/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk menampilkan data user
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


import "dotenv/config";
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import Joi from "joi";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "SYSTEM";
  const oPayload = { ...body };

  try {
    // Validasi Payload menggunakan helper validatePayload
    const cValidation = await validatePayload(
      {
        status: Joi.number().integer().valid(0, 1).allow('', null).label("Status"),
        role: Joi.array().items(Joi.string()).single().allow('', null).label("Role"),
        search: Joi.string().allow('', null).label("Global Search"),
        first: Joi.number().integer().min(0).allow(null).label("Offset First"),
        page: Joi.number().integer().min(0).allow(null).label("Page"),
        rows: Joi.number().integer().min(1).allow(null).label("Limit Rows"),
      },
      {
        "string.base": "{#label} harus berupa string",
        "number.base": "{#label} harus berupa angka",
        "number.integer": "{#label} harus berupa bilangan bulat",
        "array.base": "{#label} harus berupa array",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation || "Terdapat kesalahan pada parameter filter",
        datetime: formatDateSystem(),
      };
   
      return res.status(422).json(oResult);
    }

    // Inisiasi Query Builder
    let oQuery = DB("user_credential as u")
      .leftJoin("mst_cabang as c", "u.kode_cabang", "c.kode_cabang")
      .select(
        "u.user_code",
        "u.username",
        "u.fullname",
        "u.role",
        "u.status",
        "u.telp",
        "u.tz",
        "u.kode_cabang",
        "c.nama_cabang",
        "u.created_at"
      );

    // Filter Cabang (Optional)
    if (oPayload.kode_cabang) {
      oQuery.where("u.kode_cabang", oPayload.kode_cabang);
    }

    // Filter Status (Optional)
    if (oPayload.status !== undefined && oPayload.status !== null && oPayload.status !== "") {
      oQuery.where("u.status", oPayload.status);
    }

    // Filter Role (Optional - Mendukung single value maupun array menggunakan whereIn)
    if (oPayload.role) {
      const vaRoles = Array.isArray(oPayload.role)
        ? oPayload.role
        : [oPayload.role].filter(Boolean);
      
      if (vaRoles.length > 0) {
        oQuery.whereIn("u.role", vaRoles);
      }
    }

    // Global Search (Optional)
    if (oPayload.search) {
      const searchKeyword = `%${oPayload.search}%`;
      oQuery.where(function () {
        this.where("u.user_code", "like", searchKeyword)
          .orWhere("u.username", "like", searchKeyword)
          .orWhere("u.fullname", "like", searchKeyword)
          .orWhere("u.telp", "like", searchKeyword)
          .orWhere("c.nama_cabang", "like", searchKeyword);
      });
    }

    // Clone query untuk menghitung total data sebelum dipotong limit & offset
    const oCountQuery = oQuery.clone();
    const nTotalRecordObj = await oCountQuery.clearSelect().count("u.user_code as total").first();
    const nTotalDataCount = nTotalRecordObj ? Number(nTotalRecordObj.total) : 0;

    // Penerapan Pagination
    if (oPayload.rows !== undefined && oPayload.rows !== null) {
      oQuery.limit(Number(oPayload.rows));

      if (oPayload.first !== undefined && oPayload.first !== null) {
        oQuery.offset(Number(oPayload.first));
      }
    }

    // Eksekusi Data Query dengan sorting default descending
    const vaData = await oQuery.orderBy("u.created_at", "desc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data user berhasil diambil.",
      data: vaData,
      total_data: nTotalDataCount,
      datetime: formatDateSystem(),
    });

  } catch (error) {
    const oResultError = {
      status: status.GAGAL,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/setup/user_login/user_data.js",
      func: "data",
      request: oPayload,
      response: oResultError,
      user: username,
    });

    return res.status(500).json(oResultError);
  }
});

export default router;