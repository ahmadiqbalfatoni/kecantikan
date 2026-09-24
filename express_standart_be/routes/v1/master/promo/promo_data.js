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
    const baseQuery = DB("mst_promo as p").modify((qb) => {
      if (branchCode) qb.where("p.kode_cabang", branchCode);
      if (keyword) {
        const lower = keyword.toLowerCase();
        qb.where(function () {
          this.whereRaw("LOWER(p.kode_promo) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`]);
        });
      }
      if (filterStatus) qb.where("p.status", filterStatus);
    });

    const selectFields = [
      "p.id",
      "p.kode_promo",
      "p.nama",
      "p.jenis_diskon",
      "p.nilai_diskon",
      "p.tanggal_mulai",
      "p.tanggal_selesai",
      "p.status",
      "p.created_by",
      "p.created_at",
      "p.updated_by",
      "p.updated_at"
    ];

    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.created_at", "desc");
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
    Logging(error, { file: "/master/promo/promo_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
