/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_daftar_ulang.js
 * @description Endpoint untuk memvalidasi & memilih pasien lama (tanpa insert kunjungan)
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const no_rm = (oPayload.no_rm || "").trim();

    if (!no_rm) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Nomor RM pasien wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    // Validasi Pasien Terdaftar
    let pasienQuery = DB("mst_pasien")
      .where("no_rm", no_rm)
      .where("status", "aktif");
    if (branchCode) pasienQuery = pasienQuery.where("kode_cabang", branchCode);
    const pasien = await pasienQuery.first();

    if (!pasien) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: `Pasien dengan Nomor RM ${no_rm} tidak ditemukan atau tidak aktif`,
        datetime: formatDateSystem(),
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: `Pasien ${pasien.nama} (${pasien.no_rm}) siap melanjutkan ke pemilihan layanan`,
      datetime: formatDateSystem(),
      data: {
        id: pasien.id,
        no_rm: pasien.no_rm,
        nama: pasien.nama,
        nik: pasien.nik || "-",
        no_hp: pasien.no_hp || "-",
        tanggal_lahir: pasien.tanggal_lahir,
        jenis_kelamin: pasien.jenis_kelamin,
        provinsi: pasien.provinsi,
        kota_kabupaten: pasien.kota_kabupaten,
        alergi: pasien.alergi,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_daftar_ulang.js",
      func: "pilih_pasien_lama",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
