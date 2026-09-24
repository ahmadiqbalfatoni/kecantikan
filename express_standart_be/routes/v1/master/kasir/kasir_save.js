/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_save.js
 * @description Endpoint simpan draft transaksi kasir (create atau update)
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

// Helper generate kode
const generateKode = async (prefix, table, column) => {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const pattern = `${prefix}-${ymd}-%`;
  const last = await DB(table)
    .where(column, "like", pattern)
    .orderBy(column, "desc")
    .select(column)
    .first();
  let seq = 1;
  if (last) {
    const parts = last[column].split("-");
    seq = parseInt(parts[parts.length - 1]) + 1;
  }
  return `${prefix}-${ymd}-${String(seq).padStart(3, "0")}`;
};

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const tz = body.tz || "Asia/Jakarta";

  const {
    kode_transaksi,       // jika ada = update, jika tidak = create baru
    kode_kunjungan,
    no_rm,
    kode_promo,           // promo level transaksi (opsional)
    metode_bayar = "tunai",
  } = body;

  // items perlu let agar bisa di-filter ulang untuk transaksi is_product_only
  let items = body.items || [];

  if (!no_rm) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "no_rm pasien wajib diisi", datetime: formatDateSystem() });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "Minimal 1 item transaksi", datetime: formatDateSystem() });
  }

  const trx = await DB.transaction();
  try {
    // 1. Hitung total_harga & diskon dari items jika ada snapshot
    let total_harga = 0;
    let total_diskon_from_items = 0;
    items.forEach((item) => {
      const subtotalItem = parseFloat(item.harga_satuan || 0) * parseInt(item.qty || 1);
      total_harga += subtotalItem;
      total_diskon_from_items += parseFloat(item.diskon || 0);
    });

    // 2. Hitung diskon multi-promo jika item belum memiliki diskon snapshot
    let total_diskon = total_diskon_from_items;
    const validPromoCodes = [];
    const promoNames = [];

    const rawCodes = Array.isArray(kode_promo)
      ? kode_promo
      : typeof kode_promo === "string" && kode_promo.trim()
      ? kode_promo.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (total_diskon === 0 && rawCodes.length > 0) {
      const activePromos = await trx("mst_promo")
        .whereIn("kode_promo", rawCodes)
        .where("status", "aktif");

      for (const promoData of activePromos) {
        validPromoCodes.push(promoData.kode_promo);
        if (promoData.nama) promoNames.push(promoData.nama);
        const nilDiskon = parseFloat(promoData.nilai_diskon || 0);

        const detailPromo = await trx("mst_detail_promo")
          .where("kode_promo", promoData.kode_promo)
          .where("status", "aktif")
          .select("jenis_item", "kode_item");

        let diskonPromo = 0;
        if (detailPromo.length === 0) {
          diskonPromo = promoData.jenis_diskon === "persen"
            ? (total_harga * nilDiskon) / 100
            : nilDiskon;
        } else {
          const promoKodeSet = new Set(detailPromo.map((dp) => dp.kode_item));
          let baseDiskon = 0;
          items.forEach((item) => {
            if (promoKodeSet.has(item.kode)) {
              const subtotalItem = parseFloat(item.harga_satuan || 0) * parseInt(item.qty || 1);
              baseDiskon += subtotalItem;
            }
          });
          diskonPromo = promoData.jenis_diskon === "persen"
            ? (baseDiskon * nilDiskon) / 100
            : Math.min(nilDiskon, baseDiskon);
        }
        total_diskon += diskonPromo;
      }
    } else {
      // Ambil kode & nama promo dari items
      items.forEach((it) => {
        if (it.kode_promo && !validPromoCodes.includes(it.kode_promo)) validPromoCodes.push(it.kode_promo);
        if (it.nama_promo && !promoNames.includes(it.nama_promo)) promoNames.push(it.nama_promo);
      });
      // Gabungkan juga rawCodes jika ada
      rawCodes.forEach((c) => { if (!validPromoCodes.includes(c)) validPromoCodes.push(c); });
    }

    total_diskon = Math.min(total_diskon, total_harga);

    const validKodePromoStr = validPromoCodes.length > 0 ? validPromoCodes.join(",") : null;
    const validNamaPromoStr = body.nama_promo || (promoNames.length > 0 ? promoNames.join(", ") : null);

    let total_bayar = Math.max(0, total_harga - total_diskon);
    const tanggal_transaksi = new Date().toISOString().slice(0, 10);

    let kode_trx = kode_transaksi;

    // Deteksi DP dari Booking jika ada kode_kunjungan
    let dp_nominal = 0;
    let metode_pembayaran_dp = null;

    let targetKodeKunjungan = kode_kunjungan || null;
    if (!targetKodeKunjungan && kode_trx) {
      const existingKunj = await trx("trx_transaksi").where("kode_transaksi", kode_trx).select("kode_kunjungan").first();
      targetKodeKunjungan = existingKunj?.kode_kunjungan || null;
    }

    if (targetKodeKunjungan) {
      const bookingData = await trx("trx_kunjungan as k")
        .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
        .where("k.kode_kunjungan", targetKodeKunjungan)
        .select("b.dp_nominal", "b.dp_status", "b.metode_pembayaran_dp")
        .first();

      if (bookingData && ["sudah_bayar", "dipotong_treatment"].includes(bookingData.dp_status)) {
        dp_nominal = parseFloat(bookingData.dp_nominal || 0);
        metode_pembayaran_dp = dp_nominal > 0 ? bookingData.metode_pembayaran_dp : null;
      }
    }

    let sisa_bayar = Math.max(0, total_bayar - dp_nominal);

    let currentTrxCabang = getBranchScope(req, body.kode_cabang) || "CBG-001";

    const hasNamaPromoTrx = await trx.schema.hasColumn("trx_transaksi", "nama_promo");
    const hasDiscountCols = await trx.schema.hasColumn("trx_detail_transaksi", "kode_promo");

    if (kode_trx) {
      // UPDATE existing draft
      const existing = await trx("trx_transaksi").where("kode_transaksi", kode_trx).first();
      if (!existing) {
        await trx.rollback();
        return res.status(404).json({ status: status.BAD_REQUEST, message: "Transaksi tidak ditemukan", datetime: formatDateSystem() });
      }
      if (existing.status === "lunas") {
        await trx.rollback();
        return res.status(400).json({ status: status.BAD_REQUEST, message: "Transaksi sudah lunas, tidak bisa diubah", datetime: formatDateSystem() });
      }

      currentTrxCabang = existing.kode_cabang || currentTrxCabang;

      // Jika transaksi ini khusus produk saja, filter ulang items (hapus layanan)
      if (existing.is_product_only) {
        items = items.filter((item) => item.jenis === "produk");
        total_harga = 0;
        items.forEach((item) => { total_harga += parseFloat(item.harga_satuan || 0) * parseInt(item.qty || 1); });
        total_bayar = Math.max(0, total_harga - total_diskon);
        sisa_bayar = Math.max(0, total_bayar - dp_nominal);
      }

      const updateTrxPayload = {
        kode_cabang: currentTrxCabang,
        kode_kunjungan: kode_kunjungan || existing.kode_kunjungan,
        kode_promo: validKodePromoStr,
        total_harga,
        total_diskon,
        total_bayar,
        dp_nominal,
        metode_pembayaran_dp,
        sisa_bayar,
        metode_bayar,
        is_product_only: existing.is_product_only || 0,
        updated_by: username,
        updated_at: DB.fn.now(),
      };
      if (hasNamaPromoTrx) {
        updateTrxPayload.nama_promo = validNamaPromoStr;
      }

      await trx("trx_transaksi").where("kode_transaksi", kode_trx).update(updateTrxPayload);

      // Hapus detail lama lalu insert baru
      await trx("trx_detail_transaksi").where("kode_transaksi", kode_trx).delete();
    } else {
      // CREATE baru
      kode_trx = await generateKode("TRX", "trx_transaksi", "kode_transaksi");
      const insertTrxPayload = {
        kode_cabang: currentTrxCabang,
        kode_transaksi: kode_trx,
        kode_kunjungan: kode_kunjungan || null,
        no_rm,
        kode_promo: validKodePromoStr,
        tanggal_transaksi,
        total_harga,
        total_diskon,
        total_bayar,
        dp_nominal,
        metode_pembayaran_dp,
        sisa_bayar,
        metode_bayar,
        status: "draft",
        tz,
        created_by: username,
        created_at: DB.fn.now(),
        updated_by: username,
        updated_at: DB.fn.now(),
      };
      if (hasNamaPromoTrx) {
        insertTrxPayload.nama_promo = validNamaPromoStr;
      }
      await trx("trx_transaksi").insert(insertTrxPayload);
    }

    // Insert detail items
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    // Get last DT kode
    const lastDT = await trx("trx_detail_transaksi")
      .where("kode_detail_transaksi", "like", `DT-${today}-%`)
      .orderBy("kode_detail_transaksi", "desc")
      .select("kode_detail_transaksi")
      .first();
    let dtSeq = lastDT ? parseInt(lastDT.kode_detail_transaksi.split("-").pop()) + 1 : 1;

    for (const item of items) {
      const qty = parseInt(item.qty || 1);
      const harga_satuan = parseFloat(item.harga_satuan || 0);
      const subtotal = qty * harga_satuan;
      const itemDiskon = parseFloat(item.diskon || 0);
      const subtotalSetelahDiskon = item.subtotal_setelah_diskon !== undefined
        ? parseFloat(item.subtotal_setelah_diskon)
        : Math.max(0, subtotal - itemDiskon);

      const kode_detail = `DT-${today}-${String(dtSeq).padStart(3, "0")}`;
      dtSeq++;

      const detailRow = {
        kode_cabang: currentTrxCabang,
        kode_detail_transaksi: kode_detail,
        kode_transaksi: kode_trx,
        kode_layanan: item.jenis === "layanan" ? item.kode : null,
        kode_produk: item.jenis === "produk" ? item.kode : null,
        qty,
        harga_satuan,
        subtotal,
        is_from_pendaftaran: item.is_from_pendaftaran ? 1 : 0,
        tz,
        created_by: username,
        created_at: DB.fn.now(),
        updated_by: username,
        updated_at: DB.fn.now(),
      };

      if (hasDiscountCols) {
        detailRow.kode_promo = item.kode_promo || null;
        detailRow.nama_promo = item.nama_promo || null;
        detailRow.jenis_diskon = item.jenis_diskon || null;
        detailRow.nilai_diskon = item.nilai_diskon != null ? parseFloat(item.nilai_diskon) : null;
        detailRow.diskon = itemDiskon;
        detailRow.subtotal_setelah_diskon = subtotalSetelahDiskon;
      }

      await trx("trx_detail_transaksi").insert(detailRow);
    }

    await trx.commit();

    return res.status(200).json({
      status: status.SUKSES,
      message: kode_transaksi ? "Draft transaksi berhasil diperbarui" : "Draft transaksi berhasil dibuat",
      datetime: formatDateSystem(),
      data: {
        kode_transaksi: kode_trx,
        total_harga,
        total_diskon,
        total_bayar,
        dp_nominal,
        metode_pembayaran_dp,
        sisa_bayar,
      },
    });
  } catch (error) {
    await trx.rollback();
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_save.js", user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
