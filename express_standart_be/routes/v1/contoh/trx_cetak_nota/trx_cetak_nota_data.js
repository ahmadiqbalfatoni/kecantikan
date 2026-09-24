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
    const username = req?.auth?.username || "system";

    try {
        // 1. Validasi Payload menggunakan Joi & validatePayload helper
        const cValidation = await validatePayload(
            {
                tanggal_awal: Joi.string().required().label("Tanggal Awal"),
                tanggal_akhir: Joi.string().required().label("Tanggal Akhir"),
                gudang_kirim: Joi.string().allow(null, "").optional().label("Gudang Kirim"),
                gudang_terima: Joi.string().allow(null, "").optional().label("Gudang Terima"),
                petugas_kirim: Joi.string().allow(null, "").optional().label("Petugas Kirim"),
                petugas_terima: Joi.string().allow(null, "").optional().label("Petugas Terima"),
                jenis_mutasi: Joi.string().valid("Kirim", "Terima").optional().label("Jenis Mutasi"),
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
                "any.required": "{#label} wajib diisi",
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

        // 2. Parsing parameter setelah lolos validasi
        const tanggal_awal = oPayload.tanggal_awal;
        const tanggal_akhir = oPayload.tanggal_akhir;
        const gudang_kirim = oPayload.gudang_kirim || null;
        const gudang_terima = oPayload.gudang_terima || null;
        const petugas_kirim = oPayload.petugas_kirim || null;
        const petugas_terima = oPayload.petugas_terima || null;
        const jenis_mutasi = oPayload.jenis_mutasi || "Kirim";

        const bHasPagination = oPayload.page !== undefined && oPayload.perPage !== undefined;
        const page = parseInt(oPayload.page) || 1;
        const perPage = parseInt(oPayload.perPage) || 10;
        const keyword = oPayload.keyword || "";
        const sortField = oPayload.sortField || "faktur";
        const sortOrder = oPayload.sortOrder || "desc";

        const offset = (page - 1) * perPage;

        // 3. White-listing kolom pengurutan
        let orderByColumn = "m.tanggal_transaksi";
        if (sortField === "faktur") {
            orderByColumn = "m.faktur";
        } else if (sortField === "tanggal_transaksi") {
            orderByColumn = "m.tanggal_transaksi";
        }

        const isKirim = jenis_mutasi === "Kirim";

        // 4. QUERY HITUNG TOTAL BARIS (Distinct per Faktur)
        const oCountQuery = DB(isKirim ? "trx_mutasi_gudang_ke as m" : "trx_mutasi_gudang_dari as m")
            .where("m.tanggal_transaksi", ">=", tanggal_awal)
            .where("m.tanggal_transaksi", "<=", tanggal_akhir)
            .modify((qb) => {
                if (gudang_kirim) qb.where("m.gudang_kirim", gudang_kirim);
                if (gudang_terima) qb.where("m.gudang_terima", gudang_terima);
                if (petugas_kirim) qb.where("m.user_kirim", petugas_kirim);
                if (petugas_terima) qb.where("m.user_terima", petugas_terima);

                if (keyword) {
                    qb.where("m.faktur", "LIKE", `%${keyword}%`);
                }
            });

        const oCountResult = await oCountQuery.clone().countDistinct("m.faktur as total").first();
        const nTotalRecords = parseInt(oCountResult?.total || 0);

        // 5. QUERY UTAMA AMBIL DATA
        const oDataQuery = DB(isKirim ? "trx_mutasi_gudang_ke as m" : "trx_mutasi_gudang_dari as m")
            .where("m.tanggal_transaksi", ">=", tanggal_awal)
            .where("m.tanggal_transaksi", "<=", tanggal_akhir)
            .modify((qb) => {
                if (gudang_kirim) qb.where("m.gudang_kirim", gudang_kirim);
                if (gudang_terima) qb.where("m.gudang_terima", gudang_terima);
                if (petugas_kirim) qb.where("m.user_kirim", petugas_kirim);
                if (petugas_terima) qb.where("m.user_terima", petugas_terima);

                if (keyword) {
                    qb.where("m.faktur", "LIKE", `%${keyword}%`);
                }

                if (isKirim) {
                    qb.groupBy(
                        "m.faktur",
                        "m.tanggal_transaksi",
                        "m.gudang_kirim",
                        "m.gudang_terima",
                        "m.user_kirim",
                        "m.user_terima",
                        "m.created_by"
                    )
                    .select([
                        "m.faktur",
                        "m.tanggal_transaksi",
                        "m.gudang_kirim",
                        "m.gudang_terima",
                        "m.user_kirim",
                        "m.user_terima",
                        "m.created_by",
                        DB.raw("(SELECT d.faktur FROM trx_mutasi_gudang_dari as d WHERE d.faktur_kirim = m.faktur LIMIT 1) as faktur_terima")
                    ]);
                } else {
                    qb.groupBy(
                        "m.faktur",
                        "m.faktur_kirim",
                        "m.tanggal_transaksi",
                        "m.gudang_kirim",
                        "m.gudang_terima",
                        "m.user_kirim",
                        "m.user_terima",
                        "m.created_by"
                    )
                    .select([
                        "m.faktur",
                        "m.faktur_kirim",
                        "m.tanggal_transaksi",
                        "m.gudang_kirim",
                        "m.gudang_terima",
                        "m.user_kirim",
                        "m.user_terima",
                        "m.created_by"
                    ]);
                }
            })
            .orderBy(orderByColumn, sortOrder === "asc" ? "asc" : "desc");

        if (bHasPagination) {
            oDataQuery.limit(perPage).offset(offset);
        }

        const vaRawData = await oDataQuery;

        // 6. Standardisasi Format Output & Evaluasi Hak Akses
        const vaResult = vaRawData.map((item, idx) => {
            let allowUpdate = false;
            let allowDelete = false;

            const isCreator = item.created_by === username;

            if (isKirim) {
                const sudahDiterima = Boolean(item.faktur_terima);
                if (isCreator && !sudahDiterima) {
                    allowUpdate = true;
                    allowDelete = true;
                }
            } else {
                if (isCreator) {
                    allowUpdate = true;
                    allowDelete = true;
                }
            }

            return {
                no: bHasPagination ? offset + idx + 1 : idx + 1,
                faktur: item.faktur,
                faktur_terima: isKirim ? (item.faktur_terima || "") : (item.faktur_kirim || ""),
                tanggal_transaksi: item.tanggal_transaksi,
                kode_gudang_kirim: item.gudang_kirim,
                ket_gudang_kirim: item.gudang_kirim || "-",
                kode_gudang_terima: item.gudang_terima,
                ket_gudang_terima: item.gudang_terima || "-",
                petugas_kirim: item.user_kirim || "-",
                petugas_terima: item.user_terima || "-",
                status_penerimaan: isKirim ? (item.faktur_terima ? "Sudah Diterima" : "Belum Diterima") : "Sudah Diterima",
                username_operator: item.created_by || "-",
                allow_update: allowUpdate,
                allow_delete: allowDelete,
            };
        });

        return res.status(200).json({
            status: status.SUKSES,
            message: "Berhasil memuat log mutasi antar gudang",
            datetime: formatDateSystem(),
            data: vaResult,
            total_data: nTotalRecords,
        });

    } catch (oError) {
        const oResult = {
            status: status.BAD_REQUEST,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(oError, {
            file: "contoh/trx_cetak_nota/trx_cetak_nota_data.js",
            func: "data",
            request: oPayload,
            response: oResult,
            user: username,
        });

        return res.status(500).json(oResult);
    }
});

export default router;