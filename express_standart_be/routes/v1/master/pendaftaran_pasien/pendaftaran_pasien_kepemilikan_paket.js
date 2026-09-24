/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_kepemilikan_paket.js
 * @description Endpoint untuk mengambil data kepemilikan paket layanan pasien
 *
 * @author Antigravity
 * @created 2026-09-02
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

const handleGetKepemilikanPaket = async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);
  const assetsBase = process.env.ASSETS_PATH || "/api/assets";
  const keyword = (oPayload.keyword || "").trim();
  const filterNoRm = oPayload.no_rm || null;
  const filterStatus = oPayload.status || null;
  const page = parseInt(oPayload.page, 10) || 1;
  const perPage = parseInt(oPayload.perPage, 10) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");

    // Auto-update expired status on fetch
    await DB("trx_kepemilikan_paket_layanan")
      .where("status", "aktif")
      .whereNotNull("tanggal_expired")
      .whereRaw("DATE(tanggal_expired) < ?", [todayStr])
      .update({
        status: "expired",
        updated_at: formatDateSystem(),
      });

    const baseQuery = DB("trx_kepemilikan_paket_layanan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("mst_paket_layanan as pkt", "k.kode_paket_layanan", "pkt.kode_paket_layanan")
      .leftJoin("mst_ruangan as rpkt", "pkt.kode_ruangan", "rpkt.kode_ruangan")
      .modify((qb) => {
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kepemilikan_paket_layanan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(pkt.nama) LIKE ?", [`%${lower}%`]);
          });
        }
        if (branchCode) qb.where("k.kode_cabang", branchCode);
        if (filterNoRm) qb.where("k.no_rm", filterNoRm);
        if (filterStatus) qb.where("k.status", filterStatus);
      });

    const selectFields = [
      "k.id",
      "k.kode_kepemilikan_paket_layanan",
      "k.kode_transaksi",
      "k.no_rm",
      "p.nama as nama_pasien",
      "p.no_hp as no_hp_pasien",
      "k.kode_paket_layanan",
      "pkt.nama as nama_paket",
      "pkt.tipe as tipe_paket",
      "pkt.foto as foto_paket",
      "pkt.kode_ruangan as kode_ruangan_paket",
      "rpkt.nama_ruangan as nama_ruangan_paket",
      DB.raw("DATE_FORMAT(k.tanggal_beli, '%Y-%m-%d') as tanggal_beli"),
      DB.raw("DATE_FORMAT(k.tanggal_expired, '%Y-%m-%d') as tanggal_expired"),
      "k.status",
      "k.created_at",
      "k.updated_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult?.total || 0, 10);
      vaData = await baseQuery.clone().select(selectFields).orderBy("k.id", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("k.id", "desc");
      totalRecords = vaData.length;
    }

    const HARI_MAP = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
    const [year, month, day] = todayStr.split("-").map(Number);
    const todayDay = HARI_MAP[new Date(year, month - 1, day).getDay()];

    let schedulesQuery = DB("mst_jadwal_karyawan as j")
      .where("j.status", "aktif")
      .where("j.hari", todayDay);
    if (branchCode) schedulesQuery = schedulesQuery.where("j.kode_cabang", branchCode);
    const activeSchedulesToday = await schedulesQuery.select("j.kode_ruangan", "j.is_penanggung_jawab");

    const roomSchedulesMap = new Map();
    activeSchedulesToday.forEach((sch) => {
      if (!roomSchedulesMap.has(sch.kode_ruangan)) {
        roomSchedulesMap.set(sch.kode_ruangan, []);
      }
      roomSchedulesMap.get(sch.kode_ruangan).push(sch);
    });

    let rkQuery = DB("mst_ruangan").where("is_konsultasi", 1).where("status", "aktif");
    if (branchCode) rkQuery = rkQuery.where("kode_cabang", branchCode);
    const ruangKonsul = await rkQuery.first();
    const kodeRuanganKonsul = ruangKonsul?.kode_ruangan || "RNG-007";

    const assetsBase = process.env.ASSETS_PATH || "/api/assets";

    // Attach detail session items per package ownership
    for (const item of vaData) {
      const details = await DB("trx_detail_kepemilikan_paket_layanan as d")
        .leftJoin("mst_layanan as l", "d.kode_layanan", "l.kode_layanan")
        .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
        .where("d.kode_kepemilikan_paket_layanan", item.kode_kepemilikan_paket_layanan)
        .select(
          "d.kode_detail_kepemilikan_paket_layanan",
          "d.kode_layanan",
          "l.nama as nama_layanan",
          "l.durasi_menit",
          "l.tipe as tipe_layanan",
          "l.wajib_konsultasi",
          "l.foto as foto_layanan",
          "l.kode_ruangan",
          "r.nama_ruangan as nama_ruangan",
          "d.sesi_total",
          "d.sesi_terpakai"
        );

      const detailCodes = details.map((d) => d.kode_detail_kepemilikan_paket_layanan).filter(Boolean);
      const activeBookingsMap = {};
      if (detailCodes.length > 0) {
        const activeRows = await DB("trx_detail_booking as db")
          .join("trx_booking as b", "db.kode_booking", "b.kode_booking")
          .whereIn("db.kode_detail_kepemilikan_paket_layanan", detailCodes)
          .whereIn("b.status", ["dikonfirmasi", "menunggu_pembayaran"])
          .groupBy("db.kode_detail_kepemilikan_paket_layanan")
          .select("db.kode_detail_kepemilikan_paket_layanan", DB.raw("COUNT(db.id) as total_booked"));

        activeRows.forEach((ar) => {
          activeBookingsMap[ar.kode_detail_kepemilikan_paket_layanan] = parseInt(ar.total_booked || 0, 10);
        });
      }

      item.details = details.map((d) => {
        const sisaSesi = Math.max(0, parseInt(d.sesi_total || 0, 10) - parseInt(d.sesi_terpakai || 0, 10));
        const sesiTerbooking = activeBookingsMap[d.kode_detail_kepemilikan_paket_layanan] || 0;
        const sesiTersedia = Math.max(0, sisaSesi - sesiTerbooking);

        const finalTipe = item.tipe_paket || d.tipe_layanan || 'BEAUTY TREATMENT';
        let finalWajibKonsultasi = 'opsional';
        if (finalTipe === 'MEDICAL TREATMENT' || d.wajib_konsultasi === 'wajib') {
          finalWajibKonsultasi = 'wajib';
        } else if (finalTipe === 'SERVICE TREATMENT' || d.wajib_konsultasi === 'tidak') {
          finalWajibKonsultasi = 'tidak';
        } else {
          finalWajibKonsultasi = 'opsional';
        }

        const isWajibKonsul = finalWajibKonsultasi === 'wajib';
        const targetRuanganCek = isWajibKonsul ? kodeRuanganKonsul : (d.kode_ruangan || item.kode_ruangan_paket || 'RNG-002');
        const targetSchedules = roomSchedulesMap.get(targetRuanganCek) || [];
        const isPetugasAvailable = targetSchedules.length > 0;
        let alasanTidakTersedia = null;
        if (!isPetugasAvailable) {
          const namaRuanganCek = isWajibKonsul ? (ruangKonsul?.nama_ruangan || "Ruang Konsultasi") : (d.nama_ruangan || item.nama_ruangan_paket || "Ruangan Treatment");
          alasanTidakTersedia = isWajibKonsul
            ? `Tidak ada dokter/petugas jaga di ${namaRuanganCek} hari ini (${todayDay})`
            : `Tidak ada petugas jaga di ${namaRuanganCek} hari ini (${todayDay})`;
        }

        const fotoItem = d.foto_layanan
          ? (d.foto_layanan.startsWith("http") ? d.foto_layanan : `${assetsBase}/uploads/layanan/${d.foto_layanan}`)
          : item.foto_paket
          ? (item.foto_paket.startsWith("http") ? item.foto_paket : `${assetsBase}/uploads/paket_layanan/${item.foto_paket}`)
          : null;

        return {
          ...d,
          foto: fotoItem,
          sisa_sesi: sisaSesi,
          sesi_terbooking: sesiTerbooking,
          sesi_tersedia: sesiTersedia,
          tipe: finalTipe,
          wajib_konsultasi: finalWajibKonsultasi,
          kode_ruangan: d.kode_ruangan || item.kode_ruangan_paket || 'RNG-002',
          nama_ruangan: d.nama_ruangan || item.nama_ruangan_paket || 'Ruangan Facial & Peeling',
          durasi_menit: d.durasi_menit || 45,
          is_petugas_available: isPetugasAvailable,
          alasan_tidak_tersedia: alasanTidakTersedia,
        };
      });

      const totalSesi = details.reduce((sum, d) => sum + parseInt(d.sesi_total || 0, 10), 0);
      const totalTerpakai = details.reduce((sum, d) => sum + parseInt(d.sesi_terpakai || 0, 10), 0);
      const totalTerbooking = item.details.reduce((sum, d) => sum + (d.sesi_terbooking || 0), 0);
      const totalTersedia = item.details.reduce((sum, d) => sum + (d.sesi_tersedia || 0), 0);

      item.total_sesi = totalSesi;
      item.total_terpakai = totalTerpakai;
      item.sisa_sesi = Math.max(0, totalSesi - totalTerpakai);
      item.total_terbooking = totalTerbooking;
      item.total_tersedia = totalTersedia;

      // Auto update status to "habis" if remaining sessions are 0
      if (item.status === "aktif" && totalSesi > 0 && item.sisa_sesi === 0) {
        item.status = "habis";
        await DB("trx_kepemilikan_paket_layanan")
          .where("kode_kepemilikan_paket_layanan", item.kode_kepemilikan_paket_layanan)
          .update({ status: "habis", updated_at: formatDateSystem() });
      }
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data kepemilikan paket pasien ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_kepemilikan_paket.js",
      func: "get_kepemilikan_paket",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", handleGetKepemilikanPaket);
router.post("/", handleGetKepemilikanPaket);

export default router;
