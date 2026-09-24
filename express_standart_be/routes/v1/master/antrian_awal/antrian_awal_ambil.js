/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_ambil.js
 * @description Endpoint untuk mengambil nomor antrian pendaftaran berikutnya yang berstatus tersedia
 *
 * @author Antigravity
 * @created 2026-09-03
 * @version 1.0.0
 */

import express from "express";
import { status } from "../../components/tools/general.js";
import DB from "../../../../core/config/knex.js";
import {
  Logging,
  ChangesLog,
} from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang) || req?.auth?.kode_cabang || "CBG-001";

  try {
    let resultData = null;

    await DB.transaction(async (trx) => {
      const now = formatDateSystem();

      // Ambil kartu antrean urutan terkecil yang berstatus 'tersedia' dari pool fisik master (01-50)
      let qRecord = trx("trx_antrian_awal")
        .where("status", "tersedia");
      if (branchCode) {
        qRecord = qRecord.andWhere("kode_cabang", branchCode);
      }
      const record = await qRecord
        .orderByRaw("CAST(nomor_antrian AS UNSIGNED) ASC, nomor_antrian ASC")
        .forUpdate()
        .first();

      if (!record) {
        const error = new Error(
          "Seluruh nomor antrean pendaftaran (01-50) sedang terpakai. Silakan lakukan Reset Antrean atau tunggu hingga antrean selesai."
        );
        error.statusCode = 422;
        throw error;
      }

      const finalKodeAntrian = record.kode_antrian_awal;
      const finalNoAntrian = record.nomor_antrian;

      const updateData = {
        status: "terpakai",
        diambil_at: now,
        dipanggil_at: null,
        updated_by: username,
        updated_at: now,
      };

      await trx("trx_antrian_awal")
        .where("id", record.id)
        .update(updateData);

      await ChangesLog(
        {
          description: `Ambil Tiket Antrean Pendaftaran - Nomor ${record.nomor_antrian}`,
          tableName: "trx_antrian_awal",
          referenceCode: record.kode_antrian_awal,
          action: "UPDATE",
          dataBefore: record,
          dataAfter: { ...record, ...updateData },
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx
      );

      // Hitung jumlah antrean yang sedang menunggu di depannya (diambil & belum dipanggil, atau sedang dipanggil)
      const waitingCount = await trx("trx_antrian_awal")
        .where((qb) => {
          qb.where(function () {
            this.where("status", "terpakai")
              .whereNull("dipanggil_at")
              .where("kode_antrian_awal", "!=", finalKodeAntrian);
          }).orWhere("status", "dipanggil");
        })
        .count("* as total")
        .first();

      const totalMenunggu = parseInt(waitingCount?.total || 0, 10);

      resultData = {
        kode_antrian: finalKodeAntrian,
        no_antrian: finalNoAntrian,
        diambil_at: now,
        antrean_menunggu: totalMenunggu,
        nama_klinik: "Klinik Kecantikan",
      };
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: `Nomor antrean ${resultData.no_antrian} berhasil diambil`,
      datetime: formatDateSystem(),
      data: resultData,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: error.message,
        datetime: formatDateSystem(),
      });
    }

    if (error.statusCode === 422) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: error.message,
        datetime: formatDateSystem(),
      });
    }

    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/antrian_awal/antrian_awal_ambil.js",
      func: "ambil",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
