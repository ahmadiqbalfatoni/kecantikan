'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Toast } from 'primereact/toast';
import { FilterMatchMode } from 'primereact/api';
import { DataTableStateEvent } from 'primereact/datatable';

import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';
import { formatDateSystem } from '@/lib/tools/dateTools';
import { transformTableData } from '@/lib/tools/printTools/transformData';
import { DataRekap } from '@/types/print-tools';

import { apiEndpointGet } from './components/endpoints';
import { FORMATTER_CONFIG, HEADER_CONFIG, State } from './components/interfaces';
import Table from './components/display/table';
import Print from './components/display/print';

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = now;

    // State manajemen utama disesuaikan untuk Laporan Operasional Service
    const [state, setState] = useState<State>({
        load: false,
        data: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        tanggalAwal: defaultStart,
        tanggalAkhir: defaultEnd,

        // Filter Dropdown & MultiSelect Khusus Service
        selectedStatus: null,
        selectedJenisTiket: null,
        selectedPembayaran: null,
        selectedTeknisi: null,
        showTeknisi: false,

        teknisiLoad: false,

        // State Pagination & Sorting
        first: 0,
        rows: 10,
        page: 1,
        keyword: '',
        totalData: 0,
        sortField: 'created_at',
        sortOrder: 'desc',

        filterLoad: false,

        // Akumulasi Finansial Laporan Service
        dataTotals: {
            total_biaya_suku_cadang: 0,
            total_biaya_jasa: 0,
            subtotal: 0,
            diskon_nominal: 0,
            pajak_nominal: 0,
            grandtotal: 0,
        },
        selectedData: null,
        showDetail: false,
    });

    // Ambil opsi filter dari backend saat halaman dimuat
    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const res = await postData('/contoh/laporan/laporan-data/options', {});
                if (res?.data?.data) {
                    setState((p) => ({
                        ...p,
                        optionsStatus: res.data.data.status,
                        optionsJenisTiket: res.data.data.jenis_tiket,
                        optionsPembayaran: res.data.data.status_pembayaran,
                        optionsTeknisi: res.data.data.teknisi,
                    }));
                }
            } catch (_) {}
        };
        fetchFilterOptions();
    }, []);

    // State untuk penanganan print & export rekap
    const [dataRekap, setDataRekap] = useState<DataRekap>({
        data: [],
        dataTotals: {
            total_biaya_suku_cadang: 0,
            total_biaya_jasa: 0,
            subtotal: 0,
            diskon_nominal: 0,
            pajak_nominal: 0,
            grandtotal: 0,
        },
        totalData: 0,
        head: [],
        load: false,
        columnStyles: {},
        show: false,
        adjust: false,
        fileName: `laporan-operasional-service-${new Date().toISOString().slice(0, 10)}`,
        judul1: `Laporan Operasional Service`,
        judul2: `Periode: ${formatDateSystem(state.tanggalAwal, 'yyyy-MM-dd')} s/d ${formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd')}`
    });

    // Update judul cetak/pdf secara otomatis ketika parameter tanggal berubah
    useEffect(() => {
        setDataRekap((p) => ({
            ...p,
            judul2: `Periode: ${formatDateSystem(state.tanggalAwal, 'yyyy-MM-dd')} s/d ${formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd')}`
        }));
    }, [state.tanggalAwal, state.tanggalAkhir]);

    // Mengambil data tabel secara dinamis dengan limitasi halaman (Pagination)
    const getData = async (apiEndpoint: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const oPayload = {
                page: state.page,
                perPage: state.rows,
                keyword: state.keyword,
                sortField: state.sortField || 'created_at',
                sortOrder: state.sortOrder || 'desc',
                tanggal_awal: formatDateSystem(new Date(state.tanggalAwal), 'yyyy-MM-dd'),
                tanggal_akhir: formatDateSystem(new Date(state.tanggalAkhir), 'yyyy-MM-dd'),
                status: state.selectedStatus,
                jenis_tiket: state.selectedJenisTiket,
                status_pembayaran: state.selectedPembayaran,
                teknisi: state.selectedTeknisi
            };

            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({
                ...p,
                data: res.data.data || [],
                totalData: res.data.total_data || 0,
                dataTotals: res.data.totals || {
                    total_biaya_suku_cadang: 0,
                    total_biaya_jasa: 0,
                    subtotal: 0,
                    diskon_nominal: 0,
                    pajak_nominal: 0,
                    grandtotal: 0,
                }
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan saat memuat data');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    // Mengambil seluruh data tanpa batasan halaman untuk kebutuhan cetak PDF/Excel
    const getPrintData = async (apiEndpoint: string) => {
        setDataRekap((p) => ({ ...p, load: true }));
        try {
            const oPayload = {
                keyword: state.keyword,
                sortField: state.sortField || 'created_at',
                sortOrder: state.sortOrder || 'desc',
                tanggal_awal: formatDateSystem(new Date(state.tanggalAwal), 'yyyy-MM-dd'),
                tanggal_akhir: formatDateSystem(new Date(state.tanggalAkhir), 'yyyy-MM-dd'),
                status: state.selectedStatus,
                jenis_tiket: state.selectedJenisTiket,
                status_pembayaran: state.selectedPembayaran,
                teknisi: state.selectedTeknisi
            };

            const res = await postData(apiEndpoint, oPayload);

            // Alinyemen kolom PDF ekspor rekap
            const columnStyles = {
                0: { halign: 'center' }, // No
                1: { halign: 'center' }, // Kode Tiket
                2: { halign: 'center' }, // Tanggal Masuk
                3: { halign: 'left' },   // Pelanggan
                4: { halign: 'left' },   // Teknisi
                5: { halign: 'left' },   // Perangkat
                6: { halign: 'center' }, // Status Servis
                7: { halign: 'center' }, // Jenis Tiket
                8: { halign: 'right' },  // Biaya Sparepart
                9: { halign: 'right' },  // Biaya Jasa
                10: { halign: 'right' }, // Subtotal
                11: { halign: 'right' }, // Diskon
                12: { halign: 'right' }, // Pajak
                13: { halign: 'right' }, // Grand Total
                14: { halign: 'center' }, // Pembayaran
            };

            // Transformasi struktur data ke flat-array sesuai konfigurasi header
            const formattedData = transformTableData(res.data.data || [], {
                headerMap: HEADER_CONFIG,
                customFormatters: FORMATTER_CONFIG,
                excludeKeys: [
                    'id',
                    'kode_induk',
                    'kode_pelanggan',
                    'kode_teknisi',
                    'keluhan_awal',
                    'diagnosa_teknisi',
                    'status_fisik',
                    'kategori_servis',
                    'masa_garansi_hari',
                    'qc_audio',
                    'qc_charger',
                    'qc_kamera',
                    'qc_lcd',
                    'qc_sinyal',
                    'qc_tombol',
                    'tz',
                    'updated_at',
                    'updated_by',
                    'diskon_persen',
                    'pajak_persen',
                    'created_by'
                ]
            });

            setDataRekap((p) => ({
                ...p,
                data: formattedData,
                totalData: res.data.data?.length || 0,
                dataTotals: res.data.totals || {
                    total_biaya_suku_cadang: 0,
                    total_biaya_jasa: 0,
                    subtotal: 0,
                    diskon_nominal: 0,
                    pajak_nominal: 0,
                    grandtotal: 0,
                },
                show: true,
                adjust: true,
                columnStyles
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan ekspor data');
        } finally {
            setDataRekap((p) => ({ ...p, load: false }));
        }
    };

    // Fungsi utilitas memuat daftar drop-down statis/dinamis
    const getDropdownData = async (apiEndpoint: string, dataKey: keyof typeof state, loadKey: keyof typeof state): Promise<void> => {
        setState((p) => ({ ...p, [loadKey]: true }));
        try {
            const oPayload = { keyword: state.keyword, sortField: 'nama', sortOrder: 'asc' };
            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({ ...p, [dataKey]: res.data.data || [] }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan memuat dropdown');
        } finally {
            setState((p) => ({ ...p, [loadKey]: false }));
        }
    };

    // Fungsi utilitas memuat data filter dinamis
    const getFilterData = async (apiEndpoint: string, dataKey: keyof typeof state): Promise<void> => {
        setState((p) => ({ ...p, filterLoad: true }));
        try {
            const oPayload = { keyword: state.keyword, sortField: 'nama', sortOrder: 'asc' };
            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({ ...p, [dataKey]: res.data.data || [] }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan memuat filter');
        } finally {
            setState((p) => ({ ...p, filterLoad: false }));
        }
    };

    // Sinkronisasi pagination PrimeReact DataTable
    const onLazyLoad = (event: DataTableStateEvent) => {
        setState((prev) => {
            const newPage = typeof event.page === 'number' ? event.page + 1 : prev.page;
            return {
                ...prev,
                first: event.first,
                rows: event.rows,
                page: newPage,
                sortField: event.sortField || prev.sortField,
                sortOrder: event.sortOrder ? (event.sortOrder === 1 ? 'asc' : 'desc') : prev.sortOrder
            };
        });
    };

    // Monitor siklus perubahan parameter pencarian dan filter
    useEffect(() => {
        getData(apiEndpointGet);
    }, [
        state.page,
        state.rows,
        state.sortField,
        state.sortOrder,
        state.keyword,
        state.tanggalAwal,
        state.tanggalAkhir,
        state.selectedStatus,
        state.selectedJenisTiket,
        state.selectedPembayaran,
        state.selectedTeknisi,
    ]);

    // Menyematkan sesi NextAuth ke dalam state
    useEffect(() => {
        if (session) {
            setState((prev) => ({ ...prev, session: session }));
        }
    }, [session]);

    return (
        <div className="p-0">
            <Toast ref={toast} position="top-right" />

            <Table
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                getData={getData}
                getPrintData={getPrintData}
                getDropdownData={getDropdownData}
                getFilterData={getFilterData}
                state={state}
                setState={setState}
                toast={toast as any}
                onLazyLoad={onLazyLoad}
            />

            <Print
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                getData={getData}
                getPrintData={getPrintData}
                getDropdownData={getDropdownData}
                getFilterData={getFilterData}
                state={state}
                setState={setState}
                toast={toast as any}
                onLazyLoad={onLazyLoad}
            />
        </div>
    );
};

export default Page;