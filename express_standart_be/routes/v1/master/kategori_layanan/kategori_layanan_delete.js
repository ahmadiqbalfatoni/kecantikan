/**
 * @project Sistem Klinik Kecantikan
 * @file kategori_layanan_delete.js
 * @description Endpoint untuk menghapus kategori layanan
 * @author Antigravity
 * @created 2026-08-21
 * @version 1.0.0
 */

import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload?.kode_cabang);

  try {
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Invalid request body", datetime: formatDateSystem() });
    }

    const cValidation = await validatePayload(
      { kode_kategori_layanan: Joi.array().items(Joi.string()).min(1).required().label("Kode Kategori") },
      { "array.min": "Minimal pilih satu data untuk dihapus", "any.required": "{#label} wajib dikirim" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    }

    await DB.transaction(async (trx) => {
      let qRecords = trx("mst_kategori_layanan").whereIn("kode_kategori_layanan", oPayload.kode_kategori_layanan);
      if (branchCode) {
        qRecords = qRecords.where("kode_cabang", branchCode);
      }
      const records = await qRecords.forUpdate();
      if (!records || records.length < 1) {
        const e = new Error("Data tidak ditemukan atau tidak memiliki hak akses"); e.statusCode = 404; throw e;
      }

      const validCodes = records.map((r) => r.kode_kategori_layanan);

      // Cek apakah ada layanan yang menggunakan kategori ini
      const used = await trx("mst_layanan").whereIn("kode_kategori_layanan", validCodes).first();
      if (used) {
        const e = new Error("Tidak dapat menghapus, kategori ini masih digunakan oleh data layanan"); e.statusCode = 422; throw e;
      }

      await trx("mst_kategori_layanan").whereIn("kode_kategori_layanan", validCodes).del();

      for (const record of records) {
        await ChangesLog({ description: `Hapus Kategori Layanan ${record.kode_kategori_layanan}`, tableName: "mst_kategori_layanan", referenceCode: record.kode_kategori_layanan, action: "DELETE", dataBefore: record, dataAfter: null, user: username, tz: oPayload.tz || "UTC" }, trx);
      }
    });

    return res.status(200).json({ status: status.SUKSES, message: "Kategori layanan berhasil dihapus", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    if (error.statusCode === 422) return res.status(422).json({ status: status.BAD_REQUEST, message: error.message, datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/kategori_layanan/kategori_layanan_delete.js", func: "delete", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
