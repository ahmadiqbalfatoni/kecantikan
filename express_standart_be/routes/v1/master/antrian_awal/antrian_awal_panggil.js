/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_panggil.js
 * @description Endpoint untuk mengubah status antrian awal
 *              Alur: tersedia -> diambil -> dipanggil -> selesai
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

const TRANSISI_STATUS = {
  diambil: {
    from: ["tersedia"],
    label: "Pasien mengambil nomor antrian",
    errorMsg: (no, current) =>
      `Nomor ${no} tidak dapat diambil karena status saat ini: ${current}`,
  },
  dipanggil: {
    from: ["diambil", "tersedia"],
    label: "Panggil nomor antrian ke loket",
    errorMsg: (no, current) =>
      `Nomor ${no} tidak dapat dipanggil karena status saat ini: ${current}`,
  },
  selesai: {
    from: ["dipanggil"],
    label: "Antrian selesai dilayani",
    errorMsg: (no, current) =>
      `Nomor ${no} tidak dapat diselesaikan karena status saat ini: ${current}. Harus dipanggil dulu.`,
  },
};

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
        aksi: Joi.string()
          .valid("diambil", "dipanggil", "selesai")
          .required()
          .label("Aksi"),
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "any.only": "{#label} tidak valid. Pilih: diambil / dipanggil / selesai",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: formatDateSystem(),
      });
    }

    const aksi = oPayload.aksi;
    const aturan = TRANSISI_STATUS[aksi];
    let updatedRecord = null;

    await DB.transaction(async (trx) => {
      let qRecord = trx("trx_antrian_awal")
        .where("kode_antrian_awal", oPayload.kode_antrian);
      if (branchCode) qRecord = qRecord.andWhere("kode_cabang", branchCode);
      const record = await qRecord
        .forUpdate()
        .first();

      if (!record) {
        const error = new Error("Nomor antrian tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      let currentFrontendStatus = "tersedia";
      if (record.status === "terpakai") {
        currentFrontendStatus = record.dipanggil_at ? "selesai" : "diambil";
      } else if (record.status === "dipanggil") {
        currentFrontendStatus = "dipanggil";
      } else {
        currentFrontendStatus = "tersedia";
      }

      if (!aturan.from.includes(currentFrontendStatus)) {
        const error = new Error(
          aturan.errorMsg(record.nomor_antrian, currentFrontendStatus)
        );
        error.statusCode = 422;
        throw error;
      }

      // Validasi: Cegah memanggil antrean baru jika masih ada antrean lain yang sedang dipanggil (belum selesai) pada cabang yang sama
      if (aksi === "dipanggil") {
        const effectiveBranch = record.kode_cabang || branchCode;
        let qDipanggil = trx("trx_antrian_awal")
          .where("status", "dipanggil")
          .where("kode_antrian_awal", "!=", oPayload.kode_antrian);
        if (effectiveBranch) qDipanggil = qDipanggil.andWhere("kode_cabang", effectiveBranch);
        const existingDipanggil = await qDipanggil.first();

        if (existingDipanggil) {
          const error = new Error(
            `Nomor antrean ${existingDipanggil.nomor_antrian} sedang dipanggil di loket dan belum diselesaikan. Harap selesaikan nomor ${existingDipanggil.nomor_antrian} terlebih dahulu sebelum memanggil antrean berikutnya.`
          );
          error.statusCode = 422;
          throw error;
        }
      }

      let newDbStatus = record.status;
      let newDiambilAt = record.diambil_at;
      let newDipanggilAt = record.dipanggil_at;

      if (aksi === "diambil") {
        newDbStatus = "terpakai";
        newDiambilAt = formatDateSystem();
      } else if (aksi === "dipanggil") {
        newDbStatus = "dipanggil";
        newDiambilAt = newDiambilAt || formatDateSystem();
        newDipanggilAt = formatDateSystem();
      } else if (aksi === "selesai") {
        newDbStatus = "terpakai";
        newDipanggilAt = newDipanggilAt || formatDateSystem();
      }

      const updateData = {
        status: newDbStatus,
        diambil_at: newDiambilAt,
        dipanggil_at: newDipanggilAt,
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      await trx("trx_antrian_awal")
        .where("kode_antrian_awal", oPayload.kode_antrian)
        .update(updateData);

      updatedRecord = {
        ...record,
        ...updateData,
        kode_antrian: record.kode_antrian_awal,
        no_antrian: record.nomor_antrian,
      };

      await ChangesLog(
        {
          description: `${aturan.label} - Nomor ${record.nomor_antrian}`,
          tableName: "trx_antrian_awal",
          referenceCode: oPayload.kode_antrian,
          action: "UPDATE",
          dataBefore: record,
          dataAfter: updatedRecord,
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx
      );
    });

    const pesanAksi = {
      diambil: `Nomor antrian ${updatedRecord.no_antrian} berhasil diambil pasien`,
      dipanggil: `Nomor antrian ${updatedRecord.no_antrian} berhasil dipanggil`,
      selesai: `Nomor antrian ${updatedRecord.no_antrian} selesai dilayani`,
    };

    return res.status(200).json({
      status: status.SUKSES,
      message: pesanAksi[aksi],
      datetime: formatDateSystem(),
      data: updatedRecord,
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
      file: "/master/antrian_awal/antrian_awal_panggil.js",
      func: "panggil",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
