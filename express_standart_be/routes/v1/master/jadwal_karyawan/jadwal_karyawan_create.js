import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";

  try {
    const cValidation = await validatePayload(
      {
        no_sip: Joi.string().required().label("No SIP / Karyawan"),
        kode_ruangan: Joi.string().optional().allow("", null).label("Ruangan"),
        hari: Joi.string().valid("senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu").required().label("Hari"),
        jam_mulai: Joi.string().required().label("Jam Mulai"),
        jam_selesai: Joi.string().required().label("Jam Selesai"),
        kuota: Joi.number().integer().min(0).optional().allow(null).default(0).label("Kuota"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
        is_penanggung_jawab: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)).optional().label("Penanggung Jawab")
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    const isPJ = oPayload.is_penanggung_jawab === true || oPayload.is_penanggung_jawab === 1 || oPayload.is_penanggung_jawab === "1" || oPayload.is_penanggung_jawab === "true";
    let effectiveKuota = parseInt(oPayload.kuota) || 0;

    let kode = "";
    await DB.transaction(async (trx) => {
      const kodeRuangan = oPayload.kode_ruangan || null;
      const targetJamMulai = (oPayload.jam_mulai || "").slice(0, 5);
      const targetJamSelesai = (oPayload.jam_selesai || "").slice(0, 5);

      if (isPJ && kodeRuangan && oPayload.hari) {
        // Unset PJ HANYA berlaku untuk baris lain dalam SESI YANG SAMA (jam_mulai & jam_selesai sama persis)
        await trx("mst_jadwal_karyawan")
          .where({
            kode_ruangan: kodeRuangan,
            hari: oPayload.hari
          })
          .whereRaw("LEFT(jam_mulai, 5) = ?", [targetJamMulai])
          .whereRaw("LEFT(jam_selesai, 5) = ?", [targetJamSelesai])
          .update({
            is_penanggung_jawab: 0,
            kuota: effectiveKuota,
            updated_by: username,
            updated_at: formatDateSystem()
          });
      } else if (!isPJ && kodeRuangan && oPayload.hari) {
        // Cari PJ pada SESI YANG SAMA untuk mewarisi kuota
        const pjRow = await trx("mst_jadwal_karyawan")
          .where({
            kode_ruangan: kodeRuangan,
            hari: oPayload.hari,
            is_penanggung_jawab: 1
          })
          .whereRaw("LEFT(jam_mulai, 5) = ?", [targetJamMulai])
          .whereRaw("LEFT(jam_selesai, 5) = ?", [targetJamSelesai])
          .first();
        if (pjRow && pjRow.kuota !== undefined) {
          effectiveKuota = pjRow.kuota;
        }
      }

      // Cek apakah jadwal yang sama persis (ruangan, hari, no_sip, jam_mulai, jam_selesai) sudah ada
      let existingQuery = trx("mst_jadwal_karyawan")
        .where({
          hari: oPayload.hari,
          no_sip: oPayload.no_sip
        })
        .whereRaw("LEFT(jam_mulai, 5) = ?", [targetJamMulai])
        .whereRaw("LEFT(jam_selesai, 5) = ?", [targetJamSelesai]);

      if (kodeRuangan) {
        existingQuery = existingQuery.where("kode_ruangan", kodeRuangan);
      } else {
        existingQuery = existingQuery.whereNull("kode_ruangan");
      }

      const existing = await existingQuery.first();

      if (existing) {
        const err = new Error("Karyawan ini sudah memiliki jadwal pada ruangan, hari, dan jam yang sama.");
        err.statusCode = 422;
        throw err;
      }

      const allJadwal = await trx("mst_jadwal_karyawan").where("kode_jadwal", "like", "JDW-%").select("kode_jadwal");
      let maxNum = 0;
      for (const j of allJadwal) {
        const num = parseInt(j.kode_jadwal.replace("JDW-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kode = `JDW-${String(maxNum + 1).padStart(3, "0")}`;

      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";

      const oData = {
        kode_cabang: branchCode,
        kode_jadwal: kode,
        no_sip: oPayload.no_sip,
        kode_ruangan: oPayload.kode_ruangan || null,
        is_penanggung_jawab: isPJ ? 1 : 0,
        hari: oPayload.hari,
        jam_mulai: oPayload.jam_mulai,
        jam_selesai: oPayload.jam_selesai,
        kuota: effectiveKuota,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_jadwal_karyawan").insert(oData);
      await ChangesLog({ description: `Tambah Jadwal Karyawan ${kode}`, tableName: "mst_jadwal_karyawan", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Jadwal karyawan berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_jadwal: kode } });
  } catch (error) {
    const isDup = error.code === "ER_DUP_ENTRY";
    const statusCode = error.statusCode || (isDup ? 422 : 500);
    const message = isDup ? "Jadwal pada ruangan, hari, dan jam tersebut untuk karyawan ini sudah ada." : (error.message || "Sistem sedang maintenance");
    const oResult = { status: status.BAD_REQUEST, message, datetime: formatDateSystem() };
    Logging(error, { file: "/master/jadwal_karyawan/jadwal_karyawan_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(statusCode).json(oResult);
  }
});

export default router;
