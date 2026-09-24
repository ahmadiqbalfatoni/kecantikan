import express from "express";
import { formatDateSystem } from "../../../components/tools/date_tools.js";
import { Logging } from "../../../components/tools/servertool.js";
import { status } from "../../../components/tools/general.js";

const router = express.Router();

const dummyBarang = [
  {
    id: 1,
    kode: "BRG001",
    barcode: "8991234567890",
    nama: "Semen Portland 50kg",
    gudang: "Gudang Utama, Gudang Transit",
    kode_gudang: "GDG01",
    kode_rak: "RAK-A1",
    kode_satuan_awal: "ZAK",
    stok_awal: 100,
    kode_supplier: "SPL001",
    kode_kategori: "KAT001",
    kategori: "Bahan Bangunan",
    jenis_barang: "Stok",
    kode_satuan_1: "ZAK",
    kode_satuan_2: "PCS",
    kode_satuan_3: null,
    kode_satuan_4: null,
    kode_satuan_5: null,
    kode_satuan_6: null,
    kode_satuan_7: null,
    satuan_1: "ZAK",
    satuan_2: "Pcs",
    satuan_3: null,
    satuan_4: null,
    satuan_5: null,
    satuan_6: null,
    satuan_7: null,
    konversi_2: 1,
    konversi_3: null,
    konversi_4: null,
    konversi_5: null,
    konversi_6: null,
    konversi_7: null,
    harga_beli_1: 65000,
    harga_beli_2: 65000,
    harga_beli_3: null,
    harga_beli_4: null,
    harga_beli_5: null,
    harga_beli_6: null,
    harga_beli_7: null,
    harga_jual_1: 72000,
    harga_jual_2: 72000,
    harga_jual_3: null,
    harga_jual_4: null,
    harga_jual_5: null,
    harga_jual_6: null,
    harga_jual_7: null,
    diskon: 0,
    pajak: 11,
    batas_stok_minimal: 10,
    batas_stok_maksimal: 500,
    status_stok: "Aman",
    kedaluwarsa: null,
    gambar: "http://localhost:3000/uploads/barang/semen.jpg",
    status_barang: "Aktif",
    tz: "Asia/Jakarta",
    created_by: "admin",
    created_by_fullname: "Administrator",
    created_at: "2023-01-10 10:00:00",
    updated_by: "admin",
    updated_by_fullname: "Administrator",
    updated_at: "2023-01-10 10:00:00",
    total_stok: 150,
    list_gudang: [
      { kode_gudang: "GDG01", keterangan_gudang: "Gudang Utama", stok: 100 },
      { kode_gudang: "GDG02", keterangan_gudang: "Gudang Transit", stok: 50 }
    ]
  },
  {
    id: 2,
    kode: "BRG002",
    barcode: "8990987654321",
    nama: "Besi Beton 10mm",
    gudang: "Gudang Utama",
    kode_gudang: "GDG01",
    kode_rak: "RAK-B2",
    kode_satuan_awal: "BATANG",
    stok_awal: 200,
    kode_supplier: "SPL002",
    kode_kategori: "KAT001",
    kategori: "Bahan Bangunan",
    jenis_barang: "Stok",
    kode_satuan_1: "BATANG",
    kode_satuan_2: null,
    kode_satuan_3: null,
    kode_satuan_4: null,
    kode_satuan_5: null,
    kode_satuan_6: null,
    kode_satuan_7: null,
    satuan_1: "Batang",
    satuan_2: null,
    satuan_3: null,
    satuan_4: null,
    satuan_5: null,
    satuan_6: null,
    satuan_7: null,
    konversi_2: null,
    konversi_3: null,
    konversi_4: null,
    konversi_5: null,
    konversi_6: null,
    konversi_7: null,
    harga_beli_1: 85000,
    harga_beli_2: null,
    harga_beli_3: null,
    harga_beli_4: null,
    harga_beli_5: null,
    harga_beli_6: null,
    harga_beli_7: null,
    harga_jual_1: 95000,
    harga_jual_2: null,
    harga_jual_3: null,
    harga_jual_4: null,
    harga_jual_5: null,
    harga_jual_6: null,
    harga_jual_7: null,
    diskon: 500,
    pajak: 11,
    batas_stok_minimal: 20,
    batas_stok_maksimal: 1000,
    status_stok: "Aman",
    kedaluwarsa: null,
    gambar: "http://localhost:3000/uploads/barang/besi.jpg",
    status_barang: "Aktif",
    tz: "Asia/Jakarta",
    created_by: "admin",
    created_by_fullname: "Administrator",
    created_at: "2023-01-11 11:00:00",
    updated_by: "admin",
    updated_by_fullname: "Administrator",
    updated_at: "2023-01-11 11:00:00",
    total_stok: 200,
    list_gudang: [
      { kode_gudang: "GDG01", keterangan_gudang: "Gudang Utama", stok: 200 }
    ]
  },
  {
    id: 3,
    kode: "BRG003",
    barcode: "8995555666777",
    nama: "Cat Tembok Putih 5kg",
    gudang: "Gudang Cadangan",
    kode_gudang: "GDG03",
    kode_rak: "RAK-C1",
    kode_satuan_awal: "PAIL",
    stok_awal: 50,
    kode_supplier: "SPL003",
    kode_kategori: "KAT002",
    kategori: "Cat & Perlengkapan",
    jenis_barang: "Stok",
    kode_satuan_1: "PAIL",
    kode_satuan_2: null,
    kode_satuan_3: null,
    kode_satuan_4: null,
    kode_satuan_5: null,
    kode_satuan_6: null,
    kode_satuan_7: null,
    satuan_1: "Pail",
    satuan_2: null,
    satuan_3: null,
    satuan_4: null,
    satuan_5: null,
    satuan_6: null,
    satuan_7: null,
    konversi_2: null,
    konversi_3: null,
    konversi_4: null,
    konversi_5: null,
    konversi_6: null,
    konversi_7: null,
    harga_beli_1: 120000,
    harga_beli_2: null,
    harga_beli_3: null,
    harga_beli_4: null,
    harga_beli_5: null,
    harga_beli_6: null,
    harga_beli_7: null,
    harga_jual_1: 145000,
    harga_jual_2: null,
    harga_jual_3: null,
    harga_jual_4: null,
    harga_jual_5: null,
    harga_jual_6: null,
    harga_jual_7: null,
    diskon: 0,
    pajak: 11,
    batas_stok_minimal: 5,
    batas_stok_maksimal: 100,
    status_stok: "Aman",
    kedaluwarsa: null,
    gambar: "",
    status_barang: "Aktif",
    tz: "Asia/Jakarta",
    created_by: "admin",
    created_by_fullname: "Administrator",
    created_at: "2023-01-12 12:00:00",
    updated_by: "admin",
    updated_by_fullname: "Administrator",
    updated_at: "2023-01-12 12:00:00",
    total_stok: 75,
    list_gudang: [
      { kode_gudang: "GDG03", keterangan_gudang: "Gudang Cadangan", stok: 75 }
    ]
  }
];

router.post("/", async (req, res) => {
  const { body: oPayload } = req;
  const cUsername = req?.auth?.username || "";

  const bHasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;
  const cKeyword = oPayload.keyword || "";
  const cSortField = oPayload.sortField || "updated_at";
  const cSortOrder = oPayload.sortOrder || "desc";
  const oFilters = oPayload.filters || {};

  try {
    let filteredData = [...dummyBarang];

    // 1. Simulasi Filter berdasarkan kata kunci
    if (cKeyword) {
      const cLowerKeyword = cKeyword.toLowerCase();
      filteredData = filteredData.filter((item) => {
        const matchNama = item.nama ? item.nama.toLowerCase().includes(cLowerKeyword) : false;
        const matchKode = item.kode ? item.kode.toLowerCase().includes(cLowerKeyword) : false;
        const matchBarcode = item.barcode ? item.barcode.toLowerCase().includes(cLowerKeyword) : false;
        return matchNama || matchKode || matchBarcode;
      });
    }

    // 2. Simulasi Filter berdasarkan Kategori
    if (oFilters.kategori && oFilters.kategori.length > 0) {
      filteredData = filteredData.filter((item) =>
        oFilters.kategori.includes(item.kode_kategori)
      );
    }

    // 3. Simulasi Filter berdasarkan Gudang
    if (oFilters.gudang && oFilters.gudang.length > 0) {
      filteredData = filteredData.filter((item) =>
        item.list_gudang.some((g) => oFilters.gudang.includes(g.kode_gudang))
      );
    }

    // 4. Simulasi Pengurutan (Sorting)
    filteredData.sort((a, b) => {
      let valA = a[cSortField];
      let valB = b[cSortField];

      if (valA === undefined) valA = "";
      if (valB === undefined) valB = "";

      if (typeof valA === "string" && typeof valB === "string") {
        return cSortOrder.toLowerCase() === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return cSortOrder.toLowerCase() === "asc" ? valA - valB : valB - valA;
      }
    });

    const nTotalRecords = filteredData.length;
    let vaData = [];

    // 5. Simulasi Pembatasan Halaman (Pagination)
    if (bHasPagination) {
      const nPage = parseInt(oPayload.page) || 1;
      const nPerPage = parseInt(oPayload.perPage) || 10;
      const nOffset = (nPage - 1) * nPerPage;

      vaData = filteredData.slice(nOffset, nOffset + nPerPage);
    } else {
      vaData = filteredData;
    }

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
      file: "contoh/master/barang/barang_data.js",
      func: "get",
      request: oPayload,
      response: oResult,
      user: cUsername,
    });

    return res.status(500).json(oResult);
  }
});

export default router;