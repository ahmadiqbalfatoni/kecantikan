/**
 * @project Sistem Klinik Kecantikan
 * @file produk_update.js
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
  if (oPayload.harga_beli !== undefined && oPayload.harga_beli !== null && oPayload.harga_beli !== "") {
    oPayload.harga_beli = Number(oPayload.harga_beli);
  }
  if (oPayload.harga_jual !== undefined && oPayload.harga_jual !== null && oPayload.harga_jual !== "") {
    oPayload.harga_jual = Number(oPayload.harga_jual);
  }
  if (oPayload.stok_minimum !== undefined && oPayload.stok_minimum !== null && oPayload.stok_minimum !== "") {
    oPayload.stok_minimum = Number(oPayload.stok_minimum);
  }
  if (oPayload.stok_tersedia !== undefined && oPayload.stok_tersedia !== null && oPayload.stok_tersedia !== "") {
    oPayload.stok_tersedia = Number(oPayload.stok_tersedia);
  }

  try {
    const cValidation = await validatePayload(
      {
        kode_produk: Joi.string().required().label("Kode Produk"),
        nama: Joi.string().max(100).required().label("Nama Produk"),
        kode_kategori_produk: Joi.string().required().label("Kategori Produk"),
        satuan: Joi.string().max(20).required().label("Satuan"),
        harga_beli: Joi.number().min(0).required().label("Harga Beli"),
        harga_jual: Joi.number().min(0).required().label("Harga Jual"),
        stok_minimum: Joi.number().integer().min(0).optional().label("Stok Minimum"),
        stok_tersedia: Joi.number().integer().min(0).optional().label("Stok Tersedia"),
        no_batch: Joi.string().max(50).allow(null, "").optional().label("No. Batch"),
        tanggal_kadaluarsa: Joi.string().allow(null, "").optional().label("Tanggal Kadaluarsa"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      { "any.required": "{#label} wajib diisi" },
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
      let qPrev = trx("mst_produk").where("kode_produk", oPayload.kode_produk);
      if (branchCode) qPrev = qPrev.andWhere("kode_cabang", branchCode);
      const prev = await qPrev.forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "produk");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let finalFotoFilename = prev.foto || null;
      if (prev.foto) {
        cFullPathOldFoto = path.join(uploadDir, prev.foto);
      }

      // 1. Jika ada file foto baru diupload
      if (oFoto) {
        const ext = path.extname(oFoto.originalname).toLowerCase();
        const filename = `produk_${oPayload.kode_produk}_${Date.now()}${ext}`;
        const cFullPathNewFoto = path.join(uploadDir, filename);
        fs.renameSync(oFoto.path, cFullPathNewFoto);
        finalFotoFilename = filename;
      }
      // 2. Jika user memilih untuk menghapus foto
      else if (oPayload.hapus_foto === true || oPayload.hapus_foto === "true" || oPayload.hapus_foto === "1" || oPayload.hapus_foto === 1) {
        finalFotoFilename = null;
      }

      const oData = {
        kode_kategori_produk: oPayload.kode_kategori_produk,
        nama: oPayload.nama,
        satuan: oPayload.satuan,
        foto: finalFotoFilename,
        harga_beli: oPayload.harga_beli,
        harga_jual: oPayload.harga_jual,
        stok_minimum: oPayload.stok_minimum !== undefined ? oPayload.stok_minimum : prev.stok_minimum,
        stok_tersedia: oPayload.stok_tersedia !== undefined ? oPayload.stok_tersedia : prev.stok_tersedia,
        no_batch: oPayload.no_batch !== undefined ? (oPayload.no_batch || null) : prev.no_batch,
        tanggal_kadaluarsa: oPayload.tanggal_kadaluarsa !== undefined ? (oPayload.tanggal_kadaluarsa ? String(oPayload.tanggal_kadaluarsa).slice(0, 10) : null) : prev.tanggal_kadaluarsa,
        status: oPayload.status,
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_produk").where("kode_produk", oPayload.kode_produk).update(oData);
      await ChangesLog({ description: `Edit Produk ${oPayload.kode_produk}`, tableName: "mst_produk", referenceCode: oPayload.kode_produk, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);

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

    return res.status(200).json({ status: status.SUKSES, message: "Produk berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/produk/produk_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
