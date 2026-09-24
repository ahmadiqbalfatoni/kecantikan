/**
 * @project Sistem Klinik Kecantikan
 * @file layanan_update.js
 */
import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";
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
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

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
        kode_layanan: Joi.string().required().label("Kode Layanan"),
        nama: Joi.string().max(100).required().label("Nama Layanan"),
        kode_kategori_layanan: Joi.string().required().label("Kategori Layanan"),
        kode_ruangan: Joi.string().optional().allow("", null).label("Ruangan"),
        wajib_konsultasi: Joi.string().valid("tidak", "opsional", "wajib").optional().label("Wajib Konsultasi"),
        kode_ruangan_konsultasi: Joi.string().optional().allow("", null).label("Ruangan Konsultasi"),
        tipe: Joi.string().valid("MEDICAL TREATMENT", "BEAUTY TREATMENT", "SERVICE TREATMENT").required().label("Tipe Layanan"),
        harga: Joi.number().min(0).required().label("Harga"),
        durasi_menit: Joi.number().integer().min(1).required().label("Durasi (Menit)"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      { "any.required": "{#label} wajib diisi", "string.empty": "{#label} tidak boleh kosong" },
      oPayload,
      { allowUnknown: true }
    );
    if (cValidation) {
      files?.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    }

    const oFoto = files?.find((f) => f.fieldname === "foto");
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

    let cFullPathOldFoto = null;

    await DB.transaction(async (trx) => {
      let qPrev = trx("mst_layanan").where("kode_layanan", oPayload.kode_layanan);
      if (branchCode) qPrev = qPrev.andWhere("kode_cabang", branchCode);
      const prevRecord = await qPrev.forUpdate().first();
      if (!prevRecord) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const tipe = oPayload.tipe || prevRecord.tipe || "BEAUTY TREATMENT";
      let wajibKonsul = oPayload.wajib_konsultasi;
      if (!wajibKonsul) {
        if (tipe === "MEDICAL TREATMENT") wajibKonsul = "wajib";
        else if (tipe === "SERVICE TREATMENT") wajibKonsul = "tidak";
        else wajibKonsul = "opsional";
      }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "layanan");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let finalFotoFilename = prevRecord.foto || null;

      if (prevRecord.foto) {
        cFullPathOldFoto = path.join(uploadDir, prevRecord.foto);
      }

      // 1. Jika ada file foto baru diupload
      if (oFoto) {
        const ext = path.extname(oFoto.originalname).toLowerCase();
        const filename = `layanan_${oPayload.kode_layanan}_${Date.now()}${ext}`;
        const cFullPathNewFoto = path.join(uploadDir, filename);
        fs.renameSync(oFoto.path, cFullPathNewFoto);
        finalFotoFilename = filename;
      }
      // 2. Jika user memilih untuk menghapus foto
      else if (oPayload.hapus_foto === true || oPayload.hapus_foto === "true" || oPayload.hapus_foto === "1" || oPayload.hapus_foto === 1) {
        finalFotoFilename = null;
      }
      const oData = {
        kode_kategori_layanan: oPayload.kode_kategori_layanan,
        kode_ruangan: oPayload.kode_ruangan || null,
        wajib_konsultasi: wajibKonsul,
        kode_ruangan_konsultasi: wajibKonsul !== "tidak" ? (oPayload.kode_ruangan_konsultasi || null) : null,
        nama: oPayload.nama,
        tipe: tipe,
        harga: oPayload.harga,
        durasi_menit: oPayload.durasi_menit,
        status: oPayload.status,
        foto: finalFotoFilename,
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_layanan").where("kode_layanan", oPayload.kode_layanan).update(oData);
      await ChangesLog({ description: `Edit Layanan ${oPayload.kode_layanan}`, tableName: "mst_layanan", referenceCode: oPayload.kode_layanan, action: "UPDATE", dataBefore: prevRecord, dataAfter: { ...prevRecord, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);

      // Hapus file foto lama jika diganti atau dihapus
      const shouldDeleteOldFile = (oFoto || oPayload.hapus_foto === true || oPayload.hapus_foto === "true" || oPayload.hapus_foto === "1" || oPayload.hapus_foto === 1);
      if (shouldDeleteOldFile && cFullPathOldFoto && fs.existsSync(cFullPathOldFoto)) {
        try {
          fs.unlinkSync(cFullPathOldFoto);
        } catch (e) {
          console.error("Gagal menghapus file foto lama:", e);
        }
      }
    });

    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Layanan berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/layanan/layanan_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
