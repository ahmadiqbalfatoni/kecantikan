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
      { nama: Joi.string().max(100).required().label("Nama Alat"), merk: Joi.string().max(100).allow("", null).label("Merk"), tanggal_beli: Joi.string().allow("", null).label("Tanggal Beli"), kondisi: Joi.string().valid("baik", "rusak_ringan", "rusak_berat", "maintenance").required().label("Kondisi"), status: Joi.string().valid("aktif", "nonaktif").required().label("Status") },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload, { uniqueField: ["nama"], table: "mst_alat", allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    let kode = "";
    await DB.transaction(async (trx) => {
      const allAlat = await trx("mst_alat").where("kode_alat", "like", "ALT-%").select("kode_alat");
      let maxNum = 0;
      for (const a of allAlat) {
        const num = parseInt(a.kode_alat.replace("ALT-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kode = `ALT-${String(maxNum + 1).padStart(3, "0")}`;
      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";
      const oData = { kode_cabang: branchCode, kode_alat: kode, kode_ruangan: oPayload.kode_ruangan || null, nama: oPayload.nama, merk: oPayload.merk || null, tanggal_beli: oPayload.tanggal_beli || null, kondisi: oPayload.kondisi, status: oPayload.status, tz: oPayload.tz || "UTC", created_by: username, created_at: formatDateSystem(), updated_by: username, updated_at: formatDateSystem() };
      await trx("mst_alat").insert(oData);
      await ChangesLog({ description: `Tambah Alat ${kode}`, tableName: "mst_alat", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });
    return res.status(200).json({ status: status.SUKSES, message: "Alat berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_alat: kode } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/alat/alat_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
