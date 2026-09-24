/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_cancel.js
 * @description Endpoint untuk membatalkan transaksi booking/reservasi
 *
 * @author Antigravity
 * @created 2026-09-07
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const kodeBooking = (oPayload.kode_booking || "").trim();
    const alasanBatal = (oPayload.alasan_batal || "").trim();

    if (!kodeBooking) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Kode booking wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    let bookingQuery = DB("trx_booking").where("kode_booking", kodeBooking);
    if (branchCode) bookingQuery = bookingQuery.where("kode_cabang", branchCode);
    const booking = await bookingQuery.first();

    if (!booking) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: `Booking dengan kode ${kodeBooking} tidak ditemukan`,
        datetime: formatDateSystem(),
      });
    }

    if (booking.status === "selesai") {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Booking sudah selesai (check-in), tidak dapat dibatalkan",
        datetime: formatDateSystem(),
      });
    }

    if (booking.status === "dibatalkan") {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Booking ini sudah berstatus dibatalkan sebelumnya",
        datetime: formatDateSystem(),
      });
    }

    // Periksa apakah tanggal booking sudah lewat
    const todayYmd = new Date().toISOString().slice(0, 10);
    const tglBookingStr = booking.tanggal_booking instanceof Date
      ? booking.tanggal_booking.toISOString().slice(0, 10)
      : String(booking.tanggal_booking).slice(0, 10);

    if (tglBookingStr < todayYmd) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Tidak dapat membatalkan booking yang tanggalnya sudah lewat",
        datetime: formatDateSystem(),
      });
    }

    const nowFormatted = formatDateSystem();

    const updatePayload = {
      status: "dibatalkan",
      updated_by: username,
      updated_at: nowFormatted,
    };

    if (alasanBatal) {
      updatePayload.catatan_pasien = booking.catatan_pasien
        ? `${booking.catatan_pasien} | [Batal: ${alasanBatal}]`
        : `[Batal: ${alasanBatal}]`;
    }

    await DB("trx_booking")
      .where("kode_booking", kodeBooking)
      .update(updatePayload);

    await ChangesLog({
      description: `Membatalkan booking ${kodeBooking}`,
      tableName: "trx_booking",
      referenceCode: kodeBooking,
      action: "cancel",
      dataAfter: { kode_booking: kodeBooking, status: "dibatalkan", alasan_batal: alasanBatal },
      user: username,
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: `Booking ${kodeBooking} berhasil dibatalkan`,
      datetime: formatDateSystem(),
      data: {
        kode_booking: kodeBooking,
        status: "dibatalkan",
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Gagal membatalkan booking",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_cancel.js",
      func: "cancel_booking",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
