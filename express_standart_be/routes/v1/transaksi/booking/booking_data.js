/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file booking_data.js
 * @description Endpoint untuk mengambil daftar data booking/reservasi dengan filter & pagination
 *
 * @author Antigravity
 * @created 2026-09-07
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  const page = parseInt(oPayload.page, 10) || 1;
  const perPage = parseInt(oPayload.perPage, 10) || 10;
  const offset = (page - 1) * perPage;

  const keyword = (oPayload.keyword || "").trim();
  const filterStatus = (oPayload.status || "").trim();
  const filterDpStatus = (oPayload.dp_status || "").trim();
  const filterTanggal = (oPayload.tanggal_booking || "").trim();
  const filterTanggalMulai = (oPayload.tanggal_mulai || "").trim();
  const filterTanggalSelesai = (oPayload.tanggal_selesai || "").trim();
  const sortField = oPayload.sortField || "tanggal_booking";
  const sortOrder = (oPayload.sortOrder || "desc").toLowerCase();

  try {
    const baseQuery = DB("trx_booking as b")
      .leftJoin("mst_pasien as p", "b.no_rm", "p.no_rm")
      .leftJoin("mst_jadwal_karyawan as j", "b.kode_jadwal", "j.kode_jadwal")
      .leftJoin("mst_karyawan as k", "j.no_sip", "k.no_sip")
      .leftJoin("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
      .modify((qb) => {
        if (branchCode) {
          qb.where("b.kode_cabang", branchCode);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(b.kode_booking) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`]);
          });
        }

        if (filterStatus) {
          qb.where("b.status", filterStatus);
        }

        if (filterDpStatus) {
          qb.where("b.dp_status", filterDpStatus);
        }

        if (filterTanggal) {
          qb.where("b.tanggal_booking", filterTanggal);
        } else {
          if (filterTanggalMulai) {
            qb.where("b.tanggal_booking", ">=", filterTanggalMulai);
          }
          if (filterTanggalSelesai) {
            qb.where("b.tanggal_booking", "<=", filterTanggalSelesai);
          }
        }
      });

    // Hitung total records
    const countResult = await baseQuery.clone().count("b.id as total").first();
    const totalRecords = parseInt(countResult?.total || 0, 10);

    // Sorting map
    const sortMap = {
      kode_booking: "b.kode_booking",
      tanggal_booking: "b.tanggal_booking",
      jam_booking: "b.jam_booking",
      status: "b.status",
      dp_status: "b.dp_status",
      dp_nominal: "b.dp_nominal",
      nama_pasien: "p.nama",
      no_rm: "b.no_rm",
      created_at: "b.created_at",
    };
    const sortCol = sortMap[sortField] || "b.tanggal_booking";

    let selectQuery = baseQuery.clone().select(
      "b.id",
      "b.kode_booking",
      "b.no_rm",
      "p.nama as nama_pasien",
      "p.no_hp as no_hp_pasien",
      "p.nik as nik_pasien",
      "b.kode_ruangan as booking_kode_ruangan",
      "b.total_biaya",
      "b.jenis_layanan",
      "b.kode_layanan",
      "b.kode_jadwal",
      "j.no_sip",
      "k.nama as nama_petugas",
      "k.jabatan as jabatan_petugas",
      "j.kode_ruangan",
      "r.nama_ruangan",
      "b.tanggal_booking",
      "b.jam_booking",
      "b.catatan_pasien",
      "b.status",
      "b.dp_nominal",
      "b.dp_status",
      "b.dp_dibayar_at",
      "b.metode_pembayaran_dp",
      "b.alasan_bebas_dp",
      "b.sumber",
      "b.butuh_konsul",
      "b.created_by",
      "b.created_at",
      "b.updated_at"
    );

    if (sortCol === "b.tanggal_booking") {
      selectQuery = selectQuery.orderBy("b.tanggal_booking", sortOrder).orderBy("b.jam_booking", sortOrder);
    } else {
      selectQuery = selectQuery.orderBy(sortCol, sortOrder);
    }

    if (hasPagination) {
      selectQuery = selectQuery.limit(perPage).offset(offset);
    }

    const rows = await selectQuery;

    // Ambil detail items dari trx_detail_booking
    const bookingCodes = rows.map((r) => r.kode_booking);
    const detailMap = {};
    if (bookingCodes.length > 0) {
      const detailRows = await DB("trx_detail_booking")
        .whereIn("kode_booking", bookingCodes)
        .select(
          "kode_detail_booking",
          "kode_booking",
          "jenis_layanan",
          "jenis_item",
          "kode_layanan",
          "kode_kepemilikan_paket_layanan",
          "kode_detail_kepemilikan_paket_layanan",
          "nama_layanan",
          "harga",
          "durasi_menit",
          "butuh_konsul"
        )
        .orderBy("id", "asc");

      detailRows.forEach((d) => {
        if (!detailMap[d.kode_booking]) detailMap[d.kode_booking] = [];
        detailMap[d.kode_booking].push(d);
      });
    }

    // Ambil nama layanan dan nama paket secara batch
    const kodeLayananList = rows.filter((r) => r.jenis_layanan === "layanan").map((r) => r.kode_layanan);
    const kodePaketList = rows.filter((r) => r.jenis_layanan === "paket").map((r) => r.kode_layanan);

    const layananMap = {};
    if (kodeLayananList.length > 0) {
      const layRows = await DB("mst_layanan")
        .whereIn("kode_layanan", kodeLayananList)
        .select("kode_layanan", "nama", "harga");
      layRows.forEach((l) => {
        layananMap[l.kode_layanan] = l;
      });
    }

    const paketMap = {};
    if (kodePaketList.length > 0) {
      const pktRows = await DB("mst_paket_layanan")
        .whereIn("kode_paket_layanan", kodePaketList)
        .select("kode_paket_layanan", "nama", "harga_paket");
      pktRows.forEach((p) => {
        paketMap[p.kode_paket_layanan] = p;
      });
    }

    // Ambil konfigurasi toleransi keterlambatan dari tabel config (default: 30 menit)
    const cfgToleransi = await DB("config")
      .where("kode", "toleransi_keterlambatan_menit")
      .first();
    const toleransiMenit = parseInt(cfgToleransi?.keterangan || "30", 10) || 30;

    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const mappedData = rows.map((row) => {
      const items = detailMap[row.kode_booking] || [];
      let namaLayanan = "";
      let hargaLayanan = parseFloat(row.total_biaya || 0);

      if (items.length > 0) {
        if (items.length === 1) {
          namaLayanan = items[0].nama_layanan;
        } else {
          namaLayanan = `${items[0].nama_layanan} (+${items.length - 1} lainnya)`;
        }
        if (!hargaLayanan) {
          hargaLayanan = items.reduce((sum, it) => sum + parseFloat(it.harga || 0), 0);
        }
      } else if (row.jenis_layanan === "paket") {
        const p = paketMap[row.kode_layanan];
        namaLayanan = p ? p.nama : row.kode_layanan;
        hargaLayanan = p ? parseFloat(p.harga_paket || 0) : 0;
      } else {
        const l = layananMap[row.kode_layanan];
        namaLayanan = l ? l.nama : row.kode_layanan;
        hargaLayanan = l ? parseFloat(l.harga || 0) : 0;
      }

      // Hitung tanggal_booking format string YYYY-MM-DD
      const tglStr = row.tanggal_booking instanceof Date
        ? row.tanggal_booking.toISOString().slice(0, 10)
        : String(row.tanggal_booking).slice(0, 10);

      // Flag apakah check-in aktif (hanya untuk tanggal hari ini dan status dikonfirmasi)
      const canCheckin = tglStr === todayYmd && row.status === "dikonfirmasi";

      // Flag apakah bisa tandai lunas DP
      const canPayDp = row.dp_status === "belum_bayar" && row.status === "dikonfirmasi";

      // Flag apakah bisa ditandai tidak hadir:
      // HANYA jika status dikonfirmasi DAN sudah melewati tanggal/jam booking + toleransi dinamis
      let isOverdue = false;
      if (tglStr < todayYmd) {
        isOverdue = true;
      } else if (tglStr === todayYmd) {
        if (row.jam_booking) {
          const [bH, bM] = String(row.jam_booking).slice(0, 5).split(":").map(Number);
          const bookMins = (bH || 0) * 60 + (bM || 0) + toleransiMenit;
          isOverdue = nowMinutes >= bookMins;
        }
      }
      // Untuk tglStr > todayYmd (masa depan), isOverdue tetap false

      // Flag apakah bisa dibatalkan (tanggal belum terlewat, belum overdue, dan status dikonfirmasi)
      const canCancel = tglStr >= todayYmd && row.status === "dikonfirmasi" && !isOverdue;

      const canMarkTidakHadir = row.status === "dikonfirmasi" && isOverdue;

      return {
        ...row,
        tanggal_booking: tglStr,
        jam_booking: row.jam_booking ? String(row.jam_booking).slice(0, 5) : "",
        nama_layanan: namaLayanan,
        harga_layanan: hargaLayanan,
        total_biaya: hargaLayanan,
        items: items,
        total_items: items.length,
        can_checkin: canCheckin,
        can_cancel: canCancel,
        can_pay_dp: canPayDp,
        can_mark_tidak_hadir: canMarkTidakHadir,
      };
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data booking ditemukan",
      datetime: formatDateSystem(),
      data: mappedData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Gagal mengambil data booking",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/transaksi/booking/booking_data.js",
      func: "get_booking_data",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
