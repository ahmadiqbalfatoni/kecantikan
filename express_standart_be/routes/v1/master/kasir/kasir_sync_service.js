/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik Kecantikan
 * @file kasir_sync_service.js
 * @description Helper terpusat untuk sinkronisasi draf transaksi Kasir dan item layanan/produk
 *              dari trx_detail_antrian_layanan.
 *              Mengimplementasikan deduplikasi rujukan konsultasi -> tindakan secara otomatis.
 */

import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

/**
 * Mengambil SEMUA item layanan dari antrean yang berstatus 'selesai' untuk satu atau beberapa kunjungan,
 * dengan DEDUPLIKASI OTOMATIS: Item layanan pada antrean konsultasi asal yang sudah diteruskan
 * ke antrean rujukan anak (ruang tindakan lanjutan) HANYA diambil 1 kali dari antrean tindakan final.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} dbOrTrx
 * @param {string | string[]} kodeKunjungan
 * @returns {Promise<Array<Object>>}
 */
export const getCompletedItemsForKasir = async (dbOrTrx, kodeKunjungan) => {
  if (!kodeKunjungan || (Array.isArray(kodeKunjungan) && kodeKunjungan.length === 0)) {
    return [];
  }

  let query = dbOrTrx("trx_detail_antrian_layanan as dal")
    .join("trx_antrian_layanan as al", "dal.kode_antrian_layanan", "al.kode_antrian_layanan")
    .where("al.status", "selesai")
    .whereNotExists(function () {
      this.select("child.id")
        .from("trx_antrian_layanan as child")
        .join("trx_detail_antrian_layanan as cdal", "child.kode_antrian_layanan", "cdal.kode_antrian_layanan")
        .whereRaw("child.kode_antrian_asal = al.kode_antrian_layanan")
        .whereRaw("cdal.kode_layanan = dal.kode_layanan")
        .whereNot("child.status", "batal");
    })
    .select(
      "al.kode_kunjungan",
      "dal.id",
      "dal.kode_detail_antrian_layanan",
      "dal.kode_antrian_layanan",
      "dal.kode_layanan",
      "dal.nama_layanan",
      "dal.harga",
      "dal.jenis_layanan",
      "dal.kode_promo",
      "dal.nama_promo",
      "dal.jenis_diskon",
      "dal.nilai_diskon"
    )
    .orderBy("dal.id", "asc");

  if (Array.isArray(kodeKunjungan)) {
    query = query.whereIn("al.kode_kunjungan", kodeKunjungan);
  } else {
    query = query.where("al.kode_kunjungan", kodeKunjungan);
  }

  return await query;
};

/**
 * Sinkronisasi terpusat ke trx_transaksi dan trx_detail_transaksi:
 * 1. Membuat atau memperbarui draf trx_transaksi.
 * 2. Memasukkan layanan pendaftaran/tindakan (yang sudah didedup).
 * 3. Memasukkan atau memperbarui produk tambahan rekomendasi dokter.
 * 4. Merekalibrasi diskon promo, DP booking, total_harga, total_bayar, dan sisa_bayar.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx
 * @param {Object} params
 * @param {string} params.kodeKunjungan
 * @param {string} [params.kodeTransaksi]
 * @param {string} [params.noRm]
 * @param {string} [params.kodeRekamMedis]
 * @param {string} [params.username="system"]
 * @param {string} [params.tz="Asia/Jakarta"]
 * @param {Array<Object>} [params.extraProdukItems=[]] - [{ kode/kode_produk, nama, harga/harga_satuan/harga_jual, qty, satuan }]
 * @returns {Promise<Object>} Object { kode_transaksi, total_bayar, total_harga, total_diskon, sisa_bayar }
 */
export const syncCompletedItemsToKasirDraft = async (trx, {
  kodeKunjungan,
  kodeTransaksi = "",
  noRm = "",
  kodeRekamMedis = null,
  username = "system",
  tz = "Asia/Jakarta",
  extraProdukItems = [],
}) => {
  if (!kodeKunjungan) return null;

  const todayYmd = new Date().toISOString().slice(0, 10);
  const todayStr = todayYmd.replace(/-/g, "");
  const prefixTrx = `TRX-${todayStr}-`;
  const prefixDetail = `DT-${todayStr}-`;

  // 1. Cek apakah transaksi sudah lunas (jika sudah lunas, jangan ubah status/detailnya)
  const lunasTrx = await trx("trx_transaksi")
    .where("kode_kunjungan", kodeKunjungan)
    .where("status", "lunas")
    .first();

  if (lunasTrx) {
    return lunasTrx;
  }

  // 2. Cari atau buat draf transaksi
  let draftTrx = null;
  if (kodeTransaksi) {
    draftTrx = await trx("trx_transaksi")
      .where("kode_transaksi", kodeTransaksi)
      .where("status", "draft")
      .first();
  }
  if (!draftTrx) {
    draftTrx = await trx("trx_transaksi")
      .where("kode_kunjungan", kodeKunjungan)
      .where("status", "draft")
      .first();
  }

  const kunjunganData = await trx("trx_kunjungan")
    .where("kode_kunjungan", kodeKunjungan)
    .select("no_rm", "kode_cabang")
    .first();
  const resolvedCabang = draftTrx?.kode_cabang || kunjunganData?.kode_cabang || "CBG-001";

  let createdTransaksiKode = "";

  if (draftTrx) {
    createdTransaksiKode = draftTrx.kode_transaksi;
    const updateDraftPayload = {};
    if (kodeRekamMedis && !draftTrx.kode_rekam_medis) {
      updateDraftPayload.kode_rekam_medis = kodeRekamMedis;
    }
    if (!draftTrx.kode_cabang && resolvedCabang) {
      updateDraftPayload.kode_cabang = resolvedCabang;
    }
    if (Object.keys(updateDraftPayload).length > 0) {
      updateDraftPayload.updated_by = username;
      updateDraftPayload.updated_at = formatDateSystem();
      await trx("trx_transaksi")
        .where("kode_transaksi", createdTransaksiKode)
        .update(updateDraftPayload);
    }
  } else {
    const lastTrx = await trx("trx_transaksi")
      .where("kode_transaksi", "like", `${prefixTrx}%`)
      .orderBy("id", "desc")
      .first();

    let nextTrxSeq = 1;
    if (lastTrx && lastTrx.kode_transaksi) {
      const parts = lastTrx.kode_transaksi.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) nextTrxSeq = num + 1;
    }
    createdTransaksiKode = `${prefixTrx}${String(nextTrxSeq).padStart(3, "0")}`;

    const resolvedNoRm = noRm || (kunjunganData ? kunjunganData.no_rm : null);

    const newTrx = {
      kode_cabang: resolvedCabang,
      kode_transaksi: createdTransaksiKode,
      kode_kunjungan: kodeKunjungan,
      no_rm: resolvedNoRm,
      kode_rekam_medis: kodeRekamMedis || null,
      tanggal_transaksi: todayYmd,
      total_harga: 0,
      total_diskon: 0,
      total_bayar: 0,
      metode_bayar: "tunai",
      status: "draft",
      tz: tz || "Asia/Jakarta",
      created_by: username,
      created_at: formatDateSystem(),
      updated_by: username,
      updated_at: formatDateSystem(),
    };

    await trx("trx_transaksi").insert(newTrx);
  }

  // 3. Ambil item layanan & produk antrean yang sudah berstatus 'selesai' (DEDUPLIKASI RUJUKAN)
  const completedItems = await getCompletedItemsForKasir(trx, kodeKunjungan);

  // 4. Hitung detail yang sudah ada untuk sinkronisasi kuantitas yang idempotent
  const existingDetails = await trx("trx_detail_transaksi")
    .where("kode_transaksi", createdTransaksiKode);

  const existingServiceCounts = {};
  const existingProductCounts = {};
  existingDetails.forEach((d) => {
    if (d.kode_layanan) {
      existingServiceCounts[d.kode_layanan] = (existingServiceCounts[d.kode_layanan] || 0) + 1;
    }
    if (d.kode_produk) {
      existingProductCounts[d.kode_produk] = (existingProductCounts[d.kode_produk] || 0) + (d.qty || 1);
    }
  });

  const lastDetail = await trx("trx_detail_transaksi")
    .where("kode_detail_transaksi", "like", `${prefixDetail}%`)
    .orderBy("id", "desc")
    .first();

  let nextDetailSeq = 1;
  if (lastDetail && lastDetail.kode_detail_transaksi) {
    const parts = lastDetail.kode_detail_transaksi.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) nextDetailSeq = num + 1;
  }

  const hasDiscountCols = await trx.schema.hasColumn("trx_detail_transaksi", "kode_promo");

  // Masukkan completedItems dari antrean layanan
  for (const item of completedItems) {
    if (item.kode_layanan) {
      const isProduct = ["produk", "paket_produk"].includes((item.jenis_layanan || "").toLowerCase());
      if (isProduct) {
        const currentCount = existingProductCounts[item.kode_layanan] || 0;
        if (currentCount > 0) {
          existingProductCounts[item.kode_layanan]--;
        } else {
          const existRow = await trx("trx_detail_transaksi")
            .where("kode_transaksi", createdTransaksiKode)
            .where("kode_produk", item.kode_layanan)
            .first();

          if (existRow) {
            const newQty = parseInt(existRow.qty || 1, 10) + 1;
            const hrg = parseFloat(existRow.harga_satuan || item.harga || 0);
            await trx("trx_detail_transaksi")
              .where("id", existRow.id)
              .update({
                qty: newQty,
                subtotal: newQty * hrg,
                updated_by: username,
                updated_at: formatDateSystem(),
              });
          } else {
            const cKodeDetail = `${prefixDetail}${String(nextDetailSeq).padStart(3, "0")}`;
            nextDetailSeq++;
            const hargaSatuan = parseFloat(item.harga || 0);

            const insertPayload = {
              kode_cabang: resolvedCabang,
              kode_detail_transaksi: cKodeDetail,
              kode_transaksi: createdTransaksiKode,
              kode_layanan: null,
              kode_produk: item.kode_layanan,
              qty: 1,
              harga_satuan: hargaSatuan,
              subtotal: hargaSatuan,
              is_from_pendaftaran: 0,
              tz: tz || "Asia/Jakarta",
              created_by: username,
              created_at: formatDateSystem(),
              updated_by: username,
              updated_at: formatDateSystem(),
            };
            if (hasDiscountCols && item.kode_promo) {
              insertPayload.kode_promo = item.kode_promo;
              insertPayload.nama_promo = item.nama_promo || null;
              insertPayload.jenis_diskon = item.jenis_diskon || null;
              insertPayload.nilai_diskon = item.nilai_diskon != null ? parseFloat(item.nilai_diskon) : null;
            }

            await trx("trx_detail_transaksi").insert(insertPayload);
          }
        }
      } else {
        const currentCount = existingServiceCounts[item.kode_layanan] || 0;
        if (currentCount > 0) {
          existingServiceCounts[item.kode_layanan]--;
        } else {
          const cKodeDetail = `${prefixDetail}${String(nextDetailSeq).padStart(3, "0")}`;
          nextDetailSeq++;
          const isKlaim = (item.jenis_layanan || "").toLowerCase() === "klaim_paket";
          const hargaSatuan = isKlaim ? 0 : parseFloat(item.harga || 0);

          const insertPayload = {
            kode_cabang: resolvedCabang,
            kode_detail_transaksi: cKodeDetail,
            kode_transaksi: createdTransaksiKode,
            kode_layanan: item.kode_layanan,
            kode_produk: null,
            qty: 1,
            harga_satuan: hargaSatuan,
            subtotal: hargaSatuan,
            is_from_pendaftaran: 1,
            tz: tz || "Asia/Jakarta",
            created_by: username,
            created_at: formatDateSystem(),
            updated_by: username,
            updated_at: formatDateSystem(),
          };
          if (hasDiscountCols && item.kode_promo) {
            insertPayload.kode_promo = item.kode_promo;
            insertPayload.nama_promo = item.nama_promo || null;
            insertPayload.jenis_diskon = item.jenis_diskon || null;
            insertPayload.nilai_diskon = item.nilai_diskon != null ? parseFloat(item.nilai_diskon) : null;
          }

          await trx("trx_detail_transaksi").insert(insertPayload);
        }
      }
    }
  }

  // 5. Masukkan / update produk tambahan dokter (extraProdukItems jika dikirim via form)
  if (Array.isArray(extraProdukItems) && extraProdukItems.length > 0) {
    const freshDetails = await trx("trx_detail_transaksi").where("kode_transaksi", createdTransaksiKode);

    // Pre-fetch harga jual dari mst_produk
    const kodeProdukList = extraProdukItems.map((i) => i.kode || i.kode_produk).filter(Boolean);
    let produkPriceMap = {};
    if (kodeProdukList.length > 0) {
      const mstProdukList = await trx("mst_produk")
        .whereIn("kode_produk", kodeProdukList)
        .select("kode_produk", "nama", "harga_jual");
      mstProdukList.forEach((p) => {
        produkPriceMap[p.kode_produk] = parseFloat(p.harga_jual || 0);
      });
    }

    for (const prd of extraProdukItems) {
      const kdProduk = prd.kode || prd.kode_produk;
      if (kdProduk) {
        // Cek jika produk kustom
        const isCustom = String(kdProduk).startsWith("CUSTOM-") || String(kdProduk).startsWith("CST-");
        if (isCustom && prd.nama) {
          const existP = await trx("mst_produk").where("kode_produk", kdProduk).first();
          if (!existP) {
            const kat = await trx("mst_kategori_produk").where("status", "aktif").first();
            const defaultKatKode = kat?.kode_kategori_produk || "KATPRD-001";

            await trx("mst_produk").insert({
              kode_produk: kdProduk,
              kode_kategori_produk: defaultKatKode,
              nama: prd.nama,
              satuan: prd.satuan || "item",
              harga_beli: 0,
              harga_jual: parseFloat(prd.harga || prd.harga_satuan || prd.harga_jual || 0),
              stok_minimum: 0,
              stok_tersedia: 999,
              status: "nonaktif",
              tz: tz || "Asia/Jakarta",
              created_by: username,
              created_at: formatDateSystem(),
              updated_by: username,
              updated_at: formatDateSystem(),
            });
          }
          produkPriceMap[kdProduk] = parseFloat(prd.harga || prd.harga_satuan || prd.harga_jual || 0);
        }

        const qty = Math.max(1, parseInt(prd.qty || 1, 10));
        const rawHarga = produkPriceMap[kdProduk] !== undefined
          ? produkPriceMap[kdProduk]
          : parseFloat(prd.harga || prd.harga_satuan || prd.harga_jual || 0);
        const subtotal = qty * rawHarga;

        const existPrd = freshDetails.find((d) => d.kode_produk === kdProduk);
        if (existPrd) {
          await trx("trx_detail_transaksi")
            .where("id", existPrd.id)
            .update({
              qty: qty,
              harga_satuan: rawHarga,
              subtotal: subtotal,
              updated_by: username,
              updated_at: formatDateSystem(),
            });
        } else {
          const cKodeDetail = `${prefixDetail}${String(nextDetailSeq).padStart(3, "0")}`;
          nextDetailSeq++;

          await trx("trx_detail_transaksi").insert({
            kode_cabang: resolvedCabang,
            kode_detail_transaksi: cKodeDetail,
            kode_transaksi: createdTransaksiKode,
            kode_layanan: null,
            kode_produk: kdProduk,
            qty: qty,
            harga_satuan: rawHarga,
            subtotal: subtotal,
            is_from_pendaftaran: 0,
            tz: tz || "Asia/Jakarta",
            created_by: username,
            created_at: formatDateSystem(),
            updated_by: username,
            updated_at: formatDateSystem(),
          });
        }
      }
    }
  }

  // 6. Rekalibrasi total_harga, promo diskon, DP booking, total_bayar, & sisa_bayar
  const sumResult = await trx("trx_detail_transaksi")
    .where("kode_transaksi", createdTransaksiKode)
    .sum("subtotal as total");

  const grandTotalHarga = parseFloat(sumResult[0]?.total || 0);

  // Ambil state transaksi terkini untuk promo dan DP
  const currentTrx = await trx("trx_transaksi")
    .where("kode_transaksi", createdTransaksiKode)
    .first();

  let totalDiskon = parseFloat(currentTrx?.total_diskon || 0);

  if (currentTrx?.kode_promo) {
    const rawCodes = String(currentTrx.kode_promo).split(",").map((s) => s.trim()).filter(Boolean);
    const activePromos = await trx("mst_promo")
      .whereIn("kode_promo", rawCodes)
      .where("status", "aktif");

    const allDetails = await trx("trx_detail_transaksi")
      .where("kode_transaksi", createdTransaksiKode)
      .select("kode_layanan", "kode_produk", "qty", "harga_satuan");

    let calculatedDiskon = 0;
    for (const promoData of activePromos) {
      const nilDiskon = parseFloat(promoData.nilai_diskon || 0);
      const detailPromo = await trx("mst_detail_promo")
        .where("kode_promo", promoData.kode_promo)
        .where("status", "aktif")
        .select("kode_item");

      if (detailPromo.length === 0) {
        calculatedDiskon += promoData.jenis_diskon === "persen"
          ? (grandTotalHarga * nilDiskon) / 100
          : nilDiskon;
      } else {
        const promoKodeSet = new Set(detailPromo.map((dp) => dp.kode_item));
        let baseDiskon = 0;
        for (const d of allDetails) {
          const kode = d.kode_layanan || d.kode_produk;
          if (kode && promoKodeSet.has(kode)) {
            baseDiskon += parseFloat(d.harga_satuan || 0) * parseInt(d.qty || 1, 10);
          }
        }
        calculatedDiskon += promoData.jenis_diskon === "persen"
          ? (baseDiskon * nilDiskon) / 100
          : Math.min(nilDiskon, baseDiskon);
      }
    }
    totalDiskon = Math.min(calculatedDiskon, grandTotalHarga);
  }

  const grandTotalBayar = Math.max(0, grandTotalHarga - totalDiskon);

  // Cek DP jika ada booking
  let dpNominal = 0;
  const kunjunganRow = await trx("trx_kunjungan")
    .where("kode_kunjungan", kodeKunjungan)
    .first();

  if (kunjunganRow?.kode_booking) {
    const bookingRow = await trx("trx_booking")
      .where("kode_booking", kunjunganRow.kode_booking)
      .first();
    if (bookingRow && (bookingRow.dp_status === "sudah_bayar" || bookingRow.dp_status === "lunas")) {
      dpNominal = parseFloat(bookingRow.dp_nominal || 0);
    }
  }

  const sisaBayar = Math.max(0, grandTotalBayar - dpNominal);

  await trx("trx_transaksi")
    .where("kode_transaksi", createdTransaksiKode)
    .update({
      total_harga: grandTotalHarga,
      total_diskon: totalDiskon,
      total_bayar: grandTotalBayar,
      sisa_bayar: sisaBayar,
      updated_by: username,
      updated_at: formatDateSystem(),
    });

  return {
    kode_transaksi: createdTransaksiKode,
    total_harga: grandTotalHarga,
    total_diskon: totalDiskon,
    total_bayar: grandTotalBayar,
    sisa_bayar: sisaBayar,
  };
};
