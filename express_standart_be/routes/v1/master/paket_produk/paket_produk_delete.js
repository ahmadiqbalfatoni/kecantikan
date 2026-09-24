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
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const cValidation = await validatePayload(
      { kode_paket_produk: Joi.array().items(Joi.string()).min(1).required().label("Kode Paket") },
      { "array.min": "Minimal pilih satu data", "any.required": "{#label} wajib dikirim" },
      oPayload, { allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    await DB.transaction(async (trx) => {
      let qRecords = trx("mst_paket_produk").whereIn("kode_paket_produk", oPayload.kode_paket_produk);
      if (branchCode) qRecords = qRecords.where("kode_cabang", branchCode);
      const records = await qRecords.forUpdate();
      if (!records || records.length < 1) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const validCodes = records.map((r) => r.kode_paket_produk);
      await trx("mst_detail_paket_produk").whereIn("kode_paket_produk", validCodes).del();
      await trx("mst_paket_produk").whereIn("kode_paket_produk", validCodes).del();

      for (const record of records) {
        await ChangesLog({ description: `Hapus Paket Produk ${record.kode_paket_produk}`, tableName: "mst_paket_produk", referenceCode: record.kode_paket_produk, action: "DELETE", dataBefore: record, dataAfter: null, user: username, tz: oPayload.tz || "UTC" }, trx);
      }
    });

    return res.status(200).json({ status: status.SUKSES, message: "Paket produk berhasil dihapus", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/paket_produk/paket_produk_delete.js", func: "delete", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
