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
  const filterStatus = oPayload.status || null;
  const filterKondisi = oPayload.kondisi || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  try {
    const branchCode = getBranchScope(req, oPayload.kode_cabang);
    const baseQuery = DB("mst_alat as a")
      .leftJoin("mst_ruangan as r", "r.kode_ruangan", "a.kode_ruangan")
      .modify((qb) => {
        if (branchCode) qb.where("a.kode_cabang", branchCode);
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(a.kode_alat) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(a.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(a.merk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(r.nama_ruangan) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterStatus) qb.where("a.status", filterStatus);
        if (filterKondisi) qb.where("a.kondisi", filterKondisi);
      });
    const selectFields = ["a.kode_alat", "a.kode_ruangan", "r.nama_ruangan", "a.nama", "a.merk", "a.tanggal_beli", "a.kondisi", "a.status", "a.created_by", "a.created_at", "a.updated_at"];
    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("a.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("a.created_at", "desc");
      totalRecords = vaData.length;
    }
    return res.status(200).json({ status: status.SUKSES, message: "Data ditemukan", datetime: formatDateSystem(), data: vaData, total_data: totalRecords });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/alat/alat_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
