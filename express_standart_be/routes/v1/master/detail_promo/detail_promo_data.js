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
    const hasStatusCol = await DB.schema.hasColumn("mst_detail_promo", "status");
    if (!hasStatusCol) {
      await DB.schema.table("mst_detail_promo", (table) => {
        table.enum("status", ["aktif", "nonaktif"]).notNullable().defaultTo("aktif").after("kode_item");
      });
    }

    const branchCode = getBranchScope(req, oPayload.kode_cabang);
    const baseQuery = DB("mst_promo as p").modify((qb) => {
      if (branchCode) qb.where("p.kode_cabang", branchCode);
      if (keyword) {
        const lower = keyword.toLowerCase();
        qb.where(function () {
          this.whereRaw("LOWER(p.kode_promo) LIKE ?", [`%${lower}%`])
            .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
            .orWhereExists(function () {
              this.select("*")
                .from("mst_detail_promo as dp")
                .whereRaw("dp.kode_promo = p.kode_promo")
                .where(function () {
                  this.whereExists(function () {
                    this.select("*")
                      .from("mst_produk as pr")
                      .whereRaw("pr.kode_produk = dp.kode_item")
                      .where(function () {
                        this.whereRaw("LOWER(pr.nama) LIKE ?", [`%${lower}%`])
                          .orWhereRaw("LOWER(pr.kode_produk) LIKE ?", [`%${lower}%`]);
                      });
                  }).orWhereExists(function () {
                    this.select("*")
                      .from("mst_layanan as l")
                      .whereRaw("l.kode_layanan = dp.kode_item")
                      .where(function () {
                        this.whereRaw("LOWER(l.nama) LIKE ?", [`%${lower}%`])
                          .orWhereRaw("LOWER(l.kode_layanan) LIKE ?", [`%${lower}%`]);
                      });
                  });
                });
            });
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
      DB.raw("DATE_FORMAT(p.tanggal_mulai, '%Y-%m-%d') as tanggal_mulai"),
      DB.raw("DATE_FORMAT(p.tanggal_selesai, '%Y-%m-%d') as tanggal_selesai"),
      DB.raw("GREATEST(0, DATEDIFF(p.tanggal_selesai, CURDATE())) as sisa_hari"),
      "p.status",
      "p.created_by",
      "p.created_at",
      "p.updated_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("p.id as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("p.created_at", "desc");
      totalRecords = vaData.length;
    }

    // Load detail items (products, services, and packages) for each promo
    for (const item of vaData) {
      const rawDetails = await DB("mst_detail_promo as dp")
        .leftJoin("mst_produk as pr", function () {
          this.on("dp.kode_item", "=", "pr.kode_produk").andOn("dp.jenis_item", "=", DB.raw("'produk'"));
        })
        .leftJoin("mst_kategori_produk as kp", "pr.kode_kategori_produk", "kp.kode_kategori_produk")
        .leftJoin("mst_layanan as l", function () {
          this.on("dp.kode_item", "=", "l.kode_layanan").andOn("dp.jenis_item", "=", DB.raw("'layanan'"));
        })
        .leftJoin("mst_kategori_layanan as kl", "l.kode_kategori_layanan", "kl.kode_kategori_layanan")
        .leftJoin("mst_paket_layanan as pkt", function () {
          this.on("dp.kode_item", "=", "pkt.kode_paket_layanan").andOn("dp.jenis_item", "=", DB.raw("'paket'"));
        })
        .where("dp.kode_promo", item.kode_promo)
        .select(
          "dp.id",
          "dp.kode_detail_promo",
          "dp.kode_promo",
          "dp.jenis_item",
          "dp.kode_item",
          "dp.status",
          // Produk fields
          "pr.nama as nama_produk",
          "kp.nama as nama_kategori_produk",
          "pr.harga_jual as harga_jual_produk",
          "pr.satuan as satuan_produk",
          "pr.stok_tersedia",
          // Layanan fields
          "l.nama as nama_layanan",
          "kl.nama as nama_kategori_layanan",
          "l.harga as harga_layanan",
          // Paket fields
          "pkt.nama as nama_paket",
          "pkt.harga_paket"
        )
        .orderBy("dp.id", "asc");

      const details = [];
      for (const d of rawDetails) {
        const isLayanan = d.jenis_item === "layanan";
        const isPaket = d.jenis_item === "paket";
        const namaItem = isLayanan 
          ? (d.nama_layanan || d.kode_item) 
          : isPaket 
          ? (d.nama_paket || d.kode_item) 
          : (d.nama_produk || d.kode_item);
        const namaKategori = isLayanan 
          ? (d.nama_kategori_layanan || "Layanan") 
          : isPaket 
          ? "Paket Layanan" 
          : (d.nama_kategori_produk || "Produk");
        const hargaNormal = parseFloat(isLayanan ? d.harga_layanan : isPaket ? d.harga_paket : d.harga_jual_produk) || 0;
        const satuan = isLayanan ? "Sesi" : isPaket ? "Paket" : (d.satuan_produk || "Pcs");

        const nilaiDiskon = parseFloat(item.nilai_diskon) || 0;
        let hargaPromo = hargaNormal;
        let hemat = 0;

        if (item.jenis_diskon === "persen") {
          hargaPromo = Math.round(hargaNormal * (1 - nilaiDiskon / 100));
          hemat = Math.max(0, hargaNormal - hargaPromo);
        } else {
          hargaPromo = Math.max(0, Math.round(hargaNormal - nilaiDiskon));
          hemat = Math.min(hargaNormal, nilaiDiskon);
        }

        details.push({
          id: d.id,
          kode_detail_promo: d.kode_detail_promo,
          kode_promo: d.kode_promo,
          jenis_item: d.jenis_item || "produk",
          kode_item: d.kode_item,
          // Backwards-compatible aliases
          kode_produk: d.kode_item,
          nama_produk: namaItem,
          nama_item: namaItem,
          nama_kategori: namaKategori,
          harga_normal: hargaNormal,
          satuan: satuan,
          stok_tersedia: isLayanan || isPaket ? "-" : (d.stok_tersedia ?? 0),
          status: d.status,
          harga_promo: hargaPromo,
          hemat: hemat,
        });
      }

      item.details = details;
      item.total_item = details.length;
      item.total_produk = details.filter((d) => d.jenis_item === "produk").length;
      item.total_layanan = details.filter((d) => d.jenis_item === "layanan").length;
      item.total_paket = details.filter((d) => d.jenis_item === "paket").length;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
