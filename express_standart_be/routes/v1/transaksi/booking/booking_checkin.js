/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_checkin.js
 * @description Endpoint untuk check-in booking menjadi kunjungan aktif & antrean layanan (Mendukung Multi-Layanan)
 *
 * @author Antigravity
 * @created 2026-09-07
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";

  try {
    const kodeBooking = (oPayload.kode_booking || "").trim();

    if (!kodeBooking) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Kode booking wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    // 1. Validasi Awal Booking
    const booking = await DB("trx_booking")
      .where("kode_booking", kodeBooking)
      .first();

    if (!booking) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: `Booking dengan kode ${kodeBooking} tidak ditemukan`,
        datetime: formatDateSystem(),
      });
    }

    if (booking.status !== "dikonfirmasi") {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Booking tidak dapat di-check-in karena berstatus '${booking.status}'`,
        datetime: formatDateSystem(),
      });
    }

    const now = new Date();
    const todayYmd = now.toISOString().slice(0, 10);
    const tglBookingStr = booking.tanggal_booking instanceof Date
      ? booking.tanggal_booking.toISOString().slice(0, 10)
      : String(booking.tanggal_booking).slice(0, 10);

    if (tglBookingStr !== todayYmd) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Check-in hanya dapat dilakukan pada tanggal booking (${tglBookingStr}). Hari ini adalah ${todayYmd}.`,
        datetime: formatDateSystem(),
      });
    }

    // 2. Ambil Info Jadwal & Ruangan Tujuan
    const jadwal = await DB("mst_jadwal_karyawan as j")
      .leftJoin("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
      .where("j.kode_jadwal", booking.kode_jadwal)
      .select("j.kode_jadwal", "j.kode_ruangan", "r.nama_ruangan", "j.no_sip")
      .first();

    const kodeRuangan = booking.kode_ruangan || jadwal?.kode_ruangan || "RNG-001";
    let namaRuangan = jadwal?.nama_ruangan || "";
    if (!namaRuangan) {
      const rng = await DB("mst_ruangan").where("kode_ruangan", kodeRuangan).first();
      namaRuangan = rng?.nama_ruangan || "Ruang Treatment";
    }

    // 3. Ambil Detail Layanan dari trx_detail_booking
    let bookingItems = await DB("trx_detail_booking")
      .where("kode_booking", kodeBooking)
      .orderBy("id", "asc");

    // Fallback jika tidak ada record di trx_detail_booking
    if (bookingItems.length === 0 && booking.kode_layanan) {
      let fallbackNama = booking.kode_layanan;
      let fallbackHarga = 0;
      if (booking.jenis_layanan === "paket") {
        const pkt = await DB("mst_paket_layanan").where("kode_paket_layanan", booking.kode_layanan).first();
        fallbackNama = pkt?.nama || booking.kode_layanan;
        fallbackHarga = parseFloat(pkt?.harga_paket || 0);
      } else {
        const lay = await DB("mst_layanan").where("kode_layanan", booking.kode_layanan).first();
        fallbackNama = lay?.nama || booking.kode_layanan;
        fallbackHarga = parseFloat(lay?.harga || 0);
      }
      bookingItems = [
        {
          jenis_layanan: booking.jenis_layanan || "layanan",
          kode_layanan: booking.kode_layanan,
          nama_layanan: fallbackNama,
          harga: fallbackHarga,
        },
      ];
    }

    let resultCheckin = null;
    let isNeedsConsult = false;

    // 4. EKSEKUSI DALAM 1 DATABASE TRANSACTION ATOMIC
    await DB.transaction(async (trx) => {
      const todayStr = todayYmd.replace(/-/g, "");
      const jamDatang = now.toTimeString().slice(0, 8);
      const nowFormatted = formatDateSystem();

      // A. Generate Kode Kunjungan: KJ-YYYYMMDD-001
      const prefixKunjungan = `KJ-${todayStr}-`;
      const lastKunjungan = await trx("trx_kunjungan")
        .where("kode_kunjungan", "like", `${prefixKunjungan}%`)
        .orderBy("id", "desc")
        .first();

      let nextKjSeq = 1;
      if (lastKunjungan && lastKunjungan.kode_kunjungan) {
        const parts = lastKunjungan.kode_kunjungan.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) nextKjSeq = num + 1;
      }
      const cKodeKunjungan = `${prefixKunjungan}${String(nextKjSeq).padStart(3, "0")}`;

      // B. INSERT ke trx_kunjungan
      const branchCodeBooking = booking.kode_cabang || "CBG-001";
      const oKunjunganData = {
        kode_cabang: branchCodeBooking,
        kode_kunjungan: cKodeKunjungan,
        no_rm: booking.no_rm,
        kode_booking: booking.kode_booking,
        tanggal_kunjungan: todayYmd,
        jam_datang: jamDatang,
        status: "berlangsung",
        tz: booking.tz || "Asia/Jakarta",
        created_by: username,
        created_at: nowFormatted,
        updated_by: username,
        updated_at: nowFormatted,
      };

      await trx("trx_kunjungan").insert(oKunjunganData);

      // C. Generate Kode Antrian Layanan: AL-YYYYMMDD-001
      const prefixAntrianLayanan = `AL-${todayStr}-`;
      const lastAntrianLayanan = await trx("trx_antrian_layanan")
        .where("kode_antrian_layanan", "like", `${prefixAntrianLayanan}%`)
        .orderBy("id", "desc")
        .first();

      let nextAlSeq = 1;
      if (lastAntrianLayanan && lastAntrianLayanan.kode_antrian_layanan) {
        const parts = lastAntrianLayanan.kode_antrian_layanan.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) nextAlSeq = num + 1;
      }
      const seqPadded = String(nextAlSeq).padStart(3, "0");
      const cKodeAntrianLayanan = `${prefixAntrianLayanan}${seqPadded}`;

      // Cek apakah booking ini memerlukan konsultasi dokter terlebih dahulu
      isNeedsConsult = Boolean(booking.butuh_konsul);
      let targetKodeRuangan = kodeRuangan;
      let targetNamaRuangan = namaRuangan;

      if (isNeedsConsult) {
        const ruangKonsul = await trx("mst_ruangan")
          .where("is_konsultasi", 1)
          .where("status", "aktif")
          .first();

        if (ruangKonsul) {
          targetKodeRuangan = ruangKonsul.kode_ruangan;
          targetNamaRuangan = ruangKonsul.nama_ruangan || "Ruang Konsultasi";
        }
      }

      // Hitung nomor_antrian khusus per ruangan hari ini
      const lastNoAntrian = await trx("trx_antrian_layanan")
        .where("created_at", ">=", `${todayYmd} 00:00:00`)
        .where("kode_ruangan", targetKodeRuangan)
        .orderBy("id", "desc")
        .first();

      let nextNo = 1;
      if (lastNoAntrian && lastNoAntrian.nomor_antrian) {
        const num = parseInt(lastNoAntrian.nomor_antrian, 10);
        if (!isNaN(num)) nextNo = num + 1;
      }
      const cNomorAntrianRuangan = String(nextNo).padStart(2, "0");

      // D. INSERT ke trx_antrian_layanan (Status langsung 'menunggu' di ruangan tujuan / ruang konsul)
      const oAntrianLayananData = {
        kode_cabang: branchCodeBooking,
        kode_antrian_layanan: cKodeAntrianLayanan,
        kode_kunjungan: cKodeKunjungan,
        nomor_antrian: cNomorAntrianRuangan,
        kode_ruangan: targetKodeRuangan,
        nama_ruangan: targetNamaRuangan,
        kode_karyawan: isNeedsConsult ? null : (jadwal?.no_sip || null),
        lanjut_ke_tindakan: isNeedsConsult ? 1 : 0,
        kode_ruangan_tujuan_lanjutan: isNeedsConsult ? kodeRuangan : null,
        status: "menunggu",
        tz: booking.tz || "Asia/Jakarta",
        created_by: username,
        created_at: nowFormatted,
        updated_by: username,
        updated_at: nowFormatted,
      };

      await trx("trx_antrian_layanan").insert(oAntrianLayananData);

      // E. INSERT ke trx_detail_antrian_layanan untuk SETIAP item booking
      let detailSeq = 1;
      for (const item of bookingItems) {
        const cKodeDetailAntrian = `DAL-${todayStr}-${seqPadded}-${String(detailSeq).padStart(2, "0")}`;
        detailSeq++;

        const oDetailAntrianData = {
          kode_detail_antrian_layanan: cKodeDetailAntrian,
          kode_antrian_layanan: cKodeAntrianLayanan,
          kode_kunjungan: cKodeKunjungan,
          jenis_layanan: item.jenis_layanan,
          kode_layanan: item.kode_layanan,
          nama_layanan: item.nama_layanan,
          harga: item.harga,
          kode_promo: null,
          nama_promo: null,
          jenis_diskon: null,
          nilai_diskon: null,
          kode_ruangan: targetKodeRuangan,
          nama_ruangan: targetNamaRuangan,
          tz: booking.tz || "Asia/Jakarta",
          created_by: username,
          created_at: nowFormatted,
          updated_by: username,
          updated_at: nowFormatted,
        };

        await trx("trx_detail_antrian_layanan").insert(oDetailAntrianData);

        // F. Jika item adalah paket, catat kepemilikan paket di trx_kepemilikan_paket_layanan
        if (item.jenis_layanan === "paket") {
          const pktDetails = await trx("mst_detail_paket_layanan")
            .where("kode_paket_layanan", item.kode_layanan)
            .select("kode_layanan", "jumlah_sesi");

          const totalSesi = pktDetails.reduce((sum, d) => sum + parseInt(d.jumlah_sesi || 0, 10), 0);

          if (totalSesi >= 1) {
            const prefixKpl = `KPL-${todayStr}-`;
            const prefixDkpl = `DKPL-${todayStr}-`;

            const lastKpl = await trx("trx_kepemilikan_paket_layanan")
              .where("kode_kepemilikan_paket_layanan", "like", `${prefixKpl}%`)
              .orderBy("id", "desc")
              .first();

            const lastDkpl = await trx("trx_detail_kepemilikan_paket_layanan")
              .where("kode_detail_kepemilikan_paket_layanan", "like", `${prefixDkpl}%`)
              .orderBy("id", "desc")
              .first();

            let seq1 = 0;
            if (lastKpl && lastKpl.kode_kepemilikan_paket_layanan) {
              const parts = lastKpl.kode_kepemilikan_paket_layanan.split("-");
              const num = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(num)) seq1 = num;
            }

            let seq2 = 0;
            if (lastDkpl && lastDkpl.kode_detail_kepemilikan_paket_layanan) {
              const parts = lastDkpl.kode_detail_kepemilikan_paket_layanan.split("-");
              if (parts.length >= 3) {
                const num = parseInt(parts[2], 10);
                if (!isNaN(num)) seq2 = num;
              }
            }

            const nextKplSeq = Math.max(seq1, seq2) + 1;
            const cKodeKpl = `${prefixKpl}${String(nextKplSeq).padStart(3, "0")}`;

            // Ambil data paket untuk tanggal expired
            const pkt = await trx("mst_paket_layanan")
              .where("kode_paket_layanan", item.kode_layanan)
              .first();

            let tglExpired = "2099-12-31";
            const masaBerlakuHari = parseInt(pkt?.masa_berlaku_hari || 0, 10);
            const isMasaBerlakuSelamanya = Boolean(pkt?.is_masa_berlaku_selamanya) || masaBerlakuHari === 0;
            if (!isMasaBerlakuSelamanya && masaBerlakuHari > 0) {
              const dExp = new Date();
              dExp.setDate(dExp.getDate() + masaBerlakuHari);
              tglExpired = `${dExp.getFullYear()}-${String(dExp.getMonth() + 1).padStart(2, "0")}-${String(dExp.getDate()).padStart(2, "0")}`;
            }

            // Hitung status paket setelah 1 sesi terpakai saat checkin
            const totalRemaining = pktDetails.reduce(
              (sum, d) => sum + Math.max(0, parseInt(d.jumlah_sesi || 0, 10) - 1),
              0
            );
            const statusKpl = totalRemaining <= 0 ? "habis" : "aktif";

            await trx("trx_kepemilikan_paket_layanan").insert({
              kode_cabang: branchCodeBooking,
              kode_kepemilikan_paket_layanan: cKodeKpl,
              no_rm: booking.no_rm,
              kode_paket_layanan: item.kode_layanan,
              kode_transaksi: booking.kode_booking || null,
              tanggal_beli: todayYmd,
              tanggal_expired: tglExpired,
              status: statusKpl,
              tz: booking.tz || "Asia/Jakarta",
              created_by: username,
              created_at: nowFormatted,
              updated_by: username,
              updated_at: nowFormatted,
            });

            // Insert detail kepemilikan paket
            let dkplSeq = 1;
            const vaInsertDkpl = [];
            for (const d of pktDetails) {
              const cKodeDkpl = `DKPL-${todayStr}-${String(nextKplSeq).padStart(3, "0")}-${String(dkplSeq).padStart(2, "0")}`;
              dkplSeq++;
              const jSesi = parseInt(d.jumlah_sesi || 0, 10);
              vaInsertDkpl.push({
                kode_detail_kepemilikan_paket_layanan: cKodeDkpl,
                kode_kepemilikan_paket_layanan: cKodeKpl,
                kode_layanan: d.kode_layanan,
                sesi_total: jSesi,
                sesi_terpakai: Math.min(1, jSesi), // 1 sesi terpakai pada kunjungan checkin ini
                tz: booking.tz || "Asia/Jakarta",
                created_by: username,
                created_at: nowFormatted,
                updated_by: username,
                updated_at: nowFormatted,
              });
            }
            if (vaInsertDkpl.length > 0) {
              await trx("trx_detail_kepemilikan_paket_layanan").insert(vaInsertDkpl);
            }
          }
        }

        // F2. Jika item adalah klaim sesi paket, potong 1 sesi (sesi_terpakai + 1)
        if (item.jenis_layanan === "klaim_paket" || item.jenis_item === "klaim_paket" || item.kode_detail_kepemilikan_paket_layanan) {
          const kodeDkpl = item.kode_detail_kepemilikan_paket_layanan;
          const kodeKpl = item.kode_kepemilikan_paket_layanan;

          let dkpl = null;
          if (kodeDkpl) {
            dkpl = await trx("trx_detail_kepemilikan_paket_layanan")
              .where("kode_detail_kepemilikan_paket_layanan", kodeDkpl)
              .first();
          } else if (kodeKpl) {
            dkpl = await trx("trx_detail_kepemilikan_paket_layanan")
              .where("kode_kepemilikan_paket_layanan", kodeKpl)
              .where("kode_layanan", item.kode_layanan)
              .whereRaw("sesi_total - sesi_terpakai > 0")
              .first();
          }

          if (dkpl) {
            // Potong 1 sesi
            await trx("trx_detail_kepemilikan_paket_layanan")
              .where("id", dkpl.id)
              .update({
                sesi_terpakai: dkpl.sesi_terpakai + 1,
                updated_at: nowFormatted,
              });

            // Periksa apakah semua detail sesi pada paket sudah habis
            const kplCode = dkpl.kode_kepemilikan_paket_layanan;
            const allDetails = await trx("trx_detail_kepemilikan_paket_layanan")
              .where("kode_kepemilikan_paket_layanan", kplCode)
              .select("sesi_total", "sesi_terpakai");

            const totalRemaining = allDetails.reduce(
              (sum, d) => sum + Math.max(0, parseInt(d.sesi_total || 0, 10) - parseInt(d.sesi_terpakai || 0, 10)),
              0
            );

            if (totalRemaining <= 0) {
              await trx("trx_kepemilikan_paket_layanan")
                .where("kode_kepemilikan_paket_layanan", kplCode)
                .update({
                  status: "habis",
                  updated_at: nowFormatted,
                });
            }
          }
        }
      }

      // G. UPDATE status trx_booking jadi 'selesai'
      const newDpStatus = booking.dp_status === "sudah_bayar" ? "dipotong_treatment" : booking.dp_status;

      await trx("trx_booking")
        .where("kode_booking", kodeBooking)
        .update({
          status: "selesai",
          dp_status: newDpStatus,
          updated_by: username,
          updated_at: nowFormatted,
        });

      resultCheckin = {
        kode_booking: kodeBooking,
        kode_kunjungan: cKodeKunjungan,
        kode_antrian_layanan: cKodeAntrianLayanan,
        nomor_antrian: cNomorAntrianRuangan,
        kode_ruangan: targetKodeRuangan,
        nama_ruangan: targetNamaRuangan,
        kode_ruangan_treatment: kodeRuangan,
        nama_ruangan_treatment: namaRuangan,
        butuh_konsul: isNeedsConsult,
        status_booking: "selesai",
        dp_nominal: booking.dp_nominal,
        dp_status: newDpStatus,
        total_items: bookingItems.length,
      };

      await ChangesLog(
        {
          description: `Check-in booking ${kodeBooking} ke kunjungan ${cKodeKunjungan}`,
          tableName: "trx_booking",
          referenceCode: kodeBooking,
          action: "checkin",
          dataAfter: resultCheckin,
          user: username,
          tz: booking.tz || "Asia/Jakarta",
        },
        trx
      );
    });

    const consultSuffix = isNeedsConsult ? " untuk konsultasi dokter pra-tindakan" : "";
    return res.status(200).json({
      status: status.SUKSES,
      message: `Pasien booking ${kodeBooking} berhasil check-in. Antrean diterbitkan di ${resultCheckin.nama_ruangan}${consultSuffix} (No. Antrean: ${resultCheckin.nomor_antrian}).`,
      datetime: formatDateSystem(),
      data: resultCheckin,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Gagal memproses check-in booking",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_checkin.js",
      func: "checkin_booking",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
