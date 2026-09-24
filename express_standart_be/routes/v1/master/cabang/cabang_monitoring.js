/**
 * @file cabang_monitoring.js
 * @description Endpoint Dashboard Monitoring Konsolidasi Perkembangan Cabang untuk Superadmin
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "SUPERADMIN";

  try {
    const today = new Date().toISOString().slice(0, 10);
    const firstDayOfMonth = `${today.slice(0, 7)}-01`;
    const tanggalAwal = oPayload.tanggal_awal || firstDayOfMonth;
    const tanggalAkhir = oPayload.tanggal_akhir || today;

    const allBranches = await DB("mst_cabang").orderBy("id", "asc");
    const branchCodes = allBranches.map((b) => b.kode_cabang);

    // 1. Omzet Bulan Ini / Periode Terpilih per Cabang
    const omzetBulanIni = await DB("trx_transaksi")
      .whereIn("kode_cabang", branchCodes)
      .whereIn("status", ["lunas", "selesai"])
      .whereRaw("DATE(tanggal_transaksi) >= ? AND DATE(tanggal_transaksi) <= ?", [tanggalAwal, tanggalAkhir])
      .select("kode_cabang")
      .sum("total_bayar as omzet")
      .count("id as total_transaksi")
      .groupBy("kode_cabang");
    const omzetBulanMap = {};
    omzetBulanIni.forEach((o) => {
      omzetBulanMap[o.kode_cabang] = {
        omzet: Number(o.omzet || 0),
        transaksi: Number(o.total_transaksi || 0),
      };
    });

    // 2. Omzet Hari Ini per Cabang
    const omzetHariIni = await DB("trx_transaksi")
      .whereIn("kode_cabang", branchCodes)
      .whereIn("status", ["lunas", "selesai"])
      .whereRaw("DATE(tanggal_transaksi) = ?", [today])
      .select("kode_cabang")
      .sum("total_bayar as omzet")
      .count("id as total_transaksi")
      .groupBy("kode_cabang");
    const omzetHariMap = {};
    omzetHariIni.forEach((o) => {
      omzetHariMap[o.kode_cabang] = {
        omzet: Number(o.omzet || 0),
        transaksi: Number(o.total_transaksi || 0),
      };
    });

    // 3. Kunjungan Hari Ini & Bulan Ini / Periode Terpilih
    const kunjunganRows = await DB("trx_kunjungan")
      .whereIn("kode_cabang", branchCodes)
      .whereRaw("DATE(tanggal_kunjungan) >= ? AND DATE(tanggal_kunjungan) <= ?", [tanggalAwal, tanggalAkhir])
      .select("kode_cabang", "tanggal_kunjungan");

    const kunjunganStats = {};
    branchCodes.forEach((code) => {
      kunjunganStats[code] = { hari_ini: 0, bulan_ini: 0 };
    });

    kunjunganRows.forEach((k) => {
      const tgl = k.tanggal_kunjungan instanceof Date
        ? k.tanggal_kunjungan.toISOString().slice(0, 10)
        : String(k.tanggal_kunjungan || "").slice(0, 10);
      if (kunjunganStats[k.kode_cabang]) {
        kunjunganStats[k.kode_cabang].bulan_ini += 1;
        if (tgl === today) {
          kunjunganStats[k.kode_cabang].hari_ini += 1;
        }
      }
    });

    // 4. Total Pasien per Cabang
    const pasienRows = await DB("mst_pasien")
      .whereIn("kode_cabang", branchCodes)
      .select("kode_cabang")
      .count("no_rm as total")
      .groupBy("kode_cabang");
    const pasienMap = {};
    pasienRows.forEach((p) => { pasienMap[p.kode_cabang] = Number(p.total); });

    // 5. Total Karyawan & Dokter per Cabang
    const stafRows = await DB("mst_karyawan")
      .whereIn("kode_cabang", branchCodes)
      .select("kode_cabang", "jabatan");
    const stafMap = {};
    branchCodes.forEach((code) => {
      stafMap[code] = { total: 0, dokter: 0, beautician: 0 };
    });
    stafRows.forEach((s) => {
      if (stafMap[s.kode_cabang]) {
        stafMap[s.kode_cabang].total += 1;
        const j = (s.jabatan || "").toLowerCase();
        if (j.includes("dokter")) stafMap[s.kode_cabang].dokter += 1;
        if (j.includes("terapis") || j.includes("beautician")) stafMap[s.kode_cabang].beautician += 1;
      }
    });

    // 6. User Manager Akun Cabang
    const managerUsers = await DB("user_credential")
      .whereIn("kode_cabang", branchCodes)
      .whereIn("role", ["owner", "manager"])
      .select("kode_cabang", "fullname", "username", "status");
    const managerMap = {};
    managerUsers.forEach((m) => {
      if (!managerMap[m.kode_cabang]) managerMap[m.kode_cabang] = [];
      managerMap[m.kode_cabang].push(m);
    });

    // Konsolidasi Per Cabang
    let totalOmzetBulanAll = 0;
    let totalOmzetHariAll = 0;
    let totalKunjunganBulanAll = 0;
    let totalKunjunganHariAll = 0;
    let totalPasienAll = 0;

    const perCabang = allBranches.map((b) => {
      const omzBulan = omzetBulanMap[b.kode_cabang]?.omzet || 0;
      const omzHari = omzetHariMap[b.kode_cabang]?.omzet || 0;
      const kjHari = kunjunganStats[b.kode_cabang]?.hari_ini || 0;
      const kjBulan = kunjunganStats[b.kode_cabang]?.bulan_ini || 0;
      const pas = pasienMap[b.kode_cabang] || 0;

      totalOmzetBulanAll += omzBulan;
      totalOmzetHariAll += omzHari;
      totalKunjunganBulanAll += kjBulan;
      totalKunjunganHariAll += kjHari;
      totalPasienAll += pas;

      return {
        id: b.id,
        kode_cabang: b.kode_cabang,
        nama_cabang: b.nama_cabang,
        alamat: b.alamat,
        no_telp: b.no_telp,
        email: b.email,
        pj_manager: b.pj_manager,
        status: b.status,
        omzet_bulan_ini: omzBulan,
        omzet_hari_ini: omzHari,
        transaksi_bulan_ini: omzetBulanMap[b.kode_cabang]?.transaksi || 0,
        kunjungan_hari_ini: kjHari,
        kunjungan_bulan_ini: kjBulan,
        total_pasien: pas,
        total_karyawan: stafMap[b.kode_cabang]?.total || 0,
        total_dokter: stafMap[b.kode_cabang]?.dokter || 0,
        managers: managerMap[b.kode_cabang] || [],
      };
    });

    const summary = {
      total_cabang: allBranches.length,
      cabang_aktif: allBranches.filter((b) => b.status === "aktif").length,
      total_omzet_bulan_ini: totalOmzetBulanAll,
      total_omzet_hari_ini: totalOmzetHariAll,
      total_kunjungan_bulan_ini: totalKunjunganBulanAll,
      total_kunjungan_hari_ini: totalKunjunganHariAll,
      total_pasien_terdaftar: totalPasienAll,
    };

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data monitoring konsolidasi cabang berhasil dimuat",
      summary,
      branches: perCabang,
      datetime: formatDateSystem(),
    });
  } catch (error) {
    console.error("CABANG_MONITORING_ERR:", error);
    Logging(error, {
      file: "/master/cabang/cabang_monitoring.js",
      func: "monitoring",
      request: oPayload,
      user: username,
    });
    return res.status(500).json({
      status: status.GAGAL,
      message: "Gagal memuat data monitoring cabang",
      datetime: formatDateSystem(),
    });
  }
});

router.get("/", (req, res) => router.handle({ ...req, method: "POST" }, res));

export default router;
