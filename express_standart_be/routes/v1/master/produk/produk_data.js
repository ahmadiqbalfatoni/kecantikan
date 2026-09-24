/**
 * @project Sistem Klinik Kecantikan
 * @file produk_data.js
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
  const branchCode = getBranchScope(req, oPayload.kode_cabang);
  const keyword = oPayload.keyword || "";
  const filterStatus = oPayload.status || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const baseQuery = DB("mst_produk as p")
      .leftJoin("mst_kategori_produk as k", "p.kode_kategori_produk", "k.kode_kategori_produk")
      .whereRaw("p.kode_produk NOT LIKE 'CUSTOM-%' AND p.kode_produk NOT LIKE 'CST-%'")
      .modify((qb) => {
        if (branchCode) qb.where("p.kode_cabang", branchCode);
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterStatus) qb.where("p.status", filterStatus);
      });

    const selectFields = [
      "p.kode_produk",
      "p.kode_kategori_produk",
      "k.nama as nama_kategori",
      "p.nama",
      "p.satuan",
      "p.foto",
      "p.harga_beli",
      "p.harga_jual",
      "p.stok_minimum",
      "p.stok_tersedia",
      "p.no_batch",
      "p.tanggal_kadaluarsa",
      "p.status",
      "p.created_by",
      "p.created_at",
      "p.updated_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.created_at", "desc");
      totalRecords = vaData.length;
    }

    const assetsBase = process.env.ASSETS_PATH || "/api/assets";
    const formattedData = vaData.map((item) => {
      const fotoUrl = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/produk/${item.foto}`)
        : null;
      return {
        ...item,
        foto: fotoUrl,
      };
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: formattedData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/produk/produk_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
