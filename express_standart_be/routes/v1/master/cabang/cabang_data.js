/**
 * @file cabang_data.js
 * @description Endpoint untuk mengambil data daftar cabang beserta metrik ringkas per cabang
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "SYSTEM";
  const userRole = (req?.auth?.role || "").toLowerCase();
  const userCabang = req?.auth?.kode_cabang || null;

  try {
    let qCabang = DB("mst_cabang as c").select(
      "c.id",
      "c.kode_cabang",
      "c.nama_cabang",
      "c.alamat",
      "c.no_telp",
      "c.email",
      "c.pj_manager",
      "c.status",
      "c.created_at",
      "c.updated_at"
    );

    // Filter jika non-superadmin
    if (userRole !== "superadmin" && userCabang) {
      qCabang.where("c.kode_cabang", userCabang);
    } else if (oPayload.kode_cabang) {
      qCabang.where("c.kode_cabang", oPayload.kode_cabang);
    }

    if (oPayload.status) {
      qCabang.where("c.status", oPayload.status);
    }

    if (oPayload.search || oPayload.keyword) {
      const kw = `%${(oPayload.search || oPayload.keyword).trim()}%`;
      qCabang.where((builder) => {
        builder
          .where("c.kode_cabang", "like", kw)
          .orWhere("c.nama_cabang", "like", kw)
          .orWhere("c.alamat", "like", kw)
          .orWhere("c.pj_manager", "like", kw);
      });
    }

    const branches = await qCabang.orderBy("c.id", "asc");

    // Ambil metrik ringkasan untuk setiap cabang
    const today = new Date().toISOString().slice(0, 10);
    const branchCodes = branches.map((b) => b.kode_cabang);

    // 1. Total User / Manager
    const userCounts = await DB("user_credential")
      .whereIn("kode_cabang", branchCodes)
      .select("kode_cabang")
      .count("user_code as total")
      .groupBy("kode_cabang");
    const userMap = {};
    userCounts.forEach((u) => { userMap[u.kode_cabang] = Number(u.total); });

    // 2. Total Pasien
    const pasienCounts = await DB("mst_pasien")
      .whereIn("kode_cabang", branchCodes)
      .select("kode_cabang")
      .count("no_rm as total")
      .groupBy("kode_cabang");
    const pasienMap = {};
    pasienCounts.forEach((p) => { pasienMap[p.kode_cabang] = Number(p.total); });

    // 3. Total Karyawan
    const stafCounts = await DB("mst_karyawan")
      .whereIn("kode_cabang", branchCodes)
      .select("kode_cabang")
      .count("id as total")
      .groupBy("kode_cabang");
    const stafMap = {};
    stafCounts.forEach((s) => { stafMap[s.kode_cabang] = Number(s.total); });

    // 4. Kunjungan Hari Ini
    const kunjunganToday = await DB("trx_kunjungan")
      .whereIn("kode_cabang", branchCodes)
      .whereRaw("DATE(tanggal_kunjungan) = ?", [today])
      .select("kode_cabang")
      .count("id as total")
      .groupBy("kode_cabang");
    const kunjunganMap = {};
    kunjunganToday.forEach((k) => { kunjunganMap[k.kode_cabang] = Number(k.total); });

    // 5. Total Omzet Selesai / Lunas
    const omzetList = await DB("trx_transaksi")
      .whereIn("kode_cabang", branchCodes)
      .whereIn("status", ["lunas", "selesai"])
      .select("kode_cabang")
      .sum("total_bayar as total_omzet")
      .groupBy("kode_cabang");
    const omzetMap = {};
    omzetList.forEach((o) => { omzetMap[o.kode_cabang] = Number(o.total_omzet || 0); });

    const enrichedBranches = branches.map((b) => ({
      ...b,
      total_user: userMap[b.kode_cabang] || 0,
      total_pasien: pasienMap[b.kode_cabang] || 0,
      total_karyawan: stafMap[b.kode_cabang] || 0,
      kunjungan_hari_ini: kunjunganMap[b.kode_cabang] || 0,
      total_omzet: omzetMap[b.kode_cabang] || 0,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data cabang berhasil dimuat",
      data: enrichedBranches,
      datetime: formatDateSystem(),
    });
  } catch (error) {
    Logging(error, {
      file: "/master/cabang/cabang_data.js",
      func: "get",
      request: oPayload,
      user: username,
    });
    return res.status(500).json({
      status: status.GAGAL,
      message: "Gagal memuat data cabang klinik",
      datetime: formatDateSystem(),
    });
  }
});

router.get("/", (req, res) => router.handle({ ...req, method: "POST" }, res));

export default router;
