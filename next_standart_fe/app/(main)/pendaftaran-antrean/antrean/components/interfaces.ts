import { Toast } from 'primereact/toast';
import { RefObject } from 'react';

export interface AntrianLayananData {
    id: number;
    kode_antrian_layanan: string;
    kode_kunjungan: string;
    nomor_antrian: string;
    jenis_layanan: string;
    kode_layanan: string;
    status: 'menunggu' | 'dipanggil' | 'selesai' | 'batal' | string;
    dipanggil_at: string | null;
    selesai_at: string | null;
    created_at: string;
    no_rm: string;
    jam_datang: string;
    nama_pasien: string;
    no_hp: string;
    nama_layanan: string;
    kode_ruangan?: string;
    nama_ruangan?: string;
    kode_antrian_asal?: string | null;
    lanjut_ke_tindakan?: number | boolean | null;
    jumlah_sesi_paket?: number | null;
    hasil_form?: string | null;
    catatan_petugas?: string | null;
    kode_karyawan?: string | null;
    nama_petugas?: string | null;
    jabatan_petugas?: string | null;
    kelurahan_desa?: string | null;
    kode_booking?: string | null;
    booking_no_sip?: string | null;
    booking_nama_petugas?: string | null;
    booking_jabatan_petugas?: string | null;
    booking_tanggal_booking?: string | null;
    booking_hari?: string | null;
    booking_jam_mulai?: string | null;
    booking_jam_selesai?: string | null;
    booking_kode_ruangan?: string | null;
    booking_is_penanggung_jawab?: number | boolean | null;
    booking_petugas_pendamping?: Array<{
        kode_jadwal: string;
        no_sip: string;
        nama_petugas: string;
        jabatan_petugas?: string;
    }>;
    rekomendasi_produk_dokter?: Array<{
        kode_produk: string;
        nama_produk: string;
        harga: number;
        qty: number;
        subtotal: number;
        satuan?: string;
        foto?: string | null;
    }>;
}

export interface RuanganFormField {
    id?: number;
    kode_ruangan: string;
    label_field: string;
    tipe_field: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'upload_foto' | string;
    options?: string | null;
    is_required?: boolean | number;
    urutan?: number;
}

export interface State {
    load: boolean;
    loadGrid: boolean;
    data: AntrianLayananData[];
    gridData: AntrianLayananData[];
    searchVal: string;
    filters: any;
    session: any;
    first: number;
    rows: number;
    page: number;
    keyword: string;
    totalData: number;
    sortField: string;
    sortOrder: string;
    activeTab: number;
    autoRefresh: boolean;
    filterJenis: string;
}

export interface GridPanggilLayananProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: RefObject<Toast>;
    getGridData: () => Promise<void>;
    mode?: 'layanan' | 'paket' | 'all';
}

export interface TableAntrianLayananProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: RefObject<Toast>;
    getData: (endpoint: string) => Promise<void>;
    getGridData: () => Promise<void>;
    onLazyLoad: (event: any) => void;
}
