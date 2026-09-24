import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  try {
    // 1. Validasi parameter pencarian dan paginasi
    const cValidation = await validatePayload(
      {
        page: Joi.number().min(1).optional().label("Halaman"),
        perPage: Joi.number().min(1).optional().label("Data Per Halaman"),
        keyword: Joi.string().allow(null, "").optional().label("Kata Kunci"),
        sortField: Joi.string().allow(null, "").optional().label("Kolom Urutan"),
        sortOrder: Joi.string().valid("asc", "desc").optional().label("Tipe Urutan"),
        filters: Joi.object().optional().label("Filter"),
      },
      {
        "string.base": "{#label} harus berupa teks",
        "string.empty": "{#label} tidak boleh kosong",
        "any.only": "{#label} tidak valid",
        "number.base": "{#label} harus berupa angka",
        "number.min": "{#label} tidak boleh kurang dari {#limit}",
      },
      oPayload,
      {
        allowUnknown: true,
      }
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: formatDateSystem(),
      };

      Logging(null, {
        file: "/contoh/popup/popup_data.js",
        func: "data",
        request: oPayload,
        response: oResult,
        user: username,
      });

      return res.status(422).json(oResult);
    }

    const hasPagination =
      oPayload.page !== undefined || oPayload.perPage !== undefined;

    const keyword = oPayload.keyword || "";
    const sortField = oPayload.sortField || "updated_at";
    const sortOrder = oPayload.sortOrder || "desc";
    const oFilters = oPayload.filters || {};

    // 2. Query utama pada tabel mst_supplier tanpa JOIN ke tabel master lain
    const baseQuery = DB("mst_supplier as s")
      .modify((qb) => {
        // Filter Pencarian Kata Kunci (Keyword)
        if (keyword) {
          const lowerKeyword = keyword.toLowerCase();

          qb.where(function () {
            this.whereRaw("LOWER(s.nama) LIKE ?", [`%${lowerKeyword}%`])
              .orWhereRaw("LOWER(s.kode) LIKE ?", [`%${lowerKeyword}%`])
              .orWhereRaw("LOWER(s.alamat) LIKE ?", [`%${lowerKeyword}%`]);
          });
        }

        // Penerapan Filter Spesifik Kategori Supplier (MultiSelect)
        if (oFilters.kategori) {
          if (
            Array.isArray(oFilters.kategori) &&
            oFilters.kategori.length > 0
          ) {
            qb.whereIn("s.kode_kategori", oFilters.kategori);
          } else if (
            typeof oFilters.kategori === "string" &&
            oFilters.kategori.trim() !== ""
          ) {
            qb.where("s.kode_kategori", oFilters.kategori);
          }
        }
      });

    let totalRecords = 0;
    let vaData = [];

    // Mengganti properti join menjadi kode referensi langsung dari tabel mst_supplier
    const selectFields = [
      "s.id",
      "s.kode",
      "s.nama",
      "s.alamat",
      "s.telepon",
      "s.kode_kategori",
      "s.kode_kategori as kategori", // Fallback langsung ke kode kategori
      "s.rekening",
      "s.plafond_1",
      "s.plafond_2",
      "s.nama_cp_1",
      "s.email_cp_1",
      "s.telepon_cp_1",
      "s.hp_cp_1",
      "s.alamat_cp_1",
      "s.nama_cp_2",
      "s.email_cp_2",
      "s.telepon_cp_2",
      "s.hp_cp_2",
      "s.alamat_cp_2",
      "s.tz",
      "s.created_by",
      "s.created_by as created_by_fullname", // Fallback langsung ke username pembuat
      "s.created_at",
      "s.updated_at",
      "s.updated_by",
      "s.updated_by as updated_by_fullname", // Fallback langsung ke username pengubah
    ];

    let dbSortField = `s.${sortField}`;
    if (sortField === "kategori") {
      dbSortField = "s.kode_kategori";
    }

    if (hasPagination) {
      const page = parseInt(oPayload.page) || 1;
      const perPage = parseInt(oPayload.perPage) || 10;
      const offset = (page - 1) * perPage;

      const countResult = await baseQuery.clone().count("* as total").first();
      totalRecords = parseInt(countResult.total || 0);

      vaData = await baseQuery
        .clone()
        .select(selectFields)
        .orderBy(dbSortField, sortOrder)
        .limit(perPage)
        .offset(offset);
    } else {
      vaData = await baseQuery
        .clone()
        .select(selectFields)
        .orderBy(dbSortField, sortOrder);

      totalRecords = vaData.length;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/contoh/tabview/tabview_data.js",
      func: "data",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;