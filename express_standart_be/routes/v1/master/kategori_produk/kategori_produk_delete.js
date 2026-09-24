import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";
const router = express.Router();
router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload?.kode_cabang);
  try {
    const cValidation = await validatePayload(
      { kode_kategori_produk: Joi.array().items(Joi.string()).min(1).required().label("Kode") },
      { "array.min": "Minimal pilih satu data", "any.required": "{#label} wajib dikirim" },
      oPayload, { allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    await DB.transaction(async (trx) => {
      let qRecords = trx("mst_kategori_produk").whereIn("kode_kategori_produk", oPayload.kode_kategori_produk);
      if (branchCode) {
        qRecords = qRecords.where("kode_cabang", branchCode);
      }
      const records = await qRecords.forUpdate();
      if (!records || records.length < 1) { const e = new Error("Data tidak ditemukan atau tidak memiliki hak akses"); e.statusCode = 404; throw e; }
      const validCodes = records.map((r) => r.kode_kategori_produk);
      const used = await trx("mst_produk").whereIn("kode_kategori_produk", validCodes).first();
      if (used) { const e = new Error("Tidak dapat menghapus, kategori ini masih digunakan oleh data produk"); e.statusCode = 422; throw e; }
      await trx("mst_kategori_produk").whereIn("kode_kategori_produk", validCodes).del();
      for (const record of records) {
        await ChangesLog({ description: `Hapus Kategori Produk ${record.kode_kategori_produk}`, tableName: "mst_kategori_produk", referenceCode: record.kode_kategori_produk, action: "DELETE", dataBefore: record, dataAfter: null, user: username, tz: oPayload.tz || "UTC" }, trx);
      }
    });
    return res.status(200).json({ status: status.SUKSES, message: "Kategori produk berhasil dihapus", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    if (error.statusCode === 422) return res.status(422).json({ status: status.BAD_REQUEST, message: error.message, datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/kategori_produk/kategori_produk_delete.js", func: "delete", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
