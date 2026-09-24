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
  const branchCode = getBranchScope(req, oPayload.kode_cabang);
  const keyword = oPayload.keyword || "";
  const filterStatus = oPayload.status || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  try {
    const filterIsKonsultasi = oPayload.is_konsultasi !== undefined && oPayload.is_konsultasi !== null && oPayload.is_konsultasi !== ""
      ? parseInt(oPayload.is_konsultasi)
      : null;

    const baseQuery = DB("mst_ruangan as r").modify((qb) => {
      if (branchCode) qb.where("r.kode_cabang", branchCode);
      if (keyword) {
        const lower = keyword.toLowerCase();
        qb.where(function () {
          this.whereRaw("LOWER(r.kode_ruangan) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(r.nama_ruangan) LIKE ?", [`%${lower}%`]);
        });
      }
      if (filterStatus) qb.where("r.status", filterStatus);
      if (filterIsKonsultasi !== null) qb.where("r.is_konsultasi", filterIsKonsultasi);
    });

    const selectFields = [
      "r.id",
      "r.kode_ruangan",
      "r.nama_ruangan",
      "r.status",
      "r.is_konsultasi",
      "r.created_by",
      "r.created_at",
      "r.updated_by",
      "r.updated_at"
    ];

    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("r.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("r.created_at", "desc");
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
    Logging(error, { file: "/master/ruangan/ruangan_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
