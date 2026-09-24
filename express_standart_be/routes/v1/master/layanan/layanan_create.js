/**
 * @project Sistem Klinik Kecantikan
 * @file layanan_create.js
 */
import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const upload = multer({
  dest: "temp/",
  limits: { fileSize: 2 * 1024 * 1024 }, // Maksimal 2MB
});

router.post("/", upload.any(), async (req, res) => {
  const { body, files, auth } = req;
  const oPayload = { ...body };
  const username = auth?.username || req?.auth?.username || "";

  // Type casting untuk form-data
  if (oPayload.harga !== undefined && oPayload.harga !== null && oPayload.harga !== "") {
    oPayload.harga = Number(oPayload.harga);
  }
  if (oPayload.durasi_menit !== undefined && oPayload.durasi_menit !== null && oPayload.durasi_menit !== "") {
    oPayload.durasi_menit = Number(oPayload.durasi_menit);
  }

  try {
    const cValidation = await validatePayload(
      {
        nama: Joi.string().max(100).required().label("Nama Layanan"),
        kode_kategori_layanan: Joi.string().required().label("Kategori Layanan"),
        kode_ruangan: Joi.string().optional().allow("", null).label("Ruangan"),
        wajib_konsultasi: Joi.string().valid("tidak", "opsional", "wajib").optional().default("tidak").label("Wajib Konsultasi"),
        kode_ruangan_konsultasi: Joi.string().optional().allow("", null).label("Ruangan Konsultasi"),
        tipe: Joi.string().valid("MEDICAL TREATMENT", "BEAUTY TREATMENT", "SERVICE TREATMENT").required().label("Tipe Layanan"),
        harga: Joi.number().min(0).required().label("Harga"),
        durasi_menit: Joi.number().integer().min(1).required().label("Durasi (Menit)"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      { "any.required": "{#label} wajib diisi", "string.empty": "{#label} tidak boleh kosong" },
      oPayload,
      { uniqueField: ["nama"], table: "mst_layanan", allowUnknown: true }
    );
    if (cValidation) {
      files?.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    }

    // Validasi file foto jika diupload
    const oFoto = files?.find((f) => f.fieldname === "foto");
    let cFileNameFoto = null;

    if (oFoto) {
      const allowedExt = [".png", ".jpg", ".jpeg", ".webp"];
      const ext = path.extname(oFoto.originalname).toLowerCase();

      if (!allowedExt.includes(ext)) {
        files?.forEach((f) => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
        return res.status(400).json({
          status: status.BAD_REQUEST,
          message: "Format file foto tidak didukung (Gunakan JPG, JPEG, PNG, atau WEBP)",
          datetime: formatDateSystem(),
        });
      }
    }

    let kodeLayanan = "";
    await DB.transaction(async (trx) => {
      const allLay = await trx("mst_layanan").where("kode_layanan", "like", "LAY-%").select("kode_layanan");
      let maxNum = 0;
      for (const l of allLay) {
        const num = parseInt(l.kode_layanan.replace("LAY-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kodeLayanan = `LAY-${String(maxNum + 1).padStart(3, "0")}`;

      // Simpan foto jika ada
      if (oFoto) {
        const ext = path.extname(oFoto.originalname).toLowerCase();
        const uploadDir = path.join(process.cwd(), "public", "uploads", "layanan");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `layanan_${kodeLayanan}_${Date.now()}${ext}`;
        const cFullPathFoto = path.join(uploadDir, filename);
        fs.renameSync(oFoto.path, cFullPathFoto);
        cFileNameFoto = filename;
      }

      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";
      const tipe = oPayload.tipe || "BEAUTY TREATMENT";
      let wajibKonsul = oPayload.wajib_konsultasi;
      if (!wajibKonsul) {
        if (tipe === "MEDICAL TREATMENT") wajibKonsul = "wajib";
        else if (tipe === "SERVICE TREATMENT") wajibKonsul = "tidak";
        else wajibKonsul = "opsional";
      }
      const oData = {
        kode_cabang: branchCode,
        kode_layanan: kodeLayanan,
        kode_kategori_layanan: oPayload.kode_kategori_layanan,
        kode_ruangan: oPayload.kode_ruangan || null,
        wajib_konsultasi: wajibKonsul,
        kode_ruangan_konsultasi: wajibKonsul !== "tidak" ? (oPayload.kode_ruangan_konsultasi || null) : null,
        nama: oPayload.nama,
        tipe: tipe,
        harga: oPayload.harga,
        durasi_menit: oPayload.durasi_menit,
        status: oPayload.status,
        foto: cFileNameFoto || null,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_layanan").insert(oData);
      await ChangesLog({ description: `Tambah Layanan ${kodeLayanan}`, tableName: "mst_layanan", referenceCode: kodeLayanan, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Layanan berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_layanan: kodeLayanan } });
  } catch (error) {
    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/layanan/layanan_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
