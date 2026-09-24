'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Toast } from 'primereact/toast';
import { FilterMatchMode } from 'primereact/api';
import { DataTableStateEvent } from 'primereact/datatable';
import { useFormik } from 'formik';

import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { formatDateSystem, getBulanSekarangRange } from '@/lib/tools/dateTools';
import { transformTableData } from '@/lib/tools/printTools/transformData';
import { DataRekap } from '@/types/print-tools';

import {
    State,
    InitValue,
    HEADER_CONFIG_KIRIM,
    HEADER_CONFIG_TERIMA,
    FORMATTER_CONFIG_MUTASI
} from './components/interfaces';
import Table from './components/display/table';
import Print from './components/display/print';
import { apiEndpointGetMutasiList } from './components/endpoints';

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();
    const rangeBulanIni = getBulanSekarangRange();

    // 1. Inisialisasi State Management Utama Sesuai Interface Standard
    const [state, setState] = useState<State>({
        load: false,
        activeTab: 0, // 0 = Kirim Stock (BK), 1 = Terima Stock (BA)
        data: [],
        searchVal: '',
        add: false,
        edit: false,
        filterLoad: false,
        delete: false,
        showItemDialog: false,
        showFakturKirimDialog: false,
        selectedDatas: [],
        jenisMutasi: null,
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,

        // Filter Atas Adaptif (List View)
        tanggalAwal: rangeBulanIni.awal,
        tanggalAkhir: rangeBulanIni.akhir,
        dataNota: null,
        selectedGudangKirim: null,
        selectedGudangTerima: null,
        gudangOptions: [],
        gudangsLoad: false,

        selectedPetugasKirim: null,
        selectedPetugasTerima: null,
        petugasOptions: [],
        petugasLoad: false,

        // Server-Side Lazy Loading Properties
        first: 0,
        rows: 10,
        page: 1,
        keyword: '',
        totalRecords: 0,
        sortField: 'faktur',
        sortOrder: 'desc',

        // Dialog Controls
        showGudangDialog: false,
        showPetugasDialog: false,
        showProductDialog: false,
        showSlipPrintDialog: false,

        whichGudangTarget: 'kirim',
        whichPetugasTarget: 'kirim',

        pdfUrl: '',
        fileName: 'laporan-mutasi-gudang-kirim',
        slipFaktur: ''
    });

    // 2. State Rekapitulasi Ekspor Cetak PDF/Excel
    const [dataRekap, setDataRekap] = useState<DataRekap>({
        data: [],
        totalData: 0,
        head: [],
        load: false,
        columnStyles: {},
        show: false,
        adjust: false,
        fileName: `laporan-mutasi-gudang-kirim-${new Date().toISOString().slice(0, 10)}`,
        judul1: 'Laporan Pengiriman Mutasi Gudang',
        judul2: ''
    });

    // 3. Formik Form Transaction (Kirim & Terima Stock)
    const formik = useFormik<InitValue>({
        initialValues: {
            faktur: '',
            tanggal_transaksi: new Date(),
            dari_gudang: '',
            dari_gudang_nama: '',
            ke_gudang: '',
            ke_gudang_nama: '',
            dikirim_oleh: '',
            dikirim_oleh_nama: '',
            diterima_oleh: '',
            diterima_oleh_nama: '',
            detail: [],
            tz: 'UTC'
        },
        validate: (data: InitValue) => {
            const errors = {} as any;
            if (!data.dari_gudang) {
                errors.dari_gudang = 'Gudang pengirim wajib dipilih.';
            }
            if (!data.ke_gudang) {
                errors.ke_gudang = 'Gudang penerima wajib dipilih.';
            }
            if (data.dari_gudang && data.dari_gudang === data.ke_gudang) {
                errors.ke_gudang = 'Gudang tujuan tidak boleh sama dengan gudang pengirim.';
            }
            if (!data.dikirim_oleh) {
                errors.dikirim_oleh = 'Petugas pengirim wajib diisi.';
            }
            if (data.detail.length === 0) {
                errors.detail = 'Detail barang minimal harus diisi 1 item.';
            }
            return errors;
        },
        onSubmit: (data) => {
            setState((p) => ({ ...p, submittedData: data }));
        }
    });

    // 4. GET DATA - Memuat Daftar Mutasi dengan Server-Side Pagination
    const getData = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            const isKirim = state.activeTab === 0;
            const oPayload = {
                page: state.page,
                perPage: state.rows,
                keyword: state.keyword,
                sortField: state.sortField || 'faktur',
                sortOrder: state.sortOrder || 'desc',
                tanggal_awal: formatDateSystem(state.tanggalAwal, 'yyyy-MM-dd'),
                tanggal_akhir: formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd'),
                gudang_kirim: state.selectedGudangKirim || null,
                gudang_terima: state.selectedGudangTerima || null,
                petugas_kirim: state.selectedPetugasKirim || null,
                petugas_terima: state.selectedPetugasTerima || null,
                jenis_mutasi: isKirim ? 'Kirim' : 'Terima'
            };

            const res = await postData(apiEndpointGetMutasiList, oPayload);
            setState((p) => ({
                ...p,
                data: res.data.data || [],
                totalRecords: res.data.total_data || 0
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memuat daftar mutasi');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    // 5. GET PRINT DATA - Menyiapkan Format Rekap PDF/Excel
    const getPrintData = async () => {
        setDataRekap((p) => ({ ...p, load: true }));
        try {
            const isKirim = state.activeTab === 0;
            const oPayload = {
                keyword: state.keyword,
                sortField: state.sortField || 'faktur',
                sortOrder: state.sortOrder || 'desc',
                tanggal_awal: formatDateSystem(state.tanggalAwal, 'yyyy-MM-dd'),
                tanggal_akhir: formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd'),
                gudang_kirim: state.selectedGudangKirim || null,
                gudang_terima: state.selectedGudangTerima || null,
                petugas_kirim: state.selectedPetugasKirim || null,
                petugas_terima: state.selectedPetugasTerima || null,
                jenis_mutasi: isKirim ? 'Kirim' : 'Terima'
            };

            const res = await postData(apiEndpointGetMutasiList, oPayload);

            // Styling perataan sel untuk format PDF
            const columnStyles = isKirim
                ? {
                    0: { halign: 'center' }, // Faktur
                    1: { halign: 'center' }, // Tanggal
                    4: { halign: 'center' }, // Status
                    5: { halign: 'center' }  // Faktur Terima
                }
                : {
                    0: { halign: 'center' }, // Faktur Receipt
                    1: { halign: 'center' }, // Tanggal
                    2: { halign: 'center' }  // Faktur Kirim Asal
                };

            const formattedData = transformTableData(res.data.data || [], {
                headerMap: isKirim ? HEADER_CONFIG_KIRIM : HEADER_CONFIG_TERIMA,
                customFormatters: FORMATTER_CONFIG_MUTASI,
                excludeKeys: ['no', 'kode_gudang_kirim', 'kode_gudang_terima', 'allow_update', 'allow_delete']
            });

            setDataRekap((p) => ({
                ...p,
                data: formattedData,
                totalData: res.data.total_data || 0,
                show: true,
                adjust: true,
                columnStyles
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal merancang dokumen cetak');
        } finally {
            setDataRekap((p) => ({ ...p, load: false }));
        }
    };

    // 7. GET FILTER DATA - Memuat Dropdown Opsi Gudang dan Petugas (Lazy Load)
    const getFilterData = async (apiEndpoint: string, dataKey: keyof State): Promise<void> => {
        setState((p) => ({ ...p, filterLoad: true }));
        try {
            const oPayload = { keyword: '', sortField: 'kode', sortOrder: 'asc' };
            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({ ...p, [dataKey]: res.data.data || [] }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memuat parameter penyaringan');
        } finally {
            setState((p) => ({ ...p, filterLoad: false }));
        }
    };

    const getDropdownData = async (apiEndpoint: string, dataKey: keyof State, loadKey: keyof State): Promise<void> => {
        setState((p) => ({ ...p, [loadKey]: true }));
        try {
            const oPayload = { keyword: '', sortField: 'kode', sortOrder: 'asc' };
            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({ ...p, [dataKey]: res.data.data || [] }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan saat memuat master opsi');
        } finally {
            setState((p) => ({ ...p, [loadKey]: false }));
        }
    };

    // Handler Paginasi Lazy-Loading PrimeReact DataTable
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

    // Sinkronisasi pemanggilan data otomatis ketika ada filter yang berubah
    useEffect(() => {
        getData();
    }, [
        state.activeTab,
        state.page,
        state.rows,
        state.sortField,
        state.sortOrder,
        state.keyword,
        state.tanggalAwal,
        state.tanggalAkhir,
        state.selectedGudangKirim,
        state.selectedGudangTerima,
        state.selectedPetugasKirim,
        state.selectedPetugasTerima
    ]);

    // Sinkronisasi Sesi Autentikasi Pengguna
    useEffect(() => {
        if (session) {
            setState((prev) => ({ ...prev, session: session }));
        }
    }, [session]);

    // Sinkronisasi Meta Judul Ekspor File berdasarkan Tab yang Sedang Aktif
    useEffect(() => {
        const isKirim = state.activeTab === 0;
        setDataRekap((p) => ({
            ...p,
            fileName: isKirim
                ? `laporan-mutasi-gudang-kirim-${formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd')}`
                : `laporan-mutasi-gudang-terima-${formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd')}`,
            judul1: isKirim ? 'Laporan Pengiriman Mutasi Gudang' : 'Laporan Penerimaan Mutasi Gudang',
            judul2: `Periode: ${formatDateSystem(state.tanggalAwal, 'yyyy-MM-dd')} s.d ${formatDateSystem(state.tanggalAkhir, 'yyyy-MM-dd')}`
        }));
    }, [state.activeTab, state.tanggalAwal, state.tanggalAkhir]);

    // Reset pagination ketika user berpindah tab ledger
    useEffect(() => {
        setState((p) => ({
            ...p,
            first: 0,
            page: 1,
            keyword: '',
            searchVal: '',
            sortField: 'faktur',
            sortOrder: 'desc'
        }));
    }, [state.activeTab]);

    return (
        <div className="p-0">
            <Toast ref={toast} position="top-right" />

            <Table
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                getData={getData}
                getPrintData={getPrintData}
                getFilterData={getFilterData}
                state={state}
                setState={setState}
                formik={formik}
                toast={toast}
                getDropdownData={getDropdownData}
                onLazyLoad={onLazyLoad}
            />

            <Print
                formik={formik}
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                getData={getData}
                getPrintData={getPrintData}
                getFilterData={getFilterData}
                state={state}
                setState={setState}
                toast={toast}
                onLazyLoad={onLazyLoad}
            />
        </div>
    );
};

export default Page;