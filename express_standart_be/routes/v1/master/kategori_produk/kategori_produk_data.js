/**
 * @project Sistem Klinik Kecantikan
 * @file kategori_produk_data.js
 */
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
  const branchCode = getBranchScope(req, oPayload?.kode_cabang);
  const keyword = oPayload.keyword || "";
  const filterStatus = oPayload.status || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  try {
    const baseQuery = DB("mst_kategori_produk as k").modify((qb) => {
      if (keyword) { const lower = keyword.toLowerCase(); qb.where(function () { this.whereRaw("LOWER(k.kode_kategori_produk) LIKE ?", [`%${lower}%`]).orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`]); }); }
      if (branchCode) {
        qb.where(function () {
          this.whereNull("k.kode_cabang")
            .orWhere("k.kode_cabang", "")
            .orWhere("k.kode_cabang", "GLOBAL")
            .orWhere("k.kode_cabang", branchCode);
        });
      }
      if (filterStatus) qb.where("k.status", filterStatus);
    });
    const selectFields = ["k.kode_kategori_produk", "k.nama", "k.deskripsi", "k.status", "k.created_by", "k.created_at", "k.updated_at"];
    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("k.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("k.created_at", "desc");
      totalRecords = vaData.length;
    }
    return res.status(200).json({ status: status.SUKSES, message: "Data ditemukan", datetime: formatDateSystem(), data: vaData, total_data: totalRecords });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance harap tunggu sebentar", datetime: formatDateSystem() };
    Logging(error, { file: "/master/kategori_produk/kategori_produk_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
