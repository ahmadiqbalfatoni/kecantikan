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
        nama_ruangan: Joi.string().max(30).required().label("Nama Ruangan"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status")
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { uniqueField: ["nama_ruangan"], table: "mst_ruangan", allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    let kode = "";
    await DB.transaction(async (trx) => {
      const allRng = await trx("mst_ruangan").where("kode_ruangan", "like", "RNG-%").select("kode_ruangan");
      let maxNum = 0;
      for (const r of allRng) {
        const num = parseInt(r.kode_ruangan.replace("RNG-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kode = `RNG-${String(maxNum + 1).padStart(3, "0")}`;

      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";
      const oData = {
        kode_cabang: branchCode,
        kode_ruangan: kode,
        nama_ruangan: oPayload.nama_ruangan,
        status: oPayload.status,
        is_konsultasi: parseInt(oPayload.is_konsultasi || 0) === 1 ? 1 : 0,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_ruangan").insert(oData);
      await ChangesLog({ description: `Tambah Ruangan ${kode}`, tableName: "mst_ruangan", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Ruangan berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_ruangan: kode } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/ruangan/ruangan_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
