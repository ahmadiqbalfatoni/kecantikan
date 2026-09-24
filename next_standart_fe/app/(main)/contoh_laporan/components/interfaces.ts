import { RefObject } from 'react';
import { Toast } from 'primereact/toast';
import { FilterMatchMode } from 'primereact/api';
import { Session } from 'next-auth';
import { DataRekap } from '@/types/print-tools';
import { DataTableStateEvent } from 'primereact/datatable';
import { formatCurrency } from '@/lib/tools/generalTools';
import { formatDateSystem } from '@/lib/tools/dateTools';

// ==========================================
// 1. DATA MODEL (ROW REPRESENTATION)
// ==========================================
export interface TableData {
    no: string;
    id: number;
    kode: string;
    kode_induk: string | null;
    kode_pelanggan: string;
    nama_pelanggan: string; // Hasil join database
    kode_teknisi: string | null;
    nama_teknisi: string; // Hasil join database
    model_perangkat: string;
    imei_sn: string;
    status_fisik: 'ditinggal' | 'dibawa_pulang';
    keluhan_awal: string;
    diagnosa_teknisi: string | null;
    kategori_servis: string;
    masa_garansi_hari: number;

    // Status & Kategori
    status: 'menunggu' | 'pengecekan' | 'pengerjaan' | 'menunggu_suku_cadang' | 'selesai' | 'diambil' | 'batal';
    jenis_tiket: 'reguler' | 'garansi';

    // Quality Control (0 = Fail/No, 1 = Pass/Yes)
    qc_audio: '0' | '1';
    qc_charger: '0' | '1';
    qc_kamera: '0' | '1';
    qc_lcd: '0' | '1';
    qc_sinyal: '0' | '1';
    qc_tombol: '0' | '1';

    // Biaya & Keuangan
    total_biaya_suku_cadang: number;
    total_biaya_jasa: number;
    subtotal: number;
    diskon_persen: number;
    diskon_nominal: number;
    pajak_persen: number;
    pajak_nominal: number;
    grandtotal: number;
    status_pembayaran: 'belum_bayar' | 'sebagian' | 'lunas';

    // Audit trail
    tz: string;
    created_by: string;
    created_by_fullname: string; // Hasil join database
    created_at: string;
    updated_by: string | null;
    updated_at: string | null;
}

// Option interface untuk Dropdown/MultiSelect filter dinamis
export interface DropdownOption {
    label: string;
    value: string;
}

// ==========================================
// 2. STATE MANAGEMENT UTAMA
// ==========================================
export interface State {
    load: boolean;
    data: TableData[];
    searchVal: string;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;

    // Filter Periode List View
    tanggalAwal: string | Date;
    tanggalAkhir: string | Date;

    // Filter MultiSelect & Dropdown yang diminta
    selectedStatus: string[] | null;        // Filter Status Tiket ('menunggu', 'pengecekan', dll)
    selectedJenisTiket: string | null;      // Filter Jenis Tiket Dropdown ('Reguler', 'Garansi', 'Premium')
    selectedPembayaran: string | null;      // Filter Status Pembayaran Dropdown ('Belum Bayar', 'DP', 'Lunas')

    // Dropdown / Master data load options (untuk filter dinamis)
    teknisiLoad: boolean;
    showTeknisi: boolean;
    ketTeknisi?: string;
    selectedTeknisi: string | null;         // Filter Teknisi Dropdown ('TEK001', dst)

    optionsStatus?: DropdownOption[];
    optionsJenisTiket?: DropdownOption[];
    optionsPembayaran?: DropdownOption[];
    optionsTeknisi?: DropdownOption[];

    // Pagination & Sorting State (Lazy Loading)
    first: number;
    rows: number;
    page: number;
    keyword: string;
    totalData: number;
    sortField: string;
    sortOrder: string;

    filterLoad: boolean;

    // Aggregasi Total untuk Footer Data Table / Laporan Ringkas
    dataTotals: {
        total_biaya_suku_cadang: number;
        total_biaya_jasa: number;
        subtotal: number;
        diskon_nominal: number;
        pajak_nominal: number;
        grandtotal: number;
    };

    // Detailing
    selectedData: TableData | null;
    showDetail: boolean;
}

// ==========================================
// 3. COMPONENT PROPS INTERFACES
// ==========================================
export interface BaseProps {
    getDropdownData: (apiEndpoint: string, dataKey: keyof State, loadKey: keyof State) => Promise<void>;
}

export interface TableProps extends BaseProps {
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
    getPrintData: (apiEndpoint: string) => Promise<void>;
    onLazyLoad: (event: DataTableStateEvent) => void;
    getFilterData: (apiEndpoint: string, dataKey: keyof State) => Promise<void>;
}

// ==========================================
// 4. HEADER CONFIGURATION (KOLOM EXPORT/PRINT)
// ==========================================
export const HEADER_CONFIG = {
    kode: 'KODE TIKET',
    created_at: 'TANGGAL MASUK',
    nama_pelanggan: 'PELANGGAN',
    nama_teknisi: 'TEKNISI',
    model_perangkat: 'PERANGKAT',
    status: 'STATUS SERVIS',
    jenis_tiket: 'JENIS TIKET',
    total_biaya_suku_cadang: 'BIAYA SPAREPART',
    total_biaya_jasa: 'BIAYA JASA',
    subtotal: 'SUBTOTAL',
    diskon_nominal: 'DISKON',
    pajak_nominal: 'PAJAK',
    grandtotal: 'GRAND TOTAL',
    status_pembayaran: 'PEMBAYARAN',
    created_by_fullname: 'KASIR / PENERIMA'
};

// ==========================================
// 5. VALUE FORMATTER CONFIGURATION
// ==========================================
export const FORMATTER_CONFIG = {
    total_biaya_suku_cadang: (val: number) => (val !== undefined && val !== null ? formatCurrency(val) : 'Rp 0'),
    total_biaya_jasa: (val: number) => (val !== undefined && val !== null ? formatCurrency(val) : 'Rp 0'),
    subtotal: (val: number) => (val !== undefined && val !== null ? formatCurrency(val) : 'Rp 0'),
    diskon_nominal: (val: number) => (val !== undefined && val !== null ? formatCurrency(val) : 'Rp 0'),
    pajak_nominal: (val: number) => (val !== undefined && val !== null ? formatCurrency(val) : 'Rp 0'),
    grandtotal: (val: number) => (val !== undefined && val !== null ? formatCurrency(val) : 'Rp 0'),
    created_at: (val: string) => (val ? formatDateSystem(val) : '-')
};