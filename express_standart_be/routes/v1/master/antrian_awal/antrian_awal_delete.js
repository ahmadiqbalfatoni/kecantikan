/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_delete.js
 * @description Endpoint untuk menghapus data antrian awal
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
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import {
  Logging,
  ChangesLog,
  validatePayload,
} from "../../components/tools/servertool.js";
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
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    const cValidation = await validatePayload(
      {
        kode_antrian: Joi.array()
          .items(Joi.string())
          .min(1)
          .required()
          .label("Kode Antrian"),
      },
      {
        "array.base": "{#label} harus berupa array",
        "array.min": "Minimal pilih satu data untuk dihapus",
        "any.required": "{#label} wajib dikirim",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      });
    }

    let recordsBeforeDelete = [];

    await DB.transaction(async (trx) => {
      let qRecords = trx("trx_antrian_awal")
        .whereIn("kode_antrian_awal", oPayload.kode_antrian);
      if (branchCode) qRecords = qRecords.where("kode_cabang", branchCode);
      recordsBeforeDelete = await qRecords
        .forUpdate();

      if (!recordsBeforeDelete || recordsBeforeDelete.length < 1) {
        const error = new Error("Data tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      // Tolak hapus jika ada yang sedang diambil atau dipanggil
      const sedangAktif = recordsBeforeDelete.filter(
        (r) => r.status === 'dipanggil' || (r.status === 'terpakai' && !r.dipanggil_at)
      );
      if (sedangAktif.length > 0) {
        const nomorAktif = sedangAktif.map((r) => r.nomor_antrian).join(', ');
        const error = new Error(
          `Nomor antrian ${nomorAktif} sedang aktif (diambil/dipanggil) dan tidak dapat dihapus`
        );
        error.statusCode = 422;
        throw error;
      }

      const validCodes = recordsBeforeDelete.map((r) => r.kode_antrian_awal);
      await trx("trx_antrian_awal")
        .whereIn("kode_antrian_awal", validCodes)
        .del();

      for (const record of recordsBeforeDelete) {
        await ChangesLog(
          {
            description: "Hapus Nomor Antrian Awal",
            tableName: "trx_antrian_awal",
            referenceCode: record.kode_antrian_awal,
            action: "DELETE",
            dataBefore: record,
            dataAfter: null,
            user: username,
            tz: oPayload.tz || "UTC",
          },
          trx
        );
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil dihapus",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data tidak ditemukan atau sudah terhapus sebelumnya",
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
      file: "/master/antrian_awal/antrian_awal_delete.js",
      func: "delete",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
