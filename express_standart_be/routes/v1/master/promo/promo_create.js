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
        nama: Joi.string().max(100).required().label("Nama Promo"),
        jenis_diskon: Joi.string().valid("persen", "nominal").required().label("Jenis Diskon"),
        nilai_diskon: Joi.number().min(0).required().label("Nilai Diskon"),
        tanggal_mulai: Joi.string().required().label("Tanggal Mulai"),
        tanggal_selesai: Joi.string().required().label("Tanggal Selesai"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status")
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { uniqueField: ["nama"], table: "mst_promo", allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    let kode = "";
    await DB.transaction(async (trx) => {
      const allPromo = await trx("mst_promo").where("kode_promo", "like", "PRM-%").select("kode_promo");
      let maxNum = 0;
      for (const p of allPromo) {
        const num = parseInt(p.kode_promo.replace("PRM-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kode = `PRM-${String(maxNum + 1).padStart(3, "0")}`;
      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";
      const oData = {
        kode_cabang: branchCode,
        kode_promo: kode,
        nama: oPayload.nama,
        jenis_diskon: oPayload.jenis_diskon,
        nilai_diskon: oPayload.nilai_diskon,
        tanggal_mulai: oPayload.tanggal_mulai,
        tanggal_selesai: oPayload.tanggal_selesai,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_promo").insert(oData);
      await ChangesLog({ description: `Tambah Promo ${kode}`, tableName: "mst_promo", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Promo berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_promo: kode } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/promo/promo_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
