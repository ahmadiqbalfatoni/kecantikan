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
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  try {
    const branchCode = getBranchScope(req, oPayload.kode_cabang);
    const baseQuery = DB("mst_supplier as s").modify((qb) => {
      if (branchCode) qb.where("s.kode_cabang", branchCode);
      if (keyword) { const lower = keyword.toLowerCase(); qb.where(function () { this.whereRaw("LOWER(s.kode_supplier) LIKE ?", [`%${lower}%`]).orWhereRaw("LOWER(s.nama) LIKE ?", [`%${lower}%`]).orWhereRaw("LOWER(s.email) LIKE ?", [`%${lower}%`]); }); }
      if (filterStatus) qb.where("s.status", filterStatus);
    });
    const selectFields = ["s.kode_supplier", "s.nama", "s.alamat", "s.no_hp", "s.email", "s.status", "s.created_by", "s.created_at", "s.updated_at"];
    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("s.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("s.created_at", "desc");
      totalRecords = vaData.length;
    }
    return res.status(200).json({ status: status.SUKSES, message: "Data ditemukan", datetime: formatDateSystem(), data: vaData, total_data: totalRecords });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/supplier/supplier_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
