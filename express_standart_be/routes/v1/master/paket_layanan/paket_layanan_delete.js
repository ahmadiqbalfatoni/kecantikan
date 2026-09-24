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
      { kode_paket_layanan: Joi.array().items(Joi.string()).min(1).required().label("Kode Paket") },
      { "array.min": "Minimal pilih satu data", "any.required": "{#label} wajib dikirim" },
      oPayload, { allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    await DB.transaction(async (trx) => {
      let qRecords = trx("mst_paket_layanan").whereIn("kode_paket_layanan", oPayload.kode_paket_layanan);
      if (branchCode) qRecords = qRecords.where("kode_cabang", branchCode);
      const records = await qRecords.forUpdate();
      if (!records || records.length < 1) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const validCodes = records.map((r) => r.kode_paket_layanan);

      // 1. Cek apakah paket layanan ini pernah dibeli / dimiliki pasien
      const usedInKepemilikan = await trx("trx_kepemilikan_paket_layanan")
        .whereIn("kode_paket_layanan", validCodes)
        .first();
      if (usedInKepemilikan) {
        const e = new Error("Tidak dapat menghapus, paket layanan ini sudah memiliki riwayat pembelian oleh pasien. Anda dapat menonaktifkan status paket ini.");
        e.statusCode = 422;
        throw e;
      }

      // 2. Cek apakah paket layanan ini pernah dipakai di transaksi antrian layanan
      const usedInAntrian = await trx("trx_detail_antrian_layanan")
        .whereIn("kode_layanan", validCodes)
        .where("jenis_layanan", "paket")
        .first();
      if (usedInAntrian) {
        const e = new Error("Tidak dapat menghapus, paket layanan ini sudah memiliki riwayat antrean layanan. Anda dapat menonaktifkan status paket ini.");
        e.statusCode = 422;
        throw e;
      }

      // 3. Cek apakah paket layanan ini terdaftar di booking
      const usedInBooking = await trx("trx_detail_booking")
        .whereIn("kode_layanan", validCodes)
        .where("jenis_layanan", "paket")
        .first();
      if (usedInBooking) {
        const e = new Error("Tidak dapat menghapus, paket layanan ini terdaftar dalam reservasi booking.");
        e.statusCode = 422;
        throw e;
      }

      await trx("mst_detail_paket_layanan").whereIn("kode_paket_layanan", validCodes).del();
      await trx("mst_paket_layanan").whereIn("kode_paket_layanan", validCodes).del();

      for (const record of records) {
        await ChangesLog({ description: `Hapus Paket Layanan ${record.kode_paket_layanan}`, tableName: "mst_paket_layanan", referenceCode: record.kode_paket_layanan, action: "DELETE", dataBefore: record, dataAfter: null, user: username, tz: oPayload.tz || "UTC" }, trx);
      }
    });

    return res.status(200).json({ status: status.SUKSES, message: "Paket layanan berhasil dihapus", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    if (error.statusCode === 422) return res.status(422).json({ status: status.BAD_REQUEST, message: error.message, datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/paket_layanan/paket_layanan_delete.js", func: "delete", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
