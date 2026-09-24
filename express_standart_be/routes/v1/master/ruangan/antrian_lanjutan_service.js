/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_lanjutan_service.js
 * @description Helper terpusat untuk menerbitkan antrean rujukan ke ruang tindakan lanjutan
 *              Digunakan secara konsisten oleh Jalur A (antrian_layanan_panggil.js) dan
 *              Jalur B (ruangan_rekomendasi.js) agar alur tidak pernah divergen.
 */

import { formatDateSystem } from "../../components/tools/date_tools.js";

/**
 * Menerbitkan antrean baru di trx_antrian_layanan untuk ruang tindakan lanjutan.
 * Aturan Ketat:
 * 1. Produk dokter TIDAK PERNAH dijadikan rujukan antrean.
 * 2. Rujukan TIDAK PERNAH diterbitkan kembali ke Ruang Konsultasi (is_konsultasi === 1)
 *    atau ke ruangan yang sama dengan antrean saat ini (currentAntrian.kode_ruangan).
 * 3. Jika tidak ada ruangan tindakan valid yang berbeda, mengembalikan array kosong [].
 *
 * @param {import('knex').Knex.Transaction} trx - Knex transaction object
 * @param {Object} params
 * @param {Object} params.currentAntrian - Record antrian konsultasi saat ini
 * @param {string} params.kodeKunjungan - Kode kunjungan pasien
 * @param {string} params.username - Username staff yang melakukan aksi
 * @param {Array} [params.rekomendasiItems=[]] - Item rekomendasi layanan baru dari form dokter (opsional)
 * @param {string} [params.tz="Asia/Jakarta"] - Timezone
 * @returns {Promise<Array<Object>>} Daftar antrean rujukan yang berhasil dibuat
 */
export const terbitkanAntreanLanjutanRuangan = async (trx, {
  currentAntrian,
  kodeKunjungan,
  username,
  rekomendasiItems = [],
  tz = "Asia/Jakarta"
}) => {
  if (!currentAntrian || !kodeKunjungan) {
    return [];
  }

  const branchCode = currentAntrian.kode_cabang || (await trx("trx_kunjungan").where("kode_kunjungan", kodeKunjungan).select("kode_cabang").first())?.kode_cabang || "CBG-001";
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const todayYmd = new Date().toISOString().slice(0, 10);
  const prefixAntrianLayanan = `AL-${todayStr}-`;

  // 1. Kumpulkan item layanan untuk tindakan lanjutan
  const layananItems = [];

  // A. Jika ada item layanan baru dari form rekomendasi dokter
  if (Array.isArray(rekomendasiItems) && rekomendasiItems.length > 0) {
    for (const item of rekomendasiItems) {
      const j = (item.jenis || "").toLowerCase();
      // Produk / paket_produk TIDAK BOLEH dibuatkan antrean layanan
      if (["produk", "paket_produk"].includes(j)) {
        continue;
      }
      if (["layanan", "paket_layanan", "paket"].includes(j)) {
        let rKode = item.kode_ruangan;
        let rNama = item.nama_ruangan;
        let isKonsul = false;

        // Lookup ruangan jika belum ada info ruangan di payload item
        if (!rKode && item.kode) {
          const layInfo = await trx("mst_layanan as l")
            .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
            .where("l.kode_layanan", item.kode)
            .select("l.kode_ruangan", "r.nama_ruangan", "r.is_konsultasi")
            .first();

          if (layInfo && layInfo.kode_ruangan) {
            rKode = layInfo.kode_ruangan;
            rNama = layInfo.nama_ruangan || "Ruang Treatment";
            isKonsul = Boolean(layInfo.is_konsultasi);
          } else {
            const pktInfo = await trx("mst_paket_layanan as p")
              .leftJoin("mst_ruangan as r", "p.kode_ruangan", "r.kode_ruangan")
              .where("p.kode_paket_layanan", item.kode)
              .select("p.kode_ruangan", "r.nama_ruangan", "r.is_konsultasi")
              .first();
            if (pktInfo && pktInfo.kode_ruangan) {
              rKode = pktInfo.kode_ruangan;
              rNama = pktInfo.nama_ruangan || "Ruang Treatment";
              isKonsul = Boolean(pktInfo.is_konsultasi);
            }
          }
        }

        // Jangan buat rujukan ke ruangan yang sama atau ke ruang konsultasi
        if (rKode && rKode !== currentAntrian.kode_ruangan && !isKonsul) {
          layananItems.push({
            jenis: j === "paket_layanan" ? "paket" : "layanan",
            kode: item.kode || item.kode_layanan,
            nama: item.nama || item.nama_layanan,
            harga: parseFloat(item.harga || 0),
            kode_ruangan: rKode,
            nama_ruangan: rNama || "Ruang Treatment",
          });
        }
      }
    }
  }

  // B. Jika tidak ada item rekomendasi baru, cari item layanan pendaftaran asli yang punya ruangan tindakan
  if (layananItems.length === 0) {
    let targetRoomCode = currentAntrian.kode_ruangan_tujuan_lanjutan || null;

    // Cari detail layanan dari antrean pendaftaran/konsultasi ini (abaikan produk)
    const detailRows = await trx("trx_detail_antrian_layanan as dal")
      .leftJoin("mst_layanan as l", "dal.kode_layanan", "l.kode_layanan")
      .leftJoin("mst_ruangan as r_layanan", "l.kode_ruangan", "r_layanan.kode_ruangan")
      .leftJoin("mst_paket_layanan as p", "dal.kode_layanan", "p.kode_paket_layanan")
      .leftJoin("mst_ruangan as r_paket", "p.kode_ruangan", "r_paket.kode_ruangan")
      .where("dal.kode_antrian_layanan", currentAntrian.kode_antrian_layanan)
      .whereNotIn("dal.jenis_layanan", ["produk", "paket_produk"])
      .select(
        "dal.*",
        "l.kode_ruangan as lay_ruangan",
        "r_layanan.nama_ruangan as lay_nama_ruangan",
        "r_layanan.is_konsultasi as lay_is_konsul",
        "p.kode_ruangan as pkt_ruangan",
        "r_paket.nama_ruangan as pkt_nama_ruangan",
        "r_paket.is_konsultasi as pkt_is_konsul"
      );

    for (const d of detailRows) {
      const isProduct = ["produk", "paket_produk"].includes((d.jenis_layanan || "").toLowerCase());
      if (isProduct) continue;

      let rKode = targetRoomCode || d.lay_ruangan || d.pkt_ruangan;
      let rNama = d.lay_nama_ruangan || d.pkt_nama_ruangan || "Ruang Treatment";
      const isKonsul = Boolean(d.lay_is_konsul) || Boolean(d.pkt_is_konsul);

      // Pastikan bukan ruang konsultasi dan bukan ruangan saat ini
      if (isKonsul || (rKode && rKode === currentAntrian.kode_ruangan)) {
        continue;
      }

      if (rKode) {
        layananItems.push({
          jenis: d.jenis_layanan || "layanan",
          kode: d.kode_layanan,
          nama: d.nama_layanan,
          harga: parseFloat(d.harga || 0),
          kode_ruangan: rKode,
          nama_ruangan: rNama,
        });
      }
    }

    // Fallback ekstra jika detailRows kosong: cari di level kunjungan
    if (layananItems.length === 0) {
      const detailAsalKunjungan = await trx("trx_detail_antrian_layanan as dal")
        .leftJoin("mst_layanan as l", "dal.kode_layanan", "l.kode_layanan")
        .leftJoin("mst_ruangan as r_lay", "l.kode_ruangan", "r_lay.kode_ruangan")
        .leftJoin("mst_paket_layanan as p", "dal.kode_layanan", "p.kode_paket_layanan")
        .leftJoin("mst_ruangan as r_pkt", "p.kode_ruangan", "r_pkt.kode_ruangan")
        .where("dal.kode_kunjungan", kodeKunjungan)
        .whereNotIn("dal.jenis_layanan", ["produk", "paket_produk"])
        .where(function () {
          this.where(function () {
            this.whereNotNull("l.kode_ruangan")
              .whereNot("l.kode_ruangan", currentAntrian.kode_ruangan)
              .andWhere(function () {
                this.whereNull("r_lay.is_konsultasi").orWhere("r_lay.is_konsultasi", 0);
              });
          }).orWhere(function () {
            this.whereNotNull("p.kode_ruangan")
              .whereNot("p.kode_ruangan", currentAntrian.kode_ruangan)
              .andWhere(function () {
                this.whereNull("r_pkt.is_konsultasi").orWhere("r_pkt.is_konsultasi", 0);
              });
          });
        })
        .select(
          "dal.*",
          "l.kode_ruangan as lay_ruangan",
          "r_lay.nama_ruangan as lay_nama_ruangan",
          "p.kode_ruangan as pkt_ruangan",
          "r_pkt.nama_ruangan as pkt_nama_ruangan"
        )
        .first();

      if (detailAsalKunjungan) {
        const rKode = detailAsalKunjungan.lay_ruangan || detailAsalKunjungan.pkt_ruangan;
        const rNama = detailAsalKunjungan.lay_nama_ruangan || detailAsalKunjungan.pkt_nama_ruangan || "Ruang Treatment";
        if (rKode && rKode !== currentAntrian.kode_ruangan) {
          layananItems.push({
            jenis: detailAsalKunjungan.jenis_layanan || "layanan",
            kode: detailAsalKunjungan.kode_layanan,
            nama: detailAsalKunjungan.nama_layanan,
            harga: parseFloat(detailAsalKunjungan.harga || 0),
            kode_ruangan: rKode,
            nama_ruangan: rNama,
          });
        }
      }
    }
  }

  // Jika tidak ada item tindakan lanjutan yang valid ke ruang berbeda, tidak ada rujukan
  if (layananItems.length === 0) {
    return [];
  }

  // 2. Kelompokkan item berdasarkan kode_ruangan (hanya ruangan tindakan yang valid dan berbeda)
  const groupsByRuangan = {};
  for (const item of layananItems) {
    const targetKodeRuang = item.kode_ruangan;
    if (!targetKodeRuang || targetKodeRuang === currentAntrian.kode_ruangan) {
      continue;
    }
    const targetNamaRuang = item.nama_ruangan || item.kode_ruangan || "Ruang Treatment";

    if (!groupsByRuangan[targetKodeRuang]) {
      groupsByRuangan[targetKodeRuang] = {
        kode_ruangan: targetKodeRuang,
        nama_ruangan: targetNamaRuang,
        items: [],
      };
    }
    groupsByRuangan[targetKodeRuang].items.push(item);
  }

  if (Object.keys(groupsByRuangan).length === 0) {
    return [];
  }

  const createdAntrianLayanan = [];

  // 3. Terbitkan antrean untuk setiap kelompok ruangan tindakan
  for (const key of Object.keys(groupsByRuangan)) {
    const group = groupsByRuangan[key];
    const groupItems = group.items;

    // Cek IDEMPOTENSI: apakah antrean rujukan dari antrean konsultasi ini sudah pernah dibuat sebelumnya?
    const existingReferral = await trx("trx_antrian_layanan")
      .where("kode_kunjungan", kodeKunjungan)
      .where("kode_antrian_asal", currentAntrian.kode_antrian_layanan)
      .where("kode_ruangan", group.kode_ruangan)
      .whereNot("status", "batal")
      .first();

    if (existingReferral) {
      createdAntrianLayanan.push(existingReferral);
      continue;
    }

    // Cek ketersediaan jadwal dokter / petugas aktif hari ini di ruangan tujuan
    const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    const [yr, mo, dy] = todayYmd.split("-").map(Number);
    const todayDay = HARI_MAP[new Date(yr, mo - 1, dy).getDay()];

    const activeStaffInRoom = await trx("mst_jadwal_karyawan as j")
      .where("j.kode_ruangan", group.kode_ruangan)
      .where("j.hari", todayDay)
      .where("j.status", "aktif")
      .modify((qb) => {
        if (branchCode) qb.where("j.kode_cabang", branchCode);
      })
      .select("j.id", "j.jam_mulai", "j.jam_selesai");

    if (!activeStaffInRoom || activeStaffInRoom.length === 0) {
      const err = new Error(
        `Ruangan "${group.nama_ruangan}" (${group.kode_ruangan}) tidak memiliki dokter atau petugas jaga aktif hari ini (${todayDay.toUpperCase()}). Tidak dapat menerbitkan rujukan ke ruangan ini.`
      );
      err.statusCode = 422;
      throw err;
    }

    const nowTimeStr = new Date().toLocaleTimeString("en-GB", {
      timeZone: tz || "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const [nowH, nowM] = nowTimeStr.split(":").map(Number);
    const nowMinutes = (isNaN(nowH) ? 0 : nowH) * 60 + (isNaN(nowM) ? 0 : nowM);

    const ongoingStaff = activeStaffInRoom.filter((s) => {
      if (!s.jam_mulai || !s.jam_selesai) return false;
      const [sh, sm] = s.jam_mulai.slice(0, 5).split(":").map(Number);
      const [eh, em] = s.jam_selesai.slice(0, 5).split(":").map(Number);
      const sMin = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
      const eMin = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);
      return nowMinutes >= sMin && nowMinutes < eMin;
    });

    if (ongoingStaff.length === 0) {
      const unstartedShifts = activeStaffInRoom.filter((s) => {
        if (!s.jam_mulai) return false;
        const [sh, sm] = s.jam_mulai.slice(0, 5).split(":").map(Number);
        const sMin = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
        return nowMinutes < sMin;
      });

      if (unstartedShifts.length > 0) {
        const earliestStart = unstartedShifts
          .map((s) => (s.jam_mulai ? s.jam_mulai.slice(0, 5) : "08:00"))
          .sort()[0];
        const err = new Error(
          `Ruangan "${group.nama_ruangan}" (${group.kode_ruangan}) belum memulai jam operasional/tindakan (jadwal shift baru dimulai pukul ${earliestStart} WIB). Tidak dapat menerbitkan rujukan antrean saat ini.`
        );
        err.statusCode = 422;
        throw err;
      }

      const err = new Error(
        `Jam operasional / shift di Ruangan "${group.nama_ruangan}" (${group.kode_ruangan}) telah selesai untuk hari ini. Tidak dapat menerbitkan rujukan antrean saat ini.`
      );
      err.statusCode = 422;
      throw err;
    }

    // Urutan kode_antrian_layanan (global)
    const lastAntrianLayanan = await trx("trx_antrian_layanan")
      .where("kode_antrian_layanan", "like", `${prefixAntrianLayanan}%`)
      .orderBy("id", "desc")
      .first();

    let nextSeq = 1;
    if (lastAntrianLayanan && lastAntrianLayanan.kode_antrian_layanan) {
      const parts = lastAntrianLayanan.kode_antrian_layanan.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) nextSeq = num + 1;
    }
    const cKodeAntrianLayanan = `${prefixAntrianLayanan}${String(nextSeq).padStart(3, "0")}`;

    // Nomor antrian KHUSUS PER RUANGAN HARI INI
    let lastNoQuery = trx("trx_antrian_layanan")
      .where("created_at", ">=", todayYmd + " 00:00:00");

    if (branchCode) {
      lastNoQuery = lastNoQuery.where("kode_cabang", branchCode);
    }

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
      if (!isNaN(num)) nextNo = num + 1;
    }
    const cNomorAntrianSesi = String(nextNo).padStart(2, "0");

    const oInsertLayanan = {
      kode_cabang: branchCode,
      kode_antrian_layanan: cKodeAntrianLayanan,
      kode_kunjungan: kodeKunjungan,
      kode_antrian_asal: currentAntrian.kode_antrian_layanan,
      nomor_antrian: cNomorAntrianSesi,
      kode_ruangan: group.kode_ruangan,
      nama_ruangan: group.nama_ruangan,
      status: "menunggu",
      lanjut_ke_tindakan: 0,
      kode_ruangan_tujuan_lanjutan: null,
      tz: currentAntrian.tz || tz || "Asia/Jakarta",
      created_by: username,
      created_at: formatDateSystem(),
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    await trx("trx_antrian_layanan").insert(oInsertLayanan);

    // Insert detail rows into trx_detail_antrian_layanan
    let dSeq = 1;
    const vaInsertDetail = [];
    for (const item of groupItems) {
      const cKodeDetailAntrian = `DAL-${todayStr}-${String(nextSeq).padStart(3, "0")}-${String(dSeq).padStart(2, "0")}`;
      dSeq++;
      vaInsertDetail.push({
        kode_detail_antrian_layanan: cKodeDetailAntrian,
        kode_antrian_layanan: cKodeAntrianLayanan,
        kode_kunjungan: kodeKunjungan,
        jenis_layanan: item.jenis === "paket_layanan" ? "paket" : "layanan",
        kode_layanan: item.kode || item.kode_layanan,
        nama_layanan: item.nama || item.nama_layanan,
        harga: item.harga_asal || item.harga || 0,
        durasi_menit: item.durasi_menit || 0,
        kode_promo: item.kode_promo || null,
        nama_promo: item.nama_promo || null,
        jenis_diskon: item.jenis_diskon || null,
        nilai_diskon: item.nilai_diskon ?? null,
        kode_ruangan: group.kode_ruangan,
        nama_ruangan: group.nama_ruangan,
        tz: currentAntrian.tz || tz || "Asia/Jakarta",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      });
    }

    if (vaInsertDetail.length > 0) {
      await trx("trx_detail_antrian_layanan").insert(vaInsertDetail);
    }

    createdAntrianLayanan.push({
      ...oInsertLayanan,
      details: vaInsertDetail,
    });
  }

  return createdAntrianLayanan;
};
