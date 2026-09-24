import express from "express";
const router = express.Router();

import formUploadData from "./form_upload/form_upload_data.js";
import formUploadCreate from "./form_upload/form_upload_create.js";
import formUploadUpdate from "./form_upload/form_upload_update.js";
import formUploadDelete from "./form_upload/form_upload_delete.js";

import tabviewData from "./tabview/tabview_data.js";
import tabviewCreate from "./tabview/tabview_create.js";
import tabviewUpdate from "./tabview/tabview_update.js";
import tabviewDelete from "./tabview/tabview_delete.js";

import popupData from "./popup/popup_data.js";
import popupCreate from "./popup/popup_create.js";
import popupUpdate from "./popup/popup_update.js";
import popupDelete from "./popup/popup_delete.js";

import barangData from "./master/barang/barang_data.js";
import gudangData from "./master/gudang/gudang_data.js";
import kategoriData from "./master/kategori/kategori_data.js";
import staffData from "./master/staff/staff_data.js";

import laporanData from "./laporan/laporan_data.js";

import trxCetakNotaData from "./trx_cetak_nota/trx_cetak_nota_data.js";
import trxCetakNotaFakturKirimData from "./trx_cetak_nota/trx_cetak_nota_faktur_kirim_data.js";
import trxCetakNotaEditData from "./trx_cetak_nota/trx_cetak_nota_edit_data.js";

router.use("/form-upload/form-upload-data", formUploadData);
router.use("/form-upload/form-upload-create", formUploadCreate);
router.use("/form-upload/form-upload-update", formUploadUpdate);
router.use("/form-upload/form-upload-delete", formUploadDelete);

router.use("/tabview/tabview-data", tabviewData);
router.use("/tabview/tabview-create", tabviewCreate);
router.use("/tabview/tabview-update", tabviewUpdate);
router.use("/tabview/tabview-delete", tabviewDelete);

router.use("/popup/popup-data", popupData);
router.use("/popup/popup-create", popupCreate);
router.use("/popup/popup-update", popupUpdate);
router.use("/popup/popup-delete", popupDelete);

router.use("/laporan/laporan-data", laporanData);

router.use("/trx-cetak-nota/trx-cetak-nota-data", trxCetakNotaData);
router.use("/trx-cetak-nota/trx-cetak-nota-faktur-kirim-data", trxCetakNotaFakturKirimData);
router.use("/trx-cetak-nota/trx-cetak-nota-edit-data", trxCetakNotaEditData);

router.use("/master/barang/barang-data", barangData);
router.use("/master/gudang/gudang-data", gudangData);
router.use("/master/kategori/kategori-data", kategoriData);
router.use("/master/staff/staff-data", staffData);




export default router;