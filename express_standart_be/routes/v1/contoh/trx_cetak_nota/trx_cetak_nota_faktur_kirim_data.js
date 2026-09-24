"use client";

import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const { body: oPayload } = req;
    const cUsername = req?.auth?.username || "";

    try {
        // 1. Validasi Payload menggunakan Joi & validatePayload helper
        const cValidation = await validatePayload(
            {
                page: Joi.number().min(1).optional().label("Halaman"),
                perPage: Joi.number().min(1).optional().label("Data Per Halaman"),
                keyword: Joi.string().allow(null, "").optional().label("Kata Kunci"),
                sortField: Joi.string().allow(null, "").optional().label("Kolom Urutan"),
                sortOrder: Joi.string().valid("asc", "desc").optional().label("Tipe Urutan"),
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
                message: cValidation || "Terdapat kesalahan pada parameter pencarian anda",
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        const bHasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
        const cKeyword = oPayload.keyword || "";
        const cSortField = oPayload.sortField || "tanggal_transaksi";
        const cSortOrder = oPayload.sortOrder || "desc";

        // Mapping sorting field untuk mengantisipasi ambiguitas kolom tanpa master join
        const mapSortField = (field) => {
            const oSortMap = {
                faktur: "m.faktur",
                tanggal_transaksi: "m.tanggal_transaksi",
                tanggal: "m.tanggal_transaksi",
            };
            return oSortMap[field] || `m.${field}`;
        };

        const cSortColumn = mapSortField(cSortField);

        // 2. Query Utama untuk list BK yang belum diterima (status = '0') tanpa Master Join
        const oBaseQuery = DB("trx_mutasi_gudang_ke as m")
            .where("m.status", "0")
            .modify((qb) => {
                if (cKeyword) {
                    const cLowerKeyword = cKeyword.toLowerCase();
                    qb.where(function () {
                        this.whereRaw("LOWER(m.faktur) LIKE ?", [`%${cLowerKeyword}%`])
                            .orWhereRaw("LOWER(m.gudang_kirim) LIKE ?", [`%${cLowerKeyword}%`])
                            .orWhereRaw("LOWER(m.gudang_terima) LIKE ?", [`%${cLowerKeyword}%`])
                            .orWhereRaw("LOWER(m.user_kirim) LIKE ?", [`%${cLowerKeyword}%`]);
                    });
                }
            })
            .groupBy(
                "m.faktur",
                "m.tanggal_transaksi",
                "m.gudang_kirim",
                "m.gudang_terima",
                "m.user_kirim",
                "m.user_terima"
            );

        // 3. Hitung total records (distinct per faktur)
        const oCountResult = await DB("trx_mutasi_gudang_ke as m")
            .where("m.status", "0")
            .modify((qb) => {
                if (cKeyword) {
                    const cLowerKeyword = cKeyword.toLowerCase();
                    qb.where(function () {
                        this.whereRaw("LOWER(m.faktur) LIKE ?", [`%${cLowerKeyword}%`]);
                    });
                }
            })
            .countDistinct("m.faktur as total")
            .first();

        const nTotalRecords = parseInt(oCountResult?.total || 0);

        // 4. Ambil data paginasi dokumen mutasi kirim
        const nPage = parseInt(oPayload.page) || 1;
        const nPerPage = parseInt(oPayload.perPage) || 5;
        const nOffset = (nPage - 1) * nPerPage;

        const oDataQuery = oBaseQuery.clone().select([
            "m.faktur",
            "m.tanggal_transaksi",
            "m.gudang_kirim as dari_gudang",
            "m.gudang_terima as ke_gudang",
            "m.user_kirim as petugas_kirim",
            "m.user_terima as petugas_terima"
        ]).orderBy(cSortColumn, cSortOrder);

        if (bHasPagination) {
            oDataQuery.limit(nPerPage).offset(nOffset);
        }

        const vaRawData = await oDataQuery;
        const vaFakturs = vaRawData.map((item) => item.faktur);

        let mapDetails = {};
        let mapItemStock = {};

        // 5. Eager-Loading Rincian Barang tanpa Join mst_barang
        if (vaFakturs.length > 0) {
            const [vaDetailsRaw] = await Promise.all([
                DB("trx_mutasi_gudang_ke as d")
                    .select([
                        "d.faktur",
                        "d.kode_barang",
                        "d.satuan",
                        "d.qty as qty_kirim"
                    ])
                    .whereIn("d.faktur", vaFakturs)
            ]);

            const vaItemCodes = [...new Set(vaDetailsRaw.map((item) => item.kode_barang))];

            // Ambil sisa stok per gudang secara terpisah dari baris Kartu Stok terbaru (Tabel Transaksi, tetap dipertahankan)
            if (vaItemCodes.length > 0) {
                const latestStockIds = await DB("trx_kartu_stok")
                    .select("kode_barang", "kode_gudang")
                    .max("id as max_id")
                    .whereIn("kode_barang", vaItemCodes)
                    .groupBy("kode_barang", "kode_gudang");

                const vaMaxIds = latestStockIds.map((item) => item.max_id).filter(Boolean);

                if (vaMaxIds.length > 0) {
                    const vaStockRaw = await DB("trx_kartu_stok")
                        .select("kode_barang", "kode_gudang", "stok_akhir as stock")
                        .whereIn("id", vaMaxIds);

                    vaStockRaw.forEach((row) => {
                        if (!mapItemStock[row.kode_barang]) mapItemStock[row.kode_barang] = {};
                        mapItemStock[row.kode_barang][row.kode_gudang] = Number(row.stock);
                    });
                }
            }

            // Gabungkan rincian item ke mapping objek
            vaDetailsRaw.forEach((row) => {
                if (!mapDetails[row.faktur]) mapDetails[row.faktur] = [];
                mapDetails[row.faktur].push(row);
            });
        }

        // 6. Satukan data dokumen dengan rincian item detailnya
        const vaData = vaRawData.map((item) => {
            const rawDetailList = mapDetails[item.faktur] || [];

            const formattedDetail = rawDetailList.map((det) => {
                const itemStockMap = mapItemStock[det.kode_barang] || {};
                const nSisaStokTerima = itemStockMap[item.ke_gudang] || 0;

                return {
                    barcode: det.kode_barang || "",
                    kode_barang: det.kode_barang,
                    nama_barang: det.kode_barang || "", // Diganti dengan kode barang karena mst_barang ditiadakan
                    satuan: det.satuan || "PCS",
                    sisa_stok: nSisaStokTerima,
                    qty_kirim: Number(det.qty_kirim) || 0,
                };
            });

            return {
                faktur: item.faktur,
                tanggal_transaksi: item.tanggal_transaksi,
                dari_gudang: item.dari_gudang,
                ket_gudang_kirim: item.dari_gudang, // Direct ke kode gudang
                ke_gudang: item.ke_gudang,
                ket_gudang_terima: item.ke_gudang, // Direct ke kode gudang
                petugas_kirim: item.petugas_kirim,
                petugas_kirim_nama: item.petugas_kirim, // Direct ke username/kode petugas
                petugas_terima: item.petugas_terima,
                petugas_terima_nama: item.petugas_terima, // Direct ke username/kode petugas
                detail: formattedDetail,
            };
        });

        return res.status(200).json({
            status: status.SUKSES,
            message: "Data ditemukan",
            datetime: formatDateSystem(),
            data: vaData,
            total_data: nTotalRecords,
        });
    } catch (oError) {
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(oError, {
            file: "contoh/trx_cetak_nota/trx_cetak_nota_faktur_kirim_data.js",
            func: "get",
            request: oPayload,
            response: oResult,
            user: cUsername,
        });

        return res.status(500).json(oResult);
    }
});

export default router;