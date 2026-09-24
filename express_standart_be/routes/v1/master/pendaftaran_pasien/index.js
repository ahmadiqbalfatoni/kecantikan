/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file index.js
 * @description Router index untuk modul pendaftaran pasien & kunjungan
 *
 * @author Antigravity
 * @created 2026-08-21
 */

import express from "express";
const router = express.Router();

import pendaftaranPasienCari        from "./pendaftaran_pasien_cari.js";
import pendaftaranPasienCreate      from "./pendaftaran_pasien_create.js";
import pendaftaranPasienDaftarUlang from "./pendaftaran_pasien_daftar_ulang.js";
import pendaftaranPasienData        from "./pendaftaran_pasien_data.js";
import pendaftaranPasienUpdate      from "./pendaftaran_pasien_update.js";
import pendaftaranPasienDelete      from "./pendaftaran_pasien_delete.js";
import pendaftaranPasienBatal       from "./pendaftaran_pasien_batal.js";
import pendaftaranPasienLayananOptions    from "./pendaftaran_pasien_layanan_options.js";
import pendaftaranPasienAmbilAntrianLayanan from "./pendaftaran_pasien_ambil_antrian_layanan.js";
import pendaftaranPasienKepemilikanPaket    from "./pendaftaran_pasien_kepemilikan_paket.js";

router.use("/pendaftaran-pasien-cari",                 pendaftaranPasienCari);
router.use("/pasien-data",                             pendaftaranPasienCari);
router.use("/pendaftaran-pasien-create",               pendaftaranPasienCreate);
router.use("/pasien-create",                           pendaftaranPasienCreate);
router.use("/pendaftaran-pasien-daftar-ulang",          pendaftaranPasienDaftarUlang);
router.use("/pendaftaran-pasien-data",                 pendaftaranPasienData);
router.use("/pendaftaran-pasien-update",               pendaftaranPasienUpdate);
router.use("/pasien-update",                           pendaftaranPasienUpdate);
router.use("/pendaftaran-pasien-delete",               pendaftaranPasienDelete);
router.use("/pasien-delete",                           pendaftaranPasienDelete);
router.use("/pendaftaran-pasien-batal",                pendaftaranPasienBatal);
router.use("/pendaftaran-pasien-layanan-options",     pendaftaranPasienLayananOptions);
router.use("/pendaftaran-pasien-ambil-antrian-layanan", pendaftaranPasienAmbilAntrianLayanan);
router.use("/pendaftaran-pasien-kepemilikan-paket",    pendaftaranPasienKepemilikanPaket);

export default router;
