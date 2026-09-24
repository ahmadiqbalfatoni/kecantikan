/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file poli_dropdown.js
 * @description Endpoint dropdown daftar poli untuk form pendaftaran
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-16
 */

import express from "express";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";

  try {
    const vaData = await DB("mst_poli")
      .select("kode_poli", "nama_poli")
      .orderBy("nama_poli", "asc");

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
      file: "/master/poli_dropdown.js",
      func: "dropdown",
      request: body,
      response: oResult,
      user: username,
    });
    return res.status(500).json(oResult);
  }
});

export default router;
