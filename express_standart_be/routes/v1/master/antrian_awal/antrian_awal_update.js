/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_update.js
 * @description Endpoint untuk mengupdate data antrian awal
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
        kode_antrian: Joi.string().required().label("Kode Antrian"),
        no_antrian: Joi.string().max(10).required().label("Nomor Antrian"),
        status: Joi.string()
          .valid("tersedia", "diambil", "dipanggil", "selesai", "nonaktif")
          .required()
          .label("Status"),
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
        "any.only": "{#label} tidak valid",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      {
        allowUnknown: true,
      }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      });
    }

    let previousRecord = null;

    await DB.transaction(async (trx) => {
      let qPrev = trx("trx_antrian_awal")
        .where("kode_antrian_awal", oPayload.kode_antrian);
      if (branchCode) qPrev = qPrev.andWhere("kode_cabang", branchCode);
      previousRecord = await qPrev
        .forUpdate()
        .first();

      if (!previousRecord) {
        const error = new Error("Data tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      // Check if another record already uses this nomor_antrian in this branch
      const effectiveBranch = previousRecord.kode_cabang || branchCode;
      let qDup = trx("trx_antrian_awal")
        .where("nomor_antrian", oPayload.no_antrian)
        .whereNot("kode_antrian_awal", oPayload.kode_antrian);
      if (effectiveBranch) qDup = qDup.andWhere("kode_cabang", effectiveBranch);
      const duplicateCheck = await qDup.first();

      if (duplicateCheck) {
        const error = new Error(`Nomor antrian ${oPayload.no_antrian} sudah digunakan oleh data lain.`);
        error.statusCode = 422;
        throw error;
      }

      let dbStatus = "tersedia";
      let diambilAt = previousRecord.diambil_at;
      let dipanggilAt = previousRecord.dipanggil_at;

      if (oPayload.status === "diambil") {
        dbStatus = "terpakai";
        diambilAt = diambilAt || formatDateSystem();
        dipanggilAt = null;
      } else if (oPayload.status === "dipanggil") {
        dbStatus = "dipanggil";
        diambilAt = diambilAt || formatDateSystem();
        dipanggilAt = formatDateSystem();
      } else if (oPayload.status === "selesai") {
        dbStatus = "terpakai";
        diambilAt = diambilAt || formatDateSystem();
        dipanggilAt = dipanggilAt || formatDateSystem();
      } else if (oPayload.status === "tersedia") {
        dbStatus = "tersedia";
        diambilAt = null;
        dipanggilAt = null;
      } else if (oPayload.status === "nonaktif") {
        dbStatus = "nonaktif";
        diambilAt = null;
        dipanggilAt = null;
      } else {
        dbStatus = oPayload.status || previousRecord.status;
      }

      const oData = {
        nomor_antrian: oPayload.no_antrian,
        status: dbStatus,
        diambil_at: diambilAt,
        dipanggil_at: dipanggilAt,
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      const affectedRows = await trx("trx_antrian_awal")
        .where("kode_antrian_awal", oPayload.kode_antrian)
        .update(oData);

      if (affectedRows > 0) {
        const currentRecord = { ...previousRecord, ...oData };
        await ChangesLog(
          {
            description: "Edit Nomor Antrian Awal",
            tableName: "trx_antrian_awal",
            referenceCode: oPayload.kode_antrian,
            action: "UPDATE",
            dataBefore: previousRecord,
            dataAfter: currentRecord,
            user: username,
            tz: oPayload.tz || "UTC",
          },
          trx
        );
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil diupdate",
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
      file: "/master/antrian_awal/antrian_awal_update.js",
      func: "update",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
