/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_list.js
 * @description Endpoint list transaksi kasir
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, body?.kode_cabang);
  const keyword = body.keyword || "";
  const filterStatus = body.status || null;
  const tanggal = body.tanggal || new Date().toISOString().slice(0, 10);
  const page = parseInt(body.page) || 1;
  const perPage = parseInt(body.perPage) || 50;

  try {
    const baseQuery = DB("trx_transaksi as t")
      .leftJoin("mst_pasien as p", "t.no_rm", "p.no_rm")
      .leftJoin("trx_kunjungan as k", "t.kode_kunjungan", "k.kode_kunjungan")
      .leftJoin("mst_promo as pr", "t.kode_promo", "pr.kode_promo")
      .whereRaw("DATE(t.tanggal_transaksi) = ?", [tanggal])
      .modify((qb) => {
        if (branchCode) qb.where("t.kode_cabang", branchCode);
        if (filterStatus) qb.where("t.status", filterStatus);
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(t.kode_transaksi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(t.no_rm) LIKE ?", [`%${lower}%`]);
          });
        }
      });

    const countResult = await baseQuery.clone().count("t.id as total").first();
    const totalData = parseInt(countResult?.total || 0);
    const offset = (page - 1) * perPage;

    const vaData = await baseQuery.clone()
      .select(
        "t.kode_transaksi",
        "t.kode_kunjungan",
        "t.no_rm",
        "t.kode_rekam_medis",
        "p.nama as nama_pasien",
        "p.no_hp",
        "t.kode_promo",
        "pr.nama as nama_promo",
        "t.tanggal_transaksi",
        "t.total_harga",
        "t.total_diskon",
        "t.total_bayar",
        "t.metode_bayar",
        "t.status",
        "t.created_at",
        "t.updated_at"
      )
      .orderBy("t.created_at", "desc")
      .limit(perPage)
      .offset(offset);

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data transaksi ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalData,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_list.js", func: "list", user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
