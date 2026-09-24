import express from "express";
const router = express.Router();

import antrianAwalIndex from "./antrian_awal/index.js";
import antrianAwalAmbil from "./antrian_awal/antrian_awal_ambil.js";
import pendaftaranPasienIndex from "./pendaftaran_pasien/index.js";

import kategoriLayananData from "./kategori_layanan/kategori_layanan_data.js";
import kategoriLayananCreate from "./kategori_layanan/kategori_layanan_create.js";
import kategoriLayananUpdate from "./kategori_layanan/kategori_layanan_update.js";
import kategoriLayananDelete from "./kategori_layanan/kategori_layanan_delete.js";

import layananData from "./layanan/layanan_data.js";
import layananCreate from "./layanan/layanan_create.js";
import layananUpdate from "./layanan/layanan_update.js";
import layananDelete from "./layanan/layanan_delete.js";

import paketLayananData from "./paket_layanan/paket_layanan_data.js";
import paketLayananCreate from "./paket_layanan/paket_layanan_create.js";
import paketLayananUpdate from "./paket_layanan/paket_layanan_update.js";
import paketLayananDelete from "./paket_layanan/paket_layanan_delete.js";

import kategoriProdukData from "./kategori_produk/kategori_produk_data.js";
import kategoriProdukCreate from "./kategori_produk/kategori_produk_create.js";
import kategoriProdukUpdate from "./kategori_produk/kategori_produk_update.js";
import kategoriProdukDelete from "./kategori_produk/kategori_produk_delete.js";

import produkData from "./produk/produk_data.js";
import produkCreate from "./produk/produk_create.js";
import produkUpdate from "./produk/produk_update.js";
import produkDelete from "./produk/produk_delete.js";

import paketProdukData from "./paket_produk/paket_produk_data.js";
import paketProdukCreate from "./paket_produk/paket_produk_create.js";
import paketProdukUpdate from "./paket_produk/paket_produk_update.js";
import paketProdukDelete from "./paket_produk/paket_produk_delete.js";

import supplierData from "./supplier/supplier_data.js";
import supplierCreate from "./supplier/supplier_create.js";
import supplierUpdate from "./supplier/supplier_update.js";
import supplierDelete from "./supplier/supplier_delete.js";

import inventoriData from "./inventori/inventori_data.js";
import inventoriBeliBaru from "./inventori/inventori_beli_baru.js";
import inventoriRestock from "./inventori/inventori_restock.js";
import inventoriPoData from "./inventori/inventori_po_data.js";
import inventoriMutasiData from "./inventori/inventori_mutasi_data.js";

import karyawanData from "./karyawan/karyawan_data.js";
import karyawanCreate from "./karyawan/karyawan_create.js";
import karyawanUpdate from "./karyawan/karyawan_update.js";
import karyawanDelete from "./karyawan/karyawan_delete.js";

import alatData from "./alat/alat_data.js";
import alatCreate from "./alat/alat_create.js";
import alatUpdate from "./alat/alat_update.js";
import alatDelete from "./alat/alat_delete.js";

import ruanganData from "./ruangan/ruangan_data.js";
import ruanganCreate from "./ruangan/ruangan_create.js";
import ruanganUpdate from "./ruangan/ruangan_update.js";
import ruanganDelete from "./ruangan/ruangan_delete.js";

import promoData from "./promo/promo_data.js";
import promoCreate from "./promo/promo_create.js";
import promoUpdate from "./promo/promo_update.js";
import promoDelete from "./promo/promo_delete.js";

import detailPromoData from "./detail_promo/detail_promo_data.js";
import detailPromoCreate from "./detail_promo/detail_promo_create.js";
import detailPromoUpdate from "./detail_promo/detail_promo_update.js";
import detailPromoDelete from "./detail_promo/detail_promo_delete.js";

import jadwalKaryawanData from "./jadwal_karyawan/jadwal_karyawan_data.js";
import jadwalKaryawanCreate from "./jadwal_karyawan/jadwal_karyawan_create.js";
import jadwalKaryawanUpdate from "./jadwal_karyawan/jadwal_karyawan_update.js";
import jadwalKaryawanDelete from "./jadwal_karyawan/jadwal_karyawan_delete.js";

import dokterDropdown from "./dokter_dropdown.js";
import penjaminDropdown from "./penjamin_dropdown.js";
import antrianLayananIndex from "./antrian_layanan/index.js";
import poliDropdown from "./poli_dropdown.js";
import ruanganDropdown from "./ruangan_dropdown.js";
import produkDropdown from "./produk_dropdown.js";
import hasilTreatmentSave from "./hasil_treatment_save.js";
import wilayah from "./wilayah.js";
import ruanganFormCrud from "./ruangan/ruangan_form_crud.js";
import ruanganRekomendasi from "./ruangan/ruangan_rekomendasi.js";

import kasirOptions from "./kasir/kasir_options.js";
import kasirList from "./kasir/kasir_list.js";
import kasirDetail from "./kasir/kasir_detail.js";
import kasirSave from "./kasir/kasir_save.js";
import kasirBayar from "./kasir/kasir_bayar.js";

import rekamMedisPasien from "./rekam_medis/rekam_medis_pasien.js";
import transaksiPasien from "./rekam_medis/transaksi_pasien.js";

// Dropdown & Utility (must be before "/" catch-all routers)
router.use("/", ruanganFormCrud);
router.use("/", ruanganRekomendasi);
router.use("/wilayah", wilayah);
router.use("/ruangan-dropdown", ruanganDropdown);
router.use("/produk-dropdown", produkDropdown);
router.use("/hasil-treatment-save", hasilTreatmentSave);
router.use("/dokter-dropdown", dokterDropdown);
router.use("/penjamin-dropdown", penjaminDropdown);
router.use("/poli-dropdown", poliDropdown);

// Antrian Awal & Layanan
router.use("/antrian-awal-ambil", antrianAwalAmbil);
router.use("/antrean-awal-ambil", antrianAwalAmbil);
router.use("/antrian-pendaftaran-ambil", antrianAwalAmbil);
router.use("/antrean-pendaftaran-ambil", antrianAwalAmbil);
router.use("/", antrianAwalIndex);
router.use("/", antrianLayananIndex);

import pendaftaranPasienKepemilikanPaket from "./pendaftaran_pasien/pendaftaran_pasien_kepemilikan_paket.js";

// Pendaftaran Pasien
router.use("/", pendaftaranPasienIndex);
router.use("/pendaftaran-pasien-kepemilikan-paket", pendaftaranPasienKepemilikanPaket);

// Kategori Layanan
router.use("/kategori-layanan-data", kategoriLayananData);
router.use("/kategori-layanan-create", kategoriLayananCreate);
router.use("/kategori-layanan-update", kategoriLayananUpdate);
router.use("/kategori-layanan-delete", kategoriLayananDelete);

// Layanan
router.use("/layanan-data", layananData);
router.use("/layanan-create", layananCreate);
router.use("/layanan-update", layananUpdate);
router.use("/layanan-delete", layananDelete);

// Paket Layanan
router.use("/paket-layanan-data", paketLayananData);
router.use("/paket-layanan-create", paketLayananCreate);
router.use("/paket-layanan-update", paketLayananUpdate);
router.use("/paket-layanan-delete", paketLayananDelete);

// Kategori Produk
router.use("/kategori-produk-data", kategoriProdukData);
router.use("/kategori-produk-create", kategoriProdukCreate);
router.use("/kategori-produk-update", kategoriProdukUpdate);
router.use("/kategori-produk-delete", kategoriProdukDelete);

// Produk
router.use("/produk-data", produkData);
router.use("/produk-create", produkCreate);
router.use("/produk-update", produkUpdate);
router.use("/produk-delete", produkDelete);

// Paket Produk
router.use("/paket-produk-data", paketProdukData);
router.use("/paket-produk-create", paketProdukCreate);
router.use("/paket-produk-update", paketProdukUpdate);
router.use("/paket-produk-delete", paketProdukDelete);

// Supplier
router.use("/supplier-data", supplierData);
router.use("/supplier-create", supplierCreate);
router.use("/supplier-update", supplierUpdate);
router.use("/supplier-delete", supplierDelete);

// Inventori
router.use("/inventori-data", inventoriData);
router.use("/inventori-beli-baru", inventoriBeliBaru);
router.use("/inventori-restock", inventoriRestock);
router.use("/inventori-po-data", inventoriPoData);
router.use("/inventori-mutasi-data", inventoriMutasiData);

// Karyawan
router.use("/karyawan-data", karyawanData);
router.use("/karyawan-create", karyawanCreate);
router.use("/karyawan-update", karyawanUpdate);
router.use("/karyawan-delete", karyawanDelete);

// Alat
router.use("/alat-data", alatData);
router.use("/alat-create", alatCreate);
router.use("/alat-update", alatUpdate);
router.use("/alat-delete", alatDelete);

// Ruangan
router.use("/ruangan-data", ruanganData);
router.use("/ruangan-create", ruanganCreate);
router.use("/ruangan-update", ruanganUpdate);
router.use("/ruangan-delete", ruanganDelete);

// Promo
router.use("/promo-data", promoData);
router.use("/promo-create", promoCreate);
router.use("/promo-update", promoUpdate);
router.use("/promo-delete", promoDelete);

// Detail Promo
router.use("/detail-promo-data", detailPromoData);
router.use("/detail-promo-create", detailPromoCreate);
router.use("/detail-promo-update", detailPromoUpdate);
router.use("/detail-promo-delete", detailPromoDelete);

// Jadwal Karyawan
router.use("/jadwal-karyawan-data", jadwalKaryawanData);
router.use("/jadwal-karyawan-create", jadwalKaryawanCreate);
router.use("/jadwal-karyawan-update", jadwalKaryawanUpdate);
router.use("/jadwal-karyawan-delete", jadwalKaryawanDelete);

// Kasir
router.use("/kasir-options", kasirOptions);
router.use("/kasir-list", kasirList);
router.use("/kasir-detail", kasirDetail);
router.use("/kasir-save", kasirSave);
router.use("/kasir-bayar", kasirBayar);

// Rekam Medis Pasien & Laporan Transaksi
router.use("/pasien-rekam-medis", rekamMedisPasien);
router.use("/pasien-transaksi", transaksiPasien);
router.use("/pasien", rekamMedisPasien);

// Laporan & Analytics (Semua Modul)
import laporanRoutes from "./laporan/laporan_routes.js";
router.use("/laporan", laporanRoutes);

// Dashboard Role Based
import dashboardRoutes from "./dashboard/dashboard_routes.js";
router.use("/dashboard", dashboardRoutes);

// Booking / Reservasi Aliases
import bookingRouter from "../transaksi/booking/index.js";
router.use("/booking", bookingRouter);
router.use("/booking-slots", (await import("../transaksi/booking/booking_slots.js")).default);
router.use("/booking-create", (await import("../transaksi/booking/booking_create.js")).default);
router.use("/booking-data", (await import("../transaksi/booking/booking_data.js")).default);
router.use("/booking-update-dp", (await import("../transaksi/booking/booking_update_dp.js")).default);
router.use("/booking-cancel", (await import("../transaksi/booking/booking_cancel.js")).default);
router.use("/booking-checkin", (await import("../transaksi/booking/booking_checkin.js")).default);
router.use("/booking-tidak-hadir", (await import("../transaksi/booking/booking_tidak_hadir.js")).default);
router.use("/booking-mark-no-show", (await import("../transaksi/booking/booking_tidak_hadir.js")).default);

// Multi-Branch / Cabang Klinik
import cabangData from "./cabang/cabang_data.js";
import cabangCreate from "./cabang/cabang_create.js";
import cabangUpdate from "./cabang/cabang_update.js";
import cabangDelete from "./cabang/cabang_delete.js";
import cabangMonitoring from "./cabang/cabang_monitoring.js";
router.use("/cabang-data", cabangData);
router.use("/cabang-create", cabangCreate);
router.use("/cabang-update", cabangUpdate);
router.use("/cabang-delete", cabangDelete);
router.use("/cabang-monitoring", cabangMonitoring);

export default router;
