/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_data.js
 * @description Endpoint untuk mengambil data kunjungan pasien hari ini + JOIN mst_pasien, trx_antrian_awal, & trx_antrian_layanan
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

const handleGetData = async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  const keyword = (oPayload.keyword || "").trim();
  const filterStatus = oPayload.status || null; // berlangsung, selesai, batal
  const filterTanggal = oPayload.tanggal || new Date().toISOString().slice(0, 10);
  const sortField = oPayload.sortField || "created_at";
  const sortOrder = oPayload.sortOrder || "desc";

  try {
    const baseQuery = DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_antrian_awal as a", "k.kode_kunjungan", "a.kode_kunjungan")
      .leftJoin("trx_antrian_layanan as al", "k.kode_kunjungan", "al.kode_kunjungan")
      .leftJoin("trx_detail_antrian_layanan as dal", "k.kode_kunjungan", "dal.kode_kunjungan")
      .groupBy("k.id", "p.id", "a.id")
      .modify((qb) => {
        if (branchCode) {
          qb.where("k.kode_cabang", branchCode);
        }
        if (filterTanggal) {
          qb.where("k.tanggal_kunjungan", filterTanggal);
        }
        if (filterStatus) {
          qb.where("k.status", filterStatus);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(a.nomor_antrian) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(al.nomor_antrian) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(al.kode_antrian_layanan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(dal.nama_layanan) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    let totalRecords = 0;
    let vaData = [];

    const selectFields = [
      "k.id as kunjungan_id",
      "k.kode_kunjungan",
      "k.no_rm",
      "k.tanggal_kunjungan",
      "k.jam_datang",
      "k.status as status_kunjungan",
      "k.created_at as kunjungan_created_at",
      "p.id as pasien_id",
      "p.nama as nama_pasien",
      "p.nik",
      "p.jenis_kelamin",
      "p.tanggal_lahir",
      "p.no_hp",
      "a.kode_antrian_awal",
      "a.nomor_antrian as nomor_antrian_awal",
      "a.status as status_antrian_awal",
      "a.dipanggil_at as dipanggil_at_awal",
      DB.raw("GROUP_CONCAT(DISTINCT dal.jenis_layanan ORDER BY dal.id ASC SEPARATOR ', ') as jenis_layanan"),
      DB.raw("GROUP_CONCAT(DISTINCT dal.nama_layanan ORDER BY dal.id ASC SEPARATOR ', ') as nama_layanan_detail"),
      DB.raw("GROUP_CONCAT(DISTINCT al.nomor_antrian ORDER BY al.id ASC SEPARATOR ', ') as nomor_antrian_layanan"),
      DB.raw("GROUP_CONCAT(DISTINCT al.kode_antrian_layanan ORDER BY al.id ASC SEPARATOR ', ') as list_kode_antrian_layanan"),
    ];

    const sortMap = {
      jam_datang: "k.jam_datang",
      kode_kunjungan: "k.kode_kunjungan",
      no_rm: "k.no_rm",
      nama: "p.nama",
      nomor_antrian: "a.nomor_antrian",
      status: "k.status",
      created_at: "k.created_at",
    };
    const sortCol = sortMap[sortField] || "k.created_at";

    if (hasPagination) {
      const page = parseInt(oPayload.page, 10) || 1;
      const perPage = parseInt(oPayload.perPage, 10) || 10;
      const offset = (page - 1) * perPage;

      // Count distinct visits
      const countSubquery = DB("trx_kunjungan as k")
        .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
        .leftJoin("trx_antrian_awal as a", "k.kode_kunjungan", "a.kode_kunjungan")
        .leftJoin("trx_antrian_layanan as al", "k.kode_kunjungan", "al.kode_kunjungan")
        .leftJoin("trx_detail_antrian_layanan as dal", "k.kode_kunjungan", "dal.kode_kunjungan")
        .modify((qb) => {
          if (filterTanggal) qb.where("k.tanggal_kunjungan", filterTanggal);
          if (filterStatus) qb.where("k.status", filterStatus);
          if (keyword) {
            const lower = keyword.toLowerCase();
            qb.where(function () {
              this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(a.nomor_antrian) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(al.nomor_antrian) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(al.kode_antrian_layanan) LIKE ?", [`%${lower}%`])
                .orWhereRaw("LOWER(dal.nama_layanan) LIKE ?", [`%${lower}%`]);
            });
          }
        })
        .countDistinct("k.id as total")
        .first();

      const countResult = await countSubquery;
      totalRecords = parseInt(countResult?.total || 0, 10);

      vaData = await baseQuery
        .clone()
        .select(selectFields)
        .orderBy(sortCol, sortOrder)
        .limit(perPage)
        .offset(offset);
    } else {
      vaData = await baseQuery
        .clone()
        .select(selectFields)
        .orderBy(sortCol, sortOrder);

      totalRecords = vaData.length;
    }

    const vaDataMapped = vaData.map((row) => ({
      ...row,
      nomor_antrian: row.nomor_antrian_layanan || row.nomor_antrian_awal || null,
      kode_antrian: row.list_kode_antrian_layanan || row.kode_antrian_awal || null,
      jenis_layanan: row.jenis_layanan || null,
      nama_layanan_detail: row.nama_layanan_detail || null,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data kunjungan ditemukan",
      datetime: formatDateSystem(),
      data: vaDataMapped,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_data.js",
      func: "get_data",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
};

router.get("/", handleGetData);
router.post("/", handleGetData);

export default router;
