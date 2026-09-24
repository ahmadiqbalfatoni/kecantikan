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
  const filterStatusStok = oPayload.status_stok || null; // 'aman' | 'menipis' | 'habis'
  const filterSupplier = oPayload.kode_supplier || null;
  const filterKategori = oPayload.kode_kategori_produk || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const baseQuery = DB("mst_produk as p")
      .leftJoin("mst_kategori_produk as k", "p.kode_kategori_produk", "k.kode_kategori_produk")
      .leftJoin("mst_supplier as s", "p.kode_supplier", "s.kode_supplier")
      .whereRaw("p.kode_produk NOT LIKE 'CUSTOM-%' AND p.kode_produk NOT LIKE 'CST-%'")
      .modify((qb) => {
        if (branchCode) {
          qb.where("p.kode_cabang", branchCode);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.kode_produk) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(s.nama) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterSupplier) {
          qb.where("p.kode_supplier", filterSupplier);
        }
        if (filterKategori) {
          qb.where("p.kode_kategori_produk", filterKategori);
        }
        if (filterStatusStok === "habis") {
          qb.where("p.stok_tersedia", "<=", 0);
        } else if (filterStatusStok === "menipis") {
          qb.where("p.stok_tersedia", ">", 0).andWhereRaw("p.stok_tersedia <= p.stok_minimum");
        } else if (filterStatusStok === "aman") {
          qb.whereRaw("p.stok_tersedia > p.stok_minimum");
        }
      });

    // Ringkasan KPI Inventori
    const qSummary = DB("mst_produk")
      .whereRaw("kode_produk NOT LIKE 'CUSTOM-%' AND kode_produk NOT LIKE 'CST-%'")
      .where("status", "aktif");

    if (branchCode) qSummary.where("kode_cabang", branchCode);

    const summaryRaw = await qSummary
      .select(
        DB.raw("COUNT(id) as total_sku"),
        DB.raw("COALESCE(SUM(stok_tersedia), 0) as total_stok_unit"),
        DB.raw("COALESCE(SUM(CASE WHEN stok_tersedia <= 0 THEN 1 ELSE 0 END), 0) as stok_habis"),
        DB.raw("COALESCE(SUM(CASE WHEN stok_tersedia > 0 AND stok_tersedia <= stok_minimum THEN 1 ELSE 0 END), 0) as stok_menipis"),
        DB.raw("COALESCE(SUM(stok_tersedia * harga_beli), 0) as total_aset")
      )
      .first();

    const summary = {
      total_sku: parseInt(summaryRaw?.total_sku || 0, 10),
      total_stok_unit: parseInt(summaryRaw?.total_stok_unit || 0, 10),
      stok_habis: parseInt(summaryRaw?.stok_habis || 0, 10),
      stok_menipis: parseInt(summaryRaw?.stok_menipis || 0, 10),
      total_aset: parseFloat(summaryRaw?.total_aset || 0),
    };

    const selectFields = [
      "p.id",
      "p.kode_produk",
      "p.kode_kategori_produk",
      "k.nama as nama_kategori",
      "p.kode_supplier",
      "s.nama as nama_supplier",
      "s.no_hp as no_hp_supplier",
      "p.nama",
      "p.satuan",
      "p.harga_beli",
      "p.harga_jual",
      "p.stok_minimum",
      "p.stok_tersedia",
      "p.no_batch",
      "p.tanggal_kadaluarsa",
      DB.raw("(p.stok_tersedia * p.harga_beli) as nilai_aset"),
      DB.raw("CASE WHEN p.stok_tersedia <= 0 THEN 'habis' WHEN p.stok_tersedia <= p.stok_minimum THEN 'menipis' ELSE 'aman' END as status_stok"),
      "p.status",
      "p.created_at",
      "p.updated_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult?.total || 0, 10);
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.stok_tersedia", "asc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.stok_tersedia", "asc");
      totalRecords = vaData.length;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data inventori berhasil dimuat",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
      summary,
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/inventori/inventori_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
