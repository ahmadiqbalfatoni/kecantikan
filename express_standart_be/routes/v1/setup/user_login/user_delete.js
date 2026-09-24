/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk menghapus user
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { jwtVerify } from "jose";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  try {
    // Validasi body kosong
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    // Validasi schema → memastikan input berupa array
    const cValidation = await validatePayload(
      {
        user_code: Joi.array().items(Joi.string()).required().label("user_code"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "any.required": "{#label} wajib diisi",
        "array.base": "{#label} harus berupa array",
      },
      oPayload
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };

      Logging(null, {
        file: "/setup/user_login/user_delete.js",
        func: "delete",
        request: oPayload,
        response: oResult,
        user: username,
      });

      return res.status(422).json(oResult);
    }

    // Ambil data sebelum dihapus untuk kebutuhan ChangesLog
    const oDataBefore = await DB("user_credential")
      .whereIn("user_code", oPayload.user_code);

    if (!oDataBefore || oDataBefore.length === 0) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data dengan kode tersebut tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    // Eksekusi penghapusan dalam Transaksi Database
    await DB.transaction(async (trx) => {
      // Lepaskan relasi kode_user pada mst_karyawan agar karyawan bisa dibuatkan akun kembali jika perlu
      await trx("mst_karyawan")
        .whereIn("kode_user", oPayload.user_code)
        .update({
          kode_user: null,
          updated_at: formatDateSystem(),
        });

      // Hapus data credential
      await trx("user_credential")
        .whereIn("user_code", oPayload.user_code)
        .del();

      // Hapus data navigation
      await trx("user_navigation")
        .whereIn("user_code", oPayload.user_code)
        .del();

      // Catat log perubahan untuk setiap user yang dihapus
      for (const item of oDataBefore) {
        const oLogDataBefore = { ...item };
        if (oLogDataBefore.password) {
          oLogDataBefore.password = "[PROTECTED]";
        }

        await ChangesLog(
          {
            description: `Hapus User Credential (${item.user_code})`,
            tableName: "user_credential",
            referenceCode: item.user_code,
            action: "DELETE",
            dataBefore: oLogDataBefore,
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
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/setup/user_login/user_delete.js",
      func: "delete",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;