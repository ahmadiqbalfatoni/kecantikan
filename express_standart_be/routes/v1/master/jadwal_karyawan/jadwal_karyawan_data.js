import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";
  const keyword = oPayload.keyword || "";
  const filterHari = oPayload.hari || null;
  const filterStatus = oPayload.status || null;
  const filterKodeRuangan = oPayload.kode_ruangan || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const branchCode = getBranchScope(req, oPayload.kode_cabang);

    const hasKodeRuangan = await DB.schema.hasColumn("mst_jadwal_karyawan", "kode_ruangan");
    if (!hasKodeRuangan) {
      await DB.schema.table("mst_jadwal_karyawan", (table) => {
        table.string("kode_ruangan", 20).nullable().after("no_sip");
        table.index("kode_ruangan", "idx_jadwal_karyawan_kode_ruangan");
      });
    }

    const hasIsPJ = await DB.schema.hasColumn("mst_jadwal_karyawan", "is_penanggung_jawab");
    if (!hasIsPJ) {
      await DB.schema.table("mst_jadwal_karyawan", (table) => {
        table.tinyint("is_penanggung_jawab", 1).notNullable().defaultTo(0).after("kode_ruangan");
      });
    }

    const baseQuery = DB("mst_jadwal_karyawan as j")
      .leftJoin("mst_karyawan as k", "j.no_sip", "k.no_sip")
      .leftJoin("mst_ruangan as r", "j.kode_ruangan", "r.kode_ruangan")
      .modify((qb) => {
        if (branchCode) {
          qb.where(function () {
            this.where("j.kode_cabang", branchCode).orWhere("k.kode_cabang", branchCode);
          });
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(j.kode_jadwal) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(j.no_sip) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(j.kode_ruangan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(r.nama_ruangan) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterHari) qb.where("j.hari", filterHari);
        if (filterStatus) qb.where("j.status", filterStatus);
        if (filterKodeRuangan) qb.where("j.kode_ruangan", filterKodeRuangan);
      });

    const selectFields = [
      "j.id",
      "j.kode_jadwal",
      "j.no_sip",
      "j.kode_ruangan",
      "j.is_penanggung_jawab",
      "r.nama_ruangan as nama_ruangan",
      "k.nama as nama_karyawan",
      "k.jabatan",
      "j.hari",
      "j.jam_mulai",
      "j.jam_selesai",
      "j.kuota",
      "j.status",
      "j.created_by",
      "j.created_at",
      "j.updated_by",
      "j.updated_at"
    ];

    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("j.id as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery
        .clone()
        .select(selectFields)
        .orderByRaw("COALESCE(r.nama_ruangan, j.kode_ruangan, '') ASC")
        .orderByRaw("FIELD(j.hari, 'senin','selasa','rabu','kamis','jumat','sabtu','minggu') ASC")
        .orderBy("j.is_penanggung_jawab", "desc")
        .orderBy("j.jam_mulai", "asc")
        .limit(perPage)
        .offset(offset);
    } else {
      vaData = await baseQuery
        .clone()
        .select(selectFields)
        .orderByRaw("COALESCE(r.nama_ruangan, j.kode_ruangan, '') ASC")
        .orderByRaw("FIELD(j.hari, 'senin','selasa','rabu','kamis','jumat','sabtu','minggu') ASC")
        .orderBy("j.is_penanggung_jawab", "desc")
        .orderBy("j.jam_mulai", "asc");
      totalRecords = vaData.length;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/jadwal_karyawan/jadwal_karyawan_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
