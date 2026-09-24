
/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk membuat user baru
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
import {
  Logging,
  ChangesLog,
  validatePayload,
} from "../../components/tools/servertool.js";
import { jwtVerify } from "jose";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import {
  decryptXCredential,
  hmac,
} from "../../components/tools/encrypt_tools.js";
import {
  getLastKodeRegister,
  setLastKodeRegister,
} from "../../components/tools/getter_setter.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";

  const oPayload = {
    ...body,
  };

  try {
    // Validasi payload
    if (!oPayload || Object.keys(oPayload).length < 1) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "Invalid request body",
        datetime: formatDateSystem(),
      });
    }

    const cValidation = await validatePayload(
      {
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
          .required()
          .label("Password"),
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
        allowUnknown: true,
      },
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada data anda",
        datetime: formatDateSystem(),
      };

      Logging(null, {
        file: "/setup/user_login/user_create.js",
        func: "create",
        request: oPayload,
        response: oResult,
        user: username,
      });

      return res.status(422).json(oResult);
    }

    // Ambil rule navigasi berdasarkan role
    let cRole = oPayload.role;
    if (oPayload.role === "superadmin" || oPayload.role === "admin") {
      cRole = "master";
    }

    let oNavigation = await DB("mst_navigation")
      .select("menu")
      .where("role", cRole)
      .first();

    // Fallback ke master navigation jika role belum memiliki menu spesifik
    if (!oNavigation || !oNavigation?.menu) {
      oNavigation = await DB("mst_navigation")
        .select("menu")
        .where("role", "master")
        .first();
    }

    if (!oNavigation || !oNavigation?.menu) {
      return res.status(400).json({
        status: status.GAGAL,
        message: "Navigasi sistem belum terdaftar di database",
        datetime: formatDateSystem(),
      });
    }

    let cUserCode = "";

    // Memulai Transaksi Database
    await DB.transaction(async (trx) => {
      const lastUser = await trx("user_credential")
        .where("user_code", "like", "USR%")
        .orderBy("user_code", "desc")
        .first();
      let nextNum = 1;
      if (lastUser && lastUser.user_code) {
        const numPart = parseInt(lastUser.user_code.replace("USR", ""), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      cUserCode = `USR${String(nextNum).padStart(6, "0")}`;

      const oData = {
        fullname: oPayload.fullname,
        username: oPayload.username,
        telp: oPayload.telp,
        role: oPayload.role,
        status: oPayload.status,
        kode_cabang: oPayload.kode_cabang || null,
        tz: oPayload.tz || "UTC",
        user_code: cUserCode,
        created_at: formatDateSystem(),
        created_by: username,
        updated_at: formatDateSystem(),
      };

      if (oPayload.password) {
        const cPassword = process.env.USER_KEY + cUserCode + oPayload.password;
        const secret = process.env.USER_SECRET;
        oData["password"] = hmac(cPassword, secret, "sha512");
      }

      // Insert navigasi user (gunakan menu kustom jika dikirim oleh Manager/Admin, fallback ke template role)
      let menuToSave = oNavigation.menu;
      if (oPayload.menu) {
        menuToSave = typeof oPayload.menu === "string" ? oPayload.menu : JSON.stringify(oPayload.menu);
      }

      await trx("user_navigation").insert({
        menu: menuToSave,
        user_code: cUserCode,
        created_at: formatDateSystem(),
        updated_at: formatDateSystem(),
      });

      // Insert data user credential
      await trx("user_credential").insert(oData);

      // Hubungkan dengan mst_karyawan jika kode_karyawan diberikan
      if (oPayload.kode_karyawan) {
        await trx("mst_karyawan")
          .where("kode_karyawan", oPayload.kode_karyawan)
          .update({
            kode_user: cUserCode,
            updated_at: formatDateSystem(),
          });
      }

      // Sinkronisasi counter register database jika tabel nomor_faktur ada
      try {
        await setLastKodeRegister("USR", trx);
      } catch (_) {}

      // Masking password pada audit log
      const oLogData = { ...oData };
      if (oLogData.password) {
        oLogData.password = "[PROTECTED]";
      }

      // Pencatatan Changes Log
      await ChangesLog(
        {
          description: "Tambah User Credential",
          tableName: "user_credential",
          referenceCode: cUserCode,
          action: "CREATE",
          dataBefore: null,
          dataAfter: oLogData,
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx,
      );
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data berhasil dibuat",
      datetime: formatDateSystem(),
      data: {
        user_code: cUserCode,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/setup/user_login/user_create.js",
      func: "create",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;