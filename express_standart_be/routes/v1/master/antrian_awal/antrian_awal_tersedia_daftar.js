/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_tersedia_daftar.js
 * @description Endpoint untuk mendapatkan daftar antrian awal yang sedang dipanggil ke meja resepsionis (status: dipanggil)
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-16
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * - Antigravity (2026-08-20)
 *
 * @lastModified Antigravity (2026-08-20)
 * @version 1.2.0
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
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    let q = DB("trx_antrian_awal").where("status", "dipanggil");
    if (branchCode) {
      q = q.andWhere("kode_cabang", branchCode);
    }
    const vaData = await q
      .select("kode_antrian_awal as kode_antrian", "nomor_antrian as no_antrian", "status")
      .orderBy("nomor_antrian", "asc");

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
      file: "/master/antrian_awal/antrian_awal_tersedia_daftar.js",
      func: "get",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
