/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik Kecantikan
 * @file hasil_treatment_save.js
 * @description Endpoint dokter untuk menyimpan hasil treatment (foto after, catatan hasil treatment, dan daftar produk)
 *              Menyimpan foto after & catatan_hasil_treatment ke trx_rekam_medis_ruangan
 *              dan buat/update draft transaksi kasir.
 *
 * @author Antigravity
 * @created 2026-08-27
 */

import express from "express";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";
import { syncRekamMedisPerAntrian, saveBase64ImageFile } from "./ruangan/rekam_medis_service.js";
import { syncCompletedItemsToKasirDraft } from "./kasir/kasir_sync_service.js";

const router = express.Router();

const handleHasilTreatmentSave = async (req, res) => {
  const oPayload = req.body || {};
  const username = req?.auth?.username || "system";

  const {
    kode_kunjungan,
    no_rm,
    kode_rekam_medis,
    kode_ruangan = "",
    nama_ruangan = "Ruangan Treatment",
    foto_before = "",
    foto_after = "",
    catatan = "",
    produk_items = [], // [{ kode_produk, qty }] — produk tambahan dari dokter
    tz = "Asia/Jakarta",
  } = oPayload;

  if (!kode_kunjungan) {
    return res.status(422).json({
      status: status.BAD_REQUEST,
      message: "kode_kunjungan wajib diisi",
      datetime: formatDateSystem(),
    });
  }

  const produkItems = Array.isArray(produk_items) ? produk_items : [];

  try {
    let createdTransaksiKode = "";
    let grandTotal = 0;

    await DB.transaction(async (trx) => {
      const now = new Date();
      const todayYmd = now.toISOString().slice(0, 10);
      const todayStr = todayYmd.replace(/-/g, "");

      // ─── 1. RESOLVE KODE ANTRIAN LAYANAN & BARIS REKAM MEDIS RUANGAN ─────────
      let resolvedKodeAntrian = oPayload.kode_antrian_layanan;
      if (!resolvedKodeAntrian) {
        const lastAntrian = await trx("trx_antrian_layanan")
          .where("kode_kunjungan", kode_kunjungan)
          .orderBy("id", "desc")
          .first();
        if (lastAntrian) resolvedKodeAntrian = lastAntrian.kode_antrian_layanan;
      }

      let currentAL = null;
      if (resolvedKodeAntrian) {
        currentAL = await trx("trx_antrian_layanan")
          .where("kode_antrian_layanan", resolvedKodeAntrian)
          .first();
      }

      const targetKodeRuangan = kode_ruangan || currentAL?.kode_ruangan || "RNG-000";

      // Simpan file foto jika berformat base64 (jika sudah berupa file path, saveBase64ImageFile langsung mengembalikan path tanpa menulis ulang ke disk)
      const cleanFotoBefore = saveBase64ImageFile(foto_before, "before");
      const cleanFotoAfter = saveBase64ImageFile(foto_after, "after");

      const formPayload = {
        ...(oPayload.hasil_form || {}),
        ...(cleanFotoBefore ? { foto_before: cleanFotoBefore } : {}),
        ...(cleanFotoAfter ? { foto_after: cleanFotoAfter } : {}),
      };

      // Panggil syncRekamMedisPerAntrian untuk memastikan baris ruangan ada & ter-update
      const rmSyncResult = await syncRekamMedisPerAntrian({
        kode_kunjungan,
        kode_antrian_layanan: resolvedKodeAntrian,
        kode_ruangan: targetKodeRuangan,
        nama_ruangan,
        hasil_form: Object.keys(formPayload).length > 0 ? formPayload : null,
        catatan_hasil_treatment: catatan || null,
        kode_karyawan: oPayload.kode_karyawan || currentAL?.kode_karyawan,
        username,
        trx,
      });

      const id_rekam_medis = rmSyncResult?.id_rekam_medis;
      const id_rekam_medis_ruangan = rmSyncResult?.id_rekam_medis_ruangan;

      // ─── 2. UPDATE CATATAN HASIL TREATMENT & FOTO AFTER (OVERWRITE, TANPA CONCAT ---) ──
      if (id_rekam_medis_ruangan && catatan) {
        await trx("trx_rekam_medis_ruangan")
          .where("id", id_rekam_medis_ruangan)
          .update({
            catatan_hasil_treatment: catatan,
            updated_by: username,
            updated_at: new Date(),
          });
      }

      let resolvedKodeRM = kode_rekam_medis || (id_rekam_medis ? String(id_rekam_medis) : null);

      // ─── 3. UPDATE STATUS ANTRIAN SAAT INI JADI SELESAI ─────────────────────
      if (resolvedKodeAntrian) {
        await trx("trx_antrian_layanan")
          .where("kode_antrian_layanan", resolvedKodeAntrian)
          .update({
            status: "selesai",
            selesai_at: formatDateSystem(),
            updated_by: username,
            updated_at: formatDateSystem(),
          });
      }

      // ─── 4. SINKRONISASI TERPUSAT KE DRAF TRANSAKSI KASIR ─────────────────────
      const syncResult = await syncCompletedItemsToKasirDraft(trx, {
        kodeKunjungan: kode_kunjungan,
        noRm: no_rm,
        kodeRekamMedis: resolvedKodeRM,
        username,
        tz,
        extraProdukItems: produkItems,
      });

      if (syncResult) {
        createdTransaksiKode = syncResult.kode_transaksi;
        grandTotal = syncResult.total_bayar;
      }



      // ─── CEK APAKAH SEMUA ANTRIAN DI KUNJUNGAN INI SUDAH SELESAI ─────────────
      const allAntrianKunjungan = await trx("trx_antrian_layanan")
        .where("kode_kunjungan", kode_kunjungan)
        .select("status");

      const allSelesai = allAntrianKunjungan.every(
        (a) => a.status === "selesai" || a.status === "batal"
      );

      if (allSelesai && allAntrianKunjungan.length > 0) {
        // Tandai kunjungan sebagai selesai jika tabel trx_kunjungan ada kolom status
        try {
          await trx("trx_kunjungan")
            .where("kode_kunjungan", kode_kunjungan)
            .update({
              status: "selesai",
              updated_by: username,
              updated_at: formatDateSystem(),
            });
        } catch (_) {
          // Jika kolom/tabel tidak ada, abaikan
        }
      }

    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Hasil treatment berhasil disimpan",
      datetime: formatDateSystem(),
      data: {
        kode_kunjungan,
        kode_transaksi: createdTransaksiKode,
        total_bayar: grandTotal,
      },
    });
  } catch (error) {
    Logging(error, {
      file: "/master/hasil_treatment_save.js",
      func: "handleHasilTreatmentSave",
      request: oPayload,
      user: username,
    });
    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: error.message || "Gagal menyimpan hasil treatment",
      datetime: formatDateSystem(),
    });
  }
};

router.post("/", handleHasilTreatmentSave);

export default router;
