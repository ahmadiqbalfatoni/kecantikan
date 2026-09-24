/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_layanan_reset.js
 * @description Endpoint untuk mereset seluruh status antrian layanan hari ini ke 'menunggu'
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
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);
  const filterTanggal = oPayload.tanggal || new Date().toISOString().slice(0, 10);

  try {
    let q = DB("trx_antrian_layanan").whereRaw("DATE(created_at) = ?", [filterTanggal]);
    if (branchCode) {
      q = q.andWhere("kode_cabang", branchCode);
    }
    const updatedCount = await q.update({
        status: "menunggu",
        dipanggil_at: null,
        selesai_at: null,
        updated_by: username,
        updated_at: formatDateSystem(),
      });

    return res.status(200).json({
      status: status.SUKSES,
      message: `Berhasil mereset ${updatedCount} antrian layanan hari ini ke status menunggu`,
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, { file: "/master/antrian_layanan/antrian_layanan_reset.js", func: "reset", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal mereset antrian layanan",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
