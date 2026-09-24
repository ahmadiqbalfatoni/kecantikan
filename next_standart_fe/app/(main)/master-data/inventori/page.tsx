'use client';

import { useEffect, useRef, useState } from 'react';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { showError, showSuccess } from '@/lib/tools/generalTools';

const Page = () => {
    const toast = useRef<Toast>(null);

    // Active Tab Index
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // ==========================================
    // TAB 1: STOK INVENTORI PRODUK STATE
    // ==========================================
    const [dataProduk, setDataProduk] = useState<any[]>([]);
    const [loadingProduk, setLoadingProduk] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [filterStatusStok, setFilterStatusStok] = useState<string>('');
    const [filterKategori, setFilterKategori] = useState<string>('');
    const [filterSupplier, setFilterSupplier] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    // Ringkasan KPI
    const [summary, setSummary] = useState<any>({
        total_sku: 0,
        total_stok_unit: 0,
        stok_menipis: 0,
        stok_habis: 0,
        total_aset: 0,
    });

    // Dropdown options
    const [kategoriList, setKategoriList] = useState<any[]>([]);
    const [supplierList, setSupplierList] = useState<any[]>([]);
    const [allProdukList, setAllProdukList] = useState<any[]>([]);

    // ==========================================
    // TAB 2: RIWAYAT PURCHASE ORDER (PO) STATE
    // ==========================================
    const [dataPo, setDataPo] = useState<any[]>([]);
    const [loadingPo, setLoadingPo] = useState<boolean>(false);
    const [totalPoRecords, setTotalPoRecords] = useState<number>(0);
    const [pagePo, setPagePo] = useState<number>(1);
    const [rowsPo, setRowsPo] = useState<number>(10);
    const [keywordPo, setKeywordPo] = useState<string>('');
    const [selectedPoDetail, setSelectedPoDetail] = useState<any>(null);
    const [dialogPoDetailVisible, setDialogPoDetailVisible] = useState<boolean>(false);

    // ==========================================
    // TAB 3: LOG MUTASI STOK STATE
    // ==========================================
    const [dataMutasi, setDataMutasi] = useState<any[]>([]);
    const [loadingMutasi, setLoadingMutasi] = useState<boolean>(false);
    const [totalMutasiRecords, setTotalMutasiRecords] = useState<number>(0);
    const [pageMutasi, setPageMutasi] = useState<number>(1);
    const [rowsMutasi, setRowsMutasi] = useState<number>(10);
    const [keywordMutasi, setKeywordMutasi] = useState<string>('');
    const [filterJenisMutasi, setFilterJenisMutasi] = useState<string>('');

    // Modal Mutasi Khusus Per Produk
    const [productMutasiTarget, setProductMutasiTarget] = useState<any>(null);
    const [productMutasiList, setProductMutasiList] = useState<any[]>([]);
    const [loadingProductMutasi, setLoadingProductMutasi] = useState<boolean>(false);
    const [dialogProductMutasiVisible, setDialogProductMutasiVisible] = useState<boolean>(false);

    // ==========================================
    // MODAL DIALOG: BELI PRODUK BARU
    // ==========================================
    const [dialogBeliBaruVisible, setDialogBeliBaruVisible] = useState<boolean>(false);
    const [formBeliBaru, setFormBeliBaru] = useState<any>({
        kode_supplier: '',
        kode_kategori_produk: '',
        nama: '',
        satuan: 'Pcs',
        harga_beli: 0,
        harga_jual: 0,
        stok_minimum: 5,
        qty_beli: 1,
        no_batch: '',
        tanggal_kadaluarsa: '',
        tanggal: new Date().toISOString().slice(0, 10),
    });
    const [savingBeliBaru, setSavingBeliBaru] = useState<boolean>(false);

    // ==========================================
    // MODAL DIALOG: RESTOCK PRODUK LAMA
    // ==========================================
    const [dialogRestockVisible, setDialogRestockVisible] = useState<boolean>(false);
    const [selectedRestockProduk, setSelectedRestockProduk] = useState<any>(null);
    const [formRestock, setFormRestock] = useState<any>({
        kode_supplier: '',
        kode_produk: '',
        qty_masuk: 1,
        harga_beli: 0,
        no_batch: '',
        tanggal_kadaluarsa: '',
        update_harga_beli_master: true,
        tanggal: new Date().toISOString().slice(0, 10),
    });
    const [savingRestock, setSavingRestock] = useState<boolean>(false);

    // ==========================================
    // DATA LOADERS
    // ==========================================
    const loadInventoriData = async () => {
        setLoadingProduk(true);
        try {
            const res = await postData('/master/inventori-data', {
                page,
                perPage: rows,
                keyword,
                status_stok: filterStatusStok || null,
                kode_kategori_produk: filterKategori || null,
                kode_supplier: filterSupplier || null,
            });
            setDataProduk(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
            if (res.data.summary) {
                setSummary(res.data.summary);
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data inventori');
        } finally {
            setLoadingProduk(false);
        }
    };

    const loadPoData = async () => {
        setLoadingPo(true);
        try {
            const res = await postData('/master/inventori-po-data', {
                page: pagePo,
                perPage: rowsPo,
                keyword: keywordPo,
            });
            setDataPo(res.data.data || []);
            setTotalPoRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data Purchase Order');
        } finally {
            setLoadingPo(false);
        }
    };

    const loadMutasiData = async () => {
        setLoadingMutasi(true);
        try {
            const res = await postData('/master/inventori-mutasi-data', {
                page: pageMutasi,
                perPage: rowsMutasi,
                keyword: keywordMutasi,
                jenis_movement: filterJenisMutasi || null,
            });
            setDataMutasi(res.data.data || []);
            setTotalMutasiRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data mutasi stok');
        } finally {
            setLoadingMutasi(false);
        }
    };

    const loadDropdowns = async () => {
        try {
            const [resKat, resSup, resPrd] = await Promise.all([
                postData('/master/kategori-produk-data', { status: 'aktif' }),
                postData('/master/supplier-data', { status: 'aktif' }),
                postData('/master/inventori-data', {}),
            ]);
            setKategoriList(
                (resKat.data.data || []).map((k: any) => ({
                    label: k.nama,
                    value: k.kode_kategori_produk,
                }))
            );
            setSupplierList(
                (resSup.data.data || []).map((s: any) => ({
                    label: `${s.nama} (${s.kode_supplier})`,
                    value: s.kode_supplier,
                    raw: s,
                }))
            );
            setAllProdukList(resPrd.data.data || []);
        } catch (error) {
            console.error('Failed to load dropdowns', error);
        }
    };

    useEffect(() => {
        loadDropdowns();
    }, []);

    useEffect(() => {
        loadInventoriData();
    }, [page, rows, keyword, filterStatusStok, filterKategori, filterSupplier]);

    useEffect(() => {
        if (activeIndex === 1) {
            loadPoData();
        } else if (activeIndex === 2) {
            loadMutasiData();
        }
    }, [activeIndex, pagePo, rowsPo, keywordPo, pageMutasi, rowsMutasi, keywordMutasi, filterJenisMutasi]);

    // ==========================================
    // HANDLERS: BELI PRODUK BARU
    // ==========================================
    const handleOpenBeliBaru = () => {
        setFormBeliBaru({
            kode_supplier: supplierList[0]?.value || '',
            kode_kategori_produk: kategoriList[0]?.value || '',
            nama: '',
            satuan: 'Pcs',
            harga_beli: 0,
            harga_jual: 0,
            stok_minimum: 5,
            qty_beli: 1,
            no_batch: '',
            tanggal_kadaluarsa: '',
            tanggal: new Date().toISOString().slice(0, 10),
        });
        setDialogBeliBaruVisible(true);
    };

    const handleSaveBeliBaru = async () => {
        if (!formBeliBaru.kode_supplier) {
            showError(toast, 'Silakan pilih rekanan Supplier!');
            return;
        }
        if (!formBeliBaru.kode_kategori_produk) {
            showError(toast, 'Silakan pilih Kategori Produk!');
            return;
        }
        if (!formBeliBaru.nama?.trim()) {
            showError(toast, 'Nama Produk baru wajib diisi!');
            return;
        }
        if (!formBeliBaru.satuan?.trim()) {
            showError(toast, 'Satuan Produk wajib diisi!');
            return;
        }
        if (Number(formBeliBaru.harga_beli) < 0) {
            showError(toast, 'Harga Beli tidak valid!');
            return;
        }
        if (Number(formBeliBaru.qty_beli) < 1) {
            showError(toast, 'Jumlah pembelian minimal 1 unit!');
            return;
        }

        setSavingBeliBaru(true);
        try {
            const res = await postData('/master/inventori-beli-baru', formBeliBaru);
            showSuccess(toast, res.data.message || 'Produk baru berhasil dibeli dan masuk stok!');
            setDialogBeliBaruVisible(false);
            loadInventoriData();
            loadDropdowns();
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan pengadaan produk');
        } finally {
            setSavingBeliBaru(false);
        }
    };

    // ==========================================
    // HANDLERS: RESTOCK PRODUK LAMA
    // ==========================================
    const handleOpenRestock = (targetRow?: any) => {
        if (targetRow) {
            setSelectedRestockProduk(targetRow);
            setFormRestock({
                kode_supplier: targetRow.kode_supplier || supplierList[0]?.value || '',
                kode_produk: targetRow.kode_produk,
                qty_masuk: 1,
                harga_beli: Number(targetRow.harga_beli) || 0,
                no_batch: targetRow.no_batch || '',
                tanggal_kadaluarsa: targetRow.tanggal_kadaluarsa ? String(targetRow.tanggal_kadaluarsa).slice(0, 10) : '',
                update_harga_beli_master: true,
                tanggal: new Date().toISOString().slice(0, 10),
            });
        } else {
            const first = dataProduk[0] || allProdukList[0];
            setSelectedRestockProduk(first || null);
            setFormRestock({
                kode_supplier: first?.kode_supplier || supplierList[0]?.value || '',
                kode_produk: first?.kode_produk || '',
                qty_masuk: 1,
                harga_beli: Number(first?.harga_beli) || 0,
                no_batch: first?.no_batch || '',
                tanggal_kadaluarsa: first?.tanggal_kadaluarsa ? String(first.tanggal_kadaluarsa).slice(0, 10) : '',
                update_harga_beli_master: true,
                tanggal: new Date().toISOString().slice(0, 10),
            });
        }
        setDialogRestockVisible(true);
    };

    const handleSelectRestockProdukChange = (kodeProduk: string) => {
        const found = allProdukList.find((p) => p.kode_produk === kodeProduk) || dataProduk.find((p) => p.kode_produk === kodeProduk);
        setSelectedRestockProduk(found || null);
        setFormRestock((prev: any) => ({
            ...prev,
            kode_produk: kodeProduk,
            kode_supplier: found?.kode_supplier || prev.kode_supplier || supplierList[0]?.value || '',
            harga_beli: Number(found?.harga_beli) || 0,
            no_batch: found?.no_batch || '',
            tanggal_kadaluarsa: found?.tanggal_kadaluarsa ? String(found.tanggal_kadaluarsa).slice(0, 10) : '',
        }));
    };

    const handleSaveRestock = async () => {
        if (!formRestock.kode_supplier) {
            showError(toast, 'Silakan pilih rekanan Supplier!');
            return;
        }
        if (!formRestock.kode_produk) {
            showError(toast, 'Silakan pilih Produk yang akan direstock!');
            return;
        }
        if (Number(formRestock.qty_masuk) < 1) {
            showError(toast, 'Jumlah unit restock minimal 1!');
            return;
        }

        setSavingRestock(true);
        try {
            const res = await postData('/master/inventori-restock', formRestock);
            showSuccess(toast, res.data.message || 'Restock produk berhasil disimpan!');
            setDialogRestockVisible(false);
            loadInventoriData();
            loadDropdowns();
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memproses restock');
        } finally {
            setSavingRestock(false);
        }
    };

    // ==========================================
    // HANDLERS: DETAIL PO & MUTASI PRODUK
    // ==========================================
    const handleViewPoDetail = (poRow: any) => {
        setSelectedPoDetail(poRow);
        setDialogPoDetailVisible(true);
    };

    const handleOpenProductMutasi = async (prodRow: any) => {
        setProductMutasiTarget(prodRow);
        setLoadingProductMutasi(true);
        setDialogProductMutasiVisible(true);
        try {
            const res = await postData('/master/inventori-mutasi-data', {
                kode_produk: prodRow.kode_produk,
                perPage: 50,
            });
            setProductMutasiList(res.data.data || []);
        } catch (error: any) {
            showError(toast, 'Gagal memuat riwayat mutasi produk');
        } finally {
            setLoadingProductMutasi(false);
        }
    };

    const formatRupiah = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(num || 0);
    };

    const formatDateIndo = (dStr: string) => {
        if (!dStr) return '-';
        try {
            const d = new Date(dStr);
            return d.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch (_) {
            return dStr;
        }
    };

    const formatDateTimeIndo = (dStr: string) => {
        if (!dStr) return '-';
        try {
            const d = new Date(dStr);
            return d.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (_) {
            return dStr;
        }
    };

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* =========================================================
                CARD CONTAINER UTAMA (Konsisten dengan tema Supplier)
                ========================================================= */}
            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* PAGE HEADER */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-box text-purple-600 text-2xl" />
                        Kelola Inventori Produk
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Pantau persediaan stok produk klinik, restock barang dari supplier, dan pengadaan produk baru.
                    </p>
                </div>

                {/* =========================================================
                    5 KPI CARDS STRIP (Standard Modern Design)
                    ========================================================= */}
                <div className="grid m-0 mb-4">
                    {/* 1. Total SKU */}
                    <div className="col-12 sm:col-6 lg:col-2 p-1">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between h-full">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Total SKU</span>
                                <span className="text-2xl font-bold text-900">{summary.total_sku || 0}</span>
                                <span className="text-xs text-500 block mt-1">Katalog produk aktif</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-purple-100 flex align-items-center justify-content-center text-purple-700">
                                <i className="pi pi-tags text-xl" />
                            </div>
                        </div>
                    </div>

                    {/* 2. Total Stok Unit */}
                    <div className="col-12 sm:col-6 lg:col-2 p-1">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between h-full">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Stok Fisik</span>
                                <span className="text-2xl font-bold text-blue-600">{summary.total_stok_unit || 0}</span>
                                <span className="text-xs text-500 block mt-1">Total unit di klinik</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-blue-100 flex align-items-center justify-content-center text-blue-700">
                                <i className="pi pi-box text-xl" />
                            </div>
                        </div>
                    </div>

                    {/* 3. Stok Menipis */}
                    <div className="col-12 sm:col-6 lg:col-2 p-1">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between h-full">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Stok Menipis</span>
                                <span className="text-2xl font-bold text-orange-600">{summary.stok_menipis || 0}</span>
                                <span className="text-xs text-500 block mt-1">&le; Buffer minimum</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-orange-100 flex align-items-center justify-content-center text-orange-700">
                                <i className="pi pi-exclamation-triangle text-xl" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Stok Habis */}
                    <div className="col-12 sm:col-6 lg:col-2 p-1">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between h-full">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Stok Habis</span>
                                <span className="text-2xl font-bold text-red-600">{summary.stok_habis || 0}</span>
                                <span className="text-xs text-500 block mt-1">Stok 0 unit</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-red-100 flex align-items-center justify-content-center text-red-700">
                                <i className="pi pi-times-circle text-xl" />
                            </div>
                        </div>
                    </div>

                    {/* 5. Total Valuasi Aset */}
                    <div className="col-12 sm:col-12 lg:col-4 p-1">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between h-full bg-green-50">
                            <div>
                                <span className="text-xs text-green-800 font-semibold uppercase block mb-1">Total Valuasi Aset Stok</span>
                                <span className="text-2xl font-black text-green-900">{formatRupiah(summary.total_aset || 0)}</span>
                                <span className="text-xs text-green-700 block mt-1">Akumulasi harga beli persediaan</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-green-100 flex align-items-center justify-content-center text-green-700">
                                <i className="pi pi-money-bill text-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* =========================================================
                    TAB VIEW: INVENTORI, RIWAYAT PO, LOG MUTASI
                    ========================================================= */}
                <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    {/* ── TAB 1: STOK PRODUK ── */}
                    <TabPanel header="Stok & Inventori Produk" leftIcon="pi pi-box mr-2">
                        {/* ACTION BUTTONS (Outline Style) */}
                        <div className="flex flex-row flex-wrap align-items-center gap-2 pt-2 mb-4">
                            <Button
                                size="small"
                                label="Beli Produk Baru"
                                icon="pi pi-plus"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                onClick={handleOpenBeliBaru}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label="Restock Produk"
                                icon="pi pi-cart-plus"
                                outlined
                                severity="info"
                                className="border-round-md font-medium px-3"
                                onClick={() => handleOpenRestock()}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label="Cetak"
                                icon="pi pi-print"
                                outlined
                                className="border-round-md font-medium px-3 border-purple-600 text-purple-600"
                                onClick={() => window.print()}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label="Refresh"
                                icon="pi pi-refresh"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                loading={loadingProduk}
                                onClick={loadInventoriData}
                            />
                        </div>

                        {/* DATA TABLE STOK PRODUK */}
                        <DataTable
                            value={dataProduk}
                            loading={loadingProduk}
                            paginator
                            rows={rows}
                            totalRecords={totalRecords}
                            lazy
                            first={(page - 1) * rows}
                            onPage={(e) => {
                                setPage((e.page || 0) + 1);
                                setRows(e.rows);
                            }}
                            selection={selectedRows}
                            onSelectionChange={(e) => setSelectedRows(e.value as any[])}
                            dataKey="kode_produk"
                            className="p-datatable-sm"
                            emptyMessage="Tidak ada data stok produk yang sesuai filter."
                            responsiveLayout="scroll"
                            rowsPerPageOptions={[10, 25, 50]}
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                            header={
                                <div className="flex flex-column gap-3">
                                    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                        <span className="text-xl font-bold text-900">Data Stok Produk Klinik</span>
                                        <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                            {/* Filter Status Stok */}
                                            <Dropdown
                                                value={filterStatusStok}
                                                options={[
                                                    { label: 'Semua Status Stok', value: '' },
                                                    { label: 'Stok Aman', value: 'aman' },
                                                    { label: 'Stok Menipis', value: 'menipis' },
                                                    { label: 'Stok Habis', value: 'habis' },
                                                ]}
                                                onChange={(e) => setFilterStatusStok(e.value)}
                                                placeholder="Status Stok"
                                                className="p-inputtext-sm text-sm border-round-md w-full md:w-11rem"
                                            />

                                            {/* Filter Kategori */}
                                            <Dropdown
                                                value={filterKategori}
                                                options={[{ label: 'Semua Kategori', value: '' }, ...kategoriList]}
                                                onChange={(e) => setFilterKategori(e.value)}
                                                placeholder="Filter Kategori"
                                                className="p-inputtext-sm text-sm border-round-md w-full md:w-12rem"
                                            />

                                            {/* Filter Supplier */}
                                            <Dropdown
                                                value={filterSupplier}
                                                options={[{ label: 'Semua Supplier', value: '' }, ...supplierList]}
                                                onChange={(e) => setFilterSupplier(e.value)}
                                                placeholder="Supplier"
                                                className="p-inputtext-sm text-sm border-round-md w-full md:w-12rem"
                                            />

                                            {/* Search Field */}
                                            <IconField iconPosition="left" className="w-full md:w-16rem">
                                                <InputIcon className="pi pi-search" />
                                                <InputText
                                                    value={keyword}
                                                    onChange={(e) => setKeyword(e.target.value)}
                                                    placeholder="Cari Produk / Supplier..."
                                                    className="w-full text-sm"
                                                />
                                            </IconField>

                                            {/* Reset Filter Button */}
                                            <Button
                                                type="button"
                                                icon="pi pi-filter-slash"
                                                outlined
                                                severity="danger"
                                                tooltip="Reset Filter"
                                                tooltipOptions={{ position: 'bottom' }}
                                                onClick={() => {
                                                    setKeyword('');
                                                    setFilterStatusStok('');
                                                    setFilterKategori('');
                                                    setFilterSupplier('');
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* STATUS LEGEND BAR */}
                                    <div className="flex flex-wrap align-items-center gap-3 px-2 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                        <span className="flex align-items-center gap-1 font-bold">
                                            <i className="pi pi-info-circle" />
                                            <span>KETERANGAN STATUS:</span>
                                        </span>
                                        <span className="flex align-items-center gap-1">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '3px',
                                                    backgroundColor: '#22c55e',
                                                    boxShadow: '0 1px 3px #22c55e55',
                                                }}
                                            />
                                            Stok Aman (&gt; Min)
                                        </span>
                                        <span className="flex align-items-center gap-1">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '3px',
                                                    backgroundColor: '#f97316',
                                                    boxShadow: '0 1px 3px #f9731655',
                                                }}
                                            />
                                            Stok Menipis (&le; Min)
                                        </span>
                                        <span className="flex align-items-center gap-1">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '3px',
                                                    backgroundColor: '#ef4444',
                                                    boxShadow: '0 1px 3px #ef444455',
                                                }}
                                            />
                                            Stok Habis (0)
                                        </span>
                                    </div>
                                </div>
                            }
                        >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />

                            {/* Status Indicator Square */}
                            <Column
                                header="Status"
                                headerStyle={{ width: '4rem', textAlign: 'center' }}
                                bodyStyle={{ textAlign: 'center' }}
                                body={(r) => {
                                    let dotColor = '#22c55e';
                                    let dotTitle = 'Stok Aman';
                                    if (r.status_stok === 'habis') {
                                        dotColor = '#ef4444';
                                        dotTitle = 'Stok Habis';
                                    } else if (r.status_stok === 'menipis') {
                                        dotColor = '#f97316';
                                        dotTitle = 'Stok Menipis';
                                    }
                                    return (
                                        <div className="flex justify-content-center">
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '3px',
                                                    backgroundColor: dotColor,
                                                    boxShadow: `0 1px 3px ${dotColor}66`,
                                                }}
                                                title={dotTitle}
                                            />
                                        </div>
                                    );
                                }}
                            />

                            <Column
                                field="kode_produk"
                                header="Kode"
                                sortable
                                headerStyle={{ fontWeight: 'bold', width: '7rem' }}
                                body={(r) => (
                                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 border-round text-xs">
                                        {r.kode_produk}
                                    </span>
                                )}
                            />
                            <Column
                                field="nama"
                                header="Nama Produk"
                                sortable
                                headerStyle={{ fontWeight: 'bold' }}
                                body={(r) => (
                                    <div>
                                        <span className="font-bold text-900 text-sm block">{r.nama}</span>
                                        <span className="text-xs text-500">{r.nama_kategori || 'Tanpa Kategori'}</span>
                                    </div>
                                )}
                            />

                            <Column
                                field="nama_supplier"
                                header="Supplier Rekanan"
                                body={(r) =>
                                    r.nama_supplier ? (
                                        <div>
                                            <span className="font-medium text-800 text-sm block">{r.nama_supplier}</span>
                                            <span className="text-xs text-500 font-mono">{r.kode_supplier}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-400 italic">Belum di-assign</span>
                                    )
                                }
                            />

                            <Column field="satuan" header="Satuan" className="text-xs" />
                            <Column
                                field="harga_beli"
                                header="Harga Beli"
                                body={(r) => <span className="text-xs font-medium text-700">{formatRupiah(r.harga_beli)}</span>}
                            />
                            <Column
                                field="harga_jual"
                                header="Harga Jual"
                                body={(r) => <span className="text-xs font-semibold text-green-700">{formatRupiah(r.harga_jual)}</span>}
                            />

                            {/* Stok Tersedia Badge */}
                            <Column
                                field="stok_tersedia"
                                header="Stok Tersedia"
                                headerStyle={{ textAlign: 'center' }}
                                bodyStyle={{ textAlign: 'center' }}
                                body={(r) => {
                                    let badgeBg = 'bg-green-100 text-green-800 border-green-300';
                                    if (r.status_stok === 'habis') {
                                        badgeBg = 'bg-red-500 text-white shadow-1';
                                    } else if (r.status_stok === 'menipis') {
                                        badgeBg = 'bg-orange-100 text-orange-900 border-orange-300';
                                    }
                                    return (
                                        <span
                                            className={`px-2.5 py-1 border-round-md text-xs font-bold inline-flex align-items-center gap-1 ${badgeBg}`}
                                        >
                                            {r.status_stok === 'habis' && <i className="pi pi-times-circle text-xs" />}
                                            {r.status_stok === 'menipis' && <i className="pi pi-exclamation-triangle text-xs" />}
                                            {r.stok_tersedia} {r.satuan}
                                        </span>
                                    );
                                }}
                            />

                            <Column
                                field="stok_minimum"
                                header="Buffer Min."
                                headerStyle={{ textAlign: 'center' }}
                                bodyStyle={{ textAlign: 'center' }}
                                body={(r) => <Tag value={`${r.stok_minimum} ${r.satuan}`} severity="warning" className="text-xs" />}
                            />

                            <Column
                                field="nilai_aset"
                                header="Nilai Aset"
                                headerStyle={{ textAlign: 'right' }}
                                bodyStyle={{ textAlign: 'right' }}
                                body={(r) => (
                                    <span className="text-xs font-bold text-900">{formatRupiah(r.nilai_aset)}</span>
                                )}
                            />

                            {/* Aksi Restock Cepat & Mutasi */}
                            <Column
                                header="Aksi"
                                align="center"
                                headerStyle={{ width: '8rem', textAlign: 'center' }}
                                body={(r) => (
                                    <div className="flex align-items-center justify-content-center gap-1">
                                        <Button
                                            icon="pi pi-cart-plus"
                                            outlined
                                            severity="info"
                                            className="p-button-sm border-round-md"
                                            onClick={() => handleOpenRestock(r)}
                                            tooltip="Restock dari Supplier"
                                            tooltipOptions={{ position: 'top' }}
                                        />
                                        <Button
                                            icon="pi pi-history"
                                            outlined
                                            severity="secondary"
                                            className="p-button-sm border-round-md"
                                            onClick={() => handleOpenProductMutasi(r)}
                                            tooltip="Kartu Mutasi Stok"
                                            tooltipOptions={{ position: 'top' }}
                                        />
                                    </div>
                                )}
                            />
                        </DataTable>
                    </TabPanel>

                    {/* ── TAB 2: RIWAYAT PURCHASE ORDER ── */}
                    <TabPanel header="Riwayat Restock & PO Supplier" leftIcon="pi pi-truck mr-2">
                        <DataTable
                            value={dataPo}
                            loading={loadingPo}
                            paginator
                            rows={rowsPo}
                            totalRecords={totalPoRecords}
                            lazy
                            first={(pagePo - 1) * rowsPo}
                            onPage={(e) => {
                                setPagePo((e.page || 0) + 1);
                                setRowsPo(e.rows);
                            }}
                            dataKey="kode_po"
                            className="p-datatable-sm"
                            emptyMessage="Belum ada riwayat transaksi Purchase Order."
                            responsiveLayout="scroll"
                            rowsPerPageOptions={[10, 25, 50]}
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Menampilkan {first} - {last} dari {totalPoRecords} data"
                            header={
                                <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                    <div>
                                        <span className="text-xl font-bold text-900 block">Riwayat Faktur & Purchase Order</span>
                                        <span className="text-xs text-500">Penerimaan pasokan produk dari rekanan supplier</span>
                                    </div>
                                    <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                                        <IconField iconPosition="left" className="w-full md:w-20rem">
                                            <InputIcon className="pi pi-search" />
                                            <InputText
                                                value={keywordPo}
                                                onChange={(e) => setKeywordPo(e.target.value)}
                                                placeholder="Cari Kode PO / Supplier..."
                                                className="w-full text-sm"
                                            />
                                        </IconField>
                                        <Button
                                            icon="pi pi-refresh"
                                            outlined
                                            severity="success"
                                            tooltip="Refresh Data"
                                            tooltipOptions={{ position: 'bottom' }}
                                            loading={loadingPo}
                                            onClick={loadPoData}
                                        />
                                    </div>
                                </div>
                            }
                        >
                            <Column
                                field="kode_po"
                                header="Nomor PO"
                                sortable
                                body={(r) => (
                                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 border-round text-xs">
                                        {r.kode_po}
                                    </span>
                                )}
                            />
                            <Column
                                field="tanggal_po"
                                header="Tanggal PO"
                                body={(r) => formatDateIndo(r.tanggal_po)}
                                className="text-xs text-600"
                            />
                            <Column
                                field="nama_supplier"
                                header="Supplier Rekanan"
                                body={(r) => (
                                    <div>
                                        <span className="font-semibold text-900 text-sm block">{r.nama_supplier}</span>
                                        <span className="text-xs text-500 font-mono">{r.kode_supplier}</span>
                                    </div>
                                )}
                            />
                            <Column
                                field="item_count"
                                header="Item Dibeli"
                                body={(r) => (
                                    <span className="text-xs text-700 font-medium">
                                        {r.items?.length || 0} macam barang
                                    </span>
                                )}
                            />
                            <Column
                                field="total_po"
                                header="Total Nominal"
                                body={(r) => <span className="font-bold text-green-700 text-sm">{formatRupiah(r.total_po)}</span>}
                            />
                            <Column
                                field="status"
                                header="Status"
                                body={(r) => (
                                    <Tag
                                        value={String(r.status || 'DITERIMA').toUpperCase()}
                                        severity="success"
                                        className="text-xs font-bold uppercase"
                                    />
                                )}
                            />
                            <Column field="created_by" header="Operator" className="text-xs text-500" />
                            <Column
                                header="Rincian"
                                align="center"
                                body={(r) => (
                                    <Button
                                        label="Rincian"
                                        icon="pi pi-eye"
                                        size="small"
                                        outlined
                                        severity="info"
                                        className="text-xs py-1 px-2 border-round-md"
                                        onClick={() => handleViewPoDetail(r)}
                                    />
                                )}
                            />
                        </DataTable>
                    </TabPanel>

                    {/* ── TAB 3: LOG MUTASI STOK ── */}
                    <TabPanel header="Log Mutasi Stok" leftIcon="pi pi-list mr-2">
                        <DataTable
                            value={dataMutasi}
                            loading={loadingMutasi}
                            paginator
                            rows={rowsMutasi}
                            totalRecords={totalMutasiRecords}
                            lazy
                            first={(pageMutasi - 1) * rowsMutasi}
                            onPage={(e) => {
                                setPageMutasi((e.page || 0) + 1);
                                setRowsMutasi(e.rows);
                            }}
                            dataKey="id"
                            className="p-datatable-sm"
                            emptyMessage="Belum ada riwayat mutasi stok tercatat."
                            responsiveLayout="scroll"
                            rowsPerPageOptions={[10, 25, 50]}
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Menampilkan {first} - {last} dari {totalMutasiRecords} data"
                            header={
                                <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                    <div>
                                        <span className="text-xl font-bold text-900 block">Kartu Audit Mutasi Stok Fisik</span>
                                        <span className="text-xs text-500">Pencatatan riwayat penambahan, pengurangan, dan penyesuaian stok</span>
                                    </div>
                                    <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                        <Dropdown
                                            value={filterJenisMutasi}
                                            options={[
                                                { label: 'Semua Mutasi', value: '' },
                                                { label: 'Stok Masuk', value: 'masuk' },
                                                { label: 'Stok Keluar', value: 'keluar' },
                                                { label: 'Penyesuaian', value: 'penyesuaian' },
                                            ]}
                                            onChange={(e) => setFilterJenisMutasi(e.value)}
                                            placeholder="Jenis Mutasi"
                                            className="p-inputtext-sm text-sm border-round-md w-full md:w-11rem"
                                        />
                                        <IconField iconPosition="left" className="w-full md:w-16rem">
                                            <InputIcon className="pi pi-search" />
                                            <InputText
                                                value={keywordMutasi}
                                                onChange={(e) => setKeywordMutasi(e.target.value)}
                                                placeholder="Cari Kode / Produk / Ref..."
                                                className="w-full text-sm"
                                            />
                                        </IconField>
                                        <Button
                                            icon="pi pi-refresh"
                                            outlined
                                            severity="success"
                                            tooltip="Refresh Data"
                                            tooltipOptions={{ position: 'bottom' }}
                                            loading={loadingMutasi}
                                            onClick={loadMutasiData}
                                        />
                                    </div>
                                </div>
                            }
                        >
                            <Column
                                field="created_at"
                                header="Waktu & Tanggal"
                                body={(r) => formatDateTimeIndo(r.created_at || r.tanggal)}
                                className="text-xs text-500 font-medium"
                            />
                            <Column field="kode_stok_movement" header="Kode Mutasi" className="text-xs font-bold text-700" />
                            <Column
                                header="Produk"
                                body={(r) => (
                                    <div>
                                        <span className="font-semibold text-900 text-xs block">{r.nama_produk || r.kode_produk}</span>
                                        <span className="text-[11px] text-500">{r.kode_produk}</span>
                                    </div>
                                )}
                            />
                            <Column
                                field="jenis_movement"
                                header="Jenis"
                                body={(r) => {
                                    let sev: 'success' | 'danger' | 'warning' = 'info' as any;
                                    if (r.jenis_movement === 'masuk') sev = 'success';
                                    else if (r.jenis_movement === 'keluar') sev = 'danger';
                                    else if (r.jenis_movement === 'penyesuaian') sev = 'warning';
                                    return (
                                        <Tag
                                            value={String(r.jenis_movement || 'MASUK').toUpperCase()}
                                            severity={sev}
                                            className="text-[10px] font-bold"
                                        />
                                    );
                                }}
                            />
                            <Column
                                field="qty"
                                header="Perubahan"
                                body={(r) => (
                                    <span
                                        className={`font-bold text-xs ${
                                            r.jenis_movement === 'masuk'
                                                ? 'text-green-700'
                                                : r.jenis_movement === 'keluar'
                                                ? 'text-red-600'
                                                : 'text-amber-600'
                                        }`}
                                    >
                                        {r.jenis_movement === 'masuk' ? `+${r.qty}` : r.jenis_movement === 'keluar' ? `-${r.qty}` : `${r.qty}`} {r.satuan || ''}
                                    </span>
                                )}
                            />
                            <Column
                                header="Sebelum"
                                body={(r) => <span className="text-xs text-500">{r.stok_sebelum} {r.satuan || ''}</span>}
                            />
                            <Column
                                header="Sesudah"
                                body={(r) => <span className="text-xs font-bold text-800">{r.stok_sesudah} {r.satuan || ''}</span>}
                            />
                            <Column field="referensi" header="No. Referensi / PO" className="text-xs font-mono text-primary font-bold" />
                            <Column field="created_by" header="Operator" className="text-xs text-500" />
                        </DataTable>
                    </TabPanel>
                </TabView>
            </div>

            {/* =========================================================
                MODAL 1: BELI PRODUK BARU DARI SUPPLIER
                ========================================================= */}
            <Dialog
                header="Pengadaan / Beli Produk Baru dari Supplier"
                visible={dialogBeliBaruVisible}
                style={{ width: '600px' }}
                modal
                onHide={() => setDialogBeliBaruVisible(false)}
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div className="p-2 border-round surface-100 text-xs text-color-secondary flex align-items-center gap-2">
                        <i className="pi pi-info-circle text-primary text-sm" />
                        <span>Form ini akan menambahkan produk baru ke katalog dan otomatis mencatat pembelian stok awal ke supplier.</span>
                    </div>

                    {/* Pilih Supplier */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Supplier Rekanan *</label>
                        <Dropdown
                            value={formBeliBaru.kode_supplier}
                            options={supplierList}
                            onChange={(e) => setFormBeliBaru({ ...formBeliBaru, kode_supplier: e.value })}
                            placeholder="Pilih Supplier"
                            className="w-full text-sm"
                            filter
                        />
                    </div>

                    {/* Kategori & Nama Produk */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Kategori Produk *</label>
                            <Dropdown
                                value={formBeliBaru.kode_kategori_produk}
                                options={kategoriList}
                                onChange={(e) => setFormBeliBaru({ ...formBeliBaru, kode_kategori_produk: e.value })}
                                placeholder="Pilih Kategori"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Satuan Produk *</label>
                            <InputText
                                value={formBeliBaru.satuan}
                                onChange={(e) => setFormBeliBaru({ ...formBeliBaru, satuan: e.target.value })}
                                placeholder="Pcs, Botol, Tube, Box"
                                className="w-full text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Produk Baru *</label>
                        <InputText
                            value={formBeliBaru.nama}
                            onChange={(e) => setFormBeliBaru({ ...formBeliBaru, nama: e.target.value })}
                            placeholder="Contoh: Serum Vitamin C Glowing 30ml"
                            className="w-full text-sm"
                        />
                    </div>

                    {/* Harga Beli & Harga Jual */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Harga Beli Satuan (Modal) *</label>
                            <InputNumber
                                value={formBeliBaru.harga_beli}
                                onValueChange={(e) => setFormBeliBaru({ ...formBeliBaru, harga_beli: e.value ?? 0 })}
                                mode="currency"
                                currency="IDR"
                                locale="id-ID"
                                className="w-full text-sm"
                                min={0}
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Harga Jual ke Pasien *</label>
                            <InputNumber
                                value={formBeliBaru.harga_jual}
                                onValueChange={(e) => setFormBeliBaru({ ...formBeliBaru, harga_jual: e.value ?? 0 })}
                                mode="currency"
                                currency="IDR"
                                locale="id-ID"
                                className="w-full text-sm"
                                min={0}
                            />
                        </div>
                    </div>

                    {/* Qty Beli & Stok Min */}
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label className="block text-sm font-semibold mb-1">Jumlah Beli (Qty) *</label>
                            <InputNumber
                                value={formBeliBaru.qty_beli}
                                onValueChange={(e) => setFormBeliBaru({ ...formBeliBaru, qty_beli: e.value ?? 1 })}
                                className="w-full text-sm"
                                min={1}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-sm font-semibold mb-1">Batas Buffer Min. *</label>
                            <InputNumber
                                value={formBeliBaru.stok_minimum}
                                onValueChange={(e) => setFormBeliBaru({ ...formBeliBaru, stok_minimum: e.value ?? 5 })}
                                className="w-full text-sm"
                                min={0}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-sm font-semibold mb-1">Tanggal Pembelian</label>
                            <InputText
                                type="date"
                                value={formBeliBaru.tanggal}
                                onChange={(e) => setFormBeliBaru({ ...formBeliBaru, tanggal: e.target.value })}
                                className="w-full text-sm"
                            />
                        </div>
                    </div>

                    {/* No. Batch & Tanggal Kadaluarsa */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">No. Batch</label>
                            <InputText
                                value={formBeliBaru.no_batch}
                                onChange={(e) => setFormBeliBaru({ ...formBeliBaru, no_batch: e.target.value })}
                                placeholder="misal: BTH-2026-001"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Tanggal Kadaluarsa</label>
                            <InputText
                                type="date"
                                value={formBeliBaru.tanggal_kadaluarsa}
                                onChange={(e) => setFormBeliBaru({ ...formBeliBaru, tanggal_kadaluarsa: e.target.value })}
                                className="w-full text-sm"
                            />
                        </div>
                    </div>

                    {/* Banner Total Transaksi PO */}
                    <div className="border-1 border-green-300 bg-green-50 border-round-lg p-3 flex justify-content-between align-items-center">
                        <div>
                            <span className="text-xs text-green-700 font-bold block uppercase">Total Nilai Pembelian (PO)</span>
                            <span className="text-xs text-green-600">
                                {formBeliBaru.qty_beli} {formBeliBaru.satuan} &times; {formatRupiah(formBeliBaru.harga_beli)}
                            </span>
                        </div>
                        <div className="text-xl font-black text-green-900">
                            {formatRupiah((formBeliBaru.qty_beli || 0) * (formBeliBaru.harga_beli || 0))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogBeliBaruVisible(false)} />
                    <Button
                        label="Simpan Pengadaan"
                        icon="pi pi-check"
                        loading={savingBeliBaru}
                        onClick={handleSaveBeliBaru}
                        className="bg-primary border-none"
                    />
                </div>
            </Dialog>

            {/* =========================================================
                MODAL 2: RESTOCK PRODUK LAMA DARI SUPPLIER
                ========================================================= */}
            <Dialog
                header="Restock Stok Produk dari Supplier"
                visible={dialogRestockVisible}
                style={{ width: '560px' }}
                modal
                onHide={() => setDialogRestockVisible(false)}
            >
                <div className="flex flex-column gap-3 pt-2">
                    {/* Pilih Produk */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Pilih Produk *</label>
                        <Dropdown
                            value={formRestock.kode_produk}
                            options={(allProdukList.length > 0 ? allProdukList : dataProduk).map((p) => ({
                                label: `${p.nama} (${p.kode_produk}) - Sisa: ${p.stok_tersedia} ${p.satuan}`,
                                value: p.kode_produk,
                            }))}
                            onChange={(e) => handleSelectRestockProdukChange(e.value)}
                            placeholder="Cari & Pilih Produk"
                            className="w-full text-sm"
                            filter
                        />
                    </div>

                    {/* Preview Info Produk Terpilih */}
                    {selectedRestockProduk && (
                        <div className="surface-100 border-round-lg p-3 grid m-0 text-xs">
                            <div className="col-4">
                                <span className="text-500 block">Sisa Stok Fisik:</span>
                                <span className="font-bold text-900 text-sm">
                                    {selectedRestockProduk.stok_tersedia} {selectedRestockProduk.satuan}
                                </span>
                            </div>
                            <div className="col-4">
                                <span className="text-500 block">Harga Beli Lama:</span>
                                <span className="font-bold text-700">
                                    {formatRupiah(selectedRestockProduk.harga_beli)}
                                </span>
                            </div>
                            <div className="col-4">
                                <span className="text-500 block">Supplier Default:</span>
                                <span className="font-bold text-primary">
                                    {selectedRestockProduk.nama_supplier || 'Belum ada'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Pilih Supplier Rekanan */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Supplier Rekanan *</label>
                        <Dropdown
                            value={formRestock.kode_supplier}
                            options={supplierList}
                            onChange={(e) => setFormRestock({ ...formRestock, kode_supplier: e.value })}
                            placeholder="Pilih Supplier"
                            className="w-full text-sm"
                            filter
                        />
                    </div>

                    {/* Input Jumlah Restock & Harga Beli */}
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Jumlah Unit Restock *</label>
                            <InputNumber
                                value={formRestock.qty_masuk}
                                onValueChange={(e) => setFormRestock({ ...formRestock, qty_masuk: e.value ?? 1 })}
                                className="w-full text-sm"
                                min={1}
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Harga Beli Satuan (Rp) *</label>
                            <InputNumber
                                value={formRestock.harga_beli}
                                onValueChange={(e) => setFormRestock({ ...formRestock, harga_beli: e.value ?? 0 })}
                                mode="currency"
                                currency="IDR"
                                locale="id-ID"
                                className="w-full text-sm"
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="flex align-items-center gap-2 mt-1">
                        <Checkbox
                            inputId="chkUpdateHarga"
                            checked={formRestock.update_harga_beli_master}
                            onChange={(e) => setFormRestock({ ...formRestock, update_harga_beli_master: e.checked ?? true })}
                        />
                        <label htmlFor="chkUpdateHarga" className="text-xs text-700 cursor-pointer">
                            Perbarui harga beli master produk dengan harga restock ini
                        </label>
                    </div>

                    {/* No. Batch & Tanggal Kadaluarsa Restock */}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">No. Batch (Opsional)</label>
                            <InputText
                                value={formRestock.no_batch}
                                onChange={(e) => setFormRestock({ ...formRestock, no_batch: e.target.value })}
                                placeholder="misal: BTH-2026-002"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Tanggal Kadaluarsa (Opsional)</label>
                            <InputText
                                type="date"
                                value={formRestock.tanggal_kadaluarsa}
                                onChange={(e) => setFormRestock({ ...formRestock, tanggal_kadaluarsa: e.target.value })}
                                className="w-full text-sm"
                            />
                        </div>
                    </div>

                    {/* Tanggal Restock */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Tanggal Transaksi Restock</label>
                        <InputText
                            type="date"
                            value={formRestock.tanggal}
                            onChange={(e) => setFormRestock({ ...formRestock, tanggal: e.target.value })}
                            className="w-full text-sm"
                        />
                    </div>

                    {/* Kalkulasi Restock */}
                    <div className="border-1 border-blue-200 bg-blue-50 border-round-lg p-3">
                        <div className="flex justify-content-between align-items-center mb-2">
                            <span className="text-xs text-blue-700 font-bold uppercase">Stok Baru Setelah Restock</span>
                            <span className="text-base font-black text-blue-900">
                                {(Number(selectedRestockProduk?.stok_tersedia) || 0) + (Number(formRestock.qty_masuk) || 0)}{' '}
                                {selectedRestockProduk?.satuan || 'unit'}
                            </span>
                        </div>
                        <Divider className="my-2" />
                        <div className="flex justify-content-between align-items-center">
                            <span className="text-xs text-blue-700 font-bold uppercase">Total Tagihan PO Restock</span>
                            <span className="text-lg font-black text-blue-900">
                                {formatRupiah((formRestock.qty_masuk || 0) * (formRestock.harga_beli || 0))}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogRestockVisible(false)} />
                    <Button
                        label="Konfirmasi Restock"
                        icon="pi pi-check"
                        loading={savingRestock}
                        onClick={handleSaveRestock}
                        className="bg-primary border-none"
                    />
                </div>
            </Dialog>

            {/* =========================================================
                MODAL 3: DETAIL ITEM PURCHASE ORDER (PO)
                ========================================================= */}
            <Dialog
                header={`Rincian Faktur PO: ${selectedPoDetail?.kode_po || ''}`}
                visible={dialogPoDetailVisible}
                style={{ width: '650px' }}
                modal
                onHide={() => setDialogPoDetailVisible(false)}
            >
                {selectedPoDetail && (
                    <div className="flex flex-column gap-3">
                        <div className="surface-100 border-round-lg p-3 grid m-0 text-xs">
                            <div className="col-6">
                                <span className="text-500 block">Supplier:</span>
                                <span className="font-bold text-900 text-sm">{selectedPoDetail.nama_supplier}</span>
                                <span className="text-500 block">{selectedPoDetail.kode_supplier}</span>
                            </div>
                            <div className="col-3">
                                <span className="text-500 block">Tanggal:</span>
                                <span className="font-bold text-700">{formatDateIndo(selectedPoDetail.tanggal_po)}</span>
                            </div>
                            <div className="col-3">
                                <span className="text-500 block">Status:</span>
                                <Tag value={String(selectedPoDetail.status || 'DITERIMA').toUpperCase()} severity="success" />
                            </div>
                        </div>

                        <DataTable
                            value={selectedPoDetail.items || []}
                            className="p-datatable-sm mt-2"
                            emptyMessage="Tidak ada item pada PO ini."
                        >
                            <Column field="kode_produk" header="Kode" className="text-xs font-bold text-primary" />
                            <Column field="nama_produk" header="Nama Produk" className="text-xs font-semibold" />
                            <Column
                                field="qty"
                                header="Qty"
                                align="center"
                                body={(r) => <span className="text-xs font-bold">{r.qty} {r.satuan}</span>}
                            />
                            <Column
                                field="harga_satuan"
                                header="Harga Satuan"
                                align="right"
                                body={(r) => <span className="text-xs">{formatRupiah(r.harga_satuan)}</span>}
                            />
                            <Column
                                field="subtotal"
                                header="Subtotal"
                                align="right"
                                body={(r) => <span className="text-xs font-bold text-green-700">{formatRupiah(r.subtotal)}</span>}
                            />
                        </DataTable>

                        <div className="flex justify-content-between align-items-center surface-card p-3 border-round-lg border-1 border-200">
                            <span className="font-bold text-sm text-700 uppercase">Total Pembayaran PO</span>
                            <span className="font-black text-xl text-green-800">{formatRupiah(selectedPoDetail.total_po)}</span>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* =========================================================
                MODAL 4: KARTU MUTASI KHUSUS PER PRODUK
                ========================================================= */}
            <Dialog
                header={`Kartu Riwayat Mutasi: ${productMutasiTarget?.nama || ''} (${productMutasiTarget?.kode_produk || ''})`}
                visible={dialogProductMutasiVisible}
                style={{ width: '700px' }}
                modal
                onHide={() => setDialogProductMutasiVisible(false)}
            >
                <DataTable
                    value={productMutasiList}
                    loading={loadingProductMutasi}
                    paginator
                    rows={10}
                    className="p-datatable-sm"
                    emptyMessage="Belum ada riwayat mutasi untuk produk ini."
                >
                    <Column
                        field="created_at"
                        header="Waktu"
                        body={(r) => formatDateTimeIndo(r.created_at || r.tanggal)}
                        className="text-xs text-500"
                    />
                    <Column
                        field="jenis_movement"
                        header="Jenis"
                        body={(r) => (
                            <Tag
                                value={String(r.jenis_movement || 'MASUK').toUpperCase()}
                                severity={
                                    r.jenis_movement === 'masuk'
                                        ? 'success'
                                        : r.jenis_movement === 'keluar'
                                        ? 'danger'
                                        : 'warning'
                                }
                                className="text-[10px]"
                            />
                        )}
                    />
                    <Column
                        header="Perubahan"
                        body={(r) => (
                            <span
                                className={`text-xs font-bold ${
                                    r.jenis_movement === 'masuk' ? 'text-green-700' : 'text-red-600'
                                }`}
                            >
                                {r.jenis_movement === 'masuk' ? `+${r.qty}` : `-${r.qty}`}
                            </span>
                        )}
                    />
                    <Column field="stok_sebelum" header="Sebelum" className="text-xs" />
                    <Column field="stok_sesudah" header="Sesudah" className="text-xs font-bold text-900" />
                    <Column field="referensi" header="Referensi / PO" className="text-xs font-mono text-primary" />
                    <Column field="created_by" header="Operator" className="text-xs text-500" />
                </DataTable>
            </Dialog>
        </div>
    );
};

export default Page;
