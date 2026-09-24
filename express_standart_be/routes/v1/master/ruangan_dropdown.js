/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik Kecantikan
 * @file ruangan_dropdown.js
 * @description Endpoint dropdown daftar ruangan untuk form master layanan & paket layanan
 *
 * @author Antigravity
 * @created 2026-08-22
 */

import express from "express";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { getBranchScope } from "../components/tools/branch_scope.js";

const router = express.Router();

const handleRuanganDropdown = async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const qRuangan = DB("mst_ruangan as r").where("r.status", "aktif");
    if (branchCode) {
      qRuangan.where("r.kode_cabang", branchCode);
    }
    const vaData = await qRuangan
      .select(
        "r.kode_ruangan",
        "r.nama_ruangan",
        "r.is_konsultasi",
        DB.raw(`(
          SELECT COUNT(*) 
          FROM mst_jadwal_karyawan j 
          WHERE j.kode_ruangan = r.kode_ruangan 
            AND j.status = 'aktif'
        ) as total_jadwal`),
        DB.raw(`(
          SELECT COUNT(DISTINCT j.hari) 
          FROM mst_jadwal_karyawan j 
          WHERE j.kode_ruangan = r.kode_ruangan 
            AND j.status = 'aktif'
        ) as total_hari`),
        DB.raw(`(
          SELECT COUNT(DISTINCT j.hari) 
          FROM mst_jadwal_karyawan j 
          WHERE j.kode_ruangan = r.kode_ruangan 
            AND j.status = 'aktif' 
            AND j.is_penanggung_jawab = 1
        ) as total_hari_pj`),
        DB.raw(`(
          SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END 
          FROM mst_jadwal_karyawan j 
          WHERE j.kode_ruangan = r.kode_ruangan 
            AND j.status = 'aktif' 
            AND j.is_penanggung_jawab = 1
        ) as has_pj`)
      )
      .orderBy("r.nama_ruangan", "asc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ruangan ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, {
      file: "/master/ruangan_dropdown.js",
      func: "dropdown",
      request: oPayload,
      response: oResult,
      user: username,
    });
    return res.status(500).json(oResult);
  }
};

router.get("/", handleRuanganDropdown);
router.post("/", handleRuanganDropdown);

export default router;
