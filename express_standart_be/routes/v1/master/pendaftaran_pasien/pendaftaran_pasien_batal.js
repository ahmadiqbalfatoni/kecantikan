/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_batal.js
 * @description Endpoint untuk membatalkan kunjungan pasien & antrean layanan (update status='batal', TANPA MENGHAPUS data DB)
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";

const router = express.Router();

const handleBatal = async (req, res) => {
  const { body } = req;
  const oPayload = body || {};
  const username = req?.auth?.username || "system";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const kode_kunjungan = (oPayload.kode_kunjungan || "").trim();
    const kunjungan_id = oPayload.kunjungan_id || oPayload.id;

    if (!kode_kunjungan && !kunjungan_id) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Kode kunjungan atau ID kunjungan wajib disertakan",
        datetime: formatDateSystem(),
      });
    }

    const query = DB("trx_kunjungan");
    if (branchCode) query.where("kode_cabang", branchCode);
    if (kode_kunjungan) query.where("kode_kunjungan", kode_kunjungan);
    else query.where("id", kunjungan_id);

    const kunjunganBefore = await query.first();

    if (!kunjunganBefore) {
      return res.status(404).json({
        status: status.BAD_REQUEST,
        message: "Data kunjungan tidak ditemukan",
        datetime: formatDateSystem(),
      });
    }

    if (kunjunganBefore.status === "batal") {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: "Kunjungan ini sudah dalam status Batal",
        datetime: formatDateSystem(),
      });
    }

    await DB.transaction(async (trx) => {
      // 1. Update status kunjungan jadi 'batal' (JANGAN DELETE RECORD DB)
      await trx("trx_kunjungan")
        .where("id", kunjunganBefore.id)
        .update({
          status: "batal",
          updated_by: username,
          updated_at: formatDateSystem(),
        });

      // 2. Update status antrian layanan terkait jadi 'batal' (JANGAN DELETE RECORD DB)
      await trx("trx_antrian_layanan")
        .where("kode_kunjungan", kunjunganBefore.kode_kunjungan)
        .update({
          status: "batal",
          updated_by: username,
          updated_at: formatDateSystem(),
        });

      // 3. Kembalikan antrian fisik awal ke status 'tersedia'
      const antrianTerkait = await trx("trx_antrian_awal")
        .where("kode_kunjungan", kunjunganBefore.kode_kunjungan)
        .first();

      if (antrianTerkait) {
        await trx("trx_antrian_awal")
          .where("id", antrianTerkait.id)
          .update({
            status: "tersedia",
            no_rm: null,
            kode_kunjungan: null,
            diambil_at: null,
            dipanggil_at: null,
            updated_by: username,
            updated_at: formatDateSystem(),
          });
      }

      // Audit Log
      await ChangesLog(
        {
          description: `Pembatalan Kunjungan & Antrean Layanan (${kunjunganBefore.kode_kunjungan}) Pasien (${kunjunganBefore.no_rm})`,
          tableName: "trx_kunjungan",
          referenceCode: kunjunganBefore.kode_kunjungan,
          action: "UPDATE",
          dataBefore: kunjunganBefore,
          dataAfter: { status: "batal", antrian_dikembalikan: antrianTerkait?.nomor_antrian || null },
          user: username,
          tz: oPayload.tz || "Asia/Jakarta",
        },
        trx
      );
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: `Kunjungan ${kunjunganBefore.kode_kunjungan} & antrean layanan berhasil dibatalkan (status diubah menjadi batal, data tidak dihapus)`,
      datetime: formatDateSystem(),
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: error.message || "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_batal.js",
      func: "batal",
      request: body,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
};

router.patch("/", handleBatal);
router.post("/", handleBatal);

export default router;
