/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_data.js
 * @description Endpoint untuk mengambil data antrian awal
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-15
 *
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Antigravity (2026-08-20)
 * @version 1.0.1
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
  const oPayload = body;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  const keyword = oPayload.keyword || "";
  const filterStatus = oPayload.status || null;
  const sortField = oPayload.sortField || "no_antrian";
  const sortOrder = oPayload.sortOrder || "asc";

  try {
    const baseQuery = DB("trx_antrian_awal as a").modify((qb) => {
      if (branchCode) {
        qb.where("a.kode_cabang", branchCode);
      }
      if (keyword) {
        const lower = keyword.toLowerCase();
        qb.where(function () {
          this.whereRaw("LOWER(a.kode_antrian_awal) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(a.nomor_antrian) LIKE ?", [`%${lower}%`]);
        });
      }
      if (filterStatus) {
        if (filterStatus === "diambil") {
          qb.where("a.status", "terpakai").whereNull("a.dipanggil_at");
        } else if (filterStatus === "selesai") {
          qb.where("a.status", "terpakai").whereNotNull("a.dipanggil_at");
        } else {
          qb.where("a.status", filterStatus);
        }
      }
    });

    let totalRecords = 0;
    let vaData = [];

    const selectFields = [
      "a.id",
      "a.kode_antrian_awal",
      "a.nomor_antrian",
      "a.status",
      "a.no_rm",
      "a.kode_kunjungan",
      "a.diambil_at",
      "a.dipanggil_at",
      "a.created_at",
      "a.updated_at",
    ];

    const sortMap = {
      no_antrian: "nomor_antrian",
      kode_antrian: "kode_antrian_awal",
      status: "status",
      created_at: "created_at",
      updated_at: "updated_at"
    };
    const sortCol = sortMap[sortField] || "nomor_antrian";
    const isAsc = (sortOrder || "asc").toLowerCase() !== "desc";
    const dirSql = isAsc ? "ASC" : "DESC";

    const applyOrdering = (query) => {
      if (sortCol === "nomor_antrian") {
        return query.orderByRaw(`CAST(a.nomor_antrian AS UNSIGNED) ${dirSql}, a.nomor_antrian ${dirSql}`);
      }
      return query.orderBy(`a.${sortCol}`, isAsc ? "asc" : "desc");
    };

    if (hasPagination) {
      const page = parseInt(oPayload.page) || 1;
      const perPage = parseInt(oPayload.perPage) || 10;
      const offset = (page - 1) * perPage;

      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);

      vaData = await applyOrdering(baseQuery.clone().select(selectFields))
        .limit(perPage)
        .offset(offset);
    } else {
      vaData = await applyOrdering(baseQuery.clone().select(selectFields));

      totalRecords = vaData.length;
    }

    const vaDataMapped = vaData.map((row) => ({
      id: row.id,
      kode_antrian: row.kode_antrian_awal,
      no_antrian: row.nomor_antrian,
      status: row.status === "terpakai" ? (row.dipanggil_at ? "selesai" : "diambil") : row.status,
      no_rm: row.no_rm || null,
      kode_kunjungan: row.kode_kunjungan || null,
      diambil_at: row.diambil_at,
      dipanggil_at: row.dipanggil_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
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
      file: "/master/antrian_awal/antrian_awal_data.js",
      func: "get",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
