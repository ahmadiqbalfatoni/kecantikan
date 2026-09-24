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
    const hasTglMulai = await DB.schema.hasColumn("mst_paket_layanan", "tanggal_mulai");
    if (!hasTglMulai) {
      await DB.schema.table("mst_paket_layanan", (table) => {
        table.date("tanggal_mulai").nullable();
        table.date("tanggal_selesai").nullable();
      });
    }

    const hasIsSelamanya = await DB.schema.hasColumn("mst_paket_layanan", "is_selamanya");
    if (!hasIsSelamanya) {
      await DB.schema.table("mst_paket_layanan", (table) => {
        table.boolean("is_selamanya").defaultTo(false);
      });
    }

    const hasIsMasaBerlakuSelamanya = await DB.schema.hasColumn("mst_paket_layanan", "is_masa_berlaku_selamanya");
    if (!hasIsMasaBerlakuSelamanya) {
      await DB.schema.table("mst_paket_layanan", (table) => {
        table.boolean("is_masa_berlaku_selamanya").defaultTo(false);
      });
    }

    const hasPaketTipe = await DB.schema.hasColumn("mst_paket_layanan", "tipe");
    if (!hasPaketTipe) {
      await DB.schema.table("mst_paket_layanan", (table) => {
        table.string("tipe", 50).defaultTo("BEAUTY TREATMENT").nullable();
      });
    }

    const hasFoto = await DB.schema.hasColumn("mst_paket_layanan", "foto");
    if (!hasFoto) {
      await DB.schema.table("mst_paket_layanan", (table) => {
        table.string("foto", 255).nullable();
      });
    }

    const todayStr = formatDateSystem(new Date(), "yyyy-MM-dd");

    // Auto-sync status: jika layanan di dalamnya ada yang nonaktif atau paket sudah expired, otomatis nonaktifkan paket
    const allPakets = await DB("mst_paket_layanan").select("kode_paket_layanan", "status", "tanggal_selesai", "is_selamanya");
    for (const pkt of allPakets) {
      const inactiveCount = await DB("mst_detail_paket_layanan as d")
        .leftJoin("mst_layanan as l", "d.kode_layanan", "l.kode_layanan")
        .where("d.kode_paket_layanan", pkt.kode_paket_layanan)
        .where("l.status", "nonaktif")
        .count("d.kode_detail_paket_layanan as cnt")
        .first();

      const hasInactive = parseInt(inactiveCount?.cnt || 0) > 0;
      const isExpired = !Boolean(pkt.is_selamanya) && pkt.tanggal_selesai && pkt.tanggal_selesai < todayStr;

      if ((hasInactive || isExpired) && pkt.status === "aktif") {
        await DB("mst_paket_layanan")
          .where("kode_paket_layanan", pkt.kode_paket_layanan)
          .update({ status: "nonaktif", updated_at: formatDateSystem() });
      }
    }

    const branchCode = getBranchScope(req, oPayload.kode_cabang);
    const baseQuery = DB("mst_paket_layanan as p")
      .leftJoin("mst_ruangan as r", "p.kode_ruangan", "r.kode_ruangan")
      .modify((qb) => {
        if (branchCode) qb.where("p.kode_cabang", branchCode);
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(p.kode_paket_layanan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(r.nama_ruangan) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterStatus) qb.where("p.status", filterStatus);
      });

    const selectFields = [
      "p.kode_paket_layanan",
      "p.nama",
      "p.tipe",
      "p.harga_paket",
      "p.masa_berlaku_hari",
      "p.is_masa_berlaku_selamanya",
      "p.is_selamanya",
      DB.raw("COALESCE(DATE_FORMAT(p.tanggal_mulai, '%Y-%m-%d'), DATE_FORMAT(p.created_at, '%Y-%m-%d')) as tanggal_mulai"),
      DB.raw("DATE_FORMAT(p.tanggal_selesai, '%Y-%m-%d') as tanggal_selesai"),
      DB.raw("CASE WHEN p.is_selamanya = 1 THEN 99999 WHEN p.tanggal_selesai IS NOT NULL THEN GREATEST(0, DATEDIFF(p.tanggal_selesai, CURDATE())) ELSE 99999 END as sisa_hari"),
      "p.kode_ruangan",
      "r.nama_ruangan as nama_ruangan",
      "p.status",
      "p.foto",
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

    // Load detail items for each paket & attach status info & foto URL
    for (const item of vaData) {
      item.foto = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/paket_layanan/${item.foto}`)
        : null;

      const details = await DB("mst_detail_paket_layanan as d")
        .leftJoin("mst_layanan as l", "d.kode_layanan", "l.kode_layanan")
        .where("d.kode_paket_layanan", item.kode_paket_layanan)
        .select(
          "d.kode_detail_paket_layanan",
          "d.kode_layanan",
          "l.nama as nama_layanan",
          "l.tipe as tipe_layanan",
          "l.harga as harga_layanan",
          "l.status as status_layanan",
          "d.jumlah_sesi"
        );
      item.details = details;

      const inactiveDetails = details.filter((d) => d.status_layanan === "nonaktif");
      item.has_inactive_layanan = inactiveDetails.length > 0;
      item.inactive_layanan_names = inactiveDetails.map((d) => d.nama_layanan || d.kode_layanan);

      if (!item.tipe) {
        item.tipe = details.length > 0 ? (details[0].tipe_layanan || "BEAUTY TREATMENT") : "BEAUTY TREATMENT";
      }
    }

    return res.status(200).json({ status: status.SUKSES, message: "Data ditemukan", datetime: formatDateSystem(), data: vaData, total_data: totalRecords });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/paket_layanan/paket_layanan_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
