/**
 * @project Sistem Klinik Kecantikan
 * @file kategori_layanan_create.js
 * @description Endpoint untuk membuat kategori layanan baru
 * @author Antigravity
 * @created 2026-08-21
 * @version 1.0.0
 */

import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
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
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Invalid request body", datetime: formatDateSystem() });
    }

    const cValidation = await validatePayload(
      {
        nama: Joi.string().max(100).required().label("Nama Kategori"),
        deskripsi: Joi.string().max(255).allow("", null).label("Deskripsi"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "string.max": "{#label} tidak boleh lebih dari {#limit} karakter",
        "any.only": "{#label} tidak valid",
        "any.required": "{#label} wajib diisi",
      },
      oPayload,
      { uniqueField: ["nama"], table: "mst_kategori_layanan", allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    }

    let kodeKategori = "";

    await DB.transaction(async (trx) => {
      // Generate kode_kategori_layanan
      const allKat = await trx("mst_kategori_layanan").where("kode_kategori_layanan", "like", "KATLAY-%").select("kode_kategori_layanan");
      let maxNum = 0;
      for (const k of allKat) {
        const num = parseInt(k.kode_kategori_layanan.replace("KATLAY-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kodeKategori = `KATLAY-${String(maxNum + 1).padStart(3, "0")}`;

      const oData = {
        kode_cabang: branchCode,
        kode_kategori_layanan: kodeKategori,
        nama: oPayload.nama,
        deskripsi: oPayload.deskripsi || null,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      await trx("mst_kategori_layanan").insert(oData);
      await ChangesLog({ description: `Tambah Kategori Layanan ${kodeKategori}`, tableName: "mst_kategori_layanan", referenceCode: kodeKategori, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Kategori layanan berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_kategori_layanan: kodeKategori } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/kategori_layanan/kategori_layanan_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
