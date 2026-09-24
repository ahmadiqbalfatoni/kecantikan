/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_reset.js
 * @description Endpoint untuk mereset semua antrian awal (terpakai/dipanggil -> tersedia)
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-15
 *
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * - Antigravity (2026-08-20)
 *
 * @lastModified Antigravity (2026-08-20)
 * @version 1.1.0
 */

import express from "express";
import { status } from "../../components/tools/general.js";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang) || req?.auth?.kode_cabang || "CBG-001";

  try {
    let jumlahReset = 0;

    await DB.transaction(async (trx) => {
      // Ambil seluruh data kartu pool master yang aktif untuk dicatat di audit log sebelum di-reset
      let qRecords = trx("trx_antrian_awal")
        .where("status", "!=", "nonaktif")
        .where(function () {
          this.where("status", "!=", "tersedia")
            .orWhereNotNull("diambil_at")
            .orWhereNotNull("dipanggil_at")
            .orWhereNotNull("no_rm")
            .orWhereNotNull("kode_kunjungan");
        });
      if (branchCode) qRecords = qRecords.andWhere("kode_cabang", branchCode);
      const recordsToReset = await qRecords
        .select("id", "kode_antrian_awal", "nomor_antrian", "status");

      jumlahReset = recordsToReset.length;

      // Reset kartu pool master untuk cabang terkait
      let qUpdate = trx("trx_antrian_awal")
        .where("status", "!=", "nonaktif");
      if (branchCode) qUpdate = qUpdate.andWhere("kode_cabang", branchCode);
      await qUpdate
        .update({
          status: "tersedia",
          diambil_at: null,
          dipanggil_at: null,
          no_rm: null,
          kode_kunjungan: null,
          updated_by: username,
          updated_at: formatDateSystem(),
        });

      if (jumlahReset > 0) {
        await ChangesLog(
          {
            description: `Reset Harian Pool Kartu Fisik (${jumlahReset} kartu di-reset ke status tersedia)`,
            tableName: "trx_antrian_awal",
            referenceCode: "RESET",
            action: "UPDATE",
            dataBefore: recordsToReset,
            dataAfter: { status: "tersedia", jumlah_direset: jumlahReset },
            user: username,
            tz: oPayload.tz || "UTC",
          },
          trx
        );
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message:
        jumlahReset > 0
          ? `${jumlahReset} kartu antrean berhasil direset ke status tersedia`
          : "Seluruh kartu antrean sudah berstatus tersedia",
      datetime: formatDateSystem(),
      data: { jumlah_reset: jumlahReset },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/antrian_awal/antrian_awal_reset.js",
      func: "reset",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
