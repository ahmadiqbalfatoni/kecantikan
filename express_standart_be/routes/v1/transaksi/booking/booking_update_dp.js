/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_update_dp.js
 * @description Endpoint untuk menandai pembayaran uang muka (DP) lunas pada transaksi booking
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

    if (booking.status === "dibatalkan") {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Booking sudah dibatalkan, tidak dapat memperbarui status DP",
        datetime: formatDateSystem(),
      });
    }

    if (booking.status === "tidak_hadir") {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Booking berstatus tidak hadir, tidak dapat memperbarui status DP",
        datetime: formatDateSystem(),
      });
    }

    const nowFormatted = formatDateSystem();

    await DB("trx_booking")
      .where("kode_booking", kodeBooking)
      .update({
        dp_status: "sudah_bayar",
        dp_dibayar_at: nowFormatted,
        updated_by: username,
        updated_at: nowFormatted,
      });

    await ChangesLog({
      description: `Update DP booking ${kodeBooking} menjadi sudah bayar`,
      tableName: "trx_booking",
      referenceCode: kodeBooking,
      action: "update",
      dataAfter: { kode_booking: kodeBooking, dp_status: "sudah_bayar", dp_dibayar_at: nowFormatted },
      user: username,
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: `DP untuk booking ${kodeBooking} berhasil ditandai lunas`,
      datetime: formatDateSystem(),
      data: {
        kode_booking: kodeBooking,
        dp_status: "sudah_bayar",
        dp_dibayar_at: nowFormatted,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Gagal memperbarui status DP booking",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_update_dp.js",
      func: "update_dp",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
