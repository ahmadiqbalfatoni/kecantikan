/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_layanan_panggil.js
 * @description Endpoint untuk mengupdate status antrian layanan (dipanggil, selesai, batal, menunggu)
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";
import { getBranchScope } from "../../components/tools/branch_scope.js";
import { syncRekamMedisPerAntrian } from "../ruangan/rekam_medis_service.js";
import { terbitkanAntreanLanjutanRuangan } from "../ruangan/antrian_lanjutan_service.js";
import { syncCompletedItemsToKasirDraft } from "../kasir/kasir_sync_service.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = { ...req.query, ...req.body };
  const username = req?.auth?.username || "";
  const branchCode = getBranchScope(req, oPayload.kode_cabang);

  try {
    const cValidation = await Joi.object({
      kode_antrian_layanan: Joi.string().required().label("Kode Antrian Layanan"),
      aksi: Joi.string().valid("dipanggil", "selesai", "batal", "menunggu").required().label("Aksi"),
    }).validateAsync(
      {
        kode_antrian_layanan: oPayload.kode_antrian_layanan || oPayload.kode_antrian,
        aksi: oPayload.aksi || oPayload.status,
      },
      { allowUnknown: true }
    );

    const kodeAntrian = cValidation.kode_antrian_layanan;
    const aksi = cValidation.aksi;
    let updatedRecord = null;

    await DB.transaction(async (trx) => {
      let qRecord = trx("trx_antrian_layanan")
        .where("kode_antrian_layanan", kodeAntrian);
      if (branchCode) qRecord = qRecord.andWhere("kode_cabang", branchCode);
      const record = await qRecord
        .forUpdate()
        .first();

      if (!record) {
        const error = new Error("Data antrian layanan tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      const updateData = {
        status: aksi,
        updated_by: username,
        updated_at: formatDateSystem(),
      };

      if (oPayload.kode_karyawan) {
        updateData.kode_karyawan = oPayload.kode_karyawan;
      }

      if (aksi === "dipanggil") {
        updateData.dipanggil_at = formatDateSystem();
      } else if (aksi === "selesai") {
        const resolvedKaryawan = oPayload.kode_karyawan || record.kode_karyawan;
        if (!resolvedKaryawan) {
          const error = new Error("Petugas / karyawan wajib dipilih sebelum antrian dapat diselesaikan");
          error.statusCode = 422;
          throw error;
        }
        updateData.selesai_at = formatDateSystem();
      }

      await trx("trx_antrian_layanan")
        .where("kode_antrian_layanan", kodeAntrian)
        .update(updateData);

      updatedRecord = { ...record, ...updateData };

      // ─── PROSES TINDAKAN LANJUTAN ATAU DRAFT TRANSAKSI KASIR SAAT SELESAI ───
      if (aksi === "selesai" && record.kode_kunjungan) {
        const kodeKunjungan = record.kode_kunjungan;
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const todayYmd = new Date().toISOString().slice(0, 10);

        // Periksa apakah antrean ini adalah sesi konsultasi yang berlanjut ke ruang tindakan
        let isKonsulLanjut = record.lanjut_ke_tindakan === 1 || Boolean(record.kode_ruangan_tujuan_lanjutan);

        // Fallback untuk antrean lama (backward-compatibility)
        if (!isKonsulLanjut && record.kode_ruangan) {
          const roomInfo = await trx("mst_ruangan")
            .where("kode_ruangan", record.kode_ruangan)
            .select("is_konsultasi")
            .first();

          if (roomInfo && roomInfo.is_konsultasi === 1) {
            const detailAsalKunjungan = await trx("trx_detail_antrian_layanan as dal")
              .leftJoin("mst_layanan as l", "dal.kode_layanan", "l.kode_layanan")
              .leftJoin("mst_ruangan as r_lay", "l.kode_ruangan", "r_lay.kode_ruangan")
              .leftJoin("mst_paket_layanan as p", "dal.kode_layanan", "p.kode_paket_layanan")
              .leftJoin("mst_ruangan as r_pkt", "p.kode_ruangan", "r_pkt.kode_ruangan")
              .where("dal.kode_antrian_layanan", kodeAntrian)
              .whereNotIn("dal.jenis_layanan", ["produk", "paket_produk"])
              .where(function () {
                this.where(function () {
                  this.whereNotNull("l.kode_ruangan")
                    .whereNot("l.kode_ruangan", record.kode_ruangan)
                    .andWhere(function () {
                      this.whereNull("r_lay.is_konsultasi").orWhere("r_lay.is_konsultasi", 0);
                    });
                }).orWhere(function () {
                  this.whereNotNull("p.kode_ruangan")
                    .whereNot("p.kode_ruangan", record.kode_ruangan)
                    .andWhere(function () {
                      this.whereNull("r_pkt.is_konsultasi").orWhere("r_pkt.is_konsultasi", 0);
                    });
                });
              })
              .select("dal.id", "l.kode_ruangan as lay_ruangan", "p.kode_ruangan as pkt_ruangan")
              .first();

            if (detailAsalKunjungan && (detailAsalKunjungan.lay_ruangan || detailAsalKunjungan.pkt_ruangan)) {
              isKonsulLanjut = true;
            }
          }
        }

        let referralsCreated = [];
        if (isKonsulLanjut) {
          referralsCreated = await terbitkanAntreanLanjutanRuangan(trx, {
            currentAntrian: record,
            kodeKunjungan,
            username,
            rekomendasiItems: [],
            tz: oPayload.tz || record.tz || "Asia/Jakarta",
          });
        }

        // Draf transaksi kasir & penutupan kunjungan HANYA dieksekusi jika BUKAN konsultasi berlanjut ke tindakan
        // (atau jika tidak ada rujukan yang berhasil dibuat)
        if (!isKonsulLanjut || referralsCreated.length === 0) {
          // 1. Sinkronisasi terpusat ke draf transaksi Kasir
          await syncCompletedItemsToKasirDraft(trx, {
            kodeKunjungan,
            username,
            tz: oPayload.tz || record.tz || "Asia/Jakarta",
          });

          // 6. Cek apakah SEMUA antrean kunjungan ini sudah selesai/batal, update trx_kunjungan
          const allAntrian = await trx("trx_antrian_layanan")
            .where("kode_kunjungan", kodeKunjungan)
            .select("status");

          if (allAntrian.length > 0 && allAntrian.every((a) => a.status === "selesai" || a.status === "batal")) {
            await trx("trx_kunjungan")
              .where("kode_kunjungan", kodeKunjungan)
              .update({
                status: "selesai",
                updated_by: username,
                updated_at: formatDateSystem(),
              });
          }
        }
      }

      await ChangesLog(
        {
          description: `Update status antrian layanan ${record.nomor_antrian} ke ${aksi}`,
          tableName: "trx_antrian_layanan",
          referenceCode: kodeAntrian,
          action: "UPDATE",
          dataBefore: record,
          dataAfter: updatedRecord,
          user: username,
          tz: oPayload.tz || "UTC",
        },
        trx
      );
    });

    if (aksi === "selesai" && updatedRecord?.kode_kunjungan) {
      await syncRekamMedisPerAntrian({
        kode_kunjungan: updatedRecord.kode_kunjungan,
        kode_antrian_layanan: kodeAntrian,
        kode_ruangan: updatedRecord.kode_ruangan,
        nama_ruangan: updatedRecord.nama_ruangan,
        hasil_form: updatedRecord.hasil_form,
        catatan_petugas: updatedRecord.catatan_petugas,
        kode_karyawan: updatedRecord.kode_karyawan,
        username: username,
      });
    }

    const pesanAksi = {
      dipanggil: `Nomor antrian layanan ${updatedRecord.nomor_antrian} dipanggil`,
      selesai: `Nomor antrian layanan ${updatedRecord.nomor_antrian} selesai`,
      batal: `Nomor antrian layanan ${updatedRecord.nomor_antrian} dibatalkan`,
      menunggu: `Nomor antrian layanan ${updatedRecord.nomor_antrian} dikembalikan ke menunggu`,
    };

    return res.status(200).json({
      status: status.SUKSES,
      message: pesanAksi[aksi] || "Berhasil mengubah status antrian",
      datetime: formatDateSystem(),
      data: updatedRecord,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: error.message,
        datetime: formatDateSystem(),
      });
    }

    Logging(error, { file: "/master/antrian_layanan/antrian_layanan_panggil.js", func: "panggil", request: oPayload, response: {}, user: username });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: error.message || "Gagal mengubah status antrian layanan",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
