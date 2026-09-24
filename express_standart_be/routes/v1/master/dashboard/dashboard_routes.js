import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

/**
 * POST /master/dashboard/role-data
 * Mengambil agregasi metrik data real-time untuk 5 role dashboard:
 * owner, dokter, beautician, kasir, warehouse
 */
router.post("/role-data", async (req, res) => {
  const { body } = req;
  const role = (body.role || "owner").toLowerCase();
  const branchCode = getBranchScope(req, body.kode_cabang);

  try {
    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");

    // ── 1. METRIK OWNER / MANAGER ──
    // Kunjungan hari ini & total pasien
    const qKunjunganToday = DB("trx_kunjungan").whereRaw("DATE(tanggal_kunjungan) = ?", [todayStr]);
    if (branchCode) qKunjunganToday.where("kode_cabang", branchCode);
    const kunjunganToday = await qKunjunganToday.count("id as count").first();

    const qTotalPasien = DB("mst_pasien");
    if (branchCode) qTotalPasien.where("kode_cabang", branchCode);
    const totalPasien = await qTotalPasien.count("id as count").first();

    const qTotalLayanan = DB("mst_layanan").where("status", "aktif");
    if (branchCode) qTotalLayanan.where("kode_cabang", branchCode);
    const totalLayanan = await qTotalLayanan.count("id as count").first();

    const tanggalDari = body.tanggal_dari || null;
    const tanggalSampai = body.tanggal_sampai || null;

    // Omzet hari ini (Pelunasan hari ini + DP booking diterima hari ini)
    const qPelunasanToday = DB("trx_transaksi")
      .whereRaw("DATE(tanggal_transaksi) = ?", [todayStr])
      .whereIn("status", ["lunas", "selesai"]);
    if (branchCode) qPelunasanToday.where("kode_cabang", branchCode);
    const pelunasanToday = await qPelunasanToday
      .select(DB.raw("SUM(COALESCE(sisa_bayar, total_bayar)) as total"))
      .first();

    const qDpReceivedToday = DB("trx_booking")
      .whereRaw("DATE(COALESCE(dp_dibayar_at, created_at)) = ?", [todayStr])
      .whereIn("dp_status", ["sudah_bayar", "dipotong_treatment", "hangus"]);
    if (branchCode) qDpReceivedToday.where("kode_cabang", branchCode);
    const dpReceivedToday = await qDpReceivedToday
      .sum("dp_nominal as total")
      .first();

    const omzetTodayVal = parseFloat(pelunasanToday?.total || 0) + parseFloat(dpReceivedToday?.total || 0);

    // Total omzet keseluruhan (Nilai transaksi tindakan lunas + DP hangus)
    const qOmzetTrxTotal = DB("trx_transaksi")
      .whereIn("status", ["lunas", "selesai"]);
    if (branchCode) qOmzetTrxTotal.where("kode_cabang", branchCode);
    const omzetTrxTotal = await qOmzetTrxTotal
      .sum("total_bayar as total")
      .first();

    const qDpHangusTotal = DB("trx_booking")
      .where("status", "tidak_hadir")
      .where("dp_status", "hangus");
    if (branchCode) qDpHangusTotal.where("kode_cabang", branchCode);
    const dpHangusTotal = await qDpHangusTotal
      .sum("dp_nominal as total")
      .first();

    const omzetTotalVal = parseFloat(omzetTrxTotal?.total || 0) + parseFloat(dpHangusTotal?.total || 0);

    // ── Breakdown metode bayar akurat (UNION Pelunasan Kasir + DP Booking Terlaksana + DP Hangus) ──
    let qPelunasanWhere = "status IN ('lunas', 'selesai') AND COALESCE(sisa_bayar, total_bayar) > 0";
    let qDpBookingWhere = "t.status IN ('lunas', 'selesai') AND t.dp_nominal > 0 AND t.metode_pembayaran_dp IS NOT NULL";
    let qDpHangusWhere = "b.status = 'tidak_hadir' AND b.dp_status = 'hangus' AND b.dp_nominal > 0 AND b.metode_pembayaran_dp IS NOT NULL";

    const pelunasanBindings = [];
    const dpBookingBindings = [];
    const dpHangusBindings = [];

    if (tanggalDari) {
      qPelunasanWhere += " AND DATE(tanggal_transaksi) >= ?";
      pelunasanBindings.push(tanggalDari);

      qDpBookingWhere += " AND DATE(COALESCE(b.dp_dibayar_at, b.created_at)) >= ?";
      dpBookingBindings.push(tanggalDari);

      qDpHangusWhere += " AND DATE(COALESCE(b.dp_dibayar_at, b.created_at)) >= ?";
      dpHangusBindings.push(tanggalDari);
    }
    if (tanggalSampai) {
      qPelunasanWhere += " AND DATE(tanggal_transaksi) <= ?";
      pelunasanBindings.push(tanggalSampai);

      qDpBookingWhere += " AND DATE(COALESCE(b.dp_dibayar_at, b.created_at)) <= ?";
      dpBookingBindings.push(tanggalSampai);

      qDpHangusWhere += " AND DATE(COALESCE(b.dp_dibayar_at, b.created_at)) <= ?";
      dpHangusBindings.push(tanggalSampai);
    }

    const unionSql = `
      SELECT
        LOWER(TRIM(metode)) as metode_bayar,
        COUNT(id) as jumlah_trx,
        SUM(nominal) as nominal
      FROM (
        SELECT
          id,
          metode_bayar as metode,
          COALESCE(sisa_bayar, total_bayar) as nominal
        FROM trx_transaksi
        WHERE ${qPelunasanWhere}

        UNION ALL

        SELECT
          t.id,
          t.metode_pembayaran_dp as metode,
          t.dp_nominal as nominal
        FROM trx_transaksi as t
        JOIN trx_kunjungan as k ON t.kode_kunjungan = k.kode_kunjungan
        JOIN trx_booking as b ON k.kode_booking = b.kode_booking
        WHERE ${qDpBookingWhere}

        UNION ALL

        SELECT
          b.id,
          b.metode_pembayaran_dp as metode,
          b.dp_nominal as nominal
        FROM trx_booking as b
        WHERE ${qDpHangusWhere}
      ) as combined
      GROUP BY LOWER(TRIM(metode))
    `;

    const allBindings = [...pelunasanBindings, ...dpBookingBindings, ...dpHangusBindings];
    const metodeBreakdownRaw = await DB.raw(unionSql, allBindings);
    const metodeBreakdown = (metodeBreakdownRaw[0] || []).map((row) => ({
      metode_bayar: row.metode_bayar,
      jumlah_trx: parseInt(row.jumlah_trx || 0, 10),
      nominal: parseFloat(row.nominal || 0),
    }));

    // Top Treatment
    const qTopTreatments = DB("trx_detail_antrian_layanan as dal")
      .select("dal.nama_layanan", "dal.kode_layanan")
      .count("dal.id as total_sesi")
      .whereNotNull("dal.nama_layanan");
    if (branchCode) {
      qTopTreatments.join("trx_antrian_layanan as al_top", "dal.kode_antrian_layanan", "al_top.kode_antrian_layanan")
        .where("al_top.kode_cabang", branchCode);
    }
    const topTreatments = await qTopTreatments
      .groupBy("dal.kode_layanan", "dal.nama_layanan")
      .orderBy("total_sesi", "desc")
      .limit(5);

    // Inventory status ringkas
    const qInventory = DB("mst_produk")
      .select(
        DB.raw("COUNT(id) as total_sku"),
        DB.raw("COALESCE(SUM(harga_beli * stok_tersedia), 0) as total_aset"),
        DB.raw("COALESCE(SUM(CASE WHEN stok_tersedia <= stok_minimum THEN 1 ELSE 0 END), 0) as stok_menipis"),
        DB.raw("COALESCE(SUM(CASE WHEN stok_tersedia <= 0 THEN 1 ELSE 0 END), 0) as stok_habis")
      );
    if (branchCode) qInventory.where("kode_cabang", branchCode);
    const inventorySummary = await qInventory.first();

    // Performa SDM (Dokter & Beautician)
    const qDokter = DB("mst_karyawan as k")
      .leftJoin("trx_rekam_medis as rm", "k.kode_karyawan", "rm.kode_karyawan")
      .where("k.jabatan", "dokter");
    if (branchCode) qDokter.where("k.kode_cabang", branchCode);
    const dokterPerforma = await qDokter
      .select("k.nama", "k.kode_karyawan")
      .count("rm.id as total_konsul")
      .groupBy("k.kode_karyawan", "k.nama")
      .limit(5);

    const qBeautician = DB("mst_karyawan as k")
      .leftJoin("trx_antrian_layanan as al", "k.kode_karyawan", "al.kode_karyawan")
      .whereIn("k.jabatan", ["perawat", "terapis", "beautician"]);
    if (branchCode) qBeautician.where("k.kode_cabang", branchCode);
    const beauticianPerforma = await qBeautician
      .select("k.nama", "k.jabatan", "k.kode_karyawan")
      .count("al.id as total_tindakan")
      .groupBy("k.kode_karyawan", "k.nama", "k.jabatan")
      .limit(5);

    // ── 2. METRIK DOKTER ──
    const qAntreanDokter = DB("trx_antrian_layanan as al")
      .leftJoin("trx_kunjungan as k", "al.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
      .select(
        "al.id",
        "al.kode_antrian_layanan",
        "p.nama as nama_pasien",
        "p.no_rm",
        "dal.nama_layanan",
        "al.nama_ruangan",
        "al.status",
        "al.created_at"
      );
    if (branchCode) qAntreanDokter.where("al.kode_cabang", branchCode);
    const antreanDokter = await qAntreanDokter
      .orderBy("al.created_at", "desc")
      .limit(8);

    const qRekamMedis = DB("trx_rekam_medis as rm")
      .leftJoin("mst_pasien as p", "rm.no_rm", "p.no_rm")
      .leftJoin("mst_karyawan as d", "rm.kode_karyawan", "d.kode_karyawan")
      .select(
        "rm.id",
        "rm.kode_rekam_medis",
        "p.nama as nama_pasien",
        "rm.no_rm",
        "rm.diagnosis",
        "rm.keluhan",
        "rm.plan",
        "rm.created_at as tanggal_pemeriksaan",
        "d.nama as nama_dokter"
      );
    if (branchCode) qRekamMedis.where("rm.kode_cabang", branchCode);
    const rekamMedisTerbaru = await qRekamMedis
      .orderBy("rm.created_at", "desc")
      .limit(6);

    // ── 3. METRIK BEAUTICIAN ──
    const qTreatmentBeautician = DB("trx_antrian_layanan as al")
      .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
      .leftJoin("trx_kunjungan as k", "al.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .select(
        "al.kode_antrian_layanan",
        "dal.nama_layanan",
        "p.nama as nama_pasien",
        "al.nama_ruangan",
        "al.status",
        "al.created_at"
      );
    if (branchCode) qTreatmentBeautician.where("al.kode_cabang", branchCode);
    const treatmentBeautician = await qTreatmentBeautician
      .orderBy("al.created_at", "desc")
      .limit(8);

    // Foto Before After terbaru
    const qFoto = DB("trx_rekam_medis_foto as f")
      .leftJoin("trx_rekam_medis as rm", "f.id_rekam_medis", "rm.id")
      .leftJoin("mst_pasien as p", "rm.no_rm", "p.no_rm")
      .select("f.id", "f.url_foto", "f.tipe", "p.nama as nama_pasien", "f.created_at");
    if (branchCode) qFoto.where("rm.kode_cabang", branchCode);
    const fotoBeforeAfter = await qFoto
      .orderBy("f.created_at", "desc")
      .limit(6);

    // ── 4. METRIK KASIR ──
    const qTrxKasir = DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .select(
        "t.id",
        "t.kode_transaksi",
        "p.nama as nama_pasien",
        "t.no_rm",
        "t.tanggal_transaksi",
        "t.metode_bayar",
        "t.total_harga",
        "t.total_diskon",
        "t.total_bayar",
        "t.status"
      );
    if (branchCode) qTrxKasir.where("t.kode_cabang", branchCode);
    const transaksiKasir = await qTrxKasir
      .orderBy("t.created_at", "desc")
      .limit(10);

    const qTotalKasir = DB("trx_transaksi")
      .count("id as total_trx")
      .sum("total_bayar as total_bayar")
      .sum("total_diskon as total_diskon");
    if (branchCode) qTotalKasir.where("kode_cabang", branchCode);
    const totalTrxKasirToday = await qTotalKasir.first();

    // ── 5. METRIK WAREHOUSE ──
    const qStock = DB("mst_produk as p")
      .leftJoin("mst_kategori_produk as kp", "p.kode_kategori_produk", "kp.kode_kategori_produk")
      .select(
        "p.kode_produk",
        "p.nama",
        "kp.nama as kategori",
        "p.satuan",
        "p.stok_tersedia",
        "p.stok_minimum",
        "p.harga_beli",
        "p.harga_jual",
        "p.status"
      );
    if (branchCode) qStock.where("p.kode_cabang", branchCode);
    const stockList = await qStock
      .orderBy("p.stok_tersedia", "asc")
      .limit(10);

    const qPO = DB("trx_purchase_order as po")
      .leftJoin("mst_supplier as s", "po.kode_supplier", "s.kode_supplier")
      .select(
        "po.id",
        "po.kode_po",
        "s.nama as nama_supplier",
        "po.tanggal_po",
        "po.total_po",
        "po.status"
      );
    if (branchCode) qPO.where("po.kode_cabang", branchCode);
    const purchaseOrders = await qPO
      .orderBy("po.tanggal_po", "desc")
      .limit(6);

    // ── 6. METRIK ADMIN (PENDAFTARAN & ANTREAN) ──
    const qPasienBaruToday = DB("mst_pasien").whereRaw("DATE(created_at) = ?", [todayStr]);
    if (branchCode) qPasienBaruToday.where("kode_cabang", branchCode);
    const pasienBaruToday = await qPasienBaruToday.count("id as count").first();

    const qAntreanPendaftaranToday = DB("trx_antrian_layanan as al")
      .whereRaw("DATE(al.created_at) = ?", [todayStr]);
    if (branchCode) qAntreanPendaftaranToday.where("al.kode_cabang", branchCode);
    const antreanPendaftaranToday = await qAntreanPendaftaranToday.count("id as count").first();

    const qRecentKunjungan = DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .select("k.id", "k.kode_kunjungan", "k.no_rm", "p.nama as nama_pasien", "k.tanggal_kunjungan", "k.status")
      .orderBy("k.created_at", "desc")
      .limit(8);
    if (branchCode) qRecentKunjungan.where("k.kode_cabang", branchCode);
    const recentKunjunganList = await qRecentKunjungan;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Dashboard Role-Based berhasil dimuat",
      datetime: formatDateSystem(),
      data: {
        active_role: role,
        owner: {
          kpi: {
            kunjungan_hari_ini: parseInt(kunjunganToday?.count || 0, 10),
            total_pasien: parseInt(totalPasien?.count || 0, 10),
            total_layanan: parseInt(totalLayanan?.count || 0, 10),
            omzet_hari_ini: omzetTodayVal,
            omzet_total: omzetTotalVal,
          },
          metode_bayar: metodeBreakdown || [],
          top_treatment: topTreatments || [],
          inventory: {
            total_sku: parseInt(inventorySummary?.total_sku || 0, 10),
            total_aset: parseFloat(inventorySummary?.total_aset || 0),
            stok_menipis: parseInt(inventorySummary?.stok_menipis || 0, 10),
            stok_habis: parseInt(inventorySummary?.stok_habis || 0, 10),
          },
          sdm: {
            dokter: dokterPerforma || [],
            beautician: beauticianPerforma || [],
          },
        },
        dokter: {
          antrean: antreanDokter || [],
          rekam_medis: rekamMedisTerbaru || [],
          total_antrean_hari_ini: antreanDokter.length,
          total_konsul_selesai: rekamMedisTerbaru.length,
        },
        beautician: {
          antrean: treatmentBeautician || [],
          foto_before_after: fotoBeforeAfter || [],
          total_tindakan: treatmentBeautician.length,
        },
        kasir: {
          transaksi: transaksiKasir || [],
          summary: {
            total_transaksi: parseInt(totalTrxKasirToday?.total_trx || 0, 10),
            total_bayar: parseFloat(totalTrxKasirToday?.total_bayar || 0),
            total_diskon: parseFloat(totalTrxKasirToday?.total_diskon || 0),
          },
          metode_bayar: metodeBreakdown || [],
        },
        warehouse: {
          stock: stockList || [],
          purchase_orders: purchaseOrders || [],
          summary: {
            total_sku: parseInt(inventorySummary?.total_sku || 0, 10),
            total_aset: parseFloat(inventorySummary?.total_aset || 0),
            stok_menipis: parseInt(inventorySummary?.stok_menipis || 0, 10),
            stok_habis: parseInt(inventorySummary?.stok_habis || 0, 10),
          },
        },
        admin: {
          summary: {
            kunjungan_hari_ini: parseInt(kunjunganToday?.count || 0, 10),
            total_pasien: parseInt(totalPasien?.count || 0, 10),
            pasien_baru_hari_ini: parseInt(pasienBaruToday?.count || 0, 10),
            antrean_hari_ini: parseInt(antreanPendaftaranToday?.count || 0, 10),
          },
          kunjungan_terbaru: recentKunjunganList || [],
        },
      },
    });
  } catch (err) {
    Logging(err, { file: "dashboard_routes.js", func: "role-data", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

export default router;
