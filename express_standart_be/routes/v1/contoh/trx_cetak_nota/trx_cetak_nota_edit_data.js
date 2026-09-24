"use client";

import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "system";

  try {
    // 1. Validasi parameter faktur wajib disertakan
    const cValidation = await validatePayload(
      {
        faktur: Joi.string().required().label("No. Faktur"),
      },
      {
        "any.required": "{#label} wajib diisi.",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      const oResult = {
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: formatDateSystem(),
      };

      return res.status(422).json(oResult);
    }

    const { faktur } = oPayload;
    const isKirim = faktur.startsWith("BK");
    const targetTable = isKirim ? "trx_mutasi_gudang_ke" : "trx_mutasi_gudang_dari";

    // 2. Ambil data flat transaksi mutasi tanpa Join ke Tabel Master
    const rows = await DB(`${targetTable} as m`)
      .select([
        "m.faktur",
        "m.tanggal_transaksi",
        "m.gudang_kirim as dari_gudang",
        "m.gudang_terima as ke_gudang",
        "m.user_kirim as dikirim_oleh",
        "m.user_terima as diterima_oleh",
        "m.tz",
        "m.kode_barang",
        "m.satuan",
        "m.qty",
        "m.created_at",
        "m.created_by"
      ])
      .modify((qb) => {
        if (!isKirim) {
          qb.select("m.faktur_kirim");
        }
      })
      .where("m.faktur", faktur);

    if (rows.length === 0) {
      throw new Error(`404|Faktur mutasi ${faktur} tidak ditemukan.`);
    }

    const firstRow = rows[0];

    // 3. Transformasi baris detail item dengan sisa stok dummy (Tanpa query kartu stok)
    const vaDetails = rows.map((row, idx) => {
      const nSisaStok = 100; // Sisa stok langsung diisi dummy 100

      return {
        no: idx + 1,
        barcode: row.kode_barang || "",
        kode_barang: row.kode_barang,
        nama_barang: row.kode_barang || "",
        satuan: row.satuan || "PCS",
        sisa_stok: nSisaStok,
        qty_kirim: isKirim ? Number(row.qty) : 0,
        qty_terima: !isKirim ? Number(row.qty) : 0,
      };
    });

    // 4. Rakit menjadi struktur utuh Formik InitValue
    const oResultData = {
      faktur: firstRow.faktur,
      faktur_kirim: isKirim ? null : firstRow.faktur_kirim,
      tanggal_transaksi: formatDateSystem(firstRow.tanggal_transaksi, "yyyy-MM-dd"),
      dari_gudang: firstRow.dari_gudang,
      dari_gudang_nama: firstRow.dari_gudang,
      ke_gudang: firstRow.ke_gudang,
      ke_gudang_nama: firstRow.ke_gudang,
      dikirim_oleh: firstRow.dikirim_oleh,
      dikirim_oleh_nama: firstRow.dikirim_oleh,
      diterima_oleh: firstRow.diterima_oleh,
      diterima_oleh_nama: firstRow.diterima_oleh,
      tz: firstRow.tz,
      detail: vaDetails,
    };

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data rincian mutasi berhasil ditemukan",
      datetime: formatDateSystem(),
      data: oResultData,
    });

  } catch (error) {
    const errorMessage = error.message.includes("|") ? error.message.split("|")[1] : "Sistem sedang maintenance harap tunggu sebentar";
    const statusCode = error.message.includes("|") ? parseInt(error.message.split("|")[0]) : 500;

    const oResult = {
      status: status.BAD_REQUEST,
      message: errorMessage,
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "contoh/trx_cetak_nota/trx_cetak_nota_edit_data.js",
      func: "data",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(statusCode).json(oResult);
  }
});

export default router;