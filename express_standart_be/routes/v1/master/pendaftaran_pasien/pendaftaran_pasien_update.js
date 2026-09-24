/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_update.js
 * @description Endpoint untuk mengupdate data profil pasien
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

const handleUpdate = async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const no_rm = (oPayload.no_rm || "").trim();
    const id = oPayload.id;

    if (!no_rm && !id) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "No RM atau ID Pasien wajib disertakan",
        datetime: formatDateSystem(),
      });
    }

    // Cari data pasien awal
    const query = DB("mst_pasien");
    if (branchCode) query.where("kode_cabang", branchCode);
    if (no_rm) query.where("no_rm", no_rm);
    else query.where("id", id);

    const dataBefore = await query.first();
    if (!dataBefore) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Data pasien tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    const nama = (oPayload.nama || dataBefore.nama).trim();
    const no_hp = (oPayload.no_hp || dataBefore.no_hp).trim();
    const tanggal_lahir = (oPayload.tanggal_lahir || dataBefore.tanggal_lahir).trim();
    const jenis_kelamin = (oPayload.jenis_kelamin || dataBefore.jenis_kelamin).trim().toUpperCase();
    const nik = (oPayload.nik !== undefined ? oPayload.nik : dataBefore.nik || "").trim();

    if (!nama) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Nama pasien wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const cleanPhone = no_hp.replace(/[\s-]/g, "");
    const phoneRegex = /^(?:\+62|62|0)[8][1-9]\d{6,11}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Format nomor HP tidak valid (contoh: 081234567890)",
        datetime: formatDateSystem(),
      });
    }

    const tglLahirDate = new Date(tanggal_lahir);
    const todayDate = new Date();
    todayDate.setHours(23, 59, 59, 999);
    if (isNaN(tglLahirDate.getTime()) || tglLahirDate > todayDate) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Tanggal lahir tidak valid atau tidak boleh di masa depan",
        datetime: formatDateSystem(),
      });
    }

    if (nik) {
      if (!/^\d{16}$/.test(nik)) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "NIK harus terdiri dari 16 digit angka",
          datetime: formatDateSystem(),
        });
      }

      // Check duplicate against other active patients
      const dupNik = await DB("mst_pasien")
        .where("nik", nik)
        .where("status", "aktif")
        .whereNot("id", dataBefore.id)
        .first();

      if (dupNik) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `NIK ${nik} sudah digunakan oleh pasien lain (${dupNik.nama} / ${dupNik.no_rm})`,
          datetime: formatDateSystem(),
        });
      }
    }

    const oDataUpdate = {
      nama: nama,
      nik: nik || null,
      tempat_lahir: oPayload.tempat_lahir !== undefined ? oPayload.tempat_lahir : dataBefore.tempat_lahir,
      tanggal_lahir: tanggal_lahir,
      jenis_kelamin: jenis_kelamin,
      golongan_darah: oPayload.golongan_darah !== undefined ? oPayload.golongan_darah : dataBefore.golongan_darah,
      agama: oPayload.agama !== undefined ? oPayload.agama : dataBefore.agama,
      status_perkawinan: oPayload.status_perkawinan !== undefined ? oPayload.status_perkawinan : dataBefore.status_perkawinan,
      kewarganegaraan: oPayload.kewarganegaraan !== undefined ? oPayload.kewarganegaraan : dataBefore.kewarganegaraan,
      pekerjaan: oPayload.pekerjaan !== undefined ? oPayload.pekerjaan : dataBefore.pekerjaan,
      provinsi: oPayload.provinsi !== undefined ? oPayload.provinsi : dataBefore.provinsi,
      kota_kabupaten: oPayload.kota_kabupaten !== undefined ? oPayload.kota_kabupaten : dataBefore.kota_kabupaten,
      kecamatan: oPayload.kecamatan !== undefined ? oPayload.kecamatan : dataBefore.kecamatan,
      kelurahan_desa: oPayload.kelurahan_desa !== undefined ? oPayload.kelurahan_desa : dataBefore.kelurahan_desa,
      kode_pos: oPayload.kode_pos !== undefined ? oPayload.kode_pos : dataBefore.kode_pos,
      patokan: oPayload.patokan !== undefined ? oPayload.patokan : dataBefore.patokan,
      no_hp: cleanPhone,
      email: oPayload.email !== undefined ? oPayload.email : dataBefore.email,
      nama_kontak_darurat: oPayload.nama_kontak_darurat !== undefined ? oPayload.nama_kontak_darurat : dataBefore.nama_kontak_darurat,
      no_hp_kontak_darurat: oPayload.no_hp_kontak_darurat !== undefined ? oPayload.no_hp_kontak_darurat : dataBefore.no_hp_kontak_darurat,
      hubungan_kontak_darurat: oPayload.hubungan_kontak_darurat !== undefined ? oPayload.hubungan_kontak_darurat : dataBefore.hubungan_kontak_darurat,
      alergi: oPayload.alergi !== undefined ? oPayload.alergi : dataBefore.alergi,
      foto: oPayload.foto !== undefined ? oPayload.foto : dataBefore.foto,
      status: oPayload.status !== undefined ? oPayload.status : dataBefore.status,
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    await DB.transaction(async (trx) => {
      await trx("mst_pasien").where("id", dataBefore.id).update(oDataUpdate);

      await ChangesLog(
        {
          description: `Update Profil Pasien (${dataBefore.no_rm} - ${nama})`,
          tableName: "mst_pasien",
          referenceCode: dataBefore.no_rm,
          action: "UPDATE",
          dataBefore: dataBefore,
          dataAfter: oDataUpdate,
          user: username,
          tz: oPayload.tz || "Asia/Jakarta",
        },
        trx
      );
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data pasien berhasil diperbarui",
      datetime: formatDateSystem(),
      data: {
        id: dataBefore.id,
        no_rm: dataBefore.no_rm,
        nama: nama,
        nik: oPayload.nik !== undefined ? oPayload.nik : dataBefore.nik,
        no_hp: oPayload.no_hp !== undefined ? oPayload.no_hp : dataBefore.no_hp,
        ...oDataUpdate,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_update.js",
      func: "update",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
};

router.put("/", handleUpdate);
router.post("/", handleUpdate);

export default router;
