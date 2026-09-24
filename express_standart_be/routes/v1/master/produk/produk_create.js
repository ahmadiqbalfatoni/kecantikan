/**
 * @project Sistem Klinik Kecantikan
 * @file produk_create.js
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
        nama: Joi.string().max(100).required().label("Nama Produk"),
        kode_kategori_produk: Joi.string().required().label("Kategori Produk"),
        satuan: Joi.string().max(20).required().label("Satuan"),
        harga_beli: Joi.number().min(0).required().label("Harga Beli"),
        harga_jual: Joi.number().min(0).required().label("Harga Jual"),
        stok_minimum: Joi.number().integer().min(0).optional().default(5).label("Stok Minimum"),
        stok_tersedia: Joi.number().integer().min(0).optional().default(0).label("Stok Tersedia"),
        no_batch: Joi.string().max(50).allow(null, "").optional().label("No. Batch"),
        tanggal_kadaluarsa: Joi.string().allow(null, "").optional().label("Tanggal Kadaluarsa"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      { "any.required": "{#label} wajib diisi", "string.empty": "{#label} tidak boleh kosong" },
      oPayload,
      { uniqueField: ["nama"], table: "mst_produk", allowUnknown: true }
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

    let kode = "";
    await DB.transaction(async (trx) => {
      const allPrd = await trx("mst_produk").where("kode_produk", "like", "PRD-%").select("kode_produk");
      let maxNum = 0;
      for (const p of allPrd) {
        const num = parseInt(p.kode_produk.replace("PRD-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kode = `PRD-${String(maxNum + 1).padStart(3, "0")}`;

      // Simpan foto jika ada
      if (oFoto) {
        const ext = path.extname(oFoto.originalname).toLowerCase();
        const uploadDir = path.join(process.cwd(), "public", "uploads", "produk");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `produk_${kode}_${Date.now()}${ext}`;
        const cFullPathFoto = path.join(uploadDir, filename);
        fs.renameSync(oFoto.path, cFullPathFoto);
        cFileNameFoto = filename;
      }

      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";
      const oData = {
        kode_cabang: branchCode,
        kode_produk: kode,
        kode_kategori_produk: oPayload.kode_kategori_produk,
        nama: oPayload.nama,
        satuan: oPayload.satuan,
        foto: cFileNameFoto || null,
        harga_beli: oPayload.harga_beli,
        harga_jual: oPayload.harga_jual,
        stok_minimum: oPayload.stok_minimum ?? 5,
        stok_tersedia: oPayload.stok_tersedia ?? 0,
        no_batch: oPayload.no_batch || null,
        tanggal_kadaluarsa: oPayload.tanggal_kadaluarsa ? String(oPayload.tanggal_kadaluarsa).slice(0, 10) : null,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_produk").insert(oData);
      await ChangesLog({ description: `Tambah Produk ${kode}`, tableName: "mst_produk", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Produk berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_produk: kode } });
  } catch (error) {
    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/produk/produk_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
