/**
 * @project Sistem Klinik Kecantikan
 * @file paket_produk_create.js
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

  // Type casting & parsing untuk form-data
  if (oPayload.harga_paket !== undefined && oPayload.harga_paket !== null && oPayload.harga_paket !== "") {
    oPayload.harga_paket = Number(oPayload.harga_paket);
  }
  if (oPayload.masa_berlaku_hari !== undefined && oPayload.masa_berlaku_hari !== null && oPayload.masa_berlaku_hari !== "") {
    oPayload.masa_berlaku_hari = Number(oPayload.masa_berlaku_hari);
  }
  if (typeof oPayload.details === "string") {
    try {
      oPayload.details = JSON.parse(oPayload.details);
    } catch (e) {
      // keep as is for validation error
    }
  }

  try {
    const cValidation = await validatePayload(
      {
        nama: Joi.string().max(100).required().label("Nama Paket Produk"),
        harga_paket: Joi.number().min(0).required().label("Harga Paket"),
        masa_berlaku_hari: Joi.number().integer().min(1).required().label("Masa Berlaku (Hari)"),
        tanggal_mulai: Joi.string().optional().allow("", null).label("Tanggal Mulai"),
        tanggal_selesai: Joi.string().optional().allow("", null).label("Tanggal Selesai"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
        details: Joi.array().items(
          Joi.object({
            kode_produk: Joi.string().required().label("Produk"),
            jumlah: Joi.number().integer().min(1).required().label("Jumlah")
          })
        ).min(1).required().label("Detail Produk")
      },
      { "any.required": "{#label} wajib diisi", "array.min": "Minimal tambahkan 1 detail produk ke dalam paket" },
      oPayload, { uniqueField: ["nama"], table: "mst_paket_produk", allowUnknown: true }
    );
    if (cValidation) {
      files?.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    }

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
    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");
    const tglMulai = oPayload.tanggal_mulai || todayStr;
    let tglSelesai = oPayload.tanggal_selesai;
    if (!tglSelesai && oPayload.masa_berlaku_hari) {
      const d = new Date(tglMulai);
      d.setDate(d.getDate() + parseInt(oPayload.masa_berlaku_hari, 10));
      tglSelesai = formatDateSystem(d, "yyyy-MM-dd");
    }

    let finalStatus = oPayload.status;
    if (tglSelesai && tglSelesai < todayStr) {
      finalStatus = "nonaktif";
    }

    await DB.transaction(async (trx) => {
      const allPktPrd = await trx("mst_paket_produk").where("kode_paket_produk", "like", "PKTPRD-%").select("kode_paket_produk");
      let maxNum = 0;
      for (const p of allPktPrd) {
        const num = parseInt(p.kode_paket_produk.replace("PKTPRD-", ""), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
      kode = `PKTPRD-${String(maxNum + 1).padStart(3, "0")}`;

      if (oFoto) {
        const ext = path.extname(oFoto.originalname).toLowerCase();
        const uploadDir = path.join(process.cwd(), "public", "uploads", "paket_produk");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `paket_prd_${kode}_${Date.now()}${ext}`;
        const cFullPathFoto = path.join(uploadDir, filename);
        fs.renameSync(oFoto.path, cFullPathFoto);
        cFileNameFoto = filename;
      }

      const branchCode = oPayload.kode_cabang || req?.auth?.kode_cabang || "CBG-001";
      const oData = {
        kode_cabang: branchCode,
        kode_paket_produk: kode,
        nama: oPayload.nama,
        foto: cFileNameFoto || null,
        harga_paket: oPayload.harga_paket,
        masa_berlaku_hari: oPayload.masa_berlaku_hari,
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai,
        status: finalStatus,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_paket_produk").insert(oData);

      let detailSeq = 1;
      const detailInserts = oPayload.details.map((d) => ({
        kode_detail_paket_produk: `DPPRD-${kode}-${String(detailSeq++).padStart(2, "0")}`,
        kode_paket_produk: kode,
        kode_produk: d.kode_produk,
        jumlah: d.jumlah,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      }));
      await trx("mst_detail_paket_produk").insert(detailInserts);

      await ChangesLog({ description: `Tambah Paket Produk ${kode}`, tableName: "mst_paket_produk", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: { ...oData, details: detailInserts }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Paket produk berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_paket_produk: kode } });
  } catch (error) {
    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/paket_produk/paket_produk_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
