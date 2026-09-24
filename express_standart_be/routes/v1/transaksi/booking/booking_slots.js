/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_slots.js
 * @description Endpoint untuk mengecek slot jadwal karyawan yang tersedia dan kuota booking
 *
 * @author Antigravity
 * @created 2026-09-07
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

// Daftar hari dalam bahasa Indonesia (sesuai nilai kolom 'hari' di mst_jadwal_karyawan)
const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

// Default persentase DP (20%) - mudah dikonfigurasi
const DEFAULT_DP_PERCENTAGE = 20;

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const tanggalBooking = (oPayload.tanggal_booking || "").trim();
    const kodeRuanganParam = (oPayload.kode_ruangan || "").trim();
    const jenisLayanan = (oPayload.jenis_layanan || "layanan").toLowerCase().trim();
    const kodeLayanan = (oPayload.kode_layanan || "").trim();

    if (!tanggalBooking) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Tanggal booking wajib dipilih",
        datetime: formatDateSystem(),
      });
    }

    if (!kodeRuanganParam && !kodeLayanan) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Ruangan atau layanan wajib dipilih",
        datetime: formatDateSystem(),
      });
    }

    // 1. Tentukan nama hari dari tanggal_booking
    // Gunakan split YYYY-MM-DD agar terhindar dari timezone shift
    const cleanDateStr = (tanggalBooking || "").slice(0, 10);
    const [year, month, day] = cleanDateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = HARI_MAP[dateObj.getDay()];

    // 2. Ambil informasi layanan atau paket (jika ada) dan tentukan kode_ruangan
    let itemInfo = null;
    let targetKodeRuangan = kodeRuanganParam;
    let baseHarga = 0;
    let namaItem = "";

    if (kodeLayanan) {
      if (jenisLayanan === "paket") {
        const pkt = await DB("mst_paket_layanan as p")
          .leftJoin("mst_ruangan as r", "p.kode_ruangan", "r.kode_ruangan")
          .where("p.kode_paket_layanan", kodeLayanan)
          .where("p.status", "aktif")
          .select("p.kode_paket_layanan", "p.nama", "p.harga_paket", "p.kode_ruangan", "r.nama_ruangan")
          .first();

        if (pkt) {
          itemInfo = pkt;
          if (!targetKodeRuangan) targetKodeRuangan = pkt.kode_ruangan;
          baseHarga = parseFloat(pkt.harga_paket || 0);
          namaItem = pkt.nama;
        }
      } else {
        const lay = await DB("mst_layanan as l")
          .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
          .where("l.kode_layanan", kodeLayanan)
          .where("l.status", "aktif")
          .select("l.kode_layanan", "l.nama", "l.harga", "l.durasi_menit", "l.kode_ruangan", "r.nama_ruangan")
          .first();

        if (lay) {
          itemInfo = lay;
          if (!targetKodeRuangan) targetKodeRuangan = lay.kode_ruangan;
          baseHarga = parseFloat(lay.harga || 0);
          namaItem = lay.nama;
        }
      }
    }

    // Ambil info nama ruangan jika belum ada
    let namaRuanganTarget = itemInfo?.nama_ruangan || "";
    if (!namaRuanganTarget && targetKodeRuangan) {
      const rng = await DB("mst_ruangan").where("kode_ruangan", targetKodeRuangan).first();
      namaRuanganTarget = rng?.nama_ruangan || targetKodeRuangan;
    }

    // 3. Query jadwal karyawan aktif pada hari yang sesuai dan ruangan terkait
    const queryJadwal = DB("mst_jadwal_karyawan as j")
      .leftJoin("mst_karyawan as k", "j.no_sip", "k.no_sip")
      .leftJoin("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
      .where("j.status", "aktif")
      .where("j.hari", dayName);

    if (branchCode) {
      queryJadwal.where(function () {
        this.where("j.kode_cabang", branchCode).orWhere("k.kode_cabang", branchCode);
      });
    }

    if (targetKodeRuangan) {
      queryJadwal.where("j.kode_ruangan", targetKodeRuangan);
    }

    const vaJadwal = await queryJadwal
      .select(
        "j.id",
        "j.kode_jadwal",
        "j.no_sip",
        "j.is_penanggung_jawab",
        "k.nama as nama_petugas",
        "k.jabatan as jabatan_petugas",
        "j.kode_ruangan",
        "r.nama_ruangan",
        "j.hari",
        "j.jam_mulai",
        "j.jam_selesai",
        "j.kuota"
      )
      .orderBy("j.jam_mulai", "asc")
      .orderBy("j.is_penanggung_jawab", "desc");

    // 4. Group data jadwal berdasarkan SESI: kombinasi (kode_ruangan + hari + jam_mulai + jam_selesai)
    // Satu sesi waktu di ruangan yang sama adalah 1 slot, terlepas dari berapa karyawan (PJ + pendamping) yang piket
    const sessionMap = new Map();
    for (const jdw of vaJadwal) {
      const jamMulaiClean = jdw.jam_mulai ? jdw.jam_mulai.slice(0, 5) : "08:00";
      const jamSelesaiClean = jdw.jam_selesai ? jdw.jam_selesai.slice(0, 5) : "16:00";
      const sessionKey = `${jdw.kode_ruangan}_${(jdw.hari || "").toLowerCase()}_${jamMulaiClean}_${jamSelesaiClean}`;

      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          key: sessionKey,
          kode_ruangan: jdw.kode_ruangan,
          nama_ruangan: jdw.nama_ruangan || jdw.kode_ruangan,
          hari: jdw.hari,
          jam_mulai: jamMulaiClean,
          jam_selesai: jamSelesaiClean,
          rows: [],
        });
      }
      sessionMap.get(sessionKey).rows.push(jdw);
    }

    // Cek apakah tanggal booking adalah hari ini
    const todayYmd = formatDateSystem(new Date(), "yyyy-MM-dd") || new Date().toISOString().slice(0, 10);
    const isBookingToday = cleanDateStr === todayYmd;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 5. Bangun 1 slot per sesi dengan info utama Petugas Penanggung Jawab (PJ) dan kuota milik PJ
    const vaSlots = [];
    for (const session of sessionMap.values()) {
      const groupRows = session.rows;

      // Cari karyawan dengan is_penanggung_jawab === 1; fallback ke karyawan pertama jika belum ada yang di-set PJ
      const pjRow = groupRows.find((r) => r.is_penanggung_jawab == 1) || groupRows[0];
      const hasPJ = Boolean(groupRows.some((r) => r.is_penanggung_jawab == 1));

      // Identifikasi identitas PJ untuk mengecualikannya secara tegas dari daftar pendamping
      const pjNoSip = String(pjRow.no_sip || "").trim().toLowerCase();
      const pjNama = String(pjRow.nama_petugas || "").trim().toLowerCase();

      // Daftar petugas pendamping dalam sesi yang sama:
      // 1. KECUALIKAN baris yang no_sip / nama sama dengan PJ (karena PJ tidak bisa menjadi pendamping dirinya sendiri).
      // 2. DEDUPLIKASI pendamping unik (agar 1 karyawan pendamping tidak muncul berulang jika ada data kembar).
      const seenCompanion = new Set();
      if (pjNoSip) seenCompanion.add(pjNoSip);
      if (pjNama) seenCompanion.add(pjNama);

      const petugasPendamping = [];
      for (const r of groupRows) {
        if (r.kode_jadwal === pjRow.kode_jadwal) continue;
        const curNoSip = String(r.no_sip || "").trim().toLowerCase();
        const curNama = String(r.nama_petugas || "").trim().toLowerCase();

        // Kecualikan jika sama dengan PJ
        if (pjNoSip && curNoSip === pjNoSip) continue;
        if (pjNama && curNama === pjNama) continue;

        // Deduplikasi pendamping jika ada jadwal kembar
        const dedupeKey = curNoSip || curNama;
        if (dedupeKey && seenCompanion.has(dedupeKey)) continue;
        if (dedupeKey) seenCompanion.add(dedupeKey);

        petugasPendamping.push({
          kode_jadwal: r.kode_jadwal,
          no_sip: r.no_sip,
          nama_petugas: r.nama_petugas || "Petugas Medis",
          jabatan_petugas: r.jabatan_petugas || "Terapis / Petugas",
        });
      }

      // Kuota slot mengikuti kuota milik Penanggung Jawab (PJ)
      const totalKuota = parseInt(pjRow.kuota || 0, 10);

      // Hitung booking yang sudah terisi dan rentang durasi per booking untuk seluruh jadwal di sesi ini
      const allKodeJadwalInSession = groupRows.map((r) => r.kode_jadwal);

      const detailDurasiSubquery = DB("trx_detail_booking")
        .groupBy("kode_booking")
        .select("kode_booking", DB.raw("SUM(durasi_menit) as total_durasi"));

      const bookedRows = await DB("trx_booking as b")
        .leftJoin(detailDurasiSubquery.as("d"), "b.kode_booking", "d.kode_booking")
        .whereIn("b.kode_jadwal", allKodeJadwalInSession)
        .where("b.tanggal_booking", tanggalBooking)
        .whereNotIn("b.status", ["dibatalkan", "tidak_hadir"])
        .select("b.kode_booking", "b.jam_booking", DB.raw("COALESCE(d.total_durasi, 30) as durasi_menit"));

      const terisi = bookedRows.length;
      const sisaKuota = Math.max(0, totalKuota - terisi);

      // Cek apakah jam dinas shift petugas sudah terlewat atau belum dimulai untuk hari ini
      let isShiftPastToday = false;
      let isNotStartedToday = false;
      let isOngoingNow = false;

      if (isBookingToday) {
        const [startH, startM] = (session.jam_mulai || "00:00").slice(0, 5).split(":").map(Number);
        const [endH, endM] = (session.jam_selesai || "00:00").slice(0, 5).split(":").map(Number);
        const shiftStartMin = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
        const shiftEndMin = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);

        if (shiftEndMin <= nowMinutes) {
          isShiftPastToday = true;
        } else if (nowMinutes < shiftStartMin) {
          isNotStartedToday = true;
        } else {
          isOngoingNow = true;
        }
      }

      const isAvailable = sisaKuota > 0 && !isShiftPastToday;
      const bookedTimes = bookedRows
        .map((b) => (b.jam_booking ? String(b.jam_booking).slice(0, 5) : ""))
        .filter(Boolean);

      const bookedIntervals = bookedRows.map((b) => {
        const startStr = b.jam_booking ? String(b.jam_booking).slice(0, 5) : "08:00";
        const durasi = parseInt(b.durasi_menit || 30, 10);
        const [h, m] = startStr.split(":").map(Number);
        const startMin = (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 0 : m);
        const endMin = startMin + durasi;
        const endStr = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
        return {
          kode_booking: b.kode_booking,
          jam_mulai: startStr,
          durasi_menit: durasi,
          jam_selesai: endStr,
          start_minutes: startMin,
          end_minutes: endMin,
        };
      });

      vaSlots.push({
        kode_jadwal: pjRow.kode_jadwal,
        no_sip: pjRow.no_sip,
        nama_petugas: hasPJ ? pjRow.nama_petugas : (pjRow.nama_petugas || "Petugas belum ditentukan"),
        jabatan_petugas: pjRow.jabatan_petugas || "Dokter / Terapis",
        is_penanggung_jawab: pjRow.is_penanggung_jawab == 1,
        has_pj: hasPJ,
        petugas_pendamping: petugasPendamping,
        jumlah_pendamping: petugasPendamping.length,
        kode_ruangan: session.kode_ruangan,
        nama_ruangan: session.nama_ruangan,
        hari: session.hari,
        jam_mulai: session.jam_mulai,
        jam_selesai: session.jam_selesai,
        jam_booking_default: session.jam_mulai,
        kuota_total: totalKuota,
        kuota_terisi: terisi,
        sisa_kuota: sisaKuota,
        is_available: isAvailable,
        is_past_today: isShiftPastToday,
        is_not_started_today: isNotStartedToday,
        is_ongoing_now: isOngoingNow,
        booked_times: bookedTimes,
        booked_intervals: bookedIntervals,
      });
    }

    // 5. Query jadwal dokter jaga di Ruang Konsultasi (is_konsultasi = 1) pada hari yang sama
    const qDokterKonsul = DB("mst_jadwal_karyawan as j")
      .join("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
      .join("mst_karyawan as k", "j.no_sip", "k.no_sip")
      .where("r.is_konsultasi", 1)
      .where("j.hari", dayName)
      .where("j.status", "aktif");

    if (branchCode) {
      qDokterKonsul.where(function () {
        this.where("j.kode_cabang", branchCode).orWhere("k.kode_cabang", branchCode);
      });
    }

    const allKonsulStaff = await qDokterKonsul
      .select(
        "j.id",
        "j.kode_jadwal",
        "j.no_sip",
        "j.is_penanggung_jawab",
        "k.nama as nama_petugas",
        "k.nama as nama_dokter",
        "k.jabatan as jabatan_petugas",
        "j.kode_ruangan",
        "r.nama_ruangan",
        "j.hari",
        "j.jam_mulai",
        "j.jam_selesai",
        "j.kuota"
      )
      .orderBy("j.jam_mulai", "asc")
      .orderBy("j.is_penanggung_jawab", "desc");

    // Kelompokkan jadwal Ruang Konsultasi berdasarkan sesi
    const consultSessionMap = new Map();
    for (const jdw of allKonsulStaff) {
      const jamMulaiClean = jdw.jam_mulai ? jdw.jam_mulai.slice(0, 5) : "08:00";
      const jamSelesaiClean = jdw.jam_selesai ? jdw.jam_selesai.slice(0, 5) : "16:00";
      const sessionKey = `${jdw.kode_ruangan}_${(jdw.hari || "").toLowerCase()}_${jamMulaiClean}_${jamSelesaiClean}`;

      if (!consultSessionMap.has(sessionKey)) {
        consultSessionMap.set(sessionKey, {
          key: sessionKey,
          kode_ruangan: jdw.kode_ruangan,
          nama_ruangan: jdw.nama_ruangan || jdw.kode_ruangan,
          hari: jdw.hari,
          jam_mulai: jamMulaiClean,
          jam_selesai: jamSelesaiClean,
          rows: [],
        });
      }
      consultSessionMap.get(sessionKey).rows.push(jdw);
    }

    // Bangun slot Ruang Konsultasi dengan format identik
    const vaConsultSlots = [];
    for (const session of consultSessionMap.values()) {
      const groupRows = session.rows;
      const pjRow = groupRows.find((r) => r.is_penanggung_jawab == 1) || groupRows[0];
      const hasPJ = Boolean(groupRows.some((r) => r.is_penanggung_jawab == 1));

      const pjNoSip = String(pjRow.no_sip || "").trim().toLowerCase();
      const pjNama = String(pjRow.nama_petugas || "").trim().toLowerCase();

      const seenCompanion = new Set();
      if (pjNoSip) seenCompanion.add(pjNoSip);
      if (pjNama) seenCompanion.add(pjNama);

      const petugasPendamping = [];
      for (const r of groupRows) {
        if (r.kode_jadwal === pjRow.kode_jadwal) continue;
        const curNoSip = String(r.no_sip || "").trim().toLowerCase();
        const curNama = String(r.nama_petugas || "").trim().toLowerCase();

        if (pjNoSip && curNoSip === pjNoSip) continue;
        if (pjNama && curNama === pjNama) continue;

        const dedupeKey = curNoSip || curNama;
        if (dedupeKey && seenCompanion.has(dedupeKey)) continue;
        if (dedupeKey) seenCompanion.add(dedupeKey);

        petugasPendamping.push({
          kode_jadwal: r.kode_jadwal,
          no_sip: r.no_sip,
          nama_petugas: r.nama_petugas || "Petugas Medis",
          jabatan_petugas: r.jabatan_petugas || "Dokter / Perawat",
        });
      }

      const totalKuota = parseInt(pjRow.kuota || 0, 10);
      const allKodeJadwalInSession = groupRows.map((r) => r.kode_jadwal);

      const bookedRows = await DB("trx_booking as b")
        .whereIn("b.kode_jadwal", allKodeJadwalInSession)
        .where("b.tanggal_booking", tanggalBooking)
        .whereNotIn("b.status", ["dibatalkan", "tidak_hadir"])
        .select("b.kode_booking");

      const terisi = bookedRows.length;
      const sisaKuota = Math.max(0, totalKuota - terisi);

      let isShiftPastToday = false;
      let isNotStartedToday = false;
      let isOngoingNow = false;

      if (isBookingToday) {
        const [startH, startM] = (session.jam_mulai || "00:00").slice(0, 5).split(":").map(Number);
        const [endH, endM] = (session.jam_selesai || "00:00").slice(0, 5).split(":").map(Number);
        const shiftStartMin = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
        const shiftEndMin = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);

        if (shiftEndMin <= nowMinutes) {
          isShiftPastToday = true;
        } else if (nowMinutes < shiftStartMin) {
          isNotStartedToday = true;
        } else {
          isOngoingNow = true;
        }
      }

      const isAvailable = sisaKuota > 0 && !isShiftPastToday;

      vaConsultSlots.push({
        kode_jadwal: pjRow.kode_jadwal,
        no_sip: pjRow.no_sip,
        nama_petugas: hasPJ ? pjRow.nama_petugas : (pjRow.nama_petugas || "Dokter Konsultasi"),
        jabatan_petugas: pjRow.jabatan_petugas || "Dokter",
        is_penanggung_jawab: pjRow.is_penanggung_jawab == 1,
        has_pj: hasPJ,
        petugas_pendamping: petugasPendamping,
        jumlah_pendamping: petugasPendamping.length,
        kode_ruangan: session.kode_ruangan,
        nama_ruangan: session.nama_ruangan,
        hari: session.hari,
        jam_mulai: session.jam_mulai,
        jam_selesai: session.jam_selesai,
        jam_booking_default: session.jam_mulai,
        kuota_total: totalKuota,
        kuota_terisi: terisi,
        sisa_kuota: sisaKuota,
        is_available: isAvailable,
        is_past_today: isShiftPastToday,
        is_not_started_today: isNotStartedToday,
        is_ongoing_now: isOngoingNow,
        is_konsultasi: true,
      });
    }

    // Prioritaskan dokter yang bertugas di ruang konsultasi
    const onlyDoctors = allKonsulStaff.filter(
      (s) =>
        (s.jabatan_petugas || "").toLowerCase() === "dokter" ||
        (s.nama_dokter || "").toLowerCase().startsWith("dr.")
    );
    const rawDokterKonsulList = onlyDoctors.length > 0 ? onlyDoctors : allKonsulStaff;

    // Tandai status keaktifan jam dinas dokter hari ini
    const dokterKonsulList = rawDokterKonsulList.map((doc) => {
      const [endH, endM] = (doc.jam_selesai || "00:00").slice(0, 5).split(":").map(Number);
      const [startH, startM] = (doc.jam_mulai || "00:00").slice(0, 5).split(":").map(Number);
      const endMin = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);
      const startMin = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);

      const isPastToday = isBookingToday && endMin <= nowMinutes;
      const isOngoingNow = isBookingToday && nowMinutes >= startMin && nowMinutes < endMin;

      return {
        ...doc,
        is_past_today: isPastToday,
        is_ongoing_now: isOngoingNow,
      };
    });

    // 6. Kalkulasi default DP
    const dpNominal = Math.round((baseHarga * DEFAULT_DP_PERCENTAGE) / 100);

    return res.status(200).json({
      status: status.SUKSES,
      message: vaSlots.length > 0 ? "Slot jadwal ditemukan" : "Tidak ada jadwal petugas pada hari dan ruangan ini",
      datetime: formatDateSystem(),
      data: {
        item: {
          jenis_layanan: jenisLayanan,
          kode_layanan: kodeLayanan,
          nama: namaItem,
          harga: baseHarga,
          kode_ruangan: targetKodeRuangan,
          nama_ruangan: namaRuanganTarget || targetKodeRuangan,
        },
        tanggal_booking: tanggalBooking,
        hari: dayName,
        dp_percentage_default: DEFAULT_DP_PERCENTAGE,
        dp_nominal_default: dpNominal,
        slots: vaSlots,
        consult_slots: vaConsultSlots,
        dokter_konsul: dokterKonsulList,
        ruang_konsultasi: {
          kode_ruangan: allKonsulStaff[0]?.kode_ruangan || "RNG-007",
          nama_ruangan: allKonsulStaff[0]?.nama_ruangan || "Ruang Konsultasi",
        },
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Terjadi kesalahan saat memuat slot booking",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_slots.js",
      func: "get_slots",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
