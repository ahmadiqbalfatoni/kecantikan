/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file index.js
 * @description Route index untuk modul Booking / Reservasi
 *
 * @author Antigravity
 * @created 2026-09-07
 */

import express from "express";

import bookingSlots from "./booking_slots.js";
import bookingCreate from "./booking_create.js";
import bookingData from "./booking_data.js";
import bookingUpdateDp from "./booking_update_dp.js";
import bookingCancel from "./booking_cancel.js";
import bookingCheckin from "./booking_checkin.js";
import bookingTidakHadir from "./booking_tidak_hadir.js";

const router = express.Router();

router.use("/slots", bookingSlots);
router.use("/create", bookingCreate);
router.use("/data", bookingData);
router.use("/update-dp", bookingUpdateDp);
router.use("/cancel", bookingCancel);
router.use("/checkin", bookingCheckin);
router.use("/mark-no-show", bookingTidakHadir);
router.use("/tidak-hadir", bookingTidakHadir);

export default router;
