/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_tidak_hadir.js
 * @description Endpoint untuk menandai booking tidak hadir (manual per-booking atau scan otomatis yang kedaluwarsa)
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
    const isAutoScan = oPayload.auto_scan === true || !kodeBooking;

    const nowFormatted = formatDateSystem();
    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Ambil konfigurasi toleransi keterlambatan dari tabel config (default: 30 menit)
    const cfgToleransi = await DB("config")
      .where("kode", "toleransi_keterlambatan_menit")
      .first();
    const toleransiMenit = parseInt(cfgToleransi?.keterangan || "30", 10) || 30;

    if (!isAutoScan && kodeBooking) {
      // 1. MODE SINGLE: Tandai 1 booking spesifik
      let singleQuery = DB("trx_booking").where("kode_booking", kodeBooking);
      if (branchCode) singleQuery = singleQuery.where("kode_cabang", branchCode);
      const booking = await singleQuery.first();

      if (!booking) {
        return res.status(404).json({
          status: status.BAD_REQUEST,
          message: `Booking ${kodeBooking} tidak ditemukan`,
          datetime: formatDateSystem(),
        });
      }

      if (booking.status === "selesai") {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Booking sudah selesai (check-in), tidak dapat ditandai tidak hadir",
          datetime: formatDateSystem(),
        });
      }

      if (booking.status === "dibatalkan") {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Booking sudah dibatalkan, tidak dapat ditandai tidak hadir",
          datetime: formatDateSystem(),
        });
      }

      // Jika DP sudah bayar -> hangus
      const newDpStatus = booking.dp_status === "sudah_bayar" ? "hangus" : booking.dp_status;

      await DB("trx_booking")
        .where("kode_booking", kodeBooking)
        .update({
          status: "tidak_hadir",
          dp_status: newDpStatus,
          updated_by: username,
          updated_at: nowFormatted,
        });

      await ChangesLog({
        description: `Menandai booking ${kodeBooking} tidak hadir`,
        tableName: "trx_booking",
        referenceCode: kodeBooking,
        action: "update",
        dataAfter: { kode_booking: kodeBooking, status: "tidak_hadir", dp_status: newDpStatus },
        user: username,
      });

      return res.status(200).json({
        status: status.SUKSES,
        message: `Booking ${kodeBooking} berhasil ditandai tidak hadir.${newDpStatus === "hangus" ? " Uang muka (DP) dinyatakan hangus." : ""}`,
        datetime: formatDateSystem(),
        data: {
          kode_booking: kodeBooking,
          status: "tidak_hadir",
          dp_status: newDpStatus,
        },
      });
    } else {
      // 2. MODE AUTO SCAN: Scan semua booking berstatus 'dikonfirmasi' yang telah melewati batas toleransi
      // Batas toleransi: tanggal < hari ini ATAU (tanggal = hari ini AND jam_booking + toleransi < sekarang)
      const hours = Math.floor(toleransiMenit / 60);
      const mins = toleransiMenit % 60;
      const addTimeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;

      let autoQuery = DB("trx_booking")
        .where("status", "dikonfirmasi")
        .where(function () {
          this.where("tanggal_booking", "<", todayYmd).orWhere(function () {
            this.where("tanggal_booking", todayYmd).whereRaw(
              "ADDTIME(jam_booking, ?) < ?",
              [addTimeStr, nowTimeStr]
            );
          });
        });
      if (branchCode) autoQuery = autoQuery.where("kode_cabang", branchCode);
      const expiredBookings = await autoQuery.select("id", "kode_booking", "dp_status", "tanggal_booking", "jam_booking");

      if (expiredBookings.length === 0) {
        return res.status(200).json({
          status: status.SUKSES,
          message: "Tidak ada booking kedaluwarsa yang perlu diperbarui",
          datetime: formatDateSystem(),
          data: {
            total_updated: 0,
            updated_codes: [],
          },
        });
      }

      let updatedCount = 0;
      const updatedCodes = [];

      await DB.transaction(async (trx) => {
        for (const b of expiredBookings) {
          const newDpStatus = b.dp_status === "sudah_bayar" ? "hangus" : b.dp_status;

          await trx("trx_booking")
            .where("id", b.id)
            .update({
              status: "tidak_hadir",
              dp_status: newDpStatus,
              updated_by: username,
              updated_at: nowFormatted,
            });

          updatedCodes.push({
            kode_booking: b.kode_booking,
            dp_status: newDpStatus,
          });
          updatedCount++;
        }
      });

      return res.status(200).json({
        status: status.SUKSES,
        message: `Berhasil memperbarui ${updatedCount} booking kedaluwarsa menjadi tidak hadir`,
        datetime: formatDateSystem(),
        data: {
          total_updated: updatedCount,
          updated_codes: updatedCodes,
        },
      });
    }
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Gagal memproses booking tidak hadir",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_tidak_hadir.js",
      func: "mark_no_show",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
