import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { syncRekamMedisPerAntrian } from "./rekam_medis_service.js";

const router = express.Router();

// ─── 1. FETCH CUSTOM FIELDS FOR A ROOM ───────────────────────────────────────
router.post("/ruangan-form-data", async (req, res) => {
  const oPayload = req.body || {};
  const { kode_ruangan } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!kode_ruangan) {
      return res.status(400).json({
        status: status.BAD_REQUEST,
        message: "kode_ruangan wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const fields = await DB("mst_ruangan_form")
      .where("kode_ruangan", kode_ruangan)
      .orderBy("urutan", "asc")
      .orderBy("id", "asc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data form ruangan ditemukan",
      datetime: formatDateSystem(),
      data: fields,
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "ruangan-form-data", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal mengambil data form ruangan",
      datetime: formatDateSystem(),
    });
  }
});

// ─── 2. CREATE CUSTOM FIELD FOR A ROOM ───────────────────────────────────────
router.post("/ruangan-form-create", async (req, res) => {
  const oPayload = req.body || {};
  const { kode_ruangan, label_field, tipe_field, options, is_required, urutan } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!kode_ruangan || !label_field) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "kode_ruangan dan label_field wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const newField = {
      kode_ruangan,
      label_field: label_field.trim(),
      tipe_field: tipe_field || "text",
      options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
      is_required: is_required ? 1 : 0,
      urutan: parseInt(urutan, 10) || 0,
      created_by: username,
      created_at: formatDateSystem(),
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    const [id] = await DB("mst_ruangan_form").insert(newField);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Field form ruangan berhasil ditambahkan",
      datetime: formatDateSystem(),
      data: { id, ...newField },
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "ruangan-form-create", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal membuat field form ruangan",
      datetime: formatDateSystem(),
    });
  }
});

// ─── 3. UPDATE CUSTOM FIELD FOR A ROOM ───────────────────────────────────────
router.post("/ruangan-form-update", async (req, res) => {
  const oPayload = req.body || {};
  const { id, label_field, tipe_field, options, is_required, urutan } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!id || !label_field) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "id dan label_field wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const updateData = {
      label_field: label_field.trim(),
      tipe_field: tipe_field || "text",
      options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
      is_required: is_required ? 1 : 0,
      urutan: parseInt(urutan, 10) || 0,
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    await DB("mst_ruangan_form").where("id", id).update(updateData);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Field form ruangan berhasil diperbarui",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "ruangan-form-update", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal memperbarui field form ruangan",
      datetime: formatDateSystem(),
    });
  }
});

// ─── 4. DELETE CUSTOM FIELD FOR A ROOM ───────────────────────────────────────
router.post("/ruangan-form-delete", async (req, res) => {
  const oPayload = req.body || {};
  const { id } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!id) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "id field wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    await DB("mst_ruangan_form").where("id", id).del();

    return res.status(200).json({
      status: status.SUKSES,
      message: "Field form ruangan berhasil dihapus",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "ruangan-form-delete", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal menghapus field form ruangan",
      datetime: formatDateSystem(),
    });
  }
});

// ─── 5. SIMPAN HASIL FORM & CATATAN TINDAKAN PASIEN ──────────────────────────
router.post("/antrian-layanan-simpan-form", async (req, res) => {
  const oPayload = req.body || {};
  const { kode_antrian_layanan, hasil_form, catatan_petugas, status_tindakan } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!kode_antrian_layanan) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "kode_antrian_layanan wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const currentAntrian = await DB("trx_antrian_layanan")
      .where("kode_antrian_layanan", kode_antrian_layanan)
      .first();

    if (!currentAntrian) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Data antrian layanan tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    const updateObj = {
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    if (oPayload.kode_karyawan || oPayload.no_sip) {
      updateObj.kode_karyawan = oPayload.kode_karyawan || oPayload.no_sip;
    }

    if (status_tindakan && ["menunggu", "dipanggil", "selesai", "batal"].includes(status_tindakan)) {
      updateObj.status = status_tindakan;
      if (status_tindakan === "selesai") {
        const resolvedKaryawan = updateObj.kode_karyawan || currentAntrian.kode_karyawan;
        if (!resolvedKaryawan) {
          return res.status(422).json({
            status: status.BAD_REQUEST,
            message: "Petugas / karyawan wajib dipilih sebelum status tindakan dapat diubah menjadi selesai",
            datetime: formatDateSystem(),
          });
        }
        updateObj.selesai_at = formatDateSystem();
      }
    }

    await DB("trx_antrian_layanan")
      .where("kode_antrian_layanan", kode_antrian_layanan)
      .update(updateObj);

    if (currentAntrian.kode_kunjungan) {
      await syncRekamMedisPerAntrian({
        kode_kunjungan: currentAntrian.kode_kunjungan,
        kode_antrian_layanan: currentAntrian.kode_antrian_layanan,
        kode_ruangan: currentAntrian.kode_ruangan,
        nama_ruangan: currentAntrian.nama_ruangan,
        hasil_form: hasil_form,
        catatan_petugas: catatan_petugas,
        username: username,
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Hasil penanganan & catatan ruangan berhasil disimpan",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "antrian-layanan-simpan-form", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal menyimpan hasil form penanganan pasien",
      datetime: formatDateSystem(),
    });
  }
});

// ─── 6. UPLOAD FOTO FORM RUANGAN (BEFORE / AFTER) ───────────────────────────
router.post("/ruangan-form-upload-foto", async (req, res) => {
  const oPayload = req.body || {};
  const { image_base64, file_name, prefix } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!image_base64) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Data gambar (image_base64) wajib disertakan",
        datetime: formatDateSystem(),
      });
    }

    const matches = image_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let extension = ".jpg";
    let base64Data = image_base64;

    if (matches && matches.length === 3) {
      const mime = matches[1];
      base64Data = matches[2];
      if (mime.includes("png")) extension = ".png";
      else if (mime.includes("gif")) extension = ".gif";
      else if (mime.includes("webp")) extension = ".webp";
      else extension = ".jpg";
    }

    const buffer = Buffer.from(base64Data, "base64");
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const uploadDir = path.resolve(currentDir, "../../../../public/uploads/ruangan_form");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanPrefix = prefix ? `${prefix}_` : "";
    const uniqueFilename = `foto_${cleanPrefix}${Date.now()}_${Math.floor(Math.random() * 1000)}${extension}`;
    const fullPath = path.join(uploadDir, uniqueFilename);

    fs.writeFileSync(fullPath, buffer);

    const relativePath = `/uploads/ruangan_form/${uniqueFilename}`;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Foto berhasil diunggah",
      datetime: formatDateSystem(),
      data: {
        file_path: relativePath,
        file_name: uniqueFilename,
      },
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "ruangan-form-upload-foto", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal mengunggah foto form ruangan",
      datetime: formatDateSystem(),
    });
  }
});

// ─── 7. FETCH REKAM MEDIS PER KUNJUNGAN / PASIEN ──────────────────────────────
router.post("/rekam-medis-data", async (req, res) => {
  const oPayload = req.body || {};
  const { kode_kunjungan, no_rm } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    const query = DB("trx_rekam_medis as rm")
      .leftJoin("trx_kunjungan as k", "rm.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "rm.no_rm", "p.no_rm")
      .select(
        "rm.*",
        "k.tanggal_kunjungan",
        "k.jam_datang",
        "k.status as status_kunjungan",
        "p.nama_pasien",
        "p.no_hp",
        "p.tanggal_lahir",
        "p.jenis_kelamin"
      );

    if (kode_kunjungan) {
      query.where("rm.kode_kunjungan", kode_kunjungan);
    } else if (no_rm) {
      query.where("rm.no_rm", no_rm);
    }

    const data = await query.orderBy("rm.id", "desc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data rekam medis ditemukan",
      datetime: formatDateSystem(),
      data: data,
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_form_crud.js", func: "rekam-medis-data", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal mengambil data rekam medis",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
