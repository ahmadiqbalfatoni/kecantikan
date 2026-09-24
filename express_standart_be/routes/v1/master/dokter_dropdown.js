/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file dokter_dropdown.js
 * @description Endpoint dropdown daftar dokter untuk form pendaftaran
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-16
 */

import express from "express";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { getBranchScope } from "../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, body?.kode_cabang);

  try {
    let query = DB("mst_karyawan")
      .where("jabatan", "dokter")
      .where("status", "aktif");

    if (branchCode) query = query.where("kode_cabang", branchCode);

    const vaData = await query
      .select("id", "kode_karyawan", "no_sip", "nama as nama_dokter", "jabatan as spesialisasi")
      .orderBy("nama", "asc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
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
      file: "/master/dokter_dropdown.js",
      func: "dropdown",
      request: body,
      response: oResult,
      user: username,
    });
    return res.status(500).json(oResult);
  }
});

export default router;
