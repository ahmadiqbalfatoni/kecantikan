/**
 * @project Sistem Klinik Kecantikan
 * @file layanan_data.js
 * @description Endpoint data layanan
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
  const oPayload = body;
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  const keyword = oPayload.keyword || "";
  const filterStatus = oPayload.status || null;
  const filterKategori = oPayload.kode_kategori_layanan || null;
  const filterTipe = oPayload.tipe || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const hasTipe = await DB.schema.hasColumn("mst_layanan", "tipe");
    if (!hasTipe) {
      await DB.schema.table("mst_layanan", (table) => {
        table.string("tipe", 50).defaultTo("BEAUTY TREATMENT").nullable();
      });
    }

    const hasFoto = await DB.schema.hasColumn("mst_layanan", "foto");
    if (!hasFoto) {
      await DB.schema.table("mst_layanan", (table) => {
        table.string("foto", 255).nullable();
      });
    }

    const baseQuery = DB("mst_layanan as l")
      .leftJoin("mst_kategori_layanan as k", "l.kode_kategori_layanan", "k.kode_kategori_layanan")
      .leftJoin("mst_ruangan as r", "l.kode_ruangan", "r.kode_ruangan")
      .leftJoin("mst_ruangan as r_konsul", "l.kode_ruangan_konsultasi", "r_konsul.kode_ruangan")
      .modify((qb) => {
        if (branchCode) {
          qb.where("l.kode_cabang", branchCode);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(l.kode_layanan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(l.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(r.nama_ruangan) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterStatus) {
          qb.where("l.status", filterStatus);
        }
        if (filterKategori) {
          qb.where("l.kode_kategori_layanan", filterKategori);
        }
        if (filterTipe) {
          qb.where("l.tipe", filterTipe);
        }
      });

    const selectFields = [
      "l.kode_layanan",
      "l.kode_kategori_layanan",
      "k.nama as nama_kategori",
      "l.kode_ruangan",
      "r.nama_ruangan as nama_ruangan",
      "l.wajib_konsultasi",
      "l.kode_ruangan_konsultasi",
      "r_konsul.nama_ruangan as nama_ruangan_konsultasi",
      "l.nama",
      "l.harga",
      "l.durasi_menit",
      "l.tipe",
      "l.status",
      "l.foto",
      "l.created_by",
      "l.created_at",
      "l.updated_at",
    ];

    let totalRecords = 0;
    let vaData = [];

    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("l.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("l.created_at", "desc");
      totalRecords = vaData.length;
    }

    const assetsBase = process.env.ASSETS_PATH || "/api/assets";
    const formattedData = vaData.map((item) => {
      const fotoUrl = item.foto
        ? (item.foto.startsWith("http") ? item.foto : `${assetsBase}/uploads/layanan/${item.foto}`)
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
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/layanan/layanan_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
