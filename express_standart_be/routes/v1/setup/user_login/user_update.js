/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk mengupdate data user
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
import { decryptXCredential, hmac } from "../../components/tools/encrypt_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";

  const oPayload = {
    ...body,
  };

  try {
    // Validasi body kosong
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    const cValidation = await validatePayload(
      {
        user_code: Joi.string().required().label("user_code"),
        fullname: Joi.string().max(100).required().label("Fullname"),
        username: Joi.string().max(100).required().label("Username"),
        telp: Joi.string()
          .pattern(/^[0-9]+$/)
          .max(13)
          .required()
          .label("Telp"),
        role: Joi.string().required().label("Role"),
        kode_cabang: Joi.string().allow('', null).label("Cabang"),
        password: Joi.string()
          .min(6)
          .label("Password")
          .optional()
          .allow(""),
        status: Joi.string().required().label("Status"),
        menu: Joi.any().optional().label("Menu"),
        kode_karyawan: Joi.string().allow('', null).optional().label("Karyawan"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
        "string.min": "{#label} minimal {#limit} karakter",
        "string.pattern.base": "{#label} memiliki format yang salah",
        "any.required": "{#label} wajib diisi",
        "number.base": "{#label} harus berupa angka",
      },
      oPayload,
      {
        uniqueField: ["username", "telp"],
        table: "user_credential",
        excludedField: "user_code",
        allowUnknown: true,
      }
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };

      Logging(null, {
        file: "/setup/user_login/user_update.js",
        func: "update",
        request: oPayload,
        response: oResult,
        user: username,
      });

      return res.status(422).json(oResult);
    }

    // Ambil data sebelum di-update untuk verifikasi eksistensi dan audit log
    const oDataBefore = await DB("user_credential")
      .where("user_code", oPayload.user_code)
      .first();

    if (!oDataBefore) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data dengan kode tersebut tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    // Persiapan data yang akan diupdate
    const oData = {
      fullname: oPayload.fullname,
      username: oPayload.username,
      telp: oPayload.telp,
      role: oPayload.role,
      status: oPayload.status,
      kode_cabang: oPayload.kode_cabang !== undefined ? oPayload.kode_cabang : oDataBefore.kode_cabang,
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    // Logika enkripsi password jika dikirimkan oleh client
    if (oPayload.password) {
      const cPassword = process.env.USER_KEY + oPayload.user_code + oPayload.password;
      const dCreatedAt = oDataBefore.created_at || oDataBefore.CreatedAt;
      const secret = process.env.USER_SECRET;
      oData["password"] = hmac(cPassword, secret, "sha512");
    }

    // Eksekusi perubahan di dalam Transaksi Database
    await DB.transaction(async (trx) => {
      await trx("user_credential")
        .where("user_code", oPayload.user_code)
        .update(oData);

      // Update navigasi jika menu dikirimkan oleh client
      if (oPayload.menu) {
        const menuToSave = typeof oPayload.menu === "string" ? oPayload.menu : JSON.stringify(oPayload.menu);
        const existingNav = await trx("user_navigation").where("user_code", oPayload.user_code).first();
        if (existingNav) {
          await trx("user_navigation")
            .where("user_code", oPayload.user_code)
            .update({
              menu: menuToSave,
              updated_at: formatDateSystem(),
            });
        } else {
          await trx("user_navigation").insert({
            user_code: oPayload.user_code,
            menu: menuToSave,
            created_at: formatDateSystem(),
            updated_at: formatDateSystem(),
          });
        }
      }

      // Hubungkan dengan mst_karyawan jika kode_karyawan diberikan
      if (oPayload.kode_karyawan) {
        await trx("mst_karyawan")
          .where("kode_karyawan", oPayload.kode_karyawan)
          .update({
            kode_user: oPayload.user_code,
            updated_at: formatDateSystem(),
          });
      }

      // Masking password lama & baru pada audit log demi keamanan data
      const oLogDataBefore = { ...oDataBefore };
      if (oLogDataBefore.password) {
        oLogDataBefore.password = "[PROTECTED]";
      }

      const oLogDataAfter = { ...oDataBefore, ...oData };
      if (oLogDataAfter.password) {
        oLogDataAfter.password = "[PROTECTED]";
      }

      await ChangesLog(
        {
          description: "Update User Credential",
          tableName: "user_credential",
          referenceCode: oPayload.user_code,
          action: "UPDATE",
          dataBefore: oLogDataBefore,
          dataAfter: oLogDataAfter,
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx
      );
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil diupdate",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/setup/user_login/user_update.js",
      func: "update",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;