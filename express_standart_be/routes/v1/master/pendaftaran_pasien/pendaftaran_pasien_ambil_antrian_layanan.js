/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_ambil_antrian_layanan.js
 * @description Endpoint terpadu untuk menerbitkan trx_kunjungan + trx_antrian_awal + trx_antrian_layanan dalam 1 transaksi DB tunggal
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem, getOperationalTimeInfo } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";

  try {
    const no_rm = (oPayload.no_rm || "").trim();
    const items = Array.isArray(oPayload.items) ? oPayload.items : [];

    if (!no_rm) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Nomor RM pasien wajib diisi",
        datetime: formatDateSystem(),
      });
    }

    // 1. Validasi Pasien Aktif
    const pasien = await DB("mst_pasien")
      .where("no_rm", no_rm)
      .where("status", "aktif")
      .first();

    if (!pasien) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: `Pasien dengan Nomor RM ${no_rm} tidak ditemukan atau tidak aktif`,
        datetime: formatDateSystem(),
      });
    }

    let resultData = null;
    const vaCreatedAntrianLayanan = [];

    // 2. Eksekusi 1 Transaksi DB Atomic
    await DB.transaction(async (trx) => {
      const now = new Date();
      const timeInfo = getOperationalTimeInfo(oPayload.tz);
      const todayYmd = timeInfo.todayYmd;
      const todayStr = todayYmd.replace(/-/g, "");

      const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
      const [year, month, day] = todayYmd.split("-").map(Number);
      const todayDay = HARI_MAP[new Date(year, month - 1, day).getDay()];

      // A. Generate Kode Kunjungan (KJ-YYYYMMDD-001)
      const prefixKunjungan = `KJ-${todayStr}-`;
      const lastKunjungan = await trx("trx_kunjungan")
        .where("kode_kunjungan", "like", `${prefixKunjungan}%`)
        .orderBy("id", "desc")
        .first();

      let nextKjSeq = 1;
      if (lastKunjungan && lastKunjungan.kode_kunjungan) {
        const parts = lastKunjungan.kode_kunjungan.split("-");
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) {
          nextKjSeq = num + 1;
        }
      }
      const cKodeKunjungan = `${prefixKunjungan}${String(nextKjSeq).padStart(3, "0")}`;
      const jamDatang = timeInfo.timeStr;

      const branchCode = getBranchScope(req, oPayload.kode_cabang) || req?.auth?.kode_cabang || pasien.kode_cabang || "CBG-001";

      // B. Insert trx_kunjungan
      const oKunjunganData = {
        kode_cabang: branchCode,
        kode_kunjungan: cKodeKunjungan,
        no_rm: pasien.no_rm,
        tanggal_kunjungan: todayYmd,
        jam_datang: jamDatang,
        status: "berlangsung",
        tz: oPayload.tz || "Asia/Jakarta",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      await trx("trx_kunjungan").insert(oKunjunganData);

      // C. Hubungkan dengan 1 kartu fisik dari master pool trx_antrian_awal (TIDAK BOLEH INSERT BARU)
      let antrianAwalTersedia = null;

      // Prioritas 1: Jika request membawa kode_antrian_awal spesifik
      if (oPayload.kode_antrian_awal) {
        antrianAwalTersedia = await trx("trx_antrian_awal")
          .where("kode_antrian_awal", oPayload.kode_antrian_awal)
          .where("kode_cabang", branchCode)
          .first();
      }

      // Prioritas 2: Antrean awal yang saat ini sedang dipanggil ke loket pendaftaran (status = 'dipanggil')
      if (!antrianAwalTersedia) {
        antrianAwalTersedia = await trx("trx_antrian_awal")
          .where("status", "dipanggil")
          .where("kode_cabang", branchCode)
          .orderByRaw("CAST(nomor_antrian AS UNSIGNED) ASC, nomor_antrian ASC")
          .first();
      }

      // Prioritas 3: Antrean awal yang sudah diambil tapi belum dikaitkan dengan kunjungan pasien
      if (!antrianAwalTersedia) {
        antrianAwalTersedia = await trx("trx_antrian_awal")
          .where("status", "terpakai")
          .where("kode_cabang", branchCode)
          .whereNull("kode_kunjungan")
          .orderByRaw("CAST(nomor_antrian AS UNSIGNED) ASC, nomor_antrian ASC")
          .first();
      }

      // Prioritas 4: Kartu fisik urutan terkecil yang masih tersedia dari pool master
      if (!antrianAwalTersedia) {
        antrianAwalTersedia = await trx("trx_antrian_awal")
          .where("status", "tersedia")
          .where("kode_cabang", branchCode)
          .orderByRaw("CAST(nomor_antrian AS UNSIGNED) ASC, nomor_antrian ASC")
          .first();
      }

      if (antrianAwalTersedia) {
        await trx("trx_antrian_awal")
          .where("id", antrianAwalTersedia.id)
          .update({
            status: "terpakai",
            diambil_at: antrianAwalTersedia.diambil_at || formatDateSystem(),
            dipanggil_at: antrianAwalTersedia.dipanggil_at || formatDateSystem(),
            no_rm: pasien.no_rm,
            kode_kunjungan: cKodeKunjungan,
            updated_by: username,
            updated_at: formatDateSystem(),
          });
      }

      // D. Insert trx_antrian_layanan (jika ada items, diproses & dikelompokkan per ruangan)
      if (items.length > 0) {
        const prefixAntrianLayanan = `AL-${todayStr}-`;

        // Ambil promo aktif hari ini untuk referensi kasir
        const activePromos = await trx("mst_promo as p")
          .join("mst_detail_promo as dp", "p.kode_promo", "dp.kode_promo")
          .where("p.status", "aktif")
          .where("dp.status", "aktif")
          .whereRaw("DATE(p.tanggal_mulai) <= ?", [todayYmd])
          .whereRaw("DATE(p.tanggal_selesai) >= ?", [todayYmd])
          .select(
            "p.kode_promo",
            "p.nama as nama_promo",
            "p.jenis_diskon",
            "p.nilai_diskon",
            "dp.jenis_item",
            "dp.kode_item"
          );

        // Bangun promoMap: key = `{jenis}_{kode_item}`
        const promoMap = {};
        for (const pr of activePromos) {
          const jenisClean = (pr.jenis_item || "").toLowerCase();
          const normJenis = jenisClean.includes("layanan")
            ? jenisClean.includes("paket") ? "paket" : "layanan"
            : jenisClean.includes("produk") ? jenisClean.includes("paket") ? "paket" : "produk" : jenisClean;
          const keys = [`${normJenis}_${pr.kode_item}`, `${jenisClean}_${pr.kode_item}`];
          for (const key of keys) {
            if (!promoMap[key]) {
              promoMap[key] = pr;
            } else {
              if (parseFloat(pr.nilai_diskon || 0) > parseFloat(promoMap[key].nilai_diskon || 0)) {
                promoMap[key] = pr;
              }
            }
          }
        }

        // Ambil data ruangan konsul aktif (is_konsultasi = 1)
        const ruangKonsul = await trx("mst_ruangan")
          .where("is_konsultasi", 1)
          .where("status", "aktif")
          .modify((qb) => {
            if (branchCode) qb.where("kode_cabang", branchCode);
          })
          .first();

        // Ambil durasi sesi konsultasi dari master layanan aktif di ruang konsul (misal LAY-011 = 10 menit)
        let durasiSesiKonsulMenit = 10;
        if (ruangKonsul) {
          const defaultLayKonsul = await trx("mst_layanan")
            .where(function () {
              this.where("kode_ruangan", ruangKonsul.kode_ruangan)
                .orWhereRaw("LOWER(nama) LIKE '%konsul%'");
            })
            .where("status", "aktif")
            .modify((qb) => {
              if (branchCode) qb.where("kode_cabang", branchCode);
            })
            .orderBy("id", "asc")
            .first();
          if (defaultLayKonsul && defaultLayKonsul.durasi_menit) {
            durasiSesiKonsulMenit = parseInt(defaultLayKonsul.durasi_menit, 10) || 10;
          }
        }

        // 1. Validasi & Ambil Detail Semua Item (harga ASLI dari master, promo disimpan sebagai referensi)
        const checkedRoomsToday = new Map();
        const processedItems = [];
        for (const item of items) {
          const jenis = (item.jenis_layanan || item.jenis || "layanan").toLowerCase();
          const kodeLayanan = (item.kode_layanan || item.kode || "").trim();

          if (!["layanan", "paket", "klaim_paket"].includes(jenis) || !kodeLayanan) {
            continue;
          }

          let namaLayanan = "";
          let hargaLayanan = 0; // Selalu harga ASLI dari master
          let kodeRuanganTarget = "";
          let namaRuanganTarget = "";
          let tipeLayanan = "";
          let durasiItem = 0;

          if (jenis === "klaim_paket" || item.is_klaim === true || item.kode_kepemilikan_paket_layanan) {
            const kodeKpl = item.kode_kepemilikan_paket_layanan || item.kode_kepemilikan;
            let kplQuery = trx("trx_kepemilikan_paket_layanan")
              .where("kode_kepemilikan_paket_layanan", kodeKpl)
              .where("no_rm", pasien.no_rm);
            if (branchCode) kplQuery = kplQuery.where("kode_cabang", branchCode);
            const kpl = await kplQuery.first();

            if (!kpl) {
              const err = new Error(`Data kepemilikan paket ${kodeKpl} tidak ditemukan untuk pasien ${pasien.no_rm}`);
              err.statusCode = 422;
              throw err;
            }

            if (kpl.status !== "aktif") {
              const err = new Error(`Paket ${kpl.kode_kepemilikan_paket_layanan} sudah ${kpl.status}`);
              err.statusCode = 422;
              throw err;
            }

            // Cari detail layanan dalam paket
            let dkpl = null;
            if (kodeLayanan) {
              dkpl = await trx("trx_detail_kepemilikan_paket_layanan")
                .where("kode_kepemilikan_paket_layanan", kodeKpl)
                .where("kode_layanan", kodeLayanan)
                .whereRaw("sesi_total - sesi_terpakai > 0")
                .first();
            }

            if (!dkpl) {
              dkpl = await trx("trx_detail_kepemilikan_paket_layanan")
                .where("kode_kepemilikan_paket_layanan", kodeKpl)
                .whereRaw("sesi_total - sesi_terpakai > 0")
                .first();
            }

            if (!dkpl) {
              const err = new Error(`Sesi layanan paket untuk ${kodeLayanan || kodeKpl} sudah habis`);
              err.statusCode = 422;
              throw err;
            }

            // Potong 1 sesi (sesi_terpakai + 1)
            await trx("trx_detail_kepemilikan_paket_layanan")
              .where("id", dkpl.id)
              .update({
                sesi_terpakai: dkpl.sesi_terpakai + 1,
                updated_at: formatDateSystem(),
              });

            // Cek apakah seluruh detail sesi sudah habis (sisa_sesi === 0)
            const allDetails = await trx("trx_detail_kepemilikan_paket_layanan")
              .where("kode_kepemilikan_paket_layanan", kodeKpl)
              .select("sesi_total", "sesi_terpakai");

            const totalRemaining = allDetails.reduce((sum, d) => sum + Math.max(0, d.sesi_total - d.sesi_terpakai), 0);
            if (totalRemaining <= 0) {
              await trx("trx_kepemilikan_paket_layanan")
                .where("kode_kepemilikan_paket_layanan", kodeKpl)
                .update({
                  status: "habis",
                  updated_at: formatDateSystem(),
                });
            }

            // Ambil info master layanan & paket asal yang diklaim
            const targetLayKode = dkpl.kode_layanan || kodeLayanan;
            const lay = await trx("mst_layanan as l")
              .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
              .where("l.kode_layanan", targetLayKode)
              .select("l.nama", "l.tipe", "l.kode_ruangan", "l.durasi_menit", "r.nama_ruangan as nama_ruangan")
              .first();

            if (!lay) {
              const err = new Error(`Layanan ${targetLayKode} dalam paket ${kodeKpl} tidak ditemukan`);
              err.statusCode = 422;
              throw err;
            }

            const layDur = parseInt(lay.durasi_menit, 10);
            if (isNaN(layDur) || layDur <= 0) {
              const err = new Error(`Layanan "${lay.nama}" dalam klaim paket memiliki durasi tidak valid (${lay.durasi_menit})`);
              err.statusCode = 422;
              throw err;
            }

            const pktAsal = await trx("mst_paket_layanan as p")
              .leftJoin("mst_ruangan as r", "p.kode_ruangan", "r.kode_ruangan")
              .where("p.kode_paket_layanan", kpl.kode_paket_layanan)
              .select("p.nama as nama_paket", "p.tipe", "p.kode_ruangan", "r.nama_ruangan as nama_ruangan")
              .first();

            namaLayanan = `${lay.nama} (Klaim Sesi Paket)`;
            hargaLayanan = 0; // Klaim paket -> Rp 0 pada kunjungan ini
            tipeLayanan = (pktAsal?.tipe || lay?.tipe || "BEAUTY TREATMENT").toUpperCase();
            kodeRuanganTarget = lay?.kode_ruangan || pktAsal?.kode_ruangan || "RNG-002";
            namaRuanganTarget = lay?.nama_ruangan || pktAsal?.nama_ruangan || "Ruangan Facial & Peeling";
            durasiItem = layDur;
          } else if (jenis === "layanan") {
            const lay = await trx("mst_layanan as l")
              .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
              .where("l.kode_layanan", kodeLayanan)
              .where("l.status", "aktif")
              .select("l.nama", "l.harga", "l.tipe", "l.kode_ruangan", "l.durasi_menit", "l.wajib_konsultasi", "l.kode_ruangan_konsultasi", "r.nama_ruangan as nama_ruangan")
              .first();

            if (!lay) {
              const err = new Error(`Layanan ${kodeLayanan} tidak ditemukan atau nonaktif`);
              err.statusCode = 422;
              throw err;
            }

            const layDur = parseInt(lay.durasi_menit, 10);
            if (isNaN(layDur) || layDur <= 0) {
              const err = new Error(`Layanan "${lay.nama}" memiliki konfigurasi durasi tidak valid (${lay.durasi_menit})`);
              err.statusCode = 422;
              throw err;
            }

            namaLayanan = lay.nama;
            hargaLayanan = parseFloat(lay.harga || 0); // harga ASLI
            tipeLayanan = (lay.tipe || "BEAUTY TREATMENT").toUpperCase();
            kodeRuanganTarget = lay.kode_ruangan || "";
            namaRuanganTarget = lay.nama_ruangan || lay.kode_ruangan || "Ruang Treatment";
            durasiItem = layDur;
          } else {
            const pkt = await trx("mst_paket_layanan as p")
              .leftJoin("mst_ruangan as r", "p.kode_ruangan", "r.kode_ruangan")
              .where("p.kode_paket_layanan", kodeLayanan)
              .where("p.status", "aktif")
              .select("p.nama", "p.harga_paket", "p.tipe", "p.masa_berlaku_hari", "p.is_selamanya", "p.tanggal_selesai", "p.kode_ruangan", "r.nama_ruangan as nama_ruangan")
              .first();

            if (!pkt) {
              const err = new Error(`Paket ${kodeLayanan} tidak ditemukan atau nonaktif`);
              err.statusCode = 422;
              throw err;
            }
            namaLayanan = pkt.nama;
            hargaLayanan = parseFloat(pkt.harga_paket || 0); // harga ASLI
            tipeLayanan = (pkt.tipe || "BEAUTY TREATMENT").toUpperCase();
            kodeRuanganTarget = pkt.kode_ruangan || "";
            namaRuanganTarget = pkt.nama_ruangan || pkt.kode_ruangan || "Ruang Treatment";

            // Catat Kepemilikan Paket ke DB jika item ini ber-jenis "paket"
            const pktDetails = await trx("mst_detail_paket_layanan as dp")
              .leftJoin("mst_layanan as l", "dp.kode_layanan", "l.kode_layanan")
              .where("dp.kode_paket_layanan", kodeLayanan)
              .select("dp.kode_layanan", "dp.jumlah_sesi", "l.durasi_menit");

            let pktDurasi = 0;
            for (const d of pktDetails) {
              const dDur = parseInt(d.durasi_menit, 10);
              if (!isNaN(dDur) && dDur > 0) {
                pktDurasi += dDur;
              }
            }
            if (pktDurasi <= 0) {
              const err = new Error(`Paket layanan "${pkt.nama}" tidak memiliki total durasi layanan yang valid`);
              err.statusCode = 422;
              throw err;
            }
            durasiItem = pktDurasi;

            const totalSesiPaket = pktDetails.reduce((sum, d) => sum + parseInt(d.jumlah_sesi || 0, 10), 0);

            if (totalSesiPaket >= 1) {
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

              let tglExpired = "2099-12-31";
              const masaBerlakuHari = parseInt(pkt.masa_berlaku_hari || 0, 10);
              const isMasaBerlakuSelamanya = Boolean(pkt.is_masa_berlaku_selamanya) || masaBerlakuHari === 0;
              if (!isMasaBerlakuSelamanya && masaBerlakuHari > 0) {
                const dExp = new Date();
                dExp.setDate(dExp.getDate() + masaBerlakuHari);
                tglExpired = formatDateSystem(dExp, "yyyy-MM-dd");
              }

              const oKepemilikan = {
                kode_cabang: branchCode,
                kode_kepemilikan_paket_layanan: cKodeKpl,
                no_rm: pasien.no_rm,
                kode_paket_layanan: kodeLayanan,
                tanggal_beli: todayYmd,
                tanggal_expired: tglExpired,
                status: "aktif",
                tz: oPayload.tz || "Asia/Jakarta",
                created_by: username,
                created_at: formatDateSystem(),
                updated_by: username,
                updated_at: formatDateSystem(),
              };

              await trx("trx_kepemilikan_paket_layanan").insert(oKepemilikan);

              let dkSeq = 1;
              const vaDetailKpl = [];
              for (const det of pktDetails) {
                const cKodeDkpl = `DKPL-${todayStr}-${String(nextKplSeq).padStart(3, "0")}-${String(dkSeq).padStart(2, "0")}`;
                dkSeq++;
                const jSesi = parseInt(det.jumlah_sesi || 0, 10);
                vaDetailKpl.push({
                  kode_detail_kepemilikan_paket_layanan: cKodeDkpl,
                  kode_kepemilikan_paket_layanan: cKodeKpl,
                  kode_layanan: det.kode_layanan,
                  sesi_total: jSesi,
                  sesi_terpakai: 1, // 1 sesi terpakai pada antrean pendaftaran ini
                  tz: oPayload.tz || "Asia/Jakarta",
                  created_by: username,
                  created_at: formatDateSystem(),
                  updated_by: username,
                  updated_at: formatDateSystem(),
                });
              }
              if (vaDetailKpl.length > 0) {
                await trx("trx_detail_kepemilikan_paket_layanan").insert(vaDetailKpl);
              }
            }
          }

          // Logika Penentuan Konsultasi:
          // 1. Prioritas utama: Jika item berstatus WAJIB / MEDICAL TREATMENT -> needsConsult = true
          // 2. Jika butuh_konsul / lewat_konsultasi dikirimkan secara eksplisit (user memilih Ya/Tidak di dialog/step) -> ikuti pilihan user!
          // 3. Jika TIDAK PERLU KONSUL / SERVICE TREATMENT -> needsConsult = false
          // 4. Default: false
          let needsConsult = false;
          if (item.wajib_konsultasi === "wajib" || item.wajib_konsultasi === "WAJIB" || tipeLayanan === "MEDICAL TREATMENT") {
            needsConsult = true;
          } else if (item.butuh_konsul !== undefined && item.butuh_konsul !== null) {
            needsConsult = item.butuh_konsul === true || item.butuh_konsul === 1 || item.butuh_konsul === "true";
          } else if (item.lewat_konsultasi !== undefined && item.lewat_konsultasi !== null) {
            needsConsult = item.lewat_konsultasi === true || item.lewat_konsultasi === 1 || item.lewat_konsultasi === "true";
          } else if (item.wajib_konsultasi === "tidak" || item.wajib_konsultasi === "TIDAK" || tipeLayanan === "SERVICE TREATMENT") {
            needsConsult = false;
          } else {
            needsConsult = item.pilih_konsul === true || item.is_konsul === 1;
          }

          // Validasi Ketersediaan Petugas Jaga Hari Ini (Walk-In) di ruangan target layanan
          if (!kodeRuanganTarget) {
            const err = new Error(`Layanan "${namaLayanan}" belum memiliki konfigurasi ruangan tujuan yang valid`);
            err.statusCode = 422;
            throw err;
          }

          if (!checkedRoomsToday.has(kodeRuanganTarget)) {
            const activeSchedulesInRoom = await trx("mst_jadwal_karyawan as j")
              .leftJoin("mst_karyawan as k", "j.no_sip", "k.no_sip")
              .leftJoin("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
              .where("j.kode_ruangan", kodeRuanganTarget)
              .where("j.hari", todayDay)
              .where("j.status", "aktif")
              .modify((qb) => {
                if (branchCode) qb.where("j.kode_cabang", branchCode);
              })
              .select(
                "j.id",
                "j.kode_jadwal",
                "j.no_sip",
                "j.is_penanggung_jawab",
                "j.jam_mulai",
                "j.jam_selesai",
                "k.nama as nama_petugas",
                "r.nama_ruangan"
              );
            checkedRoomsToday.set(kodeRuanganTarget, activeSchedulesInRoom);
          }

          const activeSchedulesInRoom = checkedRoomsToday.get(kodeRuanganTarget);
          if (!activeSchedulesInRoom || activeSchedulesInRoom.length === 0) {
            const err = new Error(
              `Layanan "${namaLayanan}" tidak dapat dipilih karena ruangan ${namaRuanganTarget} (${kodeRuanganTarget}) tidak memiliki petugas/dokter jaga aktif hari ini (${todayDay.toUpperCase()})`
            );
            err.statusCode = 422;
            throw err;
          }

          // Validasi apakah sesi jadwal yang dipilih atau sesi ruangan sedang aktif saat ini (Walk-In)
          const nowMinutes = timeInfo.nowMinutes;
          const selectedJadwalKode = item.kode_jadwal || oPayload.kode_jadwal;
          let targetSchedule = null;
          if (selectedJadwalKode) {
            targetSchedule = activeSchedulesInRoom.find((s) => s.kode_jadwal === selectedJadwalKode);
          }
          if (!targetSchedule && activeSchedulesInRoom.length === 1) {
            targetSchedule = activeSchedulesInRoom[0];
          }

          if (targetSchedule) {
            const [startH, startM] = (targetSchedule.jam_mulai || "00:00").slice(0, 5).split(":").map(Number);
            const [endH, endM] = (targetSchedule.jam_selesai || "00:00").slice(0, 5).split(":").map(Number);
            const startMin = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
            const endMin = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);
            const startStr = (targetSchedule.jam_mulai || "00:00").slice(0, 5);
            const endStr = (targetSchedule.jam_selesai || "00:00").slice(0, 5);
            const staffName = targetSchedule.nama_petugas ? ` (${targetSchedule.nama_petugas})` : "";

            if (nowMinutes < startMin) {
              const err = new Error(
                `Sesi pelayanan di ${namaRuanganTarget}${staffName} baru dimulai pukul ${startStr} WIB (jadwal: ${startStr}-${endStr} WIB). Pendaftaran walk-in antrean hanya dapat dilakukan saat sesi telah aktif, atau silakan buat reservasi melalui menu Booking.`
              );
              err.statusCode = 422;
              throw err;
            }
            if (nowMinutes >= endMin) {
              const err = new Error(
                `Sesi pelayanan di ${namaRuanganTarget}${staffName} telah berakhir pukul ${endStr} WIB (jadwal: ${startStr}-${endStr} WIB). Pendaftaran walk-in antrean tidak dapat diproses.`
              );
              err.statusCode = 422;
              throw err;
            }
          } else {
            const ongoingSchedules = activeSchedulesInRoom.filter((s) => {
              const [startH, startM] = (s.jam_mulai || "00:00").slice(0, 5).split(":").map(Number);
              const [endH, endM] = (s.jam_selesai || "00:00").slice(0, 5).split(":").map(Number);
              const startMin = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
              const endMin = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);
              return nowMinutes >= startMin && nowMinutes < endMin;
            });

            if (ongoingSchedules.length === 0) {
              const schedulesSummary = activeSchedulesInRoom
                .map((s) => `${s.nama_petugas ? s.nama_petugas + " " : ""}(${(s.jam_mulai || "").slice(0, 5)}-${(s.jam_selesai || "").slice(0, 5)} WIB)`)
                .join(", ");
              const err = new Error(
                `Saat ini tidak ada sesi petugas yang sedang aktif bertugas di ${namaRuanganTarget} (jadwal hari ini: ${schedulesSummary}). Silakan daftar saat jam dinas petugas dimulai atau buat reservasi melalui menu Booking.`
              );
              err.statusCode = 422;
              throw err;
            }
          }

          // Cari promo aktif untuk item ini (disimpan sebagai referensi kasir, tidak mengubah harga)
          const promoKey1 = `${jenis}_${kodeLayanan}`;
          const promoItem = promoMap[promoKey1] || null;

          processedItems.push({
            jenis_layanan: jenis,
            kode_layanan: kodeLayanan,
            nama_layanan: namaLayanan,
            harga: hargaLayanan,         // harga ASLI — diskon diterapkan di kasir
            durasi_menit: durasiItem,
            durasi_tindakan: durasiItem,
            kode_promo: promoItem?.kode_promo || null,
            nama_promo: promoItem?.nama_promo || null,
            jenis_diskon: promoItem?.jenis_diskon || null,
            nilai_diskon: promoItem ? parseFloat(promoItem.nilai_diskon || 0) : null,
            kode_ruangan: kodeRuanganTarget,
            nama_ruangan: namaRuanganTarget,
            kode_ruangan_tujuan: kodeRuanganTarget,
            nama_ruangan_tujuan: namaRuanganTarget,
            tipe_layanan: tipeLayanan,
            needs_consult: needsConsult,
          });
        }

        // 2. Evaluasi Global Kunjungan: Apakah ada minimal satu layanan yang memerlukan konsultasi?
        // Jika ADA (wajib / opsional dipilih / medical), seluruh alur awal pasien dimulai dari Ruang Konsultasi (1 antrean terpadu).
        const hasAnyConsult = processedItems.some((item) => Boolean(item.needs_consult));

        if (hasAnyConsult && ruangKonsul) {
          // Cari apakah ada layanan konsultasi spesifik yang dipilih dalam transaksi ini
          const directConsultItem = processedItems.find(
            (pi) => (pi.nama_layanan || "").toLowerCase().includes("konsul") || pi.kode_ruangan_tujuan === ruangKonsul.kode_ruangan
          );
          if (directConsultItem && directConsultItem.durasi_tindakan) {
            const durDirect = parseInt(directConsultItem.durasi_tindakan, 10);
            if (!isNaN(durDirect) && durDirect > 0) {
              durasiSesiKonsulMenit = durDirect;
            }
          }

          // Validasi ketersediaan dokter jaga di Ruang Konsultasi hari ini & saat ini
          const nowMinutes = timeInfo.nowMinutes;

          const activeDoctorsInKonsul = await trx("mst_jadwal_karyawan as j")
            .leftJoin("mst_karyawan as k", "j.no_sip", "k.no_sip")
            .where("j.kode_ruangan", ruangKonsul.kode_ruangan)
            .where("j.hari", todayDay)
            .where("j.status", "aktif")
            .modify((qb) => {
              if (branchCode) qb.where("j.kode_cabang", branchCode);
            })
            .select(
              "j.id",
              "j.jam_mulai",
              "j.jam_selesai",
              "k.nama as nama_dokter",
              "k.jabatan"
            );

          const hasStrictWajib = processedItems.some(
            (pi) => pi.wajib_konsultasi === "wajib" || pi.wajib_konsultasi === "WAJIB" || pi.tipe_layanan === "MEDICAL TREATMENT"
          );

          // Cek apakah ada jadwal dokter aktif hari ini
          if (!activeDoctorsInKonsul || activeDoctorsInKonsul.length === 0) {
            const err = new Error(
              `Tidak ada dokter jaga di Ruang Konsultasi (${ruangKonsul.nama_ruangan}) hari ini. Silakan pilih alur "Langsung Tindakan" atau jadwalkan via menu Booking.`
            );
            err.statusCode = 422;
            throw err;
          }

          // Cek apakah jam dinas dokter di Ruang Konsultasi sudah berakhir saat ini (Walk-in)
          const validActiveDoctorsNow = activeDoctorsInKonsul.filter((d) => {
            const [endH, endM] = (d.jam_selesai || "00:00:00").slice(0, 5).split(":").map(Number);
            const endMin = (isNaN(endH) ? 0 : endH) * 60 + (isNaN(endM) ? 0 : endM);
            return endMin > nowMinutes;
          });

          if (validActiveDoctorsNow.length === 0) {
            const doctorSchedules = activeDoctorsInKonsul
              .map((d) => {
                const startStr = (d.jam_mulai || "08:00").slice(0, 5);
                const endStr = (d.jam_selesai || "16:00").slice(0, 5);
                return `${d.nama_dokter ? d.nama_dokter + " " : ""}(${startStr}-${endStr} WIB)`;
              })
              .join(", ");

            const maxEnd = Math.max(
              ...activeDoctorsInKonsul.map((d) => {
                const [h, m] = (d.jam_selesai || "00:00:00").slice(0, 5).split(":").map(Number);
                return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
              })
            );
            const maxEndStr = `${String(Math.floor(maxEnd / 60)).padStart(2, "0")}:${String(maxEnd % 60).padStart(2, "0")}`;

            const err = new Error(
              `Dokter di Ruang Konsultasi (${ruangKonsul.nama_ruangan}) sedang tidak bertugas atau jam dinas telah selesai pukul ${maxEndStr} WIB (jadwal dokter: ${doctorSchedules}). Silakan pilih alur "Langsung Tindakan" atau coba pada jam operasional dokter konsultasi.`
            );
            err.statusCode = 422;
            throw err;
          }

          // Pasien memiliki antrean awal di Ruang Konsultasi untuk layanannya
          for (const pi of processedItems) {
            pi.kode_ruangan = ruangKonsul.kode_ruangan;
            pi.nama_ruangan = ruangKonsul.nama_ruangan || "Ruang Konsultasi";
            pi.durasi_menit = durasiSesiKonsulMenit;
            pi.needs_consult = true;
          }
        }

        // 3. Kelompokkan item berdasarkan kode_ruangan awal (jika ada konsul, semua masuk ke grup Ruang Konsultasi)
        const groupsByRuangan = {};
        for (const pi of processedItems) {
          const key = pi.kode_ruangan || "UNASSIGNED";
          if (!groupsByRuangan[key]) {
            groupsByRuangan[key] = {
              kode_ruangan: pi.kode_ruangan,
              nama_ruangan: pi.nama_ruangan,
              items: [],
            };
          }
          groupsByRuangan[key].items.push(pi);
        }

        // 3. Validasi estimasi beban antrean terhadap booking terdekat (Soft Warning Collision Protection)
        const cfgBuffer = await trx("config").where("kode", "buffer_waktu_booking_menit").first();
        const bufferMenit = cfgBuffer ? parseInt(cfgBuffer.keterangan || 15, 10) : 15;

        const cfgToleransi = await trx("config").where("kode", "toleransi_keterlambatan_menit").first();
        const toleransiMenit = cfgToleransi ? parseInt(cfgToleransi.keterangan || 30, 10) : 30;

        const minRelevantBookingDate = new Date(now.getTime() - toleransiMenit * 60000);
        const minRelevantBookingTimeStr = minRelevantBookingDate.toTimeString().slice(0, 8); // "HH:mm:ss"

        // Helper untuk menghitung sisa beban antrean aktif di suatu ruangan
        const getSisaBebanRuangan = async (kodeRuangan) => {
          const activeQueues = await trx("trx_antrian_layanan as al")
            .where("al.created_at", ">=", `${todayYmd} 00:00:00`)
            .where("al.kode_ruangan", kodeRuangan)
            .modify((qb) => {
              if (branchCode) qb.where("al.kode_cabang", branchCode);
            })
            .whereIn("al.status", ["dipanggil", "menunggu"])
            .select("al.id", "al.kode_antrian_layanan", "al.status", "al.dipanggil_at");

          let queueDetails = [];
          if (activeQueues.length > 0) {
            const queueCodes = activeQueues.map((q) => q.kode_antrian_layanan);
            queueDetails = await trx("trx_detail_antrian_layanan")
              .whereIn("kode_antrian_layanan", queueCodes)
              .whereIn("jenis_layanan", ["layanan", "paket", "klaim_paket"])
              .where("durasi_menit", ">", 0)
              .select("kode_antrian_layanan", "durasi_menit");
          }

          const queueDurationMap = new Map();
          queueDetails.forEach((d) => {
            const cur = queueDurationMap.get(d.kode_antrian_layanan) || 0;
            const durasi = parseInt(d.durasi_menit, 10);
            if (!isNaN(durasi) && durasi > 0) {
              queueDurationMap.set(d.kode_antrian_layanan, cur + durasi);
            }
          });

          let sisaBebanMenit = 0;
          for (const q of activeQueues) {
            const totalDurasiAntrean = queueDurationMap.get(q.kode_antrian_layanan);
            if (totalDurasiAntrean === undefined) {
              console.warn(`[ANOMALI] Antrean ${q.kode_antrian_layanan} aktif tapi tidak punya detail layanan valid.`);
            }
            // Konservatif: menggunakan totalDurasiAntrean || 0 agar tidak menginflasi estimasi beban antrean jika ada data anomali
            const bebanAntrean = totalDurasiAntrean || 0;
            if (q.status === "dipanggil") {
              const dipanggilTime = q.dipanggil_at ? new Date(q.dipanggil_at).getTime() : now.getTime();
              const elapsedMin = Math.max(0, Math.floor((now.getTime() - dipanggilTime) / 60000));
              const remainingActive = Math.max(0, bebanAntrean - elapsedMin);
              sisaBebanMenit += remainingActive;
            } else if (q.status === "menunggu") {
              sisaBebanMenit += bebanAntrean;
            }
          }

          return { sisaBebanMenit, activeCount: activeQueues.length };
        };

        for (const key of Object.keys(groupsByRuangan)) {
          const group = groupsByRuangan[key];
          const groupItems = group.items;
          if (!group.kode_ruangan) continue;

          const isKonsulGroup = group.kode_ruangan === ruangKonsul?.kode_ruangan && hasAnyConsult;
          const walkinDurasiMenit = isKonsulGroup
            ? durasiSesiKonsulMenit
            : groupItems.reduce((sum, item) => {
                const dur = parseInt(item.durasi_menit, 10);
                if (isNaN(dur) || dur <= 0) {
                  const err = new Error(`Item layanan "${item.nama_layanan || item.kode_layanan}" memiliki durasi tidak valid (${dur})`);
                  err.statusCode = 422;
                  throw err;
                }
                return sum + dur;
              }, 0);

          // 1. Cek Ruangan Pertama (group.kode_ruangan, misal RNG-007 atau RNG-001)
          const { sisaBebanMenit, activeCount } = await getSisaBebanRuangan(group.kode_ruangan);
          const totalBebanRuanganMenit = sisaBebanMenit + walkinDurasiMenit;
          const estimasiSelesaiDate = new Date(now.getTime() + totalBebanRuanganMenit * 60000);
          const batasAmanDate = new Date(estimasiSelesaiDate.getTime() + bufferMenit * 60000);

          const batasAmanStr = batasAmanDate.toTimeString().slice(0, 8);
          const estimasiSelesaiStr = estimasiSelesaiDate.toTimeString().slice(0, 5);

          // Cari booking terdekat di ruangan pertama
          const nearestBooking = await trx("trx_booking as b")
            .leftJoin("mst_pasien as p", "b.no_rm", "p.no_rm")
            .leftJoin("mst_jadwal_karyawan as j", "b.kode_jadwal", "j.kode_jadwal")
            .where("b.tanggal_booking", todayYmd)
            .where("b.status", "dikonfirmasi")
            .modify((qb) => {
              if (branchCode) qb.where("b.kode_cabang", branchCode);
            })
            .where("b.jam_booking", ">=", minRelevantBookingTimeStr)
            .where(function () {
              this.where("b.kode_ruangan", group.kode_ruangan)
                .orWhere("j.kode_ruangan", group.kode_ruangan);
            })
            .orderBy("b.jam_booking", "asc")
            .select("b.kode_booking", "b.jam_booking", "b.no_rm", "p.nama as nama_pasien")
            .first();

          let collisionTarget = null;

          if (nearestBooking) {
            const bkgTime = String(nearestBooking.jam_booking || "").slice(0, 8);
            if (batasAmanStr > bkgTime) {
              collisionTarget = {
                booking: nearestBooking,
                kode_ruangan: group.kode_ruangan,
                nama_ruangan: group.nama_ruangan,
                bkgTime,
                estimasiSelesaiStr,
                batasAmanDate,
                totalBebanMenit: totalBebanRuanganMenit,
                durasiWalkinMenit: walkinDurasiMenit,
                sisaAntreanMenit: sisaBebanMenit,
                antreanBerjalanCount: activeCount,
              };
            }
          }

          // 2. Cek Ruangan Tujuan Lanjutan (jika group adalah Ruang Konsultasi dan item memiliki kode_ruangan_tujuan berbeda)
          if (!collisionTarget) {
            const targetRooms = new Map();
            for (const item of groupItems) {
              if (item.kode_ruangan_tujuan && item.kode_ruangan_tujuan !== group.kode_ruangan) {
                const trKode = item.kode_ruangan_tujuan;
                const trNama = item.nama_ruangan_tujuan || `Ruangan ${trKode}`;
                const curDur = targetRooms.get(trKode)?.durasi || 0;
                const rawDur = parseInt(item.durasi_tindakan || item.durasi_menit, 10);
                if (isNaN(rawDur) || rawDur <= 0) {
                  const err = new Error(`Layanan "${item.nama_layanan || item.kode_layanan}" memiliki durasi tindakan tidak valid (${rawDur})`);
                  err.statusCode = 422;
                  throw err;
                }
                targetRooms.set(trKode, {
                  kode: trKode,
                  nama: trNama,
                  durasi: curDur + rawDur,
                });
              }
            }

            for (const tr of targetRooms.values()) {
              const { sisaBebanMenit: sisaTarget, activeCount: countTarget } = await getSisaBebanRuangan(tr.kode);
              // Estimasi selesai di ruangan tujuan = waktu sekarang + beban konsultasi + sisa antrean ruangan tujuan + durasi tindakan
              const totalBebanTargetMenit = totalBebanRuanganMenit + sisaTarget + tr.durasi;
              const estimasiSelesaiTargetDate = new Date(now.getTime() + totalBebanTargetMenit * 60000);
              const batasAmanTargetDate = new Date(estimasiSelesaiTargetDate.getTime() + bufferMenit * 60000);

              const batasAmanTargetStr = batasAmanTargetDate.toTimeString().slice(0, 8);
              const estimasiSelesaiTargetStr = estimasiSelesaiTargetDate.toTimeString().slice(0, 5);

              const nearestBookingTarget = await trx("trx_booking as b")
                .leftJoin("mst_pasien as p", "b.no_rm", "p.no_rm")
                .leftJoin("mst_jadwal_karyawan as j", "b.kode_jadwal", "j.kode_jadwal")
                .where("b.tanggal_booking", todayYmd)
                .where("b.status", "dikonfirmasi")
                .modify((qb) => {
                  if (branchCode) qb.where("b.kode_cabang", branchCode);
                })
                .where("b.jam_booking", ">=", minRelevantBookingTimeStr)
                .where(function () {
                  this.where("b.kode_ruangan", tr.kode)
                    .orWhere("j.kode_ruangan", tr.kode);
                })
                .orderBy("b.jam_booking", "asc")
                .select("b.kode_booking", "b.jam_booking", "b.no_rm", "p.nama as nama_pasien")
                .first();

              if (nearestBookingTarget) {
                const bkgTimeTarget = String(nearestBookingTarget.jam_booking || "").slice(0, 8);
                if (batasAmanTargetStr > bkgTimeTarget) {
                  collisionTarget = {
                    booking: nearestBookingTarget,
                    kode_ruangan: tr.kode,
                    nama_ruangan: tr.nama,
                    bkgTime: bkgTimeTarget,
                    estimasiSelesaiStr: estimasiSelesaiTargetStr,
                    batasAmanDate: batasAmanTargetDate,
                    totalBebanMenit: totalBebanTargetMenit,
                    durasiWalkinMenit: tr.durasi,
                    sisaAntreanMenit: sisaTarget,
                    antreanBerjalanCount: countTarget,
                    isLanjutanKonsultasi: true,
                    durasiKonsultasiMenit: walkinDurasiMenit,
                    sisaAntreanKonsulMenit: sisaBebanMenit,
                    antreanKonsulCount: activeCount,
                    durasiTindakanMenit: tr.durasi,
                  };
                  break;
                }
              }
            }
          }

          let isCollision = false;
          let catatanOverride = null;

          if (collisionTarget) {
            const bookingTimeFormatted = collisionTarget.bkgTime.slice(0, 5);
            isCollision = true;
            const namaPasienBooking = collisionTarget.booking.nama_pasien || collisionTarget.booking.no_rm;
            catatanOverride = `Override benturan booking ${bookingTimeFormatted} WIB (${namaPasienBooking}) di ${collisionTarget.nama_ruangan}`;

            const isOverridden =
              oPayload.override_peringatan_booking === true ||
              oPayload.override_peringatan_booking === 1 ||
              oPayload.override_peringatan_booking === "true";

            if (!isOverridden) {
              const totalBookingRow = await trx("trx_booking as b")
                .leftJoin("mst_jadwal_karyawan as j", "b.kode_jadwal", "j.kode_jadwal")
                .where("b.tanggal_booking", todayYmd)
                .where("b.status", "dikonfirmasi")
                .where(function () {
                  this.where("b.kode_ruangan", collisionTarget.kode_ruangan)
                    .orWhere("j.kode_ruangan", collisionTarget.kode_ruangan);
                })
                .count("b.id as total")
                .first();

              const totalBkgCount = parseInt(totalBookingRow?.total || 1, 10);

              const warnErr = new Error(
                `Estimasi antrean di ${collisionTarget.nama_ruangan} (selesai ±${collisionTarget.estimasiSelesaiStr}) ditambah buffer ${bufferMenit} menit berpotensi melewati jadwal booking pasien ${namaPasienBooking} pukul ${bookingTimeFormatted} WIB.`
              );
              warnErr.isWarning = true;
              warnErr.dataPeringatan = {
                kode_ruangan: collisionTarget.kode_ruangan,
                nama_ruangan: collisionTarget.nama_ruangan,
                estimasi_selesai: collisionTarget.estimasiSelesaiStr,
                batas_aman: collisionTarget.batasAmanDate.toTimeString().slice(0, 5),
                jam_booking: bookingTimeFormatted,
                nama_pasien_booking: namaPasienBooking,
                no_rm_booking: collisionTarget.booking.no_rm,
                kode_booking: collisionTarget.booking.kode_booking,
                total_beban_menit: collisionTarget.totalBebanMenit,
                durasi_walkin_menit: collisionTarget.durasiWalkinMenit,
                sisa_antrean_menit: collisionTarget.sisaAntreanMenit,
                buffer_menit: bufferMenit,
                antrean_berjalan_count: collisionTarget.antreanBerjalanCount,
                total_booking_hari_ini: totalBkgCount,
                is_lanjutan_konsultasi: Boolean(collisionTarget.isLanjutanKonsultasi),
                durasi_konsultasi_menit: collisionTarget.durasiKonsultasiMenit || 0,
                sisa_antrean_konsul_menit: collisionTarget.sisaAntreanKonsulMenit || 0,
                antrean_konsul_count: collisionTarget.antreanKonsulCount || 0,
                durasi_tindakan_menit: collisionTarget.durasiTindakanMenit || collisionTarget.durasiWalkinMenit || 0,
              };
              throw warnErr;
            }
          }

          group.isCollision = isCollision;
          group.catatanOverride = catatanOverride;
          group.estimasiSelesaiStr = estimasiSelesaiStr;
        }

        // 4. Insert trx_antrian_layanan per kelompok ruangan
        for (const key of Object.keys(groupsByRuangan)) {
          const group = groupsByRuangan[key];
          const groupItems = group.items;

          // Dapatkan urutan kode_antrian_layanan (global)
          const lastAntrianLayanan = await trx("trx_antrian_layanan")
            .where("kode_antrian_layanan", "like", `${prefixAntrianLayanan}%`)
            .orderBy("id", "desc")
            .first();

          let nextSeq = 1;
          if (lastAntrianLayanan && lastAntrianLayanan.kode_antrian_layanan) {
            const parts = lastAntrianLayanan.kode_antrian_layanan.split("-");
            const num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num)) {
              nextSeq = num + 1;
            }
          }
          const seqPadded = String(nextSeq).padStart(3, "0");
          const cKodeAntrianLayanan = `${prefixAntrianLayanan}${seqPadded}`;

          // Hitung nomor_antrian KHUSUS PER RUANGAN HARI INI
          let lastNoQuery = trx("trx_antrian_layanan")
            .where("created_at", ">=", todayYmd + " 00:00:00");

          if (group.kode_ruangan) {
            lastNoQuery = lastNoQuery.where("kode_ruangan", group.kode_ruangan);
          } else {
            lastNoQuery = lastNoQuery.where(function () {
              this.whereNull("kode_ruangan").orWhere("kode_ruangan", "");
            });
          }

          const lastNoAntrian = await lastNoQuery.orderBy("id", "desc").first();

          let nextNo = 1;
          if (lastNoAntrian && lastNoAntrian.nomor_antrian) {
            const num = parseInt(lastNoAntrian.nomor_antrian, 10);
            if (!isNaN(num)) {
              nextNo = num + 1;
            }
          }
          const cNomorAntrianSesi = String(nextNo).padStart(2, "0");

          const combinedNamaLayanan = groupItems.map((d) => d.nama_layanan).join(", ");
          const combinedKodeLayanan = groupItems.map((d) => d.kode_layanan).join(", ");
          const totalHargaGroup = groupItems.reduce((sum, d) => sum + d.harga, 0);

          const hasTindakanLanjutan = groupItems.some(
            (item) => Boolean(item.needs_consult) && Boolean(item.kode_ruangan_tujuan) && item.kode_ruangan_tujuan !== group.kode_ruangan
          );
          const targetRuangLanjutan = hasTindakanLanjutan
            ? groupItems.find((item) => item.kode_ruangan_tujuan && item.kode_ruangan_tujuan !== group.kode_ruangan)?.kode_ruangan_tujuan || null
            : null;

          const oInsertLayanan = {
            kode_cabang: branchCode,
            kode_antrian_layanan: cKodeAntrianLayanan,
            kode_kunjungan: cKodeKunjungan,
            nomor_antrian: cNomorAntrianSesi,
            kode_ruangan: group.kode_ruangan,
            nama_ruangan: group.nama_ruangan,
            status: "menunggu",
            lanjut_ke_tindakan: hasTindakanLanjutan ? 1 : 0,
            kode_ruangan_tujuan_lanjutan: targetRuangLanjutan,
            override_peringatan_booking: group.isCollision ? 1 : 0,
            catatan_override_booking: group.catatanOverride || null,
            tz: oPayload.tz || "Asia/Jakarta",
            created_by: username,
            created_at: formatDateSystem(),
            updated_by: username,
            updated_at: formatDateSystem(),
          };

          await trx("trx_antrian_layanan").insert(oInsertLayanan);

          // Insert detail rows into trx_detail_antrian_layanan for each selected service
          let dSeq = 1;
          const vaInsertDetail = [];
          for (const item of groupItems) {
            const cKodeDetailAntrian = `DAL-${todayStr}-${seqPadded}-${String(dSeq).padStart(2, "0")}`;
            dSeq++;
            const dMenit = parseInt(item.durasi_tindakan || item.durasi_menit, 10);
            if (isNaN(dMenit) || dMenit <= 0) {
              const err = new Error(`Item layanan "${item.nama_layanan}" memiliki durasi tidak valid (${item.durasi_tindakan || item.durasi_menit}) saat akan disimpan`);
              err.statusCode = 422;
              throw err;
            }
            vaInsertDetail.push({
              kode_detail_antrian_layanan: cKodeDetailAntrian,
              kode_antrian_layanan: cKodeAntrianLayanan,
              kode_kunjungan: cKodeKunjungan,
              jenis_layanan: item.jenis_layanan || "layanan",
              kode_layanan: item.kode_layanan,
              nama_layanan: item.nama_layanan,
              harga: item.harga || 0,         // harga ASLI — diskon diterapkan di kasir
              durasi_menit: dMenit,
              kode_promo: item.kode_promo || null,
              nama_promo: item.nama_promo || null,
              jenis_diskon: item.jenis_diskon || null,
              nilai_diskon: item.nilai_diskon ?? null,
              kode_ruangan: group.kode_ruangan,
              nama_ruangan: group.nama_ruangan,
              tz: oPayload.tz || "Asia/Jakarta",
              created_by: username,
              created_at: formatDateSystem(),
              updated_by: username,
              updated_at: formatDateSystem(),
            });
          }
          if (vaInsertDetail.length > 0) {
            await trx("trx_detail_antrian_layanan").insert(vaInsertDetail);
          }

          vaCreatedAntrianLayanan.push({
            ...oInsertLayanan,
            nama_layanan: combinedNamaLayanan,
            harga: totalHargaGroup,
            detail_items: groupItems,
            details: vaInsertDetail,
          });
        }
      }

      // Audit Log
      const isAnyOverride = vaCreatedAntrianLayanan.some((a) => a.override_peringatan_booking === 1);
      const overrideNote = isAnyOverride
        ? ` [OVERRIDE PERINGATAN BOOKING: ${vaCreatedAntrianLayanan.map((a) => a.catatan_override_booking).filter(Boolean).join("; ")}]`
        : "";

      await ChangesLog(
        {
          description: `Pendaftaran Kunjungan Pasien (${pasien.no_rm} - ${pasien.nama}) Kunjungan (${cKodeKunjungan}) Total ${vaCreatedAntrianLayanan.length} Layanan/Paket${overrideNote}`,
          tableName: "trx_kunjungan",
          referenceCode: cKodeKunjungan,
          action: "CREATE",
          dataBefore: null,
          dataAfter: {
            kunjungan: oKunjunganData,
            antrian_awal: antrianAwalTersedia,
            antrian_layanan: vaCreatedAntrianLayanan,
          },
          user: username,
          tz: oPayload.tz || "Asia/Jakarta",
        },
        trx
      );

      resultData = {
        kode_kunjungan: cKodeKunjungan,
        no_rm: pasien.no_rm,
        nama_pasien: pasien.nama,
        nomor_antrian_awal: antrianAwalTersedia ? antrianAwalTersedia.nomor_antrian : null,
        kode_antrian_awal: antrianAwalTersedia ? antrianAwalTersedia.kode_antrian_awal : null,
        tanggal_kunjungan: todayYmd,
        jam_datang: jamDatang,
        antrian_layanan: vaCreatedAntrianLayanan,
      };
    });

    const msg = items.length > 0
      ? `Pendaftaran kunjungan & ${vaCreatedAntrianLayanan.length} nomor antrean layanan berhasil diterbitkan`
      : `Pendaftaran kunjungan pasien ${pasien.nama} berhasil diterbitkan (Tanpa Layanan)`;

    return res.status(200).json({
      status: status.SUKSES,
      message: msg,
      datetime: formatDateSystem(),
      data: resultData,
    });
  } catch (error) {
    if (error.isWarning) {
      return res.status(200).json({
        status: "WARN_BOOKING_COLLISION",
        peringatan: true,
        message: error.message,
        data_peringatan: error.dataPeringatan,
        datetime: formatDateSystem(),
      });
    }

    if (error.statusCode === 422) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: error.message,
        datetime: formatDateSystem(),
      });
    }

    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_ambil_antrian_layanan.js",
      func: "ambil_antrian_layanan_terpadu",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
