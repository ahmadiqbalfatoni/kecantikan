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
  const filterProduk = oPayload.kode_produk || null;
  const filterJenis = oPayload.jenis_movement || null; // 'masuk' | 'keluar' | 'penyesuaian'
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const baseQuery = DB("trx_stok_movement as m")
      .leftJoin("mst_produk as p", "m.kode_produk", "p.kode_produk")
      .modify((qb) => {
        if (branchCode) {
          qb.where(function () {
            this.where("m.kode_cabang", branchCode).orWhere("p.kode_cabang", branchCode);
          });
        }
        if (filterProduk) {
          qb.where("m.kode_produk", filterProduk);
        }
        if (filterJenis) {
          qb.where("m.jenis_movement", filterJenis);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(m.kode_stok_movement) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(m.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(m.referensi) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const selectFields = [
      "m.id",
      "m.kode_stok_movement",
      "m.kode_produk",
      "p.nama as nama_produk",
      "p.satuan",
      "m.jenis_movement",
      "m.referensi",
      "m.qty",
      "m.stok_sebelum",
      "m.stok_sesudah",
      "m.tanggal",
      "m.created_by",
      "m.created_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult?.total || 0, 10);
      vaData = await baseQuery.clone().select(selectFields).orderBy("m.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("m.created_at", "desc");
      totalRecords = vaData.length;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data log mutasi stok berhasil dimuat",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/inventori/inventori_mutasi_data.js", func: "mutasi_data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
