import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  const keyword = oPayload.keyword || "";
  const sortField = oPayload.sortField || "updated_at";
  const sortOrder = oPayload.sortOrder || "desc";

  try {
    const baseQuery = DB("mst_shift as s")
      .modify((qb) => {
        if (keyword) {
          const lowerKeyword = keyword.toLowerCase();

          qb.where(function () {
            this.whereRaw("LOWER(s.nama) LIKE ?", [`%${lowerKeyword}%`])
              .orWhereRaw("LOWER(s.kode) LIKE ?", [`%${lowerKeyword}%`]);
          });
        }
      });

    let totalRecords = 0;
    let vaData = [];

    const selectFields = [
      "s.id",
      "s.kode",
      "s.nama",
      "s.waktu_mulai",
      "s.waktu_selesai",
      "s.status",
      "s.created_at",
      "s.updated_at"
    ];

    if (hasPagination) {
      const page = parseInt(oPayload.page) || 1;
      const perPage = parseInt(oPayload.perPage) || 10;
      const offset = (page - 1) * perPage;

      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);

      vaData = await baseQuery.clone()
        .select(selectFields)
        .orderBy(`s.${sortField}`, sortOrder)
        .limit(perPage)
        .offset(offset);

    } else {
      vaData = await baseQuery.clone()
        .select(selectFields)
        .orderBy(`s.${sortField}`, sortOrder);

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
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "popup/popup_data.js",
      func: "get",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;