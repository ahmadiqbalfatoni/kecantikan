/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file index.js
 * @description Router index untuk modul master antrian awal
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-15
 *
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 *
 * @lastModified Fadil (2026-08-15)
 * @version 1.0.0
 */

import express from "express";
const router = express.Router();

import antrianAwalData          from "./antrian_awal_data.js";
import antrianAwalCreate        from "./antrian_awal_create.js";
import antrianAwalUpdate        from "./antrian_awal_update.js";
import antrianAwalDelete        from "./antrian_awal_delete.js";
import antrianAwalPanggil       from "./antrian_awal_panggil.js";
import antrianAwalReset         from "./antrian_awal_reset.js";
import antrianAwalTersediaDaftar from "./antrian_awal_tersedia_daftar.js";
import antrianAwalAmbil         from "./antrian_awal_ambil.js";

router.use("/antrian-awal-data",           antrianAwalData);
router.use("/antrian-awal-create",         antrianAwalCreate);
router.use("/antrian-awal-update",         antrianAwalUpdate);
router.use("/antrian-awal-delete",         antrianAwalDelete);
router.use("/antrian-awal-panggil",        antrianAwalPanggil);
router.use("/antrian-awal-reset",          antrianAwalReset);
router.use("/antrian-awal-tersedia-daftar", antrianAwalTersediaDaftar);
router.use("/antrian-awal-ambil",          antrianAwalAmbil);
router.use("/antrean-awal-ambil",          antrianAwalAmbil);
router.use("/antrian-pendaftaran-ambil",   antrianAwalAmbil);
router.use("/antrean-pendaftaran-ambil",   antrianAwalAmbil);

export default router;
