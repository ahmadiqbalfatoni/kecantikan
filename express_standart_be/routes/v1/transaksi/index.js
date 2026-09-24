/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file index.js
 * @description File index untuk modul Transaksi
 *
 * @author Antigravity
 * @created 2026-09-07
 */

import express from "express";
import bookingRouter from "./booking/index.js";

const router = express.Router();

router.use("/booking", bookingRouter);

export default router;
