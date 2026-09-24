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

  // Type casting & parsing untuk form-data
  if (oPayload.harga_paket !== undefined && oPayload.harga_paket !== null && oPayload.harga_paket !== "") {
    oPayload.harga_paket = Number(oPayload.harga_paket);
  }
  if (oPayload.masa_berlaku_hari !== undefined && oPayload.masa_berlaku_hari !== null && oPayload.masa_berlaku_hari !== "") {
    oPayload.masa_berlaku_hari = Number(oPayload.masa_berlaku_hari);
  }
  if (oPayload.is_masa_berlaku_selamanya !== undefined) {
    oPayload.is_masa_berlaku_selamanya = Boolean(oPayload.is_masa_berlaku_selamanya === true || oPayload.is_masa_berlaku_selamanya === "true" || oPayload.is_masa_berlaku_selamanya === "1" || oPayload.is_masa_berlaku_selamanya === 1);
  }
  if (oPayload.is_selamanya !== undefined) {
    oPayload.is_selamanya = Boolean(oPayload.is_selamanya === true || oPayload.is_selamanya === "true" || oPayload.is_selamanya === "1" || oPayload.is_selamanya === 1);
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
        kode_paket_layanan: Joi.string().required().label("Kode Paket"),
        nama: Joi.string().max(100).required().label("Nama Paket"),
        kode_ruangan: Joi.string().optional().allow("", null).label("Ruangan"),
        tipe: Joi.string().valid("MEDICAL TREATMENT", "BEAUTY TREATMENT", "SERVICE TREATMENT").optional().allow("", null).label("Tipe Paket"),
        harga_paket: Joi.number().min(0).required().label("Harga Paket"),
        masa_berlaku_hari: Joi.number().integer().min(0).optional().allow(null).label("Masa Berlaku (Hari)"),
        is_masa_berlaku_selamanya: Joi.boolean().optional().allow(null).label("Masa Berlaku Selamanya"),
        is_selamanya: Joi.boolean().optional().allow(null).label("Aktif Selamanya"),
        tanggal_mulai: Joi.string().optional().allow("", null).label("Tanggal Mulai"),
        tanggal_selesai: Joi.string().optional().allow("", null).label("Tanggal Selesai"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
        details: Joi.array().items(
          Joi.object({
            kode_layanan: Joi.string().required().label("Layanan"),
            jumlah_sesi: Joi.number().integer().min(1).required().label("Jumlah Sesi")
          })
        ).min(1).required().label("Detail Layanan")
      },
      { "any.required": "{#label} wajib diisi" }, oPayload, { allowUnknown: true }
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

    const selectedTipe = oPayload.tipe || "BEAUTY TREATMENT";
    const isSelamanya = Boolean(oPayload.is_selamanya);
    const isMasaBerlakuSelamanya = Boolean(oPayload.is_masa_berlaku_selamanya) || parseInt(oPayload.masa_berlaku_hari, 10) === 0;
    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");
    const tglMulai = oPayload.tanggal_mulai || todayStr;
    const tglSelesai = isSelamanya ? null : (oPayload.tanggal_selesai || null);

    let finalStatus = oPayload.status;
    if (!isSelamanya && tglSelesai && tglSelesai < todayStr) {
      finalStatus = "nonaktif";
    }

    let cFullPathOldFoto = null;

    await DB.transaction(async (trx) => {
      let qPrev = trx("mst_paket_layanan").where("kode_paket_layanan", oPayload.kode_paket_layanan);
      if (branchCode) qPrev = qPrev.andWhere("kode_cabang", branchCode);
      const prev = await qPrev.forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      const uploadDir = path.join(process.cwd(), "public", "uploads", "paket_layanan");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let finalFotoFilename = prev.foto || null;

      if (prev.foto) {
        cFullPathOldFoto = path.join(uploadDir, prev.foto);
      }

      if (oFoto) {
        const ext = path.extname(oFoto.originalname).toLowerCase();
        const filename = `paket_${oPayload.kode_paket_layanan}_${Date.now()}${ext}`;
        const cFullPathNewFoto = path.join(uploadDir, filename);
        fs.renameSync(oFoto.path, cFullPathNewFoto);
        finalFotoFilename = filename;
      } else if (oPayload.hapus_foto === true || oPayload.hapus_foto === "true" || oPayload.hapus_foto === "1" || oPayload.hapus_foto === 1) {
        finalFotoFilename = null;
      }

      const oData = {
        nama: oPayload.nama,
        kode_ruangan: oPayload.kode_ruangan || null,
        tipe: selectedTipe,
        harga_paket: oPayload.harga_paket,
        masa_berlaku_hari: isMasaBerlakuSelamanya ? 0 : (parseInt(oPayload.masa_berlaku_hari, 10) || 365),
        is_masa_berlaku_selamanya: isMasaBerlakuSelamanya ? 1 : 0,
        is_selamanya: isSelamanya ? 1 : 0,
        tanggal_mulai: tglMulai,
        tanggal_selesai: tglSelesai,
        status: finalStatus,
        foto: finalFotoFilename,
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_paket_layanan").where("kode_paket_layanan", oPayload.kode_paket_layanan).update(oData);

      // Re-insert detail items
      await trx("mst_detail_paket_layanan").where("kode_paket_layanan", oPayload.kode_paket_layanan).del();
      let detailSeq = 1;
      const detailInserts = oPayload.details.map((d) => ({
        kode_detail_paket_layanan: `DPKT-${oPayload.kode_paket_layanan}-${String(detailSeq++).padStart(2, "0")}`,
        kode_paket_layanan: oPayload.kode_paket_layanan,
        kode_layanan: d.kode_layanan,
        jumlah_sesi: d.jumlah_sesi,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      }));
      await trx("mst_detail_paket_layanan").insert(detailInserts);

      await ChangesLog({ description: `Edit Paket Layanan ${oPayload.kode_paket_layanan}`, tableName: "mst_paket_layanan", referenceCode: oPayload.kode_paket_layanan, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData, details: detailInserts }, user: username, tz: oPayload.tz || "UTC" }, trx);

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

    return res.status(200).json({ status: status.SUKSES, message: "Paket layanan berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    files?.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/paket_layanan/paket_layanan_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
