/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_detail.js
 * @description Endpoint detail transaksi kasir dengan auto-select idempotent layanan/paket antrian pendaftaran
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";
import { syncCompletedItemsToKasirDraft } from "./kasir_sync_service.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, body?.kode_cabang);
  const kode_transaksi = body.kode_transaksi || "";

  if (!kode_transaksi) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "kode_transaksi wajib diisi", datetime: formatDateSystem() });
  }

  try {
    let qTrx = DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
      .leftJoin("mst_promo as pr", "t.kode_promo", "pr.kode_promo")
      .where("t.kode_transaksi", kode_transaksi);

    if (branchCode) {
      qTrx = qTrx.andWhere("t.kode_cabang", branchCode);
    }

    const trx = await qTrx
      .select(
        "t.*",
        "p.nama as nama_pasien",
        "p.no_hp",
        "k.kode_booking",
        "b.dp_nominal as booking_dp_nominal",
        "b.dp_status as booking_dp_status",
        "b.metode_pembayaran_dp as booking_metode_dp",
        "pr.nama as nama_promo",
        "pr.jenis_diskon",
        "pr.nilai_diskon as nilai_diskon_promo"
      )
      .first();

    if (!trx) {
      return res.status(404).json({ status: status.BAD_REQUEST, message: "Transaksi tidak ditemukan", datetime: formatDateSystem() });
    }

    // Resolusi DP & sisa bayar
    const resolvedDpNominal = parseFloat(trx.dp_nominal || 0) > 0
      ? parseFloat(trx.dp_nominal)
      : (["sudah_bayar", "dipotong_treatment"].includes(trx.booking_dp_status) ? parseFloat(trx.booking_dp_nominal || 0) : 0);
    const resolvedMetodeDp = trx.metode_pembayaran_dp || (resolvedDpNominal > 0 ? trx.booking_metode_dp : null);
    const resolvedSisaBayar = Math.max(0, parseFloat(trx.total_bayar || 0) - resolvedDpNominal);

    trx.dp_nominal = resolvedDpNominal;
    trx.metode_pembayaran_dp = resolvedMetodeDp;
    trx.sisa_bayar = resolvedSisaBayar;

    // ─── AUTO-SELECT IDEMPOTENT LAYANAN/PAKET DARI ANTRIAN (JIKA DRAFT & KODE_KUNJUNGAN ADA) ───
    if (trx.kode_kunjungan && trx.status === "draft") {
      const syncResult = await syncCompletedItemsToKasirDraft(DB, {
        kodeKunjungan: trx.kode_kunjungan,
        kodeTransaksi: kode_transaksi,
        noRm: trx.no_rm,
        username: username || "system",
        tz: trx.tz || "Asia/Jakarta",
      });

      if (syncResult) {
        trx.total_harga = syncResult.total_harga;
        trx.total_diskon = syncResult.total_diskon;
        trx.total_bayar = syncResult.total_bayar;
        trx.sisa_bayar = syncResult.sisa_bayar;
      }
    }

    // Cek kolom diskon snapshot secara aman agar query tidak pernah crash
    const hasDiscountCols = await DB.schema.hasColumn("trx_detail_transaksi", "kode_promo");
    const promoSelectCols = hasDiscountCols ? [
      DB.raw("COALESCE(dt.kode_promo, MAX(dal.kode_promo)) as kode_promo"),
      DB.raw("COALESCE(dt.nama_promo, MAX(dal.nama_promo)) as nama_promo"),
      DB.raw("COALESCE(dt.jenis_diskon, MAX(dal.jenis_diskon)) as jenis_diskon"),
      DB.raw("COALESCE(dt.nilai_diskon, MAX(dal.nilai_diskon)) as nilai_diskon"),
      DB.raw("COALESCE(dt.diskon, 0) as diskon"),
      DB.raw("COALESCE(dt.subtotal_setelah_diskon, dt.subtotal) as subtotal_setelah_diskon"),
    ] : [
      DB.raw("MAX(dal.kode_promo) as kode_promo"),
      DB.raw("MAX(dal.nama_promo) as nama_promo"),
      DB.raw("MAX(dal.jenis_diskon) as jenis_diskon"),
      DB.raw("MAX(dal.nilai_diskon) as nilai_diskon"),
      DB.raw("0 as diskon"),
      DB.raw("dt.subtotal as subtotal_setelah_diskon"),
    ];

    // Ambil detail item dengan flag is_from_pendaftaran
    const details = await DB("trx_detail_transaksi as dt")
      .leftJoin("trx_transaksi as t", "t.kode_transaksi", "dt.kode_transaksi")
      .leftJoin("mst_layanan as l", "dt.kode_layanan", "l.kode_layanan")
      .leftJoin("mst_paket_layanan as pl", "dt.kode_layanan", "pl.kode_paket_layanan")
      .leftJoin("mst_produk as prod", "dt.kode_produk", "prod.kode_produk")
      .leftJoin(
        "trx_detail_antrian_layanan as dal",
        function () {
          this.on("dal.kode_kunjungan", "t.kode_kunjungan")
            .andOn(function () {
              this.on("dal.kode_layanan", "dt.kode_layanan")
                .orOn("dal.kode_layanan", "dt.kode_produk");
            });
        }
      )
      .where("dt.kode_transaksi", kode_transaksi)
      .groupBy("dt.id")
      .select(
        "dt.kode_detail_transaksi",
        "dt.kode_layanan",
        "dt.kode_produk",
        "l.nama as nama_layanan_single",
        "pl.nama as nama_paket_layanan",
        "prod.nama as nama_produk",
        "prod.satuan",
        "dt.qty",
        "dt.harga_satuan",
        "dt.subtotal",
        DB.raw("COALESCE(dt.is_from_pendaftaran, 0) as is_from_pendaftaran"),
        ...promoSelectCols
      )
      .orderBy("dt.is_from_pendaftaran", "desc")
      .orderBy("dt.id", "asc");

    const detailsMapped = details.map((d) => ({
      ...d,
      jenis: d.kode_layanan ? "layanan" : "produk",
      kode: d.kode_layanan || d.kode_produk,
      nama: d.nama_layanan_single || d.nama_paket_layanan || d.nama_produk || "-",
      satuan: d.satuan || (d.kode_layanan ? "tindakan" : "pcs"),
      harga_satuan: parseFloat(d.harga_satuan || 0),
      subtotal: parseFloat(d.subtotal || 0),
      diskon: parseFloat(d.diskon || 0),
      subtotal_setelah_diskon: parseFloat(d.subtotal_setelah_diskon !== null ? d.subtotal_setelah_diskon : d.subtotal),
      nilai_diskon: d.nilai_diskon != null ? parseFloat(d.nilai_diskon) : null,
      is_from_pendaftaran: Boolean(d.is_from_pendaftaran),
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Detail transaksi ditemukan",
      datetime: formatDateSystem(),
      data: { ...trx, details: detailsMapped },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_detail.js", func: "detail", user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
