/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_data.js
 * @description Endpoint list & detail transaksi kasir
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

// Handler List Transaksi
export const handleList = async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;
  const tanggal = body.tanggal || new Date().toISOString().slice(0, 10);
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 50;

  try {
    const baseQuery = DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_promo as pr", "t.kode_promo", "pr.kode_promo")
      .whereRaw("DATE(t.tanggal_transaksi) = ?", [tanggal])
      .modify((qb) => {
        if (branchCode) qb.where("t.kode_cabang", branchCode);
        if (filterStatus) qb.where("t.status", filterStatus);
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(t.kode_transaksi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(t.no_rm) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("t.id as total").first();
    const totalData = parseInt(countResult?.total || 0);
    const offset = (page - 1) * perPage;

    const vaData = await baseQuery.clone()
      .select(
        "t.kode_transaksi",
        "t.kode_kunjungan",
        "t.no_rm",
        "t.kode_rekam_medis",
        "p.nama as nama_pasien",
        "p.no_hp",
        "t.kode_promo",
        "pr.nama as nama_promo",
        "t.tanggal_transaksi",
        "t.total_harga",
        "t.total_diskon",
        "t.total_bayar",
        "t.dp_nominal",
        "t.metode_pembayaran_dp",
        "t.sisa_bayar",
        "t.metode_bayar",
        "t.status",
        "t.created_at",
        "t.updated_at"
      )
      .orderBy("t.created_at", "desc")
      .limit(perPage)
      .offset(offset);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data transaksi ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalData,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_data.js", func: "list", user: username });
    return res.status(500).json(oResult);
  }
};

// Handler Detail Transaksi
export const handleDetail = async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const kode_transaksi = body.kode_transaksi || "";

  if (!kode_transaksi) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "kode_transaksi wajib diisi", datetime: formatDateSystem() });
  }

  try {
    const trx = await DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
      .leftJoin("mst_promo as pr", "t.kode_promo", "pr.kode_promo")
      .where("t.kode_transaksi", kode_transaksi)
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

    const resolvedDpNominal = parseFloat(trx.dp_nominal || 0) > 0
      ? parseFloat(trx.dp_nominal)
      : (["sudah_bayar", "dipotong_treatment"].includes(trx.booking_dp_status) ? parseFloat(trx.booking_dp_nominal || 0) : 0);
    const resolvedMetodeDp = trx.metode_pembayaran_dp || (resolvedDpNominal > 0 ? trx.booking_metode_dp : null);
    const resolvedSisaBayar = Math.max(0, parseFloat(trx.total_bayar || 0) - resolvedDpNominal);

    trx.dp_nominal = resolvedDpNominal;
    trx.metode_pembayaran_dp = resolvedMetodeDp;
    trx.sisa_bayar = resolvedSisaBayar;

    // Ambil detail item dengan flag is_from_pendaftaran
    const details = await DB("trx_detail_transaksi as dt")
      .leftJoin("mst_layanan as l", "dt.kode_layanan", "l.kode_layanan")
      .leftJoin("mst_produk as prod", "dt.kode_produk", "prod.kode_produk")
      .where("dt.kode_transaksi", kode_transaksi)
      .select(
        "dt.kode_detail_transaksi",
        "dt.kode_layanan",
        "dt.kode_produk",
        "l.nama as nama_layanan",
        "prod.nama as nama_produk",
        "prod.satuan",
        "dt.qty",
        "dt.harga_satuan",
        "dt.subtotal",
        DB.raw("COALESCE(dt.is_from_pendaftaran, 0) as is_from_pendaftaran")
      )
      .orderBy("dt.is_from_pendaftaran", "desc")
      .orderBy("dt.id", "asc");

    const detailsMapped = details.map((d) => ({
      ...d,
      jenis: d.kode_layanan ? "layanan" : "produk",
      kode: d.kode_layanan || d.kode_produk,
      nama: d.nama_layanan || d.nama_produk || "-",
      satuan: d.satuan || (d.kode_layanan ? "tindakan" : "pcs"),
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
    Logging(error, { file: "/master/kasir/kasir_data.js", func: "detail", user: username });
    return res.status(500).json(oResult);
  }
};

// Sub-routes for /list and /detail
router.post("/list", handleList);
router.post("/detail", handleDetail);

// Root route handler for router.use("/kasir-list", kasirData) & router.use("/kasir-detail", kasirData)
router.post("/", (req, res) => {
  if (req.baseUrl.endsWith("kasir-detail")) {
    return handleDetail(req, res);
  }
  return handleList(req, res);
});

export default router;
