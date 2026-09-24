/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file index.js
 * @description Router index untuk modul antrian layanan
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
const router = express.Router();

import antrianLayananData    from "./antrian_layanan_data.js";
import antrianLayananPanggil from "./antrian_layanan_panggil.js";
import antrianLayananReset   from "./antrian_layanan_reset.js";

router.use("/antrian-layanan-data",    antrianLayananData);
router.use("/antrian-layanan-panggil", antrianLayananPanggil);
router.use("/antrian-layanan-reset",   antrianLayananReset);

export default router;
