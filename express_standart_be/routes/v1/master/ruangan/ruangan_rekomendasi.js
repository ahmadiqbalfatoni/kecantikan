/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file ruangan_rekomendasi.js
 * @description Endpoint opsi rekomendasi & pemrosesan rekomendasi treatment (layanan & paket) + produk (produk & paket produk) dari ruang konsultasi
 *
 * @author Antigravity
 * @created 2026-08-27
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";
import { syncRekamMedisPerAntrian } from "./rekam_medis_service.js";
import { terbitkanAntreanLanjutanRuangan } from "./antrian_lanjutan_service.js";
import { syncCompletedItemsToKasirDraft } from "../kasir/kasir_sync_service.js";

const router = express.Router();

/**
 * ─── 1. FETCH OPSIONAL REKOMENDASI (LAYANAN, PAKET LAYANAN, PRODUK, PAKET PRODUK) ───
 */
const handleGetRekomendasiOptions = async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const explicitCabang = oPayload.kode_cabang || req?.headers?.["x-kode-cabang"] || null;
  const branchCode = getBranchScope(req, explicitCabang) || explicitCabang || req?.auth?.kode_cabang || "CBG-001";

  try {
    const host = req.get("host");
    const protocol = req.protocol || "http";
    const assetsBase = `${protocol}://${host}`;

    // A. Fetch Layanan Biasa (status aktif, kecualikan layanan di ruang konsultasi)
    const qLayanan = DB("mst_layanan as l")
      .leftJoin("mst_kategori_layanan as k", "l.kode_kategori_layanan", "k.kode_kategori_layanan")
      .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
      .where("l.status", "aktif")
      .where(function () {
        this.whereNull("r.is_konsultasi").orWhere("r.is_konsultasi", 0);
      })
      .whereRaw("(r.nama_ruangan IS NULL OR LOWER(r.nama_ruangan) NOT LIKE '%konsultasi%')");

    if (branchCode) {
      qLayanan.where(function () {
        this.where("l.kode_cabang", branchCode).orWhere("r.kode_cabang", branchCode);
      });
    }

    const vaLayanan = await qLayanan
      .select(
        "l.kode_layanan",
        "l.kode_kategori_layanan",
        "k.nama as nama_kategori",
        "l.nama",
        "l.harga",
        "l.durasi_menit",
        "l.wajib_konsultasi",
        "l.tipe",
        "l.foto",
        "l.kode_ruangan",
        "r.nama_ruangan as nama_ruangan"
      )
      .orderBy("r.nama_ruangan", "asc")
      .orderBy("l.nama", "asc");

    // B. Fetch Paket Layanan (status aktif, kecualikan paket di ruang konsultasi)
    const qPaket = DB("mst_paket_layanan as p")
      .leftJoin("mst_ruangan as r", "p.kode_ruangan", "r.kode_ruangan")
      .where("p.status", "aktif")
      .where(function () {
        this.whereNull("r.is_konsultasi").orWhere("r.is_konsultasi", 0);
      })
      .whereRaw("(r.nama_ruangan IS NULL OR LOWER(r.nama_ruangan) NOT LIKE '%konsultasi%')");

    if (branchCode) {
      qPaket.where(function () {
        this.where("p.kode_cabang", branchCode).orWhere("r.kode_cabang", branchCode);
      });
    }

    const vaPaketLayanan = await qPaket
      .select(
        "p.kode_paket_layanan",
        "p.nama",
        "p.harga_paket as harga",
        "p.masa_berlaku_hari",
        "p.tipe",
        "p.foto",
        "p.kode_ruangan",
        "r.nama_ruangan as nama_ruangan"
      )
      .orderBy("r.nama_ruangan", "asc")
      .orderBy("p.nama", "asc");

    // C. Fetch Produk (status aktif)
    const qProduk = DB("mst_produk as pr")
      .leftJoin("mst_kategori_produk as kp", "pr.kode_kategori_produk", "kp.kode_kategori_produk")
      .where("pr.status", "aktif")
      .whereRaw("pr.kode_produk NOT LIKE 'CUSTOM-%' AND pr.kode_produk NOT LIKE 'CST-%'");

    if (branchCode) {
      qProduk.where("pr.kode_cabang", branchCode);
    }

    const vaProduk = await qProduk
      .select(
        "pr.kode_produk",
        "pr.kode_kategori_produk",
        "kp.nama as nama_kategori",
        "pr.nama",
        "pr.satuan",
        "pr.foto",
        "pr.harga_jual as harga",
        "pr.stok_minimum"
      )
      .orderBy("pr.nama", "asc");

    // D. Fetch Paket Produk (status aktif)
    const qPaketProduk = DB("mst_paket_produk as pp").where("pp.status", "aktif");
    if (branchCode) {
      qPaketProduk.where("pp.kode_cabang", branchCode);
    }

    const vaPaketProduk = await qPaketProduk
      .select(
        "pp.kode_paket_produk",
        "pp.nama",
        "pp.foto",
        "pp.harga_paket as harga",
        "pp.masa_berlaku_hari"
      )
      .orderBy("pp.nama", "asc");

    // Tentukan hari & waktu saat ini (WIB / sistem)
    const tz = oPayload.tz || "Asia/Jakarta";
    const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    const todayYmd = new Date().toISOString().slice(0, 10);
    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");
    const [year, month, day] = todayStr.split("-").map(Number);
    const todayDay = HARI_MAP[new Date(year, month - 1, day).getDay()];

    const nowTimeStr = new Date().toLocaleTimeString("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [nowH, nowM] = nowTimeStr.split(":").map(Number);
    const nowMinutes = (isNaN(nowH) ? 0 : nowH) * 60 + (isNaN(nowM) ? 0 : nowM);

    // Fetch active schedules for today
    const qSchedules = DB("mst_jadwal_karyawan as j")
      .leftJoin("mst_karyawan as k", "j.no_sip", "k.no_sip")
      .leftJoin("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
      .where("j.status", "aktif")
      .where("j.hari", todayDay);

    if (branchCode) {
      qSchedules.where(function () {
        this.where("j.kode_cabang", branchCode).orWhere("k.kode_cabang", branchCode);
      });
    }

    const activeSchedulesToday = await qSchedules
      .select(
        "j.id",
        "j.kode_jadwal",
        "j.kode_ruangan",
        "r.nama_ruangan",
        "j.no_sip",
        "j.is_penanggung_jawab",
        "j.jam_mulai",
        "j.jam_selesai",
        "k.nama as nama_petugas",
        "k.jabatan as jabatan_petugas"
      )
      .orderBy("j.is_penanggung_jawab", "desc")
      .orderBy("j.jam_mulai", "asc");

    // Group schedules by kode_ruangan & tag shift timeliness
    const roomSchedulesMap = new Map();
    activeSchedulesToday.forEach((sch) => {
      let isOngoing = false;
      let isNotStarted = false;
      let isPast = false;

      if (sch.jam_mulai && sch.jam_selesai) {
        const [sh, sm] = sch.jam_mulai.slice(0, 5).split(":").map(Number);
        const [eh, em] = sch.jam_selesai.slice(0, 5).split(":").map(Number);
        const sMin = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
        const eMin = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);

        if (eMin <= nowMinutes) {
          isPast = true;
        } else if (nowMinutes < sMin) {
          isNotStarted = true;
        } else {
          isOngoing = true;
        }
      }

      sch.is_ongoing_now = isOngoing;
      sch.is_not_started_today = isNotStarted;
      sch.is_past_today = isPast;

      if (!roomSchedulesMap.has(sch.kode_ruangan)) {
        roomSchedulesMap.set(sch.kode_ruangan, []);
      }
      roomSchedulesMap.get(sch.kode_ruangan).push(sch);
    });

    // Fetch active promos for today
    const qPromos = DB("mst_promo as p")
      .join("mst_detail_promo as dp", "p.kode_promo", "dp.kode_promo")
      .where("p.status", "aktif")
      .where("dp.status", "aktif")
      .whereRaw("DATE(p.tanggal_mulai) <= ?", [todayYmd])
      .whereRaw("DATE(p.tanggal_selesai) >= ?", [todayYmd]);

    if (branchCode) {
      qPromos.where("p.kode_cabang", branchCode);
    }

    const activePromos = await qPromos
      .select(
        "p.kode_promo",
        "p.nama as nama_promo",
        "p.jenis_diskon",
        "p.nilai_diskon",
        "dp.jenis_item",
        "dp.kode_item"
      );

    const promoMap = {};
    activePromos.forEach((pr) => {
      const jenisClean = (pr.jenis_item || "").toLowerCase();
      const normJenis = jenisClean.includes("layanan")
        ? jenisClean.includes("paket") ? "paket" : "layanan"
        : jenisClean.includes("produk") ? jenisClean.includes("paket") ? "paket" : "produk" : jenisClean;

      const keys = [`${normJenis}_${pr.kode_item}`, `${jenisClean}_${pr.kode_item}`];
      keys.forEach((key) => {
        if (!promoMap[key]) {
          promoMap[key] = pr;
        } else {
          const curVal = parseFloat(promoMap[key].nilai_diskon || 0);
          const newVal = parseFloat(pr.nilai_diskon || 0);
          if (newVal > curVal) {
            promoMap[key] = pr;
          }
        }
      });
    });

    const applyPromo = (item) => {
      const normJenis = item.jenis.includes("layanan")
        ? item.jenis.includes("paket") ? "paket" : "layanan"
        : item.jenis.includes("produk") ? item.jenis.includes("paket") ? "paket" : "produk" : item.jenis;

      const key = `${normJenis}_${item.kode}`;
      const keyFull = `${item.jenis}_${item.kode}`;
      const promo = promoMap[key] || promoMap[keyFull];

      if (promo) {
        const diskonNilai = parseFloat(promo.nilai_diskon || 0);
        let hargaDiskon = item.harga;
        if (promo.jenis_diskon === "persen") {
          hargaDiskon = Math.max(0, item.harga - (item.harga * diskonNilai) / 100);
        } else {
          hargaDiskon = Math.max(0, item.harga - diskonNilai);
        }

        return {
          ...item,
          is_promo: true,
          kode_promo: promo.kode_promo,
          nama_promo: promo.nama_promo,
          jenis_diskon: promo.jenis_diskon,
          nilai_diskon: diskonNilai,
          harga_asal: item.harga,
          harga: item.harga, // Base price tetap harga asli/normal
          harga_promo: hargaDiskon, // Metadata estimasi promo
        };
      }

      return {
        ...item,
        is_promo: false,
        harga_asal: item.harga,
      };
    };

    const getRoomStaffInfo = (roomCode, roomName) => {
      const roomSchedules = roomSchedulesMap.get(roomCode) || [];
      const hasPetugasHariIni = roomSchedules.length > 0;

      const ongoingSchedules = roomSchedules.filter((s) => s.is_ongoing_now);
      const unstartedSchedules = roomSchedules.filter((s) => s.is_not_started_today);
      const pastSchedules = roomSchedules.filter((s) => s.is_past_today);

      const hasOngoingPetugas = ongoingSchedules.length > 0;
      const isNotStartedToday = !hasOngoingPetugas && unstartedSchedules.length > 0;
      const isPastToday = !hasOngoingPetugas && !isNotStartedToday && pastSchedules.length > 0;

      const doctorsInRoom = roomSchedules.filter((s) => {
        const jbt = (s.jabatan_petugas || "").toLowerCase();
        const nm = (s.nama_petugas || "").toLowerCase();
        return jbt.includes("dokter") || jbt.includes("dr") || nm.startsWith("dr.") || nm.startsWith("dr ") || nm.includes("dr.") || nm.includes("sp.");
      });

      const ongoingDoctors = doctorsInRoom.filter((s) => s.is_ongoing_now);
      const hasDokter = doctorsInRoom.length > 0;
      const hasOngoingDokter = ongoingDoctors.length > 0;

      const pjStaff = ongoingSchedules.find((s) => s.is_penanggung_jawab === 1) ||
                      ongoingDoctors[0] ||
                      ongoingSchedules[0] ||
                      roomSchedules.find((s) => s.is_penanggung_jawab === 1) ||
                      doctorsInRoom[0] ||
                      roomSchedules[0];

      const doctorPj = ongoingDoctors.find((s) => s.is_penanggung_jawab === 1) ||
                       ongoingDoctors[0] ||
                       doctorsInRoom.find((s) => s.is_penanggung_jawab === 1) ||
                       doctorsInRoom[0];

      const companions = roomSchedules
        .filter((s) => s !== pjStaff)
        .map((s) => ({
          nama_petugas: s.nama_petugas,
          jabatan_petugas: s.jabatan_petugas || "Petugas",
          jam_mulai: s.jam_mulai ? s.jam_mulai.slice(0, 5) : null,
          jam_selesai: s.jam_selesai ? s.jam_selesai.slice(0, 5) : null,
          is_ongoing_now: s.is_ongoing_now,
          is_not_started_today: s.is_not_started_today,
          is_past_today: s.is_past_today,
        }));

      const shiftStr = pjStaff?.jam_mulai && pjStaff?.jam_selesai
        ? `${pjStaff.jam_mulai.slice(0, 5)} - ${pjStaff.jam_selesai.slice(0, 5)} WIB`
        : null;

      const earliestStart = unstartedSchedules.length > 0
        ? unstartedSchedules.map((s) => (s.jam_mulai ? s.jam_mulai.slice(0, 5) : "08:00")).sort()[0]
        : null;

      let statusJadwal = "tidak_ada_jadwal";
      let alasan = `Tidak ada dokter atau petugas jaga di ${roomName || roomCode || "ruangan ini"} hari ini (${todayDay})`;

      if (hasOngoingPetugas) {
        statusJadwal = "aktif";
        alasan = null;
      } else if (isNotStartedToday) {
        statusJadwal = "belum_mulai";
        alasan = `Shift petugas di ${roomName || "ruangan ini"} baru dimulai pukul ${earliestStart || (pjStaff?.jam_mulai ? pjStaff.jam_mulai.slice(0, 5) : "13:00")} WIB (Shift: ${shiftStr || "Jadwal Belum Mulai"}). Rujukan antrean belum dapat diterbitkan saat ini.`;
      } else if (isPastToday) {
        statusJadwal = "selesai";
        alasan = `Shift petugas di ${roomName || "ruangan ini"} telah berakhir untuk hari ini (Shift: ${shiftStr}).`;
      }

      return {
        hasPetugas: hasOngoingPetugas, // Available ONLY if ongoing right now
        hasPetugasHariIni,
        hasOngoingPetugas,
        isNotStartedToday,
        isPastToday,
        statusJadwal,
        alasan,
        hasDokter,
        hasOngoingDokter,
        doctorPjName: doctorPj?.nama_petugas || null,
        doctorNames: doctorsInRoom.map((s) => s.nama_petugas).filter(Boolean),
        doctorCount: doctorsInRoom.length,
        pjStaffName: pjStaff?.nama_petugas || null,
        pjStaffJabatan: pjStaff?.jabatan_petugas || (doctorPj ? "Dokter" : "Petugas"),
        staffNames: roomSchedules.map((s) => s.nama_petugas).filter(Boolean),
        staffCount: roomSchedules.length,
        shift: shiftStr,
        earliestStart,
        companions: companions,
      };
    };

    // Format output items with promo info and staff duty availability applied
    const listLayanan = vaLayanan.map((item) => {
      const staffInfo = getRoomStaffInfo(item.kode_ruangan, item.nama_ruangan);

      const fotoUrl = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/layanan/${item.foto}`)
        : null;

      return applyPromo({
        jenis: "layanan",
        tipe: item.tipe || "BEAUTY TREATMENT",
        wajib_konsultasi: item.wajib_konsultasi || "opsional",
        foto: fotoUrl,
        kode: item.kode_layanan,
        kode_layanan: item.kode_layanan,
        nama: item.nama,
        harga: parseFloat(item.harga || 0),
        kode_kategori: item.kode_kategori_layanan,
        nama_kategori: item.nama_kategori || "Layanan",
        durasi_menit: parseInt(item.durasi_menit || 30, 10),
        kode_ruangan: item.kode_ruangan || "",
        nama_ruangan: item.nama_ruangan || item.kode_ruangan || "Ruang Treatment",
        is_petugas_available: staffInfo.hasPetugas,
        is_not_started_today: staffInfo.isNotStartedToday,
        is_past_today: staffInfo.isPastToday,
        status_jadwal: staffInfo.statusJadwal,
        alasan_tidak_tersedia: staffInfo.alasan,
        shift: staffInfo.shift,
        earliest_start: staffInfo.earliestStart,
        has_dokter: staffInfo.hasDokter,
        dokter_nama: staffInfo.doctorPjName,
        petugas_jaga_count: staffInfo.staffCount,
        petugas_pj_nama: staffInfo.pjStaffName,
        petugas_jaga_names: staffInfo.staffNames,
      });
    });

    const listPaketLayanan = vaPaketLayanan.map((item) => {
      const staffInfo = getRoomStaffInfo(item.kode_ruangan, item.nama_ruangan);

      const fotoUrl = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/paket_layanan/${item.foto}`)
        : null;

      return applyPromo({
        jenis: "paket_layanan",
        tipe: item.tipe || "BEAUTY TREATMENT",
        wajib_konsultasi: item.tipe === "MEDICAL TREATMENT" ? "wajib" : item.tipe === "SERVICE TREATMENT" ? "tidak" : "opsional",
        foto: fotoUrl,
        kode: item.kode_paket_layanan,
        kode_layanan: item.kode_paket_layanan,
        nama: item.nama,
        harga: parseFloat(item.harga || 0),
        kode_kategori: "PAKET_LAYANAN",
        nama_kategori: "Paket Layanan",
        durasi_menit: 45,
        masa_berlaku_hari: item.masa_berlaku_hari,
        kode_ruangan: item.kode_ruangan || "",
        nama_ruangan: item.nama_ruangan || item.kode_ruangan || "Ruang Treatment",
        is_petugas_available: staffInfo.hasPetugas,
        is_not_started_today: staffInfo.isNotStartedToday,
        is_past_today: staffInfo.isPastToday,
        status_jadwal: staffInfo.statusJadwal,
        alasan_tidak_tersedia: staffInfo.alasan,
        shift: staffInfo.shift,
        earliest_start: staffInfo.earliestStart,
        has_dokter: staffInfo.hasDokter,
        dokter_nama: staffInfo.doctorPjName,
        petugas_jaga_count: staffInfo.staffCount,
        petugas_pj_nama: staffInfo.pjStaffName,
        petugas_jaga_names: staffInfo.staffNames,
      });
    });

    const listProduk = vaProduk.map((item) => {
      const fotoUrl = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/produk/${item.foto}`)
        : null;

      return applyPromo({
        jenis: "produk",
        tipe: "produk_biasa",
        foto: fotoUrl,
        kode: item.kode_produk,
        kode_produk: item.kode_produk,
        nama: item.nama,
        satuan: item.satuan || "pcs",
        harga: parseFloat(item.harga || 0),
        kode_kategori: item.kode_kategori_produk,
        nama_kategori: item.nama_kategori || "Produk",
        is_petugas_available: true,
      });
    });

    const listPaketProduk = vaPaketProduk.map((item) => {
      const fotoUrl = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/paket_produk/${item.foto}`)
        : null;

      return applyPromo({
        jenis: "paket_produk",
        tipe: "paket_produk",
        foto: fotoUrl,
        kode: item.kode_paket_produk,
        kode_produk: item.kode_paket_produk,
        nama: item.nama,
        satuan: "paket",
        harga: parseFloat(item.harga || 0),
        kode_kategori: "PAKET_PRODUK",
        nama_kategori: "Paket Produk",
        masa_berlaku_hari: item.masa_berlaku_hari,
        is_petugas_available: true,
      });
    });

    // Fetch ALL active treatment rooms from master
    const qAllRuangan = DB("mst_ruangan")
      .where("status", "aktif")
      .where(function () {
        this.whereNull("is_konsultasi").orWhere("is_konsultasi", 0);
      })
      .whereRaw("(nama_ruangan IS NULL OR LOWER(nama_ruangan) NOT LIKE '%konsultasi%')");

    if (branchCode) {
      qAllRuangan.where("kode_cabang", branchCode);
    }

    const vaAllRuangan = await qAllRuangan
      .select("kode_ruangan", "nama_ruangan")
      .orderBy("nama_ruangan", "asc");

    const listAllRuangan = vaAllRuangan.map((r) => {
      const staffInfo = getRoomStaffInfo(r.kode_ruangan, r.nama_ruangan);

      return {
        kode: r.kode_ruangan,
        kode_ruangan: r.kode_ruangan,
        nama: r.nama_ruangan,
        nama_ruangan: r.nama_ruangan,
        has_petugas: staffInfo.hasPetugas,
        has_petugas_hari_ini: staffInfo.hasPetugasHariIni,
        is_not_started_today: staffInfo.isNotStartedToday,
        is_past_today: staffInfo.isPastToday,
        status_jadwal: staffInfo.statusJadwal,
        alasan: staffInfo.alasan,
        has_dokter: staffInfo.hasDokter,
        dokter_nama: staffInfo.doctorPjName,
        dokter_names: staffInfo.doctorNames,
        dokter_count: staffInfo.doctorCount,
        petugas_count: staffInfo.staffCount,
        petugas_pj: staffInfo.pjStaffName,
        petugas_pj_jabatan: staffInfo.pjStaffJabatan,
        petugas_jaga_names: staffInfo.staffNames,
        shift: staffInfo.shift,
        earliest_start: staffInfo.earliestStart,
        companions: staffInfo.companions,
      };
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data opsi rekomendasi berhasil dimuat",
      datetime: formatDateSystem(),
      data: {
        ruangan: listAllRuangan,
        layanan: listLayanan,
        paket_layanan: listPaketLayanan,
        produk: listProduk,
        paket_produk: listPaketProduk,
      },
    });
  } catch (error) {
    Logging(error, {
      file: "/master/ruangan/ruangan_rekomendasi.js",
      func: "ruangan-rekomendasi-options",
      request: oPayload,
      response: {},
      user: username,
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal mengambil data opsi rekomendasi",
      datetime: formatDateSystem(),
    });
  }
};

router.get("/ruangan-rekomendasi-options", handleGetRekomendasiOptions);
router.post("/ruangan-rekomendasi-options", handleGetRekomendasiOptions);

/**
 * ─── 2. SIMPAN FORM PENANGANAN & PROSES REKOMENDASI TREATMENT / PRODUK ───
 */
router.post("/antrian-layanan-simpan-rekomendasi", async (req, res) => {
  const oPayload = req.body || {};
  const {
    kode_antrian_layanan,
    hasil_form,
    catatan_petugas,
    status_tindakan,
    rekomendasi_items = [],
  } = oPayload;
  const username = req?.auth?.username || "system";

  try {
    if (!kode_antrian_layanan) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "kode_antrian_layanan wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    const currentAntrian = await DB("trx_antrian_layanan")
      .where("kode_antrian_layanan", kode_antrian_layanan)
      .first();

    if (!currentAntrian) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Data antrian layanan tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    const kodeKunjungan = currentAntrian.kode_kunjungan;
    let kunjungan = null;
    if (kodeKunjungan) {
      kunjungan = await DB("trx_kunjungan").where("kode_kunjungan", kodeKunjungan).first();
    }

    const createdAntrianLayanan = [];
    let createdTransaksi = null;

    // Direct DB Transaction for consistency
    await DB.transaction(async (trx) => {
      const now = new Date();
      const todayYmd = now.toISOString().slice(0, 10);
      const todayStr = todayYmd.replace(/-/g, "");

      // ─── A. Update status antrian saat ini ───
      const updateObj = {
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      if (oPayload.kode_karyawan || oPayload.no_sip) {
        const rawCode = oPayload.kode_karyawan || oPayload.no_sip;
        updateObj.kode_karyawan = String(rawCode).split("#")[0].trim();
      }
      if (hasil_form) {
        updateObj.hasil_form = typeof hasil_form === "object" ? JSON.stringify(hasil_form) : hasil_form;
      }
      if (catatan_petugas) {
        updateObj.catatan_petugas = catatan_petugas;
      }
      if (status_tindakan && ["menunggu", "dipanggil", "selesai", "batal"].includes(status_tindakan)) {
        updateObj.status = status_tindakan;
        if (status_tindakan === "selesai") {
          updateObj.selesai_at = formatDateSystem();
        }
      }
      const isLanjut = oPayload.lanjut_ke_tindakan !== undefined ? (oPayload.lanjut_ke_tindakan ? 1 : 0) : 1;
      updateObj.lanjut_ke_tindakan = isLanjut;

      await trx("trx_antrian_layanan")
        .where("kode_antrian_layanan", kode_antrian_layanan)
        .update(updateObj);

      if (oPayload.diubah_dari_booking) {
        await ChangesLog({
          description: `Perubahan Petugas Tindakan Booking: ${oPayload.petugas_asal_booking || ''} (${oPayload.no_sip_asal_booking || ''}) diubah ke ${oPayload.petugas_pengganti || oPayload.kode_karyawan} (${oPayload.kode_karyawan}) pada antrean ${kode_antrian_layanan}`,
          tableName: "trx_antrian_layanan",
          referenceCode: kode_antrian_layanan,
          action: "UPDATE",
          dataBefore: { kode_karyawan: oPayload.no_sip_asal_booking, nama: oPayload.petugas_asal_booking },
          dataAfter: { kode_karyawan: oPayload.kode_karyawan, nama: oPayload.petugas_pengganti, catatan: oPayload.catatan_perubahan_petugas },
          user: username,
          tz: oPayload.tz || "Asia/Jakarta"
        }, trx);
      }

      // ─── B. Memisahkan rekomendasi Layanan vs Produk ───
      const items = Array.isArray(rekomendasi_items) ? rekomendasi_items : [];
      const layananItems = [];
      const produkItems = [];

      items.forEach((item) => {
        const j = (item.jenis || "").toLowerCase();
        if (["layanan", "paket_layanan", "paket"].includes(j)) {
          layananItems.push(item);
        } else if (["produk", "paket_produk"].includes(j)) {
          produkItems.push(item);
        }
      });

      // Validasi ketersediaan petugas/terapis di ruangan tujuan tindakan hari ini
      if (isLanjut === 1 && layananItems.length > 0) {
        const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
        const todayDate = new Date();
        const todayStrDate = formatDateSystem(todayDate, "yyyy-MM-dd");
        const [yr, mo, dy] = todayStrDate.split("-").map(Number);
        const todayDayName = HARI_MAP[new Date(yr, mo - 1, dy).getDay()];

        for (const item of layananItems) {
          let rKode = item.kode_ruangan;
          let rNama = item.nama_ruangan;
          if (!rKode && (item.kode || item.kode_layanan)) {
            const kd = item.kode || item.kode_layanan;
            const layInfo = await trx("mst_layanan").where("kode_layanan", kd).select("kode_ruangan").first();
            if (layInfo) rKode = layInfo.kode_ruangan;
            else {
              const pktInfo = await trx("mst_paket_layanan").where("kode_paket_layanan", kd).select("kode_ruangan").first();
              if (pktInfo) rKode = pktInfo.kode_ruangan;
            }
          }

          if (rKode && rKode !== currentAntrian.kode_ruangan) {
            const activeStaff = await trx("mst_jadwal_karyawan")
              .where("kode_ruangan", rKode)
              .where("hari", todayDayName)
              .where("status", "aktif")
              .first();

            if (!activeStaff) {
              const roomInfo = await trx("mst_ruangan").where("kode_ruangan", rKode).first();
              const namaRuangan = roomInfo?.nama_ruangan || rNama || rKode;
              return res.status(422).json({
                status: status.BAD_REQUEST,
                message: `Tidak dapat menerbitkan rujukan ke "${namaRuangan}": Tidak ada petugas/terapis yang bertugas hari ini (${todayDayName}). Silakan alihkan layanan atau simpan tanpa tindakan lanjut.`,
                datetime: formatDateSystem(),
              });
            }
          }
        }
      }

      // ─── B.1. SIMPAN REKOMENDASI PRODUK KE trx_detail_antrian_layanan (ANTREAN KONSULTASI ASAL) ───
      // Produk dicatat pada antrean konsultasi saat ini agar tersimpan permanen di riwayat kunjungan.
      // Ketika pasien selesai (baik langsung atau setelah tindakan lanjutan di ruang rujukan),
      // sinkronisasi Kasir akan otomatis membaca produk ini dari antrean konsultasi yang sudah 'selesai'.
      if (kodeKunjungan) {
        // Hapus produk lama di antrean ini untuk mencegah duplikasi jika form disimpan ulang
        await trx("trx_detail_antrian_layanan")
          .where("kode_antrian_layanan", kode_antrian_layanan)
          .whereIn("jenis_layanan", ["produk", "paket_produk"])
          .del();

        if (produkItems.length > 0) {
          const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const alParts = kode_antrian_layanan.split("-");
          const seqPadded = alParts.length >= 3 ? alParts[2] : "001";

          // Ambil urutan sub-seq detail terakhir untuk antrean ini
          const existingDetails = await trx("trx_detail_antrian_layanan")
            .where("kode_antrian_layanan", kode_antrian_layanan)
            .select("kode_detail_antrian_layanan");

          let maxSubSeq = 0;
          existingDetails.forEach((d) => {
            if (d.kode_detail_antrian_layanan) {
              const parts = d.kode_detail_antrian_layanan.split("-");
              const sub = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(sub) && sub > maxSubSeq) maxSubSeq = sub;
            }
          });

          const vaInsertProdukDetail = [];
          for (const prd of produkItems) {
            const qty = Math.max(1, parseInt(prd.qty || 1, 10));
            const kdPrd = prd.kode || prd.kode_produk || prd.kode_layanan;
            const nmPrd = prd.nama || prd.nama_produk || prd.nama_layanan || "Produk";
            const hrgPrd = parseFloat(prd.harga || prd.harga_jual || prd.harga_satuan || 0);

            for (let q = 0; q < qty; q++) {
              maxSubSeq++;
              const cKodeDetailAntrian = `DAL-${todayStr}-${seqPadded}-${String(maxSubSeq).padStart(2, "0")}`;
              vaInsertProdukDetail.push({
                kode_detail_antrian_layanan: cKodeDetailAntrian,
                kode_antrian_layanan: kode_antrian_layanan,
                kode_kunjungan: kodeKunjungan,
                jenis_layanan: (prd.jenis || "").toLowerCase() === "paket_produk" ? "paket_produk" : "produk",
                kode_layanan: kdPrd,
                nama_layanan: nmPrd,
                harga: hrgPrd,
                durasi_menit: 0,
                kode_promo: prd.kode_promo || null,
                nama_promo: prd.nama_promo || null,
                jenis_diskon: prd.jenis_diskon || null,
                nilai_diskon: prd.nilai_diskon ?? null,
                kode_ruangan: currentAntrian.kode_ruangan || null,
                nama_ruangan: currentAntrian.nama_ruangan || null,
                tz: currentAntrian.tz || oPayload.tz || "Asia/Jakarta",
                created_by: username,
                created_at: formatDateSystem(),
                updated_by: username,
                updated_at: formatDateSystem(),
              });
            }
          }

          if (vaInsertProdukDetail.length > 0) {
            await trx("trx_detail_antrian_layanan").insert(vaInsertProdukDetail);
          }
        }
      }

      // ─── C. PROSES REKOMENDASI LAYANAN → TERBITKAN NOMOR ANTREAN KHUSUS PER RUANGAN ───
      // Antrean rujukan HANYA diterbitkan jika isLanjut === 1 dan terdapat layanan tindakan ke ruang yang valid & berbeda
      let createdReferrals = [];
      if (isLanjut === 1 && kodeKunjungan) {
        createdReferrals = await terbitkanAntreanLanjutanRuangan(trx, {
          currentAntrian,
          kodeKunjungan,
          username,
          rekomendasiItems: layananItems,
          tz: currentAntrian.tz || oPayload.tz || "Asia/Jakarta",
        });
        createdAntrianLayanan.push(...createdReferrals);
      }

      const isLanjutFinal = createdReferrals.length > 0 ? 1 : 0;
      if (isLanjut !== isLanjutFinal) {
        await trx("trx_antrian_layanan")
          .where("kode_antrian_layanan", kode_antrian_layanan)
          .update({
            lanjut_ke_tindakan: isLanjutFinal,
            updated_by: username,
            updated_at: formatDateSystem(),
          });
      }

      // ─── D. PROSES DRAF TRANSAKSI (LAYANAN SELESAI + REKOMENDASI PRODUK) ───
      // PENTING: Draf transaksi ke Kasir HANYA dibuat jika TIDAK ADA tindakan lanjutan (isLanjutFinal === 0)
      // Jika isLanjutFinal === 1, pasien masih harus menjalani treatment di ruang tindakan rujukan,
      // sehingga transaksi Kasir baru boleh diterbitkan setelah treatment di ruang tindakan tersebut selesai!
      const isStatusSelesai = status_tindakan === "selesai";
      const shouldSyncTrx = isLanjutFinal === 0 && (isStatusSelesai || produkItems.length > 0) && kodeKunjungan && kunjungan;

      if (shouldSyncTrx) {
        const syncResult = await syncCompletedItemsToKasirDraft(trx, {
          kodeKunjungan,
          noRm: kunjungan.no_rm,
          username,
          tz: kunjungan.tz || oPayload.tz || "Asia/Jakarta",
          extraProdukItems: produkItems,
        });

        if (syncResult) {
          createdTransaksi = {
            kode_transaksi: syncResult.kode_transaksi,
            total_bayar: syncResult.total_bayar,
            jumlah_produk: produkItems.length,
          };
        }
      }

      // ─── E. UPDATE STATUS KUNJUNGAN JIKA TANPA RUJUKAN & SEMUA ANTREAN SELESAI ───
      // Saat isLanjutFinal === 0 dan status_tindakan === 'selesai',
      // periksa apakah SEMUA antrean pada kode_kunjungan ini sudah selesai/batal.
      // Jika ya, update status kunjungan menjadi 'selesai'.
      if (isLanjutFinal === 0 && isStatusSelesai && kodeKunjungan) {
        const allAntrian = await trx("trx_antrian_layanan")
          .where("kode_kunjungan", kodeKunjungan)
          .select("status");

        const allSelesai = allAntrian.length > 0 && allAntrian.every((a) => a.status === "selesai" || a.status === "batal");
        if (allSelesai) {
          await trx("trx_kunjungan")
            .where("kode_kunjungan", kodeKunjungan)
            .update({
              status: "selesai",
              updated_by: username,
              updated_at: formatDateSystem(),
            });
        }
      }

      // ─── E. SIMPAN & SYNC REKAM MEDIS ───
      if (kodeKunjungan) {
        let textRekomendasi = "";
        if (layananItems.length > 0) {
          textRekomendasi += `Rekomendasi Treatment: ${layananItems.map((l) => `${l.nama} (${l.nama_ruangan || "Ruangan"})`).join(", ")}\n`;
        }
        if (produkItems.length > 0) {
          textRekomendasi += `Rekomendasi Produk (Draf Transaksi): ${produkItems.map((p) => `${p.nama} (${p.qty || 1}x)`).join(", ")}`;
        }

        const combinedCatatan = [
          catatan_petugas ? catatan_petugas : null,
          textRekomendasi ? textRekomendasi.trim() : null,
        ]
          .filter(Boolean)
          .join("\n\n---\n");

        await syncRekamMedisPerAntrian({
          kode_kunjungan: kodeKunjungan,
          kode_antrian_layanan: kode_antrian_layanan,
          kode_ruangan: currentAntrian.kode_ruangan,
          nama_ruangan: currentAntrian.nama_ruangan,
          hasil_form: hasil_form,
          header_data: oPayload.header_data,
          catatan_petugas: combinedCatatan,
          kode_karyawan: updateObj.kode_karyawan || currentAntrian.kode_karyawan,
          username: username,
          trx: trx,
        });
      }
    });

    let msg = "Hasil penanganan & catatan ruangan berhasil disimpan";
    if (createdAntrianLayanan.length > 0 && createdTransaksi) {
      msg = `Berhasil disimpan! Menerbitkan ${createdAntrianLayanan.length} antrean layanan & 1 draf transaksi.`;
    } else if (createdAntrianLayanan.length > 0) {
      msg = `Berhasil disimpan & menerbitkan ${createdAntrianLayanan.length} antrean layanan baru!`;
    } else if (createdTransaksi) {
      msg = `Berhasil disimpan & draf transaksi kasir berhasil diperbarui!`;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: msg,
      datetime: formatDateSystem(),
      data: {
        kode_kunjungan: kodeKunjungan,
        no_rm: kunjungan?.no_rm || '',
        antrian_layanan_baru: createdAntrianLayanan,
        transaksi_draft: createdTransaksi,
      },
    });
  } catch (error) {
    Logging(error, {
      file: "/master/ruangan/ruangan_rekomendasi.js",
      func: "antrian-layanan-simpan-rekomendasi",
      request: oPayload,
      response: {},
      user: username,
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: error.message || "Gagal menyimpan rekomendasi & penanganan pasien",
      datetime: formatDateSystem(),
    });
  }
});

/**
 * ─── 3. FETCH PRE-SELECTED ITEMS DARI PENDAFTARAN (UNLOCKED / LOCKED) ───
 */
router.post("/antrian-layanan-pendaftaran-items", async (req, res) => {
  const { kode_kunjungan, kode_antrian_layanan, for_referral } = req.body || {};
  const username = req?.auth?.username || "system";

  try {
    if (!kode_kunjungan && !kode_antrian_layanan) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "kode_kunjungan atau kode_antrian_layanan wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    let query = DB("trx_detail_antrian_layanan as dal")
      .leftJoin("mst_layanan as l", "dal.kode_layanan", "l.kode_layanan")
      .leftJoin("mst_kategori_layanan as kl", "l.kode_kategori_layanan", "kl.kode_kategori_layanan")
      .leftJoin("mst_paket_layanan as p", "dal.kode_layanan", "p.kode_paket_layanan")
      .leftJoin("mst_ruangan as r_lay", "l.kode_ruangan", "r_lay.kode_ruangan")
      .leftJoin("mst_ruangan as r_pkt", "p.kode_ruangan", "r_pkt.kode_ruangan");

    if (kode_kunjungan) {
      query = query.where("dal.kode_kunjungan", kode_kunjungan);
    } else {
      query = query.where("dal.kode_antrian_layanan", kode_antrian_layanan);
    }

    const rawItems = await query.select(
      "dal.*",
      "l.harga as lay_master_harga",
      "l.kode_ruangan as lay_ruangan",
      "kl.nama as lay_nama_kategori",
      "r_lay.nama_ruangan as lay_nama_ruangan",
      "r_lay.is_konsultasi as lay_is_konsul",
      "p.harga_paket as pkt_master_harga",
      "p.kode_ruangan as pkt_ruangan",
      "r_pkt.nama_ruangan as pkt_nama_ruangan",
      "r_pkt.is_konsultasi as pkt_is_konsul"
    );

    // Filter is_konsultasi HANYA dipakai jika untuk keperluan rujukan ruangan (for_referral === true)
    // agar dokter hanya merujuk layanan tindakan lebih lanjut ke ruang tindakan.
    // Jika tidak sedang merujuk (for_referral falsy / untuk ringkasan layanan kunjungan),
    // seluruh layanan (termasuk konsultasi) disertakan secara utuh.
    // CATATAN: Endpoint ini adalah untuk UI form penanganan/rujukan dan TIDAK PERNAH digunakan
    // untuk menghitung atau membatasi tagihan kasir (kasir langsung membaca trx_detail_antrian_layanan).
    const isForReferral = Boolean(for_referral === true || for_referral === "true" || for_referral === 1);
    const filteredItems = isForReferral
      ? rawItems.filter((i) => !Boolean(i.lay_is_konsul) && !Boolean(i.pkt_is_konsul))
      : rawItems;

    const formatted = filteredItems
      .map((i) => {
        const jenisStr = (i.jenis_layanan || "").toLowerCase();
        const isPaket = jenisStr.includes("paket");
        const roomCode = isPaket ? (i.pkt_ruangan || i.kode_ruangan) : (i.lay_ruangan || i.kode_ruangan);
        const roomName = isPaket ? (i.pkt_nama_ruangan || i.nama_ruangan) : (i.lay_nama_ruangan || i.nama_ruangan);
        const isKlaim = jenisStr.includes("klaim");

        // Base price selalu harga master normal, bukan harga setelah diskon promo
        let basePrice = isPaket
          ? (i.pkt_master_harga !== null && i.pkt_master_harga !== undefined ? parseFloat(i.pkt_master_harga) : parseFloat(i.harga || 0))
          : (i.lay_master_harga !== null && i.lay_master_harga !== undefined ? parseFloat(i.lay_master_harga) : parseFloat(i.harga || 0));

        if (isKlaim) {
          basePrice = 0;
        }

        return {
          jenis: isPaket ? "paket_layanan" : (jenisStr || "layanan"),
          tipe: isPaket ? "paket_layanan" : "layanan_biasa",
          kode: i.kode_layanan,
          nama: i.nama_layanan,
          nama_kategori: i.lay_nama_kategori || (isPaket ? "Paket Layanan" : "Perawatan"),
          harga: basePrice,
          harga_asal: basePrice,
          is_promo: Boolean(i.kode_promo || i.nama_promo),
          kode_promo: i.kode_promo || null,
          nama_promo: i.nama_promo || null,
          jenis_diskon: i.jenis_diskon || null,
          nilai_diskon: i.nilai_diskon ? parseFloat(i.nilai_diskon) : null,
          kode_ruangan: roomCode || "RNG-001",
          nama_ruangan: roomName || "Ruang Treatment",
          is_locked: true,
          is_pendaftaran: true,
        };
      });

    // Deduplicate unique pendaftaran items by (jenis, kode)
    const uniqueItemsMap = new Map();
    formatted.forEach((item) => {
      const normJenis = (item.jenis || "").includes("paket") ? "paket_layanan" : item.jenis;
      const key = `${normJenis}_${item.kode}`;
      if (!uniqueItemsMap.has(key)) {
        uniqueItemsMap.set(key, item);
      }
    });
    const uniqueFormatted = Array.from(uniqueItemsMap.values());

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data item pendaftaran berhasil dimuat",
      datetime: formatDateSystem(),
      data: uniqueFormatted,
    });
  } catch (error) {
    Logging(error, {
      file: "/master/ruangan/ruangan_rekomendasi.js",
      func: "antrian-layanan-pendaftaran-items",
      request: req.body,
      response: {},
      user: username,
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal mengambil data item pendaftaran",
      datetime: formatDateSystem(),
    });
  }
});

/**
 * ─── 4. FETCH PRODUK REKOMENDASI DOKTER PADA KUNJUNGAN PASIEN ───
 */
router.post("/kunjungan-produk-rekomendasi", async (req, res) => {
  const { kode_kunjungan, kode_antrian_layanan } = req.body || {};
  const username = req?.auth?.username || "system";

  try {
    if (!kode_kunjungan && !kode_antrian_layanan) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "kode_kunjungan atau kode_antrian_layanan wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    let query = DB("trx_detail_antrian_layanan as dal")
      .leftJoin("mst_produk as p", "dal.kode_layanan", "p.kode_produk")
      .whereIn("dal.jenis_layanan", ["produk", "paket_produk"]);

    if (kode_kunjungan) {
      query = query.where("dal.kode_kunjungan", kode_kunjungan);
    } else {
      query = query.where("dal.kode_antrian_layanan", kode_antrian_layanan);
    }

    const rawRows = await query.select(
      "dal.id",
      "dal.kode_detail_antrian_layanan",
      "dal.kode_kunjungan",
      "dal.kode_antrian_layanan",
      "dal.jenis_layanan",
      "dal.kode_layanan as kode_produk",
      "dal.nama_layanan as nama",
      "dal.harga as harga_jual",
      "p.satuan",
      "p.foto"
    );

    const host = req.get("host");
    const protocol = req.protocol || "http";
    const assetsBase = `${protocol}://${host}`;

    // Group & aggregate by kode_produk
    const groupedMap = new Map();
    for (const r of rawRows) {
      const kd = r.kode_produk;
      if (groupedMap.has(kd)) {
        const item = groupedMap.get(kd);
        item.qty = (item.qty || 1) + 1;
        item.subtotal = item.qty * parseFloat(item.harga_jual || 0);
      } else {
        const fotoUrl = r.foto
          ? (r.foto.startsWith("http") ? r.foto : `${assetsBase}/uploads/produk/${r.foto}`)
          : null;
        groupedMap.set(kd, {
          kode_produk: kd,
          nama: r.nama,
          harga_jual: parseFloat(r.harga_jual || 0),
          satuan: r.satuan || "pcs",
          qty: 1,
          subtotal: parseFloat(r.harga_jual || 0),
          foto: fotoUrl,
        });
      }
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data rekomendasi produk berhasil dimuat",
      datetime: formatDateSystem(),
      data: Array.from(groupedMap.values()),
    });
  } catch (error) {
    Logging(error, { file: "/master/ruangan/ruangan_rekomendasi.js", func: "kunjungan-produk-rekomendasi", user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: "Gagal memuat data rekomendasi produk",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
