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
  const filterSupplier = oPayload.kode_supplier || null;
  const filterStatus = oPayload.status || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const baseQuery = DB("trx_purchase_order as po")
      .leftJoin("mst_supplier as s", "po.kode_supplier", "s.kode_supplier")
      .modify((qb) => {
        if (branchCode) {
          qb.where(function () {
            this.where("po.kode_cabang", branchCode).orWhere("s.kode_cabang", branchCode);
          });
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(po.kode_po) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(s.nama) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterSupplier) {
          qb.where("po.kode_supplier", filterSupplier);
        }
        if (filterStatus) {
          qb.where("po.status", filterStatus);
        }
      });

    const selectFields = [
      "po.id",
      "po.kode_po",
      "po.kode_supplier",
      "s.nama as nama_supplier",
      "s.no_hp as no_hp_supplier",
      "po.tanggal_po",
      "po.total_po",
      "po.status",
      "po.created_by",
      "po.created_at",
      "po.updated_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult?.total || 0, 10);
      vaData = await baseQuery.clone().select(selectFields).orderBy("po.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("po.created_at", "desc");
      totalRecords = vaData.length;
    }

    // Ambil detail items untuk PO yang tampil
    if (vaData.length > 0) {
      const poCodes = vaData.map((po) => po.kode_po);
      const details = await DB("trx_detail_purchase_order as d")
        .leftJoin("mst_produk as p", "d.kode_produk", "p.kode_produk")
        .whereIn("d.kode_po", poCodes)
        .select(
          "d.id",
          "d.kode_detail_po",
          "d.kode_po",
          "d.kode_produk",
          "p.nama as nama_produk",
          "p.satuan",
          "d.qty",
          "d.harga_satuan",
          "d.subtotal"
        );

      const detailMap = {};
      for (const d of details) {
        if (!detailMap[d.kode_po]) detailMap[d.kode_po] = [];
        detailMap[d.kode_po].push(d);
      }

      vaData = vaData.map((po) => ({
        ...po,
        items: detailMap[po.kode_po] || [],
      }));
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data Purchase Order berhasil dimuat",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/inventori/inventori_po_data.js", func: "po_data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
