/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_create.js
 * @description Endpoint untuk membuat transaksi booking/reservasi baru (Mendukung Multi-Layanan)
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
  const branchCode = getBranchScope(req, oPayload.kode_cabang) || req?.auth?.kode_cabang || "CBG-001";

  try {
    const noRm = (oPayload.no_rm || "").trim();
    const kodeJadwal = (oPayload.kode_jadwal || "").trim();
    const tanggalBooking = (oPayload.tanggal_booking || "").trim();
    let jamBooking = (oPayload.jam_booking || "").trim();
    const catatanPasien = (oPayload.catatan_pasien || "").trim() || null;
    const dpNominal = parseFloat(oPayload.dp_nominal ?? 0);
    const metodePembayaranDp = (oPayload.metode_pembayaran_dp || "").toLowerCase().trim();
    const konfirmasiDpDiterima = oPayload.konfirmasi_dp_diterima === true || oPayload.konfirmasi_dp_diterima === "true" || oPayload.konfirmasi_dp_diterima === 1;
    const alasanBebasDp = (oPayload.alasan_bebas_dp || "").trim();
    const sumber = (oPayload.sumber || "staff").toLowerCase().trim();
    let kodeRuangan = (oPayload.kode_ruangan || "").trim();

    // Normalisasi Items (Bisa dari array oPayload.items atau single jenis_layanan + kode_layanan)
    let rawItems = Array.isArray(oPayload.items) ? oPayload.items : [];
    if (rawItems.length === 0 && oPayload.kode_layanan) {
      rawItems.push({
        jenis_layanan: oPayload.jenis_layanan || "layanan",
        kode_layanan: oPayload.kode_layanan,
        nama_layanan: oPayload.nama_layanan,
        harga: oPayload.harga,
        durasi_menit: oPayload.durasi_menit,
      });
    }

    // 1. Validasi Input Dasar
    if (!noRm) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Nomor RM pasien wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    if (rawItems.length === 0) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Pilih minimal satu layanan atau paket perawatan",
        datetime: formatDateSystem(),
      });
    }

    if (!kodeJadwal) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Slot jadwal petugas wajib dipilih",
        datetime: formatDateSystem(),
      });
    }

    if (!tanggalBooking) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Tanggal booking wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const clinicTz = oPayload.tz || "Asia/Jakarta";
    const cleanDateStr = (tanggalBooking || "").slice(0, 10);
    const todayYmd = formatDateSystem(new Date(), "yyyy-MM-dd", clinicTz) || new Date().toISOString().slice(0, 10);

    if (cleanDateStr < todayYmd) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Tanggal booking (${cleanDateStr}) tidak dapat memilih tanggal di masa lalu`,
        datetime: formatDateSystem(),
      });
    }

    // 2. Validasi Pasien
    const pasien = await DB("mst_pasien")
      .where("no_rm", noRm)
      .where("status", "aktif")
      .first();

    if (!pasien) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: `Pasien dengan Nomor RM ${noRm} tidak ditemukan atau nonaktif`,
        datetime: formatDateSystem(),
      });
    }

    // 3. Validasi Jadwal Karyawan
    const jadwal = await DB("mst_jadwal_karyawan")
      .where("kode_jadwal", kodeJadwal)
      .where("status", "aktif")
      .first();

    if (!jadwal) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: `Jadwal ${kodeJadwal} tidak ditemukan atau nonaktif`,
        datetime: formatDateSystem(),
      });
    }

    if (!kodeRuangan) {
      kodeRuangan = jadwal.kode_ruangan;
    }

    // 4. Validasi & Fetch Detail Semua Item Layanan / Paket
    const validatedItems = [];
    let calculatedTotalBiaya = 0;
    let totalDurasiMenit = 0;

    for (const item of rawItems) {
      const jns = (item.jenis_layanan || item.jenis || "layanan").toLowerCase();
      const kd = (item.kode_layanan || "").trim();

      if (jns === "klaim_paket" || item.is_klaim === true || item.kode_detail_kepemilikan_paket_layanan) {
        const kodeKpl = (item.kode_kepemilikan_paket_layanan || item.kode_kepemilikan || "").trim();
        const kodeDkpl = (item.kode_detail_kepemilikan_paket_layanan || "").trim();

        // Cari data header kepemilikan paket pasien
        let kpl = null;
        if (kodeKpl) {
          kpl = await DB("trx_kepemilikan_paket_layanan")
            .where("kode_kepemilikan_paket_layanan", kodeKpl)
            .where("no_rm", noRm)
            .first();
        } else if (kodeDkpl) {
          const detailRow = await DB("trx_detail_kepemilikan_paket_layanan")
            .where("kode_detail_kepemilikan_paket_layanan", kodeDkpl)
            .first();
          if (detailRow) {
            kpl = await DB("trx_kepemilikan_paket_layanan")
              .where("kode_kepemilikan_paket_layanan", detailRow.kode_kepemilikan_paket_layanan)
              .where("no_rm", noRm)
              .first();
          }
        }

        if (!kpl) {
          return res.status(404).json({
            status: status.BAD_REQUEST,
            message: `Data kepemilikan paket ${kodeKpl || kodeDkpl} tidak ditemukan untuk pasien ${noRm}`,
            datetime: formatDateSystem(),
          });
        }

        if (kpl.status !== "aktif") {
          return res.status(422).json({
            status: status.BAD_REQUEST,
            message: `Paket ${kpl.kode_kepemilikan_paket_layanan} sudah ${kpl.status}, sesi tidak dapat digunakan`,
            datetime: formatDateSystem(),
          });
        }

        // Validasi tanggal booking terhadap tanggal_expired paket
        if (kpl.tanggal_expired) {
          const tglExpStr = kpl.tanggal_expired instanceof Date
            ? kpl.tanggal_expired.toISOString().slice(0, 10)
            : String(kpl.tanggal_expired).slice(0, 10);

          if (tanggalBooking > tglExpStr) {
            return res.status(422).json({
              status: status.BAD_REQUEST,
              message: `Paket telah kedaluwarsa pada ${tglExpStr}. Tanggal janji temu (${tanggalBooking}) tidak valid untuk klaim sesi paket ini.`,
              datetime: formatDateSystem(),
            });
          }
        }

        // Cari detail sesi tindakan dalam paket
        let dkpl = null;
        if (kodeDkpl) {
          dkpl = await DB("trx_detail_kepemilikan_paket_layanan")
            .where("kode_detail_kepemilikan_paket_layanan", kodeDkpl)
            .where("kode_kepemilikan_paket_layanan", kpl.kode_kepemilikan_paket_layanan)
            .first();
        } else if (kd) {
          dkpl = await DB("trx_detail_kepemilikan_paket_layanan")
            .where("kode_kepemilikan_paket_layanan", kpl.kode_kepemilikan_paket_layanan)
            .where("kode_layanan", kd)
            .whereRaw("sesi_total - sesi_terpakai > 0")
            .first();
        }

        if (!dkpl) {
          return res.status(422).json({
            status: status.BAD_REQUEST,
            message: `Sesi treatment untuk ${kd || kodeDkpl} tidak ditemukan dalam paket pasien`,
            datetime: formatDateSystem(),
          });
        }

        const sisaSesiReal = Math.max(0, parseInt(dkpl.sesi_total || 0, 10) - parseInt(dkpl.sesi_terpakai || 0, 10));
        if (sisaSesiReal <= 0) {
          return res.status(422).json({
            status: status.BAD_REQUEST,
            message: `Sisa sesi untuk treatment ini sudah habis`,
            datetime: formatDateSystem(),
          });
        }

        // Validasi overbooking sesi aktif lain
        const activeBookingsCount = await DB("trx_detail_booking as db")
          .join("trx_booking as b", "db.kode_booking", "b.kode_booking")
          .where("db.kode_detail_kepemilikan_paket_layanan", dkpl.kode_detail_kepemilikan_paket_layanan)
          .whereIn("b.status", ["dikonfirmasi", "menunggu_pembayaran"])
          .count("db.id as total")
          .first();

        const terbooking = parseInt(activeBookingsCount?.total || 0, 10);
        const sesiTersedia = sisaSesiReal - terbooking;

        if (sesiTersedia <= 0) {
          return res.status(422).json({
            status: status.BAD_REQUEST,
            message: `Sesi treatment ini sudah dijadwalkan pada booking aktif lain. Sisa sesi yang tersedia untuk dibooking: 0.`,
            datetime: formatDateSystem(),
          });
        }

        // Ambil info master layanan
        const lay = await DB("mst_layanan")
          .where("kode_layanan", dkpl.kode_layanan)
          .first();

        const durasiItem = lay?.durasi_menit || item.durasi_menit || 45;
        totalDurasiMenit += durasiItem;
        // Klaim sesi paket berbiaya Rp 0
        calculatedTotalBiaya += 0;

        const namaItem = lay?.nama
          ? `${lay.nama} (Klaim Sesi Paket)`
          : `Klaim Sesi Paket (${dkpl.kode_layanan})`;

        validatedItems.push({
          jenis_layanan: "klaim_paket",
          jenis_item: "klaim_paket",
          kode_layanan: dkpl.kode_layanan,
          nama_layanan: namaItem,
          harga: 0,
          durasi_menit: durasiItem,
          kode_kepemilikan_paket_layanan: kpl.kode_kepemilikan_paket_layanan,
          kode_detail_kepemilikan_paket_layanan: dkpl.kode_detail_kepemilikan_paket_layanan,
        });
      } else if (jns === "paket") {
        const pkt = await DB("mst_paket_layanan")
          .where("kode_paket_layanan", kd)
          .where("status", "aktif")
          .first();

        if (!pkt) {
          return res.status(404).json({
            status: status.BAD_REQUEST,
            message: `Paket layanan ${kd} tidak ditemukan atau nonaktif`,
            datetime: formatDateSystem(),
          });
        }

        const hargaPkt = parseFloat(pkt.harga_paket || 0);
        const durasiPkt = item.durasi_menit || 60;
        calculatedTotalBiaya += hargaPkt;
        totalDurasiMenit += durasiPkt;
        validatedItems.push({
          jenis_layanan: "paket",
          jenis_item: "paket_baru",
          kode_layanan: pkt.kode_paket_layanan,
          nama_layanan: pkt.nama,
          harga: hargaPkt,
          durasi_menit: durasiPkt,
          kode_kepemilikan_paket_layanan: null,
          kode_detail_kepemilikan_paket_layanan: null,
        });
      } else {
        const lay = await DB("mst_layanan")
          .where("kode_layanan", kd)
          .where("status", "aktif")
          .first();

        if (!lay) {
          return res.status(404).json({
            status: status.BAD_REQUEST,
            message: `Layanan ${kd} tidak ditemukan atau nonaktif`,
            datetime: formatDateSystem(),
          });
        }

        const hargaLay = parseFloat(lay.harga || 0);
        const durasiLay = lay.durasi_menit || 30;
        calculatedTotalBiaya += hargaLay;
        totalDurasiMenit += durasiLay;
        validatedItems.push({
          jenis_layanan: "layanan",
          jenis_item: "layanan_baru",
          kode_layanan: lay.kode_layanan,
          nama_layanan: lay.nama,
          harga: hargaLay,
          durasi_menit: durasiLay,
          kode_kepemilikan_paket_layanan: null,
          kode_detail_kepemilikan_paket_layanan: null,
        });
      }
    }

    // 4b. Validasi Jadwal Dokter Konsultasi (Jika Booking Membutuhkan Konsultasi Dokter)
    const anyWajibKonsulCheck = validatedItems.some((it) => it.is_wajib_konsul);
    let isBookingButuhKonsulCheck = 0;
    if (anyWajibKonsulCheck) {
      isBookingButuhKonsulCheck = 1;
    } else if (oPayload.butuh_konsul !== undefined && oPayload.butuh_konsul !== null) {
      isBookingButuhKonsulCheck = (oPayload.butuh_konsul === true || oPayload.butuh_konsul === 1 || oPayload.butuh_konsul === "1" || oPayload.butuh_konsul === "true") ? 1 : 0;
    }

    // cleanDateStr & todayYmd sudah didefinisikan pada validasi input di awal
    const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    const [year, month, day] = cleanDateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = HARI_MAP[dateObj.getDay()];

    let dokterKonsulList = [];
    if (isBookingButuhKonsulCheck === 1) {
      const qDoc = DB("mst_jadwal_karyawan as j")
        .join("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
        .join("mst_karyawan as k", "j.no_sip", "k.no_sip")
        .where("r.is_konsultasi", 1)
        .where("j.hari", dayName)
        .where("j.status", "aktif");

      if (branchCode) {
        qDoc.where(function () {
          this.where("j.kode_cabang", branchCode).orWhere("k.kode_cabang", branchCode);
        });
      }

      const allKonsul = await qDoc.select(
        "j.kode_jadwal",
        "j.jam_mulai",
        "j.jam_selesai",
        "k.nama as nama_dokter",
        "k.jabatan as jabatan_petugas"
      );

      const onlyDoctors = allKonsul.filter(
        (s) =>
          (s.jabatan_petugas || "").toLowerCase() === "dokter" ||
          (s.nama_dokter || "").toLowerCase().startsWith("dr.")
      );
      dokterKonsulList = onlyDoctors.length > 0 ? onlyDoctors : allKonsul;

      if (dokterKonsulList.length === 0) {
        const HARI_LABEL = {
          senin: "Senin",
          selasa: "Selasa",
          rabu: "Rabu",
          kamis: "Kamis",
          jumat: "Jumat",
          sabtu: "Sabtu",
          minggu: "Minggu",
        };
        const namaHariStr = HARI_LABEL[dayName] || dayName;
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `Tidak ada dokter jaga di Ruang Konsultasi pada hari ${namaHariStr} (${tanggalBooking}). Silakan ubah tanggal booking ke hari praktek dokter atau pilih alur 'Langsung Tindakan' jika tindakan memungkinkan tanpa konsultasi.`,
          datetime: formatDateSystem(),
        });
      }
    }

    // 4c. Validasi Jam Janji Temu Spesifik
    if (!jamBooking) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Jam janji temu spesifik wajib dipilih",
        datetime: formatDateSystem(),
      });
    }

    if (jamBooking.length === 5) {
      jamBooking = `${jamBooking}:00`;
    }

    const jStart = (jadwal.jam_mulai || "08:00:00").slice(0, 5);
    const jEnd = (jadwal.jam_selesai || "16:00:00").slice(0, 5);
    let bTime = jamBooking.slice(0, 5);

    const [jStartH, jStartM] = jStart.split(":").map(Number);
    const [jEndH, jEndM] = jEnd.split(":").map(Number);
    const jStartMinutes = jStartH * 60 + jStartM;
    const jEndMinutes = jEndH * 60 + jEndM;

    const [bH, bM] = bTime.split(":").map(Number);
    const bMinutesRaw = (isNaN(bH) ? 8 : bH) * 60 + (isNaN(bM) ? 0 : bM);

    // 1. Batasi rentang jam booking di luar jam kerja shift petugas sebelum pembulatan
    if (bMinutesRaw < jStartMinutes || bMinutesRaw >= jEndMinutes) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Jam booking (${bTime} WIB) berada di luar jam kerja shift petugas (${jStart} - ${jEnd} WIB)`,
        datetime: formatDateSystem(),
      });
    }

    // 1b. Validasi waktu saat ini: jika booking hari ini, tolak jam yang sudah lewat waktu saat ini
    const isTodayBooking = cleanDateStr === todayYmd;
    if (isTodayBooking) {
      const nowTimeStr = formatDateSystem(new Date(), "HH:mm", clinicTz);
      const [nowH, nowM] = nowTimeStr.split(":").map(Number);
      const nowMinutes = nowH * 60 + nowM;

      // Buffer waktu persiapan minimal sebelum booking (menit)
      // TODO: Diskusikan dengan manajemen operasional klinik jika membutuhkan buffer persiapan booking (misal 30-60 menit)
      const BOOKING_LEAD_TIME_BUFFER_MINUTES = 0;

      if (bMinutesRaw < nowMinutes + BOOKING_LEAD_TIME_BUFFER_MINUTES) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `Jam booking (${bTime} WIB) tidak dapat dipilih karena sudah melewati waktu saat ini (${nowTimeStr} WIB) untuk reservasi hari ini.`,
          datetime: formatDateSystem(),
        });
      }
    }

    // Bulatkan jam_booking ke interval durasi layanan terdekat berdasarkan shift sesi
    const stepInterval = totalDurasiMenit > 0 ? totalDurasiMenit : 30;
    const diffFromStart = bMinutesRaw - jStartMinutes;
    const roundedStep = Math.round(diffFromStart / stepInterval);
    const bMinutes = jStartMinutes + roundedStep * stepInterval;
    bTime = `${String(Math.floor(bMinutes / 60)).padStart(2, "0")}:${String(bMinutes % 60).padStart(2, "0")}`;
    jamBooking = `${bTime}:00`;

    // Pastikan hasil pembulatan jam booking juga tidak berada di masa lalu untuk reservasi hari ini
    if (isTodayBooking) {
      const nowTimeStr = formatDateSystem(new Date(), "HH:mm", clinicTz);
      const [nowH, nowM] = nowTimeStr.split(":").map(Number);
      const nowMinutes = nowH * 60 + nowM;
      const BOOKING_LEAD_TIME_BUFFER_MINUTES = 0;

      if (bMinutes < nowMinutes + BOOKING_LEAD_TIME_BUFFER_MINUTES) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `Jam booking (${bTime} WIB) tidak dapat dipilih karena sudah melewati waktu saat ini (${nowTimeStr} WIB) untuk reservasi hari ini.`,
          datetime: formatDateSystem(),
        });
      }
    }

    // Validasi jam booking terhadap shift dokter konsultasi (jika alur butuh konsultasi)
    if (isBookingButuhKonsulCheck === 1 && dokterKonsulList.length > 0) {
      const docStartMinutes = Math.min(...dokterKonsulList.map((d) => {
        const [dh, dm] = (d.jam_mulai || "08:00").slice(0, 5).split(":").map(Number);
        return dh * 60 + dm;
      }));
      const docEndMinutes = Math.max(...dokterKonsulList.map((d) => {
        const [dh, dm] = (d.jam_selesai || "20:00").slice(0, 5).split(":").map(Number);
        return dh * 60 + dm;
      }));

      const docStartStr = `${String(Math.floor(docStartMinutes / 60)).padStart(2, "0")}:${String(docStartMinutes % 60).padStart(2, "0")}`;
      const docEndStr = `${String(Math.floor(docEndMinutes / 60)).padStart(2, "0")}:${String(docEndMinutes % 60).padStart(2, "0")}`;
      const dokterNames = dokterKonsulList.map((d) => d.nama_dokter).join(", ");

      // Edge case: tidak ada irisan sama sekali antara shift terapis dan dokter
      const overlapStart = Math.max(jStartMinutes, docStartMinutes);
      const overlapEnd = Math.min(jEndMinutes, docEndMinutes);
      if (overlapStart >= overlapEnd) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `Tidak ada irisan jam jaga antara dokter konsultasi (${docStartStr} - ${docEndStr} WIB) dan petugas treatment (${jStart} - ${jEnd} WIB) pada hari ini. Silakan ubah tanggal booking atau pilih alur 'Langsung Tindakan'.`,
          datetime: formatDateSystem(),
        });
      }

      // Validasi apakah jam janji temu treatment berada di dalam window jaga dokter
      if (bMinutes < docStartMinutes || bMinutes >= docEndMinutes) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `Jam booking (${bTime} WIB) tidak valid untuk alur konsultasi dokter. Dokter jaga (${dokterNames}) bertugas pada pukul ${docStartStr} - ${docEndStr} WIB. Silakan pilih jam di antara ${docStartStr} s/d ${jEnd} WIB.`,
          datetime: formatDateSystem(),
        });
      }
    }

    if (bTime < jStart || bTime >= jEnd) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Jam booking (${bTime} WIB) berada di luar jam kerja shift petugas (${jStart} - ${jEnd} WIB)`,
        datetime: formatDateSystem(),
      });
    }

    const endTreatmentMinutes = bMinutes + totalDurasiMenit;

    if (endTreatmentMinutes > jEndMinutes) {
      const endTreatmentHour = `${String(Math.floor(endTreatmentMinutes / 60)).padStart(2, "0")}:${String(endTreatmentMinutes % 60).padStart(2, "0")}`;
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: `Waktu tindakan selesai (${endTreatmentHour} WIB) melewati batas akhir shift petugas (${jEnd} WIB). Total durasi tindakan: ${totalDurasiMenit} menit.`,
        datetime: formatDateSystem(),
      });
    }

    // Cari semua jadwal dalam sesi yang sama (ruangan, hari, jam_mulai, jam_selesai)
    const sessionSchedules = await DB("mst_jadwal_karyawan")
      .where("kode_ruangan", jadwal.kode_ruangan)
      .where("hari", jadwal.hari)
      .where("jam_mulai", jadwal.jam_mulai)
      .where("jam_selesai", jadwal.jam_selesai)
      .where("status", "aktif")
      .select("kode_jadwal");
    const allKodeJadwalInSession = sessionSchedules.map((s) => s.kode_jadwal);

    // Validasi apakah rentang waktu tindakan bertabrakan dengan janji temu pasien lain pada sesi yang sama
    const detailDurasiSubquery = DB("trx_detail_booking")
      .groupBy("kode_booking")
      .select("kode_booking", DB.raw("SUM(durasi_menit) as total_durasi"));

    const existingBookings = await DB("trx_booking as b")
      .leftJoin(detailDurasiSubquery.as("d"), "b.kode_booking", "d.kode_booking")
      .whereIn("b.kode_jadwal", allKodeJadwalInSession.length > 0 ? allKodeJadwalInSession : [kodeJadwal])
      .where("b.tanggal_booking", tanggalBooking)
      .whereNotIn("b.status", ["dibatalkan", "tidak_hadir"])
      .select("b.kode_booking", "b.jam_booking", DB.raw("COALESCE(d.total_durasi, 30) as durasi_menit"));

    for (const eb of existingBookings) {
      const eStartStr = eb.jam_booking ? String(eb.jam_booking).slice(0, 5) : "08:00";
      const [eh, em] = eStartStr.split(":").map(Number);
      const eStartMin = (isNaN(eh) ? 8 : eh) * 60 + (isNaN(em) ? 0 : em);
      const eDurasi = parseInt(eb.durasi_menit || 30, 10);
      const eEndMin = eStartMin + eDurasi;

      // Dua rentang [bMinutes, endTreatmentMinutes) dan [eStartMin, eEndMin) saling bertabrakan jika:
      // bMinutes < eEndMin && eStartMin < endTreatmentMinutes
      if (bMinutes < eEndMin && eStartMin < endTreatmentMinutes) {
        const eEndStr = `${String(Math.floor(eEndMin / 60)).padStart(2, "0")}:${String(eEndMin % 60).padStart(2, "0")}`;
        const newEndStr = `${String(Math.floor(endTreatmentMinutes / 60)).padStart(2, "0")}:${String(endTreatmentMinutes % 60).padStart(2, "0")}`;
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: `Waktu tindakan yang dipilih (${bTime} - ${newEndStr} WIB) bertabrakan dengan janji temu pasien lain (${eStartStr} - ${eEndStr} WIB) pada sesi ini. Silakan pilih jam yang lain.`,
          datetime: formatDateSystem(),
        });
      }
    }

    // 5. Validasi Aturan Bisnis Uang Muka (DP) & Anti-Spam Booking
    const hasKlaim = validatedItems.some((it) => it.jenis_item === "klaim_paket");
    const hasBaru = validatedItems.some((it) => it.jenis_item !== "klaim_paket");
    const finalDpNominal = (!hasBaru && hasKlaim) ? 0 : (isNaN(dpNominal) ? 0 : Math.max(0, dpNominal));

    if (finalDpNominal > 0) {
      if (!konfirmasiDpDiterima) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Uang muka (DP) wajib dikonfirmasi telah diterima dari pasien untuk mengunci jadwal booking.",
          datetime: formatDateSystem(),
        });
      }
      const allowedMethods = ["cash", "transfer", "qris"];
      if (!metodePembayaranDp || !allowedMethods.includes(metodePembayaranDp)) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Metode pembayaran DP wajib dipilih (Cash, Transfer, atau QRIS).",
          datetime: formatDateSystem(),
        });
      }
    } else {
      let effectiveAlasan = alasanBebasDp;
      if (!effectiveAlasan && !hasBaru && hasKlaim) {
        effectiveAlasan = "Klaim Paket (Kepemilikan Aktif)";
      }
      if (!effectiveAlasan) {
        return res.status(422).json({
          status: status.BAD_REQUEST,
          message: "Alasan bebas DP wajib dipilih untuk reservasi tanpa uang muka.",
          datetime: formatDateSystem(),
        });
      }
    }

    // 6. Eksekusi Atomic Transaction untuk validasi kuota + insert trx_booking + trx_detail_booking
    let newBooking = null;

    await DB.transaction(async (trx) => {
      // Periksa kuota tersisa
      const countRes = await trx("trx_booking")
        .where("kode_jadwal", kodeJadwal)
        .where("tanggal_booking", tanggalBooking)
        .whereNotIn("status", ["dibatalkan", "tidak_hadir"])
        .count("id as total")
        .first();

      const terisi = parseInt(countRes?.total || 0, 10);
      const totalKuota = parseInt(jadwal.kuota || 0, 10);

      if (terisi >= totalKuota) {
        const err = new Error(
          `Kuota jadwal pada tanggal ${tanggalBooking} sudah penuh (${terisi}/${totalKuota})`
        );
        err.statusCode = 422;
        throw err;
      }

      // Generate Kode Booking: BKG-YYYYMMDD-001
      const now = new Date();
      const todayYmd = now.toISOString().slice(0, 10);
      const todayStr = todayYmd.replace(/-/g, "");
      const prefixBooking = `BKG-${todayStr}-`;

      const lastBooking = await trx("trx_booking")
        .where("kode_booking", "like", `${prefixBooking}%`)
        .orderBy("id", "desc")
        .first();

      let nextSeq = 1;
      if (lastBooking && lastBooking.kode_booking) {
        const parts = lastBooking.kode_booking.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) {
          nextSeq = num + 1;
        }
      }
      const cKodeBooking = `${prefixBooking}${String(nextSeq).padStart(3, "0")}`;
      const nowFormatted = formatDateSystem();

      const firstItem = validatedItems[0] || {};
      let headerJenisLayanan = firstItem.jenis_layanan || "layanan";
      if (hasKlaim && hasBaru) {
        headerJenisLayanan = "campuran";
      } else if (hasKlaim) {
        headerJenisLayanan = "klaim_paket";
      }

      let savedMetodeDp = null;
      let savedAlasanBebasDp = null;

      if (finalDpNominal > 0) {
        savedMetodeDp = metodePembayaranDp;
      } else {
        savedAlasanBebasDp = alasanBebasDp || ((!hasBaru && hasKlaim) ? "Klaim Paket (Kepemilikan Aktif)" : "Bebas DP");
      }

      // Tentukan status butuh_konsul untuk seluruh booking
      let isBookingButuhKonsul = 0;
      const anyWajibKonsul = rawItems.some((it) => {
        const wk = (it.wajib_konsultasi || "").toLowerCase();
        const tp = (it.tipe || "").toUpperCase();
        return wk === "wajib" || tp === "MEDICAL TREATMENT";
      });

      if (anyWajibKonsul) {
        isBookingButuhKonsul = 1;
      } else if (oPayload.butuh_konsul !== undefined && oPayload.butuh_konsul !== null) {
        isBookingButuhKonsul = (oPayload.butuh_konsul === true || oPayload.butuh_konsul === 1 || oPayload.butuh_konsul === "1" || oPayload.butuh_konsul === "true") ? 1 : 0;
      }

      const oInsertData = {
        kode_cabang: branchCode,
        kode_booking: cKodeBooking,
        no_rm: noRm,
        kode_ruangan: kodeRuangan,
        jenis_layanan: headerJenisLayanan,
        kode_layanan: firstItem.kode_layanan || null,
        kode_jadwal: kodeJadwal,
        tanggal_booking: tanggalBooking,
        jam_booking: jamBooking,
        catatan_pasien: catatanPasien,
        total_biaya: calculatedTotalBiaya,
        status: "dikonfirmasi",
        dp_nominal: finalDpNominal,
        dp_status: "sudah_bayar",
        dp_dibayar_at: nowFormatted,
        metode_pembayaran_dp: savedMetodeDp,
        alasan_bebas_dp: savedAlasanBebasDp,
        sumber: ["staff", "whatsapp"].includes(sumber) ? sumber : "staff",
        butuh_konsul: isBookingButuhKonsul,
        tz: oPayload.tz || "Asia/Jakarta",
        created_by: username,
        created_at: nowFormatted,
        updated_by: username,
        updated_at: nowFormatted,
      };

      const [insertedId] = await trx("trx_booking").insert(oInsertData);

      // Insert ke trx_detail_booking
      const detailInserts = [];
      let itemSeq = 1;
      for (const item of validatedItems) {
        const cKodeDetail = `DBKG-${todayStr}-${String(nextSeq).padStart(3, "0")}-${String(itemSeq).padStart(2, "0")}`;
        itemSeq++;
        detailInserts.push({
          kode_detail_booking: cKodeDetail,
          kode_booking: cKodeBooking,
          jenis_layanan: item.jenis_layanan,
          jenis_item: item.jenis_item || "layanan_baru",
          kode_layanan: item.kode_layanan,
          kode_kepemilikan_paket_layanan: item.kode_kepemilikan_paket_layanan || null,
          kode_detail_kepemilikan_paket_layanan: item.kode_detail_kepemilikan_paket_layanan || null,
          nama_layanan: item.nama_layanan,
          harga: item.harga,
          durasi_menit: item.durasi_menit,
          butuh_konsul: isBookingButuhKonsul,
          tz: oPayload.tz || "Asia/Jakarta",
          created_by: username,
          created_at: nowFormatted,
          updated_by: username,
          updated_at: nowFormatted,
        });
      }

      if (detailInserts.length > 0) {
        await trx("trx_detail_booking").insert(detailInserts);
      }

      newBooking = {
        id: insertedId,
        ...oInsertData,
        items: detailInserts,
      };

      await ChangesLog(
        {
          description: `Membuat booking baru ${cKodeBooking}`,
          tableName: "trx_booking",
          referenceCode: cKodeBooking,
          action: "create",
          dataAfter: newBooking,
          user: username,
          tz: oPayload.tz || "Asia/Jakarta",
        },
        trx
      );
    });

    return res.status(201).json({
      status: status.SUKSES,
      message: `Booking berhasil dibuat dengan kode ${newBooking.kode_booking}`,
      datetime: formatDateSystem(),
      data: newBooking,
    });
  } catch (error) {
    if (error.statusCode === 422) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: error.message,
        datetime: formatDateSystem(),
      });
    }

    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Gagal membuat booking baru",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_create.js",
      func: "create_booking",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
