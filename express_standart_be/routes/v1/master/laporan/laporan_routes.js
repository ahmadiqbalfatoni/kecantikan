/**
 * @project Sistem Klinik Kecantikan
 * @file laporan_routes.js
 * @description Controller router terpadu untuk modul Laporan & Analytics Klinik Kecantikan
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

/**
 * 0. ENDPOINT OPSI FILTER LAPORAN REAL DARI DATABASE
 */
router.post("/options", async (req, res) => {
  try {
    const [karyawanList, ruanganList, kategoriList, levelMembershipList] = await Promise.all([
      DB("mst_karyawan").select("kode_karyawan", "nama", "jabatan").orderBy("nama", "asc"),
      DB("mst_ruangan").select("kode_ruangan", "nama_ruangan").orderBy("nama_ruangan", "asc"),
      DB("mst_kategori_produk").select("kode_kategori_produk", "nama").orderBy("nama", "asc"),
      DB("mst_level_membership").select("kode_level", "nama_level").orderBy("minimal_poin", "asc"),
    ]);

    const petugasOptions = karyawanList.map((k) => ({
      label: `${k.nama} (${k.jabatan ? k.jabatan.toUpperCase() : 'STAFF'})`,
      value: k.kode_karyawan,
      jabatan: k.jabatan,
    }));

    const dokterOptions = karyawanList
      .filter((k) => (k.jabatan || "").toLowerCase() === "dokter")
      .map((k) => ({
        label: k.nama,
        value: k.kode_karyawan,
      }));

    const ruanganOptions = ruanganList.map((r) => ({
      label: r.nama_ruangan,
      value: r.kode_ruangan,
    }));

    const kategoriOptions = kategoriList.map((kp) => ({
      label: kp.nama,
      value: kp.kode_kategori_produk,
    }));

    const levelMembershipOptions = levelMembershipList.map((lm) => ({
      label: lm.nama_level,
      value: lm.kode_level,
    }));

    const metodeBayarOptions = [
      { label: "Tunai", value: "tunai" },
      { label: "QRIS", value: "qris" },
      { label: "Debit", value: "debit" },
      { label: "Kredit", value: "kredit" },
      { label: "Transfer", value: "transfer" },
    ];

    const statusPenjualanOptions = [
      { label: "Lunas", value: "lunas" },
      { label: "Draft / Pending", value: "draft" },
      { label: "Batal", value: "batal" },
    ];

    const statusTreatmentOptions = [
      { label: "Menunggu", value: "menunggu" },
      { label: "Dipanggil", value: "dipanggil" },
      { label: "Selesai", value: "selesai" },
      { label: "Batal", value: "batal" },
    ];

    const statusKunjunganOptions = [
      { label: "Berlangsung", value: "berlangsung" },
      { label: "Selesai", value: "selesai" },
      { label: "Batal", value: "batal" },
    ];

    return res.status(200).json({
      status: status.SUKSES,
      message: "Berhasil memuat opsi filter laporan",
      datetime: formatDateSystem(),
      data: {
        petugas: petugasOptions,
        dokter: dokterOptions,
        ruangan: ruanganOptions,
        kategori_produk: kategoriOptions,
        level_membership: levelMembershipOptions,
        metode_bayar: metodeBayarOptions,
        status_penjualan: statusPenjualanOptions,
        status_treatment: statusTreatmentOptions,
        status_kunjungan: statusKunjunganOptions,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "options" });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 1. LAPORAN PENJUALAN
 */
router.post("/penjualan", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;
  const filterMetode = body.metode_bayar || null;
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .modify((qb) => {
        if (branchCode) {
          qb.where("t.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(t.tanggal_transaksi) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(t.tanggal_transaksi) <= ?", [tanggal_sampai]);
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("t.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim()) {
            qb.where("t.status", filterStatus.trim());
          }
        }
        if (filterMetode) {
          if (Array.isArray(filterMetode) && filterMetode.length > 0) {
            qb.whereIn("t.metode_bayar", filterMetode);
          } else if (typeof filterMetode === "string" && filterMetode.trim()) {
            qb.where("t.metode_bayar", filterMetode.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(t.kode_transaksi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(t.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(t.metode_bayar) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("t.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const summaryResult = await baseQuery.clone()
      .select(
        DB.raw("COALESCE(SUM(t.total_harga), 0) as total_bruto"),
        DB.raw("COALESCE(SUM(t.total_diskon), 0) as total_diskon"),
        DB.raw("COALESCE(SUM(t.total_bayar), 0) as total_omzet"),
        DB.raw("COUNT(t.id) as total_transaksi")
      )
      .first();

    const data = await baseQuery.clone()
      .select(
        "t.id",
        "t.kode_transaksi",
        "t.kode_kunjungan",
        "t.no_rm",
        "p.nama as nama_pasien",
        "p.no_hp",
        "t.tanggal_transaksi",
        "t.total_harga",
        "t.total_diskon",
        "t.total_bayar",
        "t.metode_bayar",
        "t.status",
        "t.created_at"
      )
      .orderBy("t.tanggal_transaksi", "desc")
      .orderBy("t.id", "desc")
      .limit(perPage)
      .offset(offset);

    // Ambil detail ringkasan item per transaksi
    const kodeTrxList = data.map((d) => d.kode_transaksi).filter(Boolean);
    let detailsMap = {};
    if (kodeTrxList.length > 0) {
      const details = await DB("trx_detail_transaksi as dt")
        .leftJoin("mst_layanan as l", "dt.kode_layanan", "l.kode_layanan")
        .leftJoin("mst_paket_layanan as pl", "dt.kode_layanan", "pl.kode_paket_layanan")
        .leftJoin("mst_produk as prod", "dt.kode_produk", "prod.kode_produk")
        .whereIn("dt.kode_transaksi", kodeTrxList)
        .select(
          "dt.kode_transaksi",
          "dt.qty",
          "dt.harga_satuan",
          "dt.subtotal",
          DB.raw("COALESCE(prod.nama, l.nama, pl.nama, 'Item') as item_nama")
        );

      details.forEach((item) => {
        if (!detailsMap[item.kode_transaksi]) {
          detailsMap[item.kode_transaksi] = [];
        }
        detailsMap[item.kode_transaksi].push(item);
      });
    }

    const formattedData = data.map((tr) => ({
      ...tr,
      items: detailsMap[tr.kode_transaksi] || [],
      total_items: (detailsMap[tr.kode_transaksi] || []).reduce((acc, curr) => acc + curr.qty, 0),
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Penjualan berhasil dimuat",
      datetime: formatDateSystem(),
      data: formattedData,
      total_data: totalData,
      summary: {
        total_bruto: parseFloat(summaryResult?.total_bruto || 0),
        total_diskon: parseFloat(summaryResult?.total_diskon || 0),
        total_omzet: parseFloat(summaryResult?.total_omzet || 0),
        total_transaksi: parseInt(summaryResult?.total_transaksi || 0, 10),
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "penjualan", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 2. LAPORAN TREATMENT
 */
router.post("/treatment", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterRuangan = body.kode_ruangan || null;
  const filterKaryawan = body.kode_karyawan || null;
  const filterStatus = body.status || null;
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_antrian_layanan as al")
      .leftJoin("trx_kunjungan as k", "al.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("mst_ruangan as r", "al.kode_ruangan", "r.kode_ruangan")
      .leftJoin("trx_booking as b", "k.kode_booking", "b.kode_booking")
      .leftJoin("mst_jadwal_karyawan as jk", "b.kode_jadwal", "jk.kode_jadwal")
      .leftJoin("trx_rekam_medis_ruangan as rmr", "al.kode_antrian_layanan", "rmr.kode_antrian_layanan")
      .leftJoin("trx_rekam_medis as rm", function () {
        this.on("al.kode_antrian_layanan", "=", "rm.kode_antrian_layanan")
          .orOn("al.kode_kunjungan", "=", "rm.kode_kunjungan");
      })
      .leftJoin("mst_karyawan as kry_al", function () {
        this.on("al.kode_karyawan", "=", "kry_al.kode_karyawan")
          .orOn("al.kode_karyawan", "=", "kry_al.no_sip")
          .orOn("al.kode_karyawan", "=", "kry_al.kode_user");
      })
      .leftJoin("mst_karyawan as kry_rmr", function () {
        this.on("rmr.kode_karyawan", "=", "kry_rmr.kode_karyawan")
          .orOn("rmr.kode_karyawan", "=", "kry_rmr.no_sip")
          .orOn("rmr.kode_karyawan", "=", "kry_rmr.kode_user");
      })
      .leftJoin("mst_karyawan as kry_rm", function () {
        this.on("rm.kode_karyawan", "=", "kry_rm.kode_karyawan")
          .orOn("rm.no_sip", "=", "kry_rm.no_sip");
      })
      .leftJoin("mst_karyawan as kry_book", "jk.no_sip", "kry_book.no_sip")
      .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
      .leftJoin("mst_layanan as lyn", "dal.kode_layanan", "lyn.kode_layanan")
      .modify((qb) => {
        if (branchCode) {
          qb.where("al.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(al.created_at) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(al.created_at) <= ?", [tanggal_sampai]);
        }
        if (filterRuangan) {
          qb.where("al.kode_ruangan", filterRuangan);
        }
        if (filterKaryawan) {
          qb.where("al.kode_karyawan", filterKaryawan);
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("al.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim()) {
            qb.where("al.status", filterStatus.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(al.kode_antrian_layanan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(lyn.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(al.nama_ruangan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(COALESCE(kry_al.nama, kry_rmr.nama, kry_rm.nama, kry_book.nama, '')) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().countDistinct("al.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery.clone()
      .select(
        "al.id",
        "al.kode_antrian_layanan",
        "al.kode_kunjungan",
        "al.nomor_antrian",
        "al.kode_ruangan",
        "al.nama_ruangan",
        "al.status",
        "al.dipanggil_at",
        "al.selesai_at",
        "al.created_at",
        "p.no_rm",
        "p.nama as nama_pasien",
        DB.raw("COALESCE(kry_al.nama, kry_rmr.nama, kry_rm.nama, kry_book.nama, '-') as nama_petugas"),
        DB.raw("COALESCE(kry_al.jabatan, kry_rmr.jabatan, kry_rm.jabatan, kry_book.jabatan, '') as jabatan_petugas"),
        DB.raw("COALESCE(GROUP_CONCAT(DISTINCT lyn.nama SEPARATOR ', '), 'Treatment Umum') as nama_treatment")
      )
      .groupBy(
        "al.id",
        "al.kode_antrian_layanan",
        "al.kode_kunjungan",
        "al.nomor_antrian",
        "al.kode_ruangan",
        "al.nama_ruangan",
        "al.status",
        "al.dipanggil_at",
        "al.selesai_at",
        "al.created_at",
        "p.no_rm",
        "p.nama",
        "kry_al.nama",
        "kry_al.jabatan",
        "kry_rmr.nama",
        "kry_rmr.jabatan",
        "kry_rm.nama",
        "kry_rm.jabatan",
        "kry_book.nama",
        "kry_book.jabatan"
      )
      .orderBy("al.created_at", "desc")
      .limit(perPage)
      .offset(offset);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Treatment berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: totalData,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "treatment", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 3. LAPORAN PRODUK
 */
router.post("/produk", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterKategori = body.kode_kategori_produk || null;
  const filterStatusStok = body.status_stok || null;
  const filterStatus = body.status || null;
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;

  try {
    const query = DB("mst_produk as p")
      .leftJoin("mst_kategori_produk as kp", "p.kode_kategori_produk", "kp.kode_kategori_produk")
      .leftJoin("mst_supplier as s", "p.kode_supplier", "s.kode_supplier")
      .leftJoin("trx_detail_transaksi as dt", "p.kode_produk", "dt.kode_produk")
      .leftJoin("trx_transaksi as tr", "dt.kode_transaksi", "tr.kode_transaksi")
      .modify((qb) => {
        if (branchCode) {
          qb.where("p.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("(tr.tanggal_transaksi >= ? OR tr.tanggal_transaksi IS NULL)", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("(tr.tanggal_transaksi <= ? OR tr.tanggal_transaksi IS NULL)", [tanggal_sampai]);
        }
        if (filterKategori) {
          qb.where("p.kode_kategori_produk", filterKategori);
        }
        if (filterStatus) {
          qb.where("p.status", filterStatus);
        }
        if (filterStatusStok === "habis") {
          qb.where("p.stok_tersedia", "<=", 0);
        } else if (filterStatusStok === "menipis") {
          qb.where("p.stok_tersedia", ">", 0).whereRaw("p.stok_tersedia <= p.stok_minimum");
        } else if (filterStatusStok === "aman") {
          qb.whereRaw("p.stok_tersedia > p.stok_minimum");
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(kp.nama) LIKE ?", [`%${lower}%`]);
          });
        }
      })
      .select(
        "p.id",
        "p.kode_produk",
        "p.nama as nama_produk",
        "kp.nama as nama_kategori",
        "s.nama as nama_supplier",
        "p.satuan",
        "p.harga_beli",
        "p.harga_jual",
        "p.stok_tersedia",
        "p.stok_minimum",
        "p.status",
        DB.raw("COALESCE(SUM(dt.qty), 0) as total_terjual"),
        DB.raw("COALESCE(SUM(dt.subtotal), 0) as total_pendapatan")
      )
      .groupBy(
        "p.id",
        "p.kode_produk",
        "p.nama",
        "kp.nama",
        "s.nama",
        "p.satuan",
        "p.harga_beli",
        "p.harga_jual",
        "p.stok_tersedia",
        "p.stok_minimum",
        "p.status"
      )
      .orderBy("total_terjual", "desc");

    const rows = await query;

    const totalTerjual = rows.reduce((acc, r) => acc + parseInt(r.total_terjual || 0, 10), 0);
    const totalOmzet = rows.reduce((acc, r) => acc + parseFloat(r.total_pendapatan || 0), 0);
    const totalProduk = rows.length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Produk berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: totalProduk,
      summary: {
        total_terjual: totalTerjual,
        total_omzet: totalOmzet,
        total_produk: totalProduk,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "produk", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 4. LAPORAN PAKET
 */
router.post("/paket", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;
  const filterRuangan = body.kode_ruangan || null;
  const filterTipe = body.tipe || null;

  try {
    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");

    // Auto-sync status semua paket berdasarkan status layanannya & tanggal expired
    const allPakets = await DB("mst_paket_layanan").select("kode_paket_layanan", "status", "tanggal_selesai", "is_selamanya");
    for (const pkt of allPakets) {
      const inactiveCount = await DB("mst_detail_paket_layanan as d")
        .leftJoin("mst_layanan as l", "d.kode_layanan", "l.kode_layanan")
        .where("d.kode_paket_layanan", pkt.kode_paket_layanan)
        .where("l.status", "nonaktif")
        .count("d.kode_detail_paket_layanan as cnt")
        .first();

      const hasInactive = parseInt(inactiveCount?.cnt || 0) > 0;
      const isExpired = !Boolean(pkt.is_selamanya) && pkt.tanggal_selesai && pkt.tanggal_selesai < todayStr;
      const targetStatus = (hasInactive || isExpired) ? "nonaktif" : "aktif";

      if (pkt.status !== targetStatus) {
        await DB("mst_paket_layanan")
          .where("kode_paket_layanan", pkt.kode_paket_layanan)
          .update({ status: targetStatus, updated_at: formatDateSystem() });
      }
    }

    const baseQuery = DB("mst_paket_layanan as pl")
      .leftJoin("mst_ruangan as r", "pl.kode_ruangan", "r.kode_ruangan")
      .modify((qb) => {
        if (branchCode) {
          qb.where("pl.kode_cabang", branchCode);
        }
        if (filterStatus) {
          qb.where("pl.status", filterStatus);
        }
        if (filterRuangan) {
          qb.where("pl.kode_ruangan", filterRuangan);
        }
        if (filterTipe) {
          qb.where("pl.tipe", filterTipe);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(pl.kode_paket_layanan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(pl.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(r.nama_ruangan) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const rows = await baseQuery
      .select(
        "pl.id",
        "pl.kode_paket_layanan",
        "pl.nama",
        "pl.nama as nama_paket",
        "pl.harga_paket",
        "pl.masa_berlaku_hari",
        "pl.status",
        "pl.tipe",
        "pl.is_selamanya",
        "pl.kode_ruangan",
        "r.nama_ruangan",
        DB.raw("COALESCE(DATE_FORMAT(pl.tanggal_mulai, '%Y-%m-%d'), DATE_FORMAT(pl.created_at, '%Y-%m-%d')) as tanggal_mulai"),
        DB.raw("DATE_FORMAT(pl.tanggal_selesai, '%Y-%m-%d') as tanggal_selesai"),
        DB.raw("CASE WHEN pl.is_selamanya = 1 THEN 99999 WHEN pl.tanggal_selesai IS NOT NULL THEN GREATEST(0, DATEDIFF(pl.tanggal_selesai, CURDATE())) ELSE 99999 END as sisa_hari")
      )
      .orderBy("pl.created_at", "desc");

    // Ambil detail layanan di setiap paket
    const kodePaketList = rows.map((r) => r.kode_paket_layanan);
    let detailsMap = {};
    let inactiveMap = {};

    if (kodePaketList.length > 0) {
      const details = await DB("mst_detail_paket_layanan as dpl")
        .leftJoin("mst_layanan as l", "dpl.kode_layanan", "l.kode_layanan")
        .whereIn("dpl.kode_paket_layanan", kodePaketList)
        .select(
          "dpl.kode_paket_layanan",
          "dpl.kode_layanan",
          "l.nama as nama_layanan",
          "l.status as status_layanan",
          "dpl.jumlah_sesi"
        );

      details.forEach((d) => {
        if (!detailsMap[d.kode_paket_layanan]) {
          detailsMap[d.kode_paket_layanan] = [];
        }
        detailsMap[d.kode_paket_layanan].push(d);
        if (d.status_layanan === 'nonaktif') {
          if (!inactiveMap[d.kode_paket_layanan]) inactiveMap[d.kode_paket_layanan] = [];
          inactiveMap[d.kode_paket_layanan].push(d.nama_layanan);
        }
      });
    }

    const formattedData = rows.map((p) => ({
      ...p,
      details: detailsMap[p.kode_paket_layanan] || [],
      items: detailsMap[p.kode_paket_layanan] || [],
      has_inactive_layanan: Boolean(inactiveMap[p.kode_paket_layanan]?.length),
      inactive_layanan_names: inactiveMap[p.kode_paket_layanan] || [],
      total_sesi: (detailsMap[p.kode_paket_layanan] || []).reduce(
        (acc, curr) => acc + (curr.jumlah_sesi || 0),
        0
      ),
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Paket berhasil dimuat",
      datetime: formatDateSystem(),
      data: formattedData,
      total_data: formattedData.length,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "paket", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 6. LAPORAN PASIEN
 */
router.post("/pasien", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterGender = body.jenis_kelamin || null;
  const filterStatus = body.status || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("mst_pasien as p").modify((qb) => {
      if (branchCode) {
        qb.where("p.kode_cabang", branchCode);
      }
      if (filterGender) {
        qb.where("p.jenis_kelamin", filterGender);
      }
      if (filterStatus) {
        qb.where("p.status", filterStatus);
      }
      if (keyword) {
        const lower = keyword.toLowerCase();
        qb.where(function () {
          this.whereRaw("LOWER(p.no_rm) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`]);
        });
      }
    });

    const countResult = await baseQuery.clone().count("p.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery.clone()
      .select(
        "p.id",
        "p.no_rm",
        "p.nama",
        "p.nik",
        "p.jenis_kelamin",
        "p.tanggal_lahir",
        "p.no_hp",
        "p.kota_kabupaten",
        "p.status",
        "p.created_at",
        DB.raw("(SELECT COUNT(k.id) FROM trx_kunjungan k WHERE k.no_rm = p.no_rm) as total_kunjungan"),
        DB.raw("(SELECT COALESCE(SUM(t.total_bayar), 0) FROM trx_transaksi t WHERE t.no_rm = p.no_rm) as total_transaksi")
      )
      .orderBy("p.created_at", "desc")
      .limit(perPage)
      .offset(offset);

    const mappedRows = rows.map((r) => ({
      ...r,
      total_kunjungan: parseInt(r.total_kunjungan || 0, 10),
      total_transaksi: parseFloat(r.total_transaksi || 0),
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Pasien berhasil dimuat",
      datetime: formatDateSystem(),
      data: mappedRows,
      total_data: totalData,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "pasien", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 7. LAPORAN KUNJUNGAN
 */
router.post("/kunjungan", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;
  const filterRuangan = body.kode_ruangan || null;
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .modify((qb) => {
        if (branchCode) {
          qb.where("k.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(k.tanggal_kunjungan) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(k.tanggal_kunjungan) <= ?", [tanggal_sampai]);
        }
        if (filterRuangan) {
          qb.where("k.kode_ruangan", filterRuangan);
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("k.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim()) {
            qb.where("k.status", filterStatus.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("k.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery.clone()
      .select(
        "k.id",
        "k.kode_kunjungan",
        "k.no_rm",
        "p.nama as nama_pasien",
        "p.no_hp",
        "k.tanggal_kunjungan",
        "k.jam_datang",
        "k.status as status_kunjungan",
        "k.created_at",
        DB.raw("(SELECT COUNT(al.id) FROM trx_antrian_layanan al WHERE al.kode_kunjungan = k.kode_kunjungan) as total_antrian_layanan")
      )
      .orderBy("k.tanggal_kunjungan", "desc")
      .orderBy("k.jam_datang", "desc")
      .limit(perPage)
      .offset(offset);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Kunjungan berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: totalData,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "kunjungan", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 9. LAPORAN DOKTER
 */
router.post("/dokter", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;

  try {
    const baseQuery = DB("mst_karyawan as k")
      .whereRaw("LOWER(k.jabatan) LIKE ?", ["%dokter%"])
      .modify((qb) => {
        if (branchCode) {
          qb.where("k.kode_cabang", branchCode);
        }
        if (filterStatus) {
          qb.where("k.status", filterStatus);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_karyawan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_sip) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const rows = await baseQuery
      .select(
        "k.id",
        "k.kode_karyawan",
        "k.nama as nama_dokter",
        "k.no_sip",
        "k.no_hp",
        "k.email",
        "k.status",
        DB.raw("(SELECT COUNT(DISTINCT rm.id) FROM trx_rekam_medis rm WHERE rm.kode_karyawan = k.kode_karyawan OR rm.no_sip = k.no_sip) as total_konsultasi_rm"),
        DB.raw("(SELECT COUNT(DISTINCT al.id) FROM trx_antrian_layanan al LEFT JOIN trx_rekam_medis_ruangan rmr ON al.kode_antrian_layanan = rmr.kode_antrian_layanan WHERE al.kode_karyawan IN (k.kode_karyawan, k.no_sip, k.kode_user) OR rmr.kode_karyawan IN (k.kode_karyawan, k.no_sip, k.kode_user)) as total_tindakan_layanan")
      )
      .orderBy("k.nama", "asc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Dokter berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: rows.length,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "dokter", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 10. LAPORAN BEAUTICIAN
 */
router.post("/beautician", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterJabatan = body.jabatan || null;
  const filterStatus = body.status || null;

  try {
    const baseQuery = DB("mst_karyawan as k")
      .whereRaw("LOWER(k.jabatan) IN ('terapis', 'perawat', 'beautician')")
      .modify((qb) => {
        if (branchCode) {
          qb.where("k.kode_cabang", branchCode);
        }
        if (filterJabatan) {
          qb.whereRaw("LOWER(k.jabatan) = ?", [filterJabatan.toLowerCase()]);
        }
        if (filterStatus) {
          qb.where("k.status", filterStatus);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_karyawan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.jabatan) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const rows = await baseQuery
      .select(
        "k.id",
        "k.kode_karyawan",
        "k.nama as nama_beautician",
        "k.jabatan",
        "k.no_hp",
        "k.email",
        "k.status",
        DB.raw("(SELECT COUNT(DISTINCT al.id) FROM trx_antrian_layanan al LEFT JOIN trx_rekam_medis_ruangan rmr ON al.kode_antrian_layanan = rmr.kode_antrian_layanan WHERE al.kode_karyawan IN (k.kode_karyawan, k.no_sip, k.kode_user) OR rmr.kode_karyawan IN (k.kode_karyawan, k.no_sip, k.kode_user)) as total_treatment_ditangani"),
        DB.raw("(SELECT COUNT(DISTINCT rmr.id) FROM trx_rekam_medis_ruangan rmr WHERE rmr.kode_karyawan IN (k.kode_karyawan, k.no_sip, k.kode_user)) as total_sesi_ruangan")
      )
      .orderBy("k.nama", "asc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Beautician berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: rows.length,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "beautician", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 12. LAPORAN INVENTORY
 */
router.post("/inventory", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterKategori = body.kode_kategori_produk || null;
  const filterStatusStok = body.status_stok || null;

  try {
    const baseQuery = DB("mst_produk as p")
      .leftJoin("mst_kategori_produk as kp", "p.kode_kategori_produk", "kp.kode_kategori_produk")
      .leftJoin("mst_supplier as s", "p.kode_supplier", "s.kode_supplier")
      .modify((qb) => {
        if (branchCode) {
          qb.where("p.kode_cabang", branchCode);
        }
        if (filterKategori) {
          qb.where("p.kode_kategori_produk", filterKategori);
        }
        if (filterStatusStok === "habis") {
          qb.where("p.stok_tersedia", "<=", 0);
        } else if (filterStatusStok === "menipis") {
          qb.where("p.stok_tersedia", ">", 0).whereRaw("p.stok_tersedia <= p.stok_minimum");
        } else if (filterStatusStok === "aman") {
          qb.whereRaw("p.stok_tersedia > p.stok_minimum");
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(kp.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(s.nama) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const rows = await baseQuery
      .select(
        "p.id",
        "p.kode_produk",
        "p.nama as nama_produk",
        "kp.nama as nama_kategori",
        "s.nama as nama_supplier",
        "p.satuan",
        "p.harga_beli",
        "p.harga_jual",
        "p.stok_tersedia",
        "p.stok_minimum",
        "p.status",
        DB.raw("(p.stok_tersedia * p.harga_beli) as total_nilai_aset_beli"),
        DB.raw("(p.stok_tersedia * p.harga_jual) as total_nilai_aset_jual")
      )
      .orderBy("p.stok_tersedia", "asc");

    const totalAsetBeli = rows.reduce((acc, r) => acc + parseFloat(r.total_nilai_aset_beli || 0), 0);
    const totalAsetJual = rows.reduce((acc, r) => acc + parseFloat(r.total_nilai_aset_jual || 0), 0);
    const produkMenipis = rows.filter((r) => r.stok_tersedia <= r.stok_minimum).length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Inventory berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: rows.length,
      summary: {
        total_aset_beli: totalAsetBeli,
        total_aset_jual: totalAsetJual,
        produk_menipis: produkMenipis,
        total_produk: rows.length,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "inventory", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 17. LAPORAN VOUCHER
 */
router.post("/voucher", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;
  const filterJenisDiskon = body.jenis_diskon || null;

  try {
    const baseQuery = DB("mst_promo as pr").modify((qb) => {
      if (branchCode) {
        qb.where("pr.kode_cabang", branchCode);
      }
      if (filterStatus) {
        qb.where("pr.status", filterStatus);
      }
      if (filterJenisDiskon) {
        qb.where("pr.jenis_diskon", filterJenisDiskon);
      }
      if (keyword) {
        const lower = keyword.toLowerCase();
        qb.where(function () {
          this.whereRaw("LOWER(pr.kode_promo) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(pr.nama) LIKE ?", [`%${lower}%`]);
        });
      }
    });

    const rows = await baseQuery
      .select(
        "pr.id",
        "pr.kode_promo",
        "pr.nama as nama_promo",
        "pr.jenis_diskon",
        "pr.nilai_diskon",
        "pr.tanggal_mulai",
        "pr.tanggal_selesai",
        "pr.status"
      )
      .orderBy("pr.created_at", "desc");

    // Ambil detail item promo
    const kodePromoList = rows.map((r) => r.kode_promo);
    let detailsMap = {};
    if (kodePromoList.length > 0) {
      const details = await DB("mst_detail_promo as dp")
        .whereIn("dp.kode_promo", kodePromoList)
        .select("dp.kode_promo", "dp.jenis_item", "dp.kode_item", "dp.status");

      details.forEach((d) => {
        if (!detailsMap[d.kode_promo]) {
          detailsMap[d.kode_promo] = [];
        }
        detailsMap[d.kode_promo].push(d);
      });
    }

    const formattedData = rows.map((p) => ({
      ...p,
      items: detailsMap[p.kode_promo] || [],
      total_item_terkait: (detailsMap[p.kode_promo] || []).length,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Voucher/Promo berhasil dimuat",
      datetime: formatDateSystem(),
      data: formattedData,
      total_data: formattedData.length,
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "voucher", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 19. LAPORAN KEUANGAN
 */
router.post("/keuangan", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;

  try {
    const baseQuery = DB("trx_transaksi as t").modify((qb) => {
      if (branchCode) {
        qb.where("t.kode_cabang", branchCode);
      }
      if (tanggal_dari) {
        qb.whereRaw("DATE(t.tanggal_transaksi) >= ?", [tanggal_dari]);
      }
      if (tanggal_sampai) {
        qb.whereRaw("DATE(t.tanggal_transaksi) <= ?", [tanggal_sampai]);
      }
      if (body.metode_bayar) {
        if (Array.isArray(body.metode_bayar) && body.metode_bayar.length > 0) {
          qb.whereIn("t.metode_bayar", body.metode_bayar);
        } else if (typeof body.metode_bayar === "string") {
          qb.where("t.metode_bayar", body.metode_bayar);
        }
      }
      if (body.status) {
        if (Array.isArray(body.status) && body.status.length > 0) {
          qb.whereIn("t.status", body.status);
        } else if (typeof body.status === "string") {
          qb.where("t.status", body.status);
        }
      }
    });

    const summaryTotal = await baseQuery.clone()
      .select(
        DB.raw("COALESCE(SUM(t.total_harga), 0) as total_bruto"),
        DB.raw("COALESCE(SUM(t.total_diskon), 0) as total_diskon"),
        DB.raw("COALESCE(SUM(t.total_bayar), 0) as total_netto"),
        DB.raw("COUNT(t.id) as total_transaksi")
      )
      .first();

    const perMetode = await baseQuery.clone()
      .select(
        DB.raw("LOWER(COALESCE(t.metode_bayar, 'tunai')) as metode_bayar"),
        DB.raw("COUNT(t.id) as jumlah_transaksi"),
        DB.raw("COALESCE(SUM(t.total_bayar), 0) as total_nominal")
      )
      .groupByRaw("LOWER(COALESCE(t.metode_bayar, 'tunai'))");

    const perTanggal = await baseQuery.clone()
      .select(
        DB.raw("DATE(t.tanggal_transaksi) as tanggal"),
        DB.raw("COUNT(t.id) as jumlah_transaksi"),
        DB.raw("COALESCE(SUM(t.total_harga), 0) as total_bruto"),
        DB.raw("COALESCE(SUM(t.total_diskon), 0) as total_diskon"),
        DB.raw("COALESCE(SUM(t.total_bayar), 0) as total_netto")
      )
      .groupByRaw("DATE(t.tanggal_transaksi)")
      .orderBy("tanggal", "desc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Keuangan berhasil dimuat",
      datetime: formatDateSystem(),
      data: perTanggal,
      total_data: perTanggal.length,
      summary: {
        total_bruto: parseFloat(summaryTotal?.total_bruto || 0),
        total_diskon: parseFloat(summaryTotal?.total_diskon || 0),
        total_netto: parseFloat(summaryTotal?.total_netto || 0),
        total_transaksi: parseInt(summaryTotal?.total_transaksi || 0, 10),
        breakdown_metode: perMetode,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "keuangan", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 13. LAPORAN APPOINTMENT
 */
router.post("/appointment", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const filterStatus = body.status || null;
  const filterDokter = body.kode_dokter || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_booking as b")
      .leftJoin("mst_pasien as p", "b.no_rm", "p.no_rm")
      .leftJoin("mst_jadwal_karyawan as j", "b.kode_jadwal", "j.kode_jadwal")
      .leftJoin("mst_karyawan as k", function () {
        this.on("j.no_sip", "=", "k.no_sip")
          .orOn("j.no_sip", "=", "k.kode_karyawan");
      })
      .leftJoin("mst_layanan as l", "b.kode_layanan", "l.kode_layanan")
      .leftJoin("mst_paket_layanan as pkt", "b.kode_layanan", "pkt.kode_paket_layanan")
      .modify((qb) => {
        if (branchCode) {
          qb.where("b.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(b.tanggal_booking) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(b.tanggal_booking) <= ?", [tanggal_sampai]);
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("b.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim() && filterStatus !== "ALL") {
            qb.where("b.status", filterStatus.trim());
          }
        }
        if (filterDokter) {
          qb.where(function () {
            this.where("k.kode_karyawan", filterDokter).orWhere("k.no_sip", filterDokter);
          });
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(b.kode_booking) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(b.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(l.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(pkt.nama) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("b.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery
      .clone()
      .select(
        "b.id",
        "b.kode_booking",
        "b.no_rm",
        "p.nama as nama_pasien",
        "p.no_hp",
        "b.kode_ruangan",
        "b.jenis_layanan",
        "b.kode_layanan",
        DB.raw("COALESCE(l.nama, pkt.nama, b.kode_layanan) as nama_layanan"),
        "b.kode_jadwal",
        "b.tanggal_booking",
        "b.jam_booking",
        "b.butuh_konsul",
        DB.raw("CASE WHEN b.butuh_konsul = 1 AND k.nama IS NOT NULL THEN k.nama ELSE '-' END as dokter_tujuan"),
        "k.nama as nama_petugas_jadwal",
        "k.jabatan as jabatan_petugas_jadwal",
        "b.total_biaya",
        "b.status",
        "b.catatan_pasien",
        "b.created_at"
      )
      .orderBy("b.tanggal_booking", "desc")
      .orderBy("b.jam_booking", "desc")
      .limit(perPage)
      .offset(offset);

    // Summary counters
    const summaryRows = await baseQuery.clone().select("b.status");
    const totalAppointment = summaryRows.length;
    const terkonfirmasi = summaryRows.filter((r) => ["dikonfirmasi", "selesai"].includes(String(r.status).toLowerCase())).length;
    const menunggu = summaryRows.filter((r) => ["menunggu", "pending", "draft"].includes(String(r.status).toLowerCase())).length;
    const batal = summaryRows.filter((r) => ["batal", "dibatalkan", "tidak_hadir"].includes(String(r.status).toLowerCase())).length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Appointment berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows.map((r) => ({
        ...r,
        total_biaya: parseFloat(r.total_biaya || 0),
      })),
      total_data: totalData,
      summary: {
        total_appointment: totalAppointment,
        terkonfirmasi,
        menunggu,
        batal,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "appointment", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 14. LAPORAN STOK OPNAME
 */
const handleStokOpname = async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const filterJenis = body.jenis_movement || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_stok_movement as m")
      .leftJoin("mst_produk as p", "m.kode_produk", "p.kode_produk")
      .modify((qb) => {
        if (branchCode) {
          qb.where("m.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(m.tanggal) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(m.tanggal) <= ?", [tanggal_sampai]);
        }
        if (filterJenis) {
          if (Array.isArray(filterJenis) && filterJenis.length > 0) {
            qb.whereIn("m.jenis_movement", filterJenis);
          } else if (typeof filterJenis === "string" && filterJenis.trim() && filterJenis !== "ALL") {
            qb.where("m.jenis_movement", filterJenis.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(m.kode_stok_movement) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(m.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(m.referensi) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("m.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery
      .clone()
      .select(
        "m.id",
        "m.kode_stok_movement",
        "m.kode_produk",
        "p.nama as nama_produk",
        "m.jenis_movement",
        "m.referensi",
        "m.qty",
        "m.stok_sebelum",
        "m.stok_sesudah",
        "m.tanggal",
        "m.created_at",
        "m.created_by"
      )
      .orderBy("m.tanggal", "desc")
      .orderBy("m.id", "desc")
      .limit(perPage)
      .offset(offset);

    // Summary counters
    const allRows = await baseQuery.clone().select("m.stok_sebelum", "m.stok_sesudah", "m.qty", "m.jenis_movement");
    const totalItem = allRows.length;
    const stokSesuai = allRows.filter((r) => r.stok_sebelum === r.stok_sesudah || r.qty === 0).length;
    const selisihLebih = allRows.filter((r) => r.stok_sesudah > r.stok_sebelum || (r.jenis_movement === "masuk" && r.qty > 0)).length;
    const selisihKurang = allRows.filter((r) => r.stok_sesudah < r.stok_sebelum || (r.jenis_movement === "keluar" && r.qty > 0)).length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Stok Opname berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows.map((r) => ({
        ...r,
        stok_sebelum: parseInt(r.stok_sebelum || 0, 10),
        stok_sesudah: parseInt(r.stok_sesudah || 0, 10),
        qty: parseInt(r.qty || 0, 10),
      })),
      total_data: totalData,
      summary: {
        total_item: totalItem,
        stok_sesuai: stokSesuai,
        selisih_lebih: selisihLebih,
        selisih_kurang: selisihKurang,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "stok-opname", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
};

router.post("/stok-opname", handleStokOpname);
router.post("/stok_opname", handleStokOpname);

/**
 * 15. LAPORAN PEMBELIAN
 */
router.post("/pembelian", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const filterStatus = body.status || null;
  const filterSupplier = body.kode_supplier || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_purchase_order as po")
      .leftJoin("mst_supplier as s", "po.kode_supplier", "s.kode_supplier")
      .modify((qb) => {
        if (branchCode) {
          qb.where("po.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(po.tanggal_po) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(po.tanggal_po) <= ?", [tanggal_sampai]);
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("po.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim() && filterStatus !== "ALL") {
            qb.where("po.status", filterStatus.trim());
          }
        }
        if (filterSupplier) {
          qb.where("po.kode_supplier", filterSupplier);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(po.kode_po) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(s.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(po.kode_supplier) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("po.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery
      .clone()
      .select(
        "po.id",
        "po.kode_po",
        "po.tanggal_po",
        "po.kode_supplier",
        "s.nama as nama_supplier",
        "s.no_hp as no_hp_supplier",
        DB.raw("(SELECT COUNT(d.id) FROM trx_detail_purchase_order d WHERE d.kode_po = po.kode_po) as total_item"),
        "po.total_po",
        "po.status",
        "po.created_at",
        "po.created_by"
      )
      .orderBy("po.tanggal_po", "desc")
      .orderBy("po.id", "desc")
      .limit(perPage)
      .offset(offset);

    // Summary calculation
    const allSummary = await baseQuery.clone().select("po.status", "po.total_po");
    const totalPo = allSummary.length;
    const barangDiterima = allSummary.filter((r) => String(r.status).toLowerCase() === "diterima").length;
    const totalTagihanPo = allSummary.reduce((acc, curr) => acc + parseFloat(curr.total_po || 0), 0);
    const menungguSupplier = allSummary.filter((r) => ["draft", "dikirim", "menunggu"].includes(String(r.status).toLowerCase())).length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Pembelian berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows.map((r) => ({
        ...r,
        total_item: parseInt(r.total_item || 0, 10),
        total_po: parseFloat(r.total_po || 0),
      })),
      total_data: totalData,
      summary: {
        total_po: totalPo,
        barang_diterima: barangDiterima,
        total_tagihan_po: totalTagihanPo,
        menunggu_supplier: menungguSupplier,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "pembelian", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 16. LAPORAN MEMBERSHIP
 */
router.post("/membership", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const filterLevel = body.kode_level || null;
  const filterStatus = body.status || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("mst_pasien as p")
      .leftJoin("mst_level_membership as lm", "p.kode_level_membership", "lm.kode_level")
      .modify((qb) => {
        if (branchCode) {
          qb.where("p.kode_cabang", branchCode);
        }
        if (filterLevel) {
          if (filterLevel === "non_member") {
            qb.whereNull("p.kode_level_membership");
          } else {
            qb.where("p.kode_level_membership", filterLevel);
          }
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("p.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim() && filterStatus !== "ALL") {
            qb.where("p.status", filterStatus.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(lm.nama_level) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("p.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery
      .clone()
      .select(
        "p.id",
        "p.no_rm",
        "p.nama as nama_pasien",
        "p.no_hp",
        "p.kode_level_membership",
        DB.raw("COALESCE(lm.nama_level, 'Non-Member') as nama_level"),
        "p.tanggal_gabung_membership",
        "p.total_poin",
        "p.status",
        "p.created_at"
      )
      .orderBy("p.total_poin", "desc")
      .orderBy("p.created_at", "desc")
      .limit(perPage)
      .offset(offset);

    // Summary calculation
    const allSummary = await baseQuery.clone().select("p.kode_level_membership", "p.total_poin", "p.status");
    const totalPasien = allSummary.length;
    const memberAktif = allSummary.filter((r) => r.kode_level_membership !== null && r.status === "aktif").length;
    const akumulasiPoin = allSummary.reduce((acc, curr) => acc + parseInt(curr.total_poin || 0, 10), 0);
    const nonMember = allSummary.filter((r) => !r.kode_level_membership).length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Membership berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows.map((r) => ({
        ...r,
        total_poin: parseInt(r.total_poin || 0, 10),
      })),
      total_data: totalData,
      summary: {
        total_pasien: totalPasien,
        member_aktif: memberAktif,
        akumulasi_poin: akumulasiPoin,
        non_member: nonMember,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "membership", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 17. LAPORAN KOMISI
 */
router.post("/komisi", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const filterKaryawan = body.kode_karyawan || null;
  const filterStatusPencairan = body.status_pencairan || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_komisi as k")
      .leftJoin("mst_karyawan as kar", "k.kode_karyawan", "kar.kode_karyawan")
      .modify((qb) => {
        if (branchCode) {
          qb.where("k.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(k.created_at) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(k.created_at) <= ?", [tanggal_sampai]);
        }
        if (filterKaryawan) {
          qb.where("k.kode_karyawan", filterKaryawan);
        }
        if (filterStatusPencairan) {
          if (Array.isArray(filterStatusPencairan) && filterStatusPencairan.length > 0) {
            qb.whereIn("k.status_pencairan", filterStatusPencairan);
          } else if (typeof filterStatusPencairan === "string" && filterStatusPencairan.trim() && filterStatusPencairan !== "ALL") {
            qb.where("k.status_pencairan", filterStatusPencairan.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_karyawan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(kar.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(kar.jabatan) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    // We group by employee and status
    const groupedQuery = baseQuery
      .clone()
      .select(
        "k.kode_karyawan",
        "kar.nama as nama_tenaga_medis",
        "kar.jabatan as peran",
        DB.raw("COUNT(k.id) as total_tindakan"),
        DB.raw("COALESCE(SUM(k.nilai_omzet), 0) as nilai_omzet"),
        DB.raw("COALESCE(SUM(k.nominal_komisi), 0) as nominal_komisi"),
        "k.status_pencairan"
      )
      .groupBy("k.kode_karyawan", "kar.nama", "kar.jabatan", "k.status_pencairan");

    const allGrouped = await groupedQuery;
    const totalData = allGrouped.length;
    const paginatedRows = allGrouped.slice(offset, offset + perPage);

    // Summary calculation
    const totalTindakan = allGrouped.reduce((acc, curr) => acc + parseInt(curr.total_tindakan || 0, 10), 0);
    const totalOmzet = allGrouped.reduce((acc, curr) => acc + parseFloat(curr.nilai_omzet || 0), 0);
    const totalKomisi = allGrouped.reduce((acc, curr) => acc + parseFloat(curr.nominal_komisi || 0), 0);
    const komisiDicairkan = allGrouped
      .filter((r) => r.status_pencairan === "sudah_dicairkan")
      .reduce((acc, curr) => acc + parseFloat(curr.nominal_komisi || 0), 0);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Komisi berhasil dimuat",
      datetime: formatDateSystem(),
      data: paginatedRows.map((r) => ({
        ...r,
        total_tindakan: parseInt(r.total_tindakan || 0, 10),
        nilai_omzet: parseFloat(r.nilai_omzet || 0),
        nominal_komisi: parseFloat(r.nominal_komisi || 0),
      })),
      total_data: totalData,
      summary: {
        total_tindakan: totalTindakan,
        total_omzet: totalOmzet,
        total_komisi: totalKomisi,
        komisi_dicairkan: komisiDicairkan,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "komisi", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 18. LAPORAN EXPIRED
 */
router.post("/expired", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const filterStatusExpired = body.status_expired || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("mst_produk as p")
      .whereRaw("p.kode_produk NOT LIKE 'CUSTOM-%' AND p.kode_produk NOT LIKE 'CST-%'")
      .modify((qb) => {
        if (branchCode) {
          qb.where("p.kode_cabang", branchCode);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_batch) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const allProducts = await baseQuery.clone().select(
      "p.id",
      "p.kode_produk",
      "p.nama as nama_produk",
      "p.no_batch",
      "p.tanggal_kadaluarsa",
      "p.stok_tersedia",
      "p.satuan",
      "p.status"
    );

    const now = new Date();
    const mappedWithStatus = allProducts.map((p) => {
      let statusExp = "belum_diisi";
      let sisaHari = null;
      if (p.tanggal_kadaluarsa) {
        const expDate = new Date(p.tanggal_kadaluarsa);
        sisaHari = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (sisaHari < 30) {
          statusExp = "kritis";
        } else if (sisaHari < 90) {
          statusExp = "perhatian";
        } else {
          statusExp = "aman";
        }
      }
      return {
        ...p,
        sisa_hari: sisaHari,
        status_expired: statusExp,
        stok_tersedia: parseInt(p.stok_tersedia || 0, 10),
      };
    });

    const filtered = mappedWithStatus.filter((p) => {
      if (!filterStatusExpired || filterStatusExpired === "ALL") return true;
      if (Array.isArray(filterStatusExpired)) return filterStatusExpired.includes(p.status_expired);
      return p.status_expired === filterStatusExpired;
    });

    const priorityMap = { kritis: 1, perhatian: 2, aman: 3, belum_diisi: 4 };
    filtered.sort((a, b) => {
      const pDiff = (priorityMap[a.status_expired] || 5) - (priorityMap[b.status_expired] || 5);
      if (pDiff !== 0) return pDiff;
      if (a.sisa_hari !== null && b.sisa_hari !== null) return a.sisa_hari - b.sisa_hari;
      return 0;
    });

    const totalData = filtered.length;
    const paginated = filtered.slice(offset, offset + perPage);

    const totalProduk = mappedWithStatus.length;
    const kritis = mappedWithStatus.filter((p) => p.status_expired === "kritis").length;
    const perhatian = mappedWithStatus.filter((p) => p.status_expired === "perhatian").length;
    const aman = mappedWithStatus.filter((p) => p.status_expired === "aman").length;
    const belumDiisi = mappedWithStatus.filter((p) => p.status_expired === "belum_diisi").length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Expired berhasil dimuat",
      datetime: formatDateSystem(),
      data: paginated,
      total_data: totalData,
      summary: {
        total_produk: totalProduk,
        kritis,
        perhatian,
        aman,
        belum_diisi: belumDiisi,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "expired", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 19. LAPORAN DEPOSIT
 */
router.post("/deposit", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const filterStatus = body.status || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("mst_pasien as p")
      .leftJoin("trx_deposit as d", "p.no_rm", "d.no_rm")
      .modify((qb) => {
        if (branchCode) {
          qb.where("p.kode_cabang", branchCode);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`]);
          });
        }
      })
      .select(
        "p.no_rm",
        "p.nama as nama_pasien",
        "p.saldo_deposit",
        DB.raw("COUNT(d.id) as total_riwayat"),
        DB.raw("CASE WHEN p.saldo_deposit > 0 THEN 'aktif' ELSE 'nonaktif' END as status_deposit")
      )
      .groupBy("p.no_rm", "p.nama", "p.saldo_deposit")
      .havingRaw("COUNT(d.id) > 0 OR p.saldo_deposit > 0");

    const allRows = await baseQuery;

    const filtered = allRows.filter((r) => {
      if (!filterStatus || filterStatus === "ALL") return true;
      if (Array.isArray(filterStatus)) return filterStatus.includes(r.status_deposit);
      return r.status_deposit === filterStatus;
    });

    const totalData = filtered.length;
    const paginated = filtered.slice(offset, offset + perPage);

    const totalPasienDeposit = allRows.length;
    const totalSaldoMengendap = allRows.reduce((acc, curr) => acc + parseFloat(curr.saldo_deposit || 0), 0);
    const totalRiwayatTrx = allRows.reduce((acc, curr) => acc + parseInt(curr.total_riwayat || 0, 10), 0);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan Deposit berhasil dimuat",
      datetime: formatDateSystem(),
      data: paginated.map((r) => ({
        ...r,
        saldo_deposit: parseFloat(r.saldo_deposit || 0),
        total_riwayat: parseInt(r.total_riwayat || 0, 10),
      })),
      total_data: totalData,
      summary: {
        total_pasien: totalPasienDeposit,
        total_saldo: totalSaldoMengendap,
        total_riwayat: totalRiwayatTrx,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "deposit", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

/**
 * 20. LAPORAN CRM
 */
router.post("/crm", async (req, res) => {
  const { body } = req;
  const branchCode = getBranchScope(req, body.kode_cabang);
  const keyword = (body.keyword || "").trim();
  const tanggal_dari = body.tanggal_dari || null;
  const tanggal_sampai = body.tanggal_sampai || null;
  const filterTipe = body.tipe_followup || null;
  const filterKanal = body.kanal_komunikasi || null;
  const filterStatus = body.status || null;
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const baseQuery = DB("trx_crm_interaksi as crm")
      .leftJoin("mst_pasien as p", "crm.no_rm", "p.no_rm")
      .modify((qb) => {
        if (branchCode) {
          qb.where("crm.kode_cabang", branchCode);
        }
        if (tanggal_dari) {
          qb.whereRaw("DATE(crm.tanggal_kirim) >= ?", [tanggal_dari]);
        }
        if (tanggal_sampai) {
          qb.whereRaw("DATE(crm.tanggal_kirim) <= ?", [tanggal_sampai]);
        }
        if (filterTipe) {
          if (Array.isArray(filterTipe) && filterTipe.length > 0) {
            qb.whereIn("crm.tipe_followup", filterTipe);
          } else if (typeof filterTipe === "string" && filterTipe.trim() && filterTipe !== "ALL") {
            qb.where("crm.tipe_followup", filterTipe.trim());
          }
        }
        if (filterKanal) {
          if (Array.isArray(filterKanal) && filterKanal.length > 0) {
            qb.whereIn("crm.kanal_komunikasi", filterKanal);
          } else if (typeof filterKanal === "string" && filterKanal.trim() && filterKanal !== "ALL") {
            qb.where("crm.kanal_komunikasi", filterKanal.trim());
          }
        }
        if (filterStatus) {
          if (Array.isArray(filterStatus) && filterStatus.length > 0) {
            qb.whereIn("crm.status", filterStatus);
          } else if (typeof filterStatus === "string" && filterStatus.trim() && filterStatus !== "ALL") {
            qb.where("crm.status", filterStatus.trim());
          }
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(crm.kode_interaksi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(crm.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(crm.pesan) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("crm.id as total").first();
    const totalData = parseInt(countResult?.total || 0, 10);

    const rows = await baseQuery
      .clone()
      .select(
        "crm.id",
        "crm.kode_interaksi",
        "crm.no_rm",
        "p.nama as nama_pasien",
        "crm.tipe_followup",
        "crm.tanggal_kirim",
        "crm.kanal_komunikasi",
        "crm.pesan",
        "crm.status",
        "crm.created_at"
      )
      .orderBy("crm.tanggal_kirim", "desc")
      .orderBy("crm.id", "desc")
      .limit(perPage)
      .offset(offset);

    // Summary calculation
    const allSummary = await baseQuery.clone().select("crm.status");
    const totalInteraksi = allSummary.length;
    const terkirim = allSummary.filter((r) => r.status === "terkirim").length;
    const pending = allSummary.filter((r) => r.status === "pending").length;
    const gagal = allSummary.filter((r) => r.status === "gagal").length;

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Laporan CRM berhasil dimuat",
      datetime: formatDateSystem(),
      data: rows,
      total_data: totalData,
      summary: {
        total_interaksi: totalInteraksi,
        terkirim,
        pending,
        gagal,
      },
    });
  } catch (err) {
    Logging(err, { file: "laporan_routes.js", func: "crm", request: body });
    return res.status(500).json({ status: status.BAD_REQUEST, message: err.message });
  }
});

export default router;
