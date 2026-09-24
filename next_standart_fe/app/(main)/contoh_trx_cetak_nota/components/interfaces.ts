import { FilterMatchMode } from 'primereact/api';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';
import { DataTableStateEvent } from 'primereact/datatable';
import { DataRekap } from '@/types/print-tools';

// Interface opsi master data pendukung dropdown (Gudang & Staff)
export interface WarehousesData {
    kode: string;
    keterangan: string;
}

export interface StaffData {
    kode: string;
    keterangan: string;
}

// ==========================================
// 1. DATA VALUE UNTUK TRANSAKSI FORM (FORMIK)
// ==========================================
export interface InitValue {
    faktur?: string;
    faktur_kirim?: string;
    tanggal_transaksi: string | Date;
    dari_gudang: string;
    dari_gudang_nama?: string;
    ke_gudang: string;
    ke_gudang_nama?: string;
    dikirim_oleh: string;
    dikirim_oleh_nama?: string;
    diterima_oleh: string;
    diterima_oleh_nama?: string;

    tz: string;
    // Array baris barang mutasi
    detail: DetailData[];
}

export interface DetailData {
    no?: number;
    barcode: string; // Relasi ke mst_barang.barcode
    kode_barang: string; // Relasi ke mst_barang.kode
    nama_barang: string;
    satuan: string;
    sisa_stok: number;
    qty_kirim: number;
    qty_terima?: number;
}

// ==========================================
// 2. DATA VALUE UNTUK LIST VIEW DATATABLE (TABEL UTAMA)
// ==========================================
export interface TableData {
    no: number;
    faktur: string;
    tanggal_transaksi: string;
    kode_gudang_kirim: string;
    ket_gudang_kirim: string;
    kode_gudang_terima: string;
    ket_gudang_terima: string;
    petugas_kirim: string;
    petugas_terima: string;
    status_penerimaan: 'Sudah Diterima' | 'Belum Diterima' | string;
    faktur_terima?: string; // Menyambungkan relasi BK -> BA jika sudah diterima
    username_operator: string;
    allow_update: boolean; // Flag hak akses edit transaksi
    allow_delete: boolean; // Flag hak akses hapus transaksi
}

// ==========================================
// 3. STATE MANAGEMENT UTAMA (PAGE ORCHESTRATOR)
// ==========================================
export interface State {
    load: boolean;
    activeTab: 0 | 1; // 0 = Kirim Stock (BK), 1 = Terima Stock (BA)
    add: boolean;
    edit: boolean;
    filterLoad: boolean;
    delete: boolean;
    selectedDatas: TableData[];
    dataNota: InitValue | null;
    data: TableData[];

    searchVal: string;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
    submittedData: InitValue | null;

    // Filter Atas Adaptif (List View)
    tanggalAwal: string | Date;
    tanggalAkhir: string | Date;

    selectedGudangKirim: string | null;
    selectedGudangTerima: string | null;
    gudangOptions: WarehousesData[];
    gudangsLoad: boolean;

    selectedPetugasKirim: string | null;
    selectedNamaPetugasKirim?: string | null;
    selectedPetugasTerima: string | null;
    selectedNamaPetugasTerima?: string | null;
    petugasOptions: StaffData[];
    petugasLoad: boolean;

    jenisMutasi: string | null;
    // Parameter DataTable Lazy-Load Server-side Pagination
    first: number;
    rows: number;
    page: number;
    keyword: string;
    totalRecords: number;
    sortField: string;
    sortOrder: string;

    // Dialog & Modal Control
    showItemDialog: boolean;
    showFakturKirimDialog: boolean;
    showGudangDialog: boolean;
    showPetugasDialog: boolean;
    showProductDialog: boolean; // Dialog cari produk (F9)
    showSlipPrintDialog: boolean; // Dialog slip mutasi kecil/besar

    whichGudangTarget: 'kirim' | 'terima';
    whichPetugasTarget: 'kirim' | 'terima';

    // Slip PDF data url
    pdfUrl: string;
    fileName: string;
    slipFaktur: string;
}

// ==========================================
// 4. PROPS DEFINISI ANTAR KOMPONEN
// ==========================================
export interface BaseProps {
    getDropdownData?: (apiEndpoint: string, dataKey: keyof State, loadKey: keyof State) => Promise<void>;
}

export interface TableProps extends BaseProps {
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: RefObject<Toast>;
    formik: FormikProps<InitValue>;
    getData: () => Promise<void>;
    getPrintData: () => Promise<void>;
    onLazyLoad: (event: DataTableStateEvent) => void;
    getFilterData: (apiEndpoint: string, dataKey: keyof State) => Promise<void>;
}

export interface FormProps extends BaseProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<InitValue>;
    toast: RefObject<Toast>;
    getData: () => Promise<void>;
}

// ==========================================
// 5. CONFIG PRINT LAPORAN & FORMATTER
// ==========================================
export const HEADER_CONFIG_KIRIM = {
    faktur: 'FAKTUR',
    tanggal_transaksi: 'TANGGAL',
    ket_gudang_kirim: 'GUDANG ASAL',
    ket_gudang_terima: 'GUDANG TUJUAN',
    petugas_kirim: 'PETUGAS KIRIM',
    status_penerimaan: 'STATUS',
    faktur_terima: 'FAKTUR PENERIMA',
    username_operator: 'OPERATOR'
};

export const HEADER_CONFIG_TERIMA = {
    faktur: 'FAKTUR RECEIPT',
    tanggal_transaksi: 'TANGGAL',
    faktur_terima: 'FAKTUR KIRIM ASAL',
    ket_gudang_kirim: 'GUDANG ASAL',
    ket_gudang_terima: 'GUDANG TUJUAN',
    petugas_terima: 'PETUGAS PENERIMA',
    username_operator: 'OPERATOR'
};

export const FORMATTER_CONFIG_MUTASI = {
    // tanggal_transaksitanggal: (val: string) => {
    //     if (!val) return '-';
    //     const d = new Date(val);
    //     return isNaN(d.getTime()) ? val : d.toLocaleDateString('id-ID');
    // }
};