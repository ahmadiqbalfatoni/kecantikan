'use client';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import { showError } from '@/lib/tools/generalTools';
import { useFormik } from 'formik';
import { FORMATTER_CONFIG, HEADER_CONFIG, initValue, State } from './components/interfaces';
import Table from './components/display/table';
import { FilterMatchMode } from 'primereact/api';
import { useSession } from 'next-auth/react';
import { DataTableStateEvent } from 'primereact/datatable';
import { apiEndpointGet } from './components/endpoints';
import { DataRekap } from '@/types/print-tools';
import Print from './components/display/print';
import { getTzUser } from '@/lib/tools/dateTools';
import { transformTableData } from '@/lib/tools/printTools/transformData';

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        data: [],
        add: false,
        edit: false,
        delete: false,
        selectedDatas: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,

        // Step Form
        activeStep: 0,

        // Load data for dropdowns
        supplierCategoriesLoad: false,

        // Data for dropdowns
        supplierCategoriesData: [],

        first: 0,
        rows: 10,
        page: 1,
        keyword: '',
        totalData: 0,
        sortField: 'updated_at',
        sortOrder: 'desc',

        filterLoad: false,
        selectedSupplierCategories: null,
        supplierCategoriesOptions: []
    });

    const [dataRekap, setDataRekap] = useState<DataRekap>({
        data: [],
        totalData: 0,
        head: [],
        load: false,
        columnStyles: {},
        show: false,
        adjust: false,
        fileName: `laporan-daftar-supplier-${new Date().toISOString().slice(0, 10)}`,
        judul1: 'Laporan Daftar Supplier',
        judul2: ''
    });

    const formik = useFormik<initValue>({
        initialValues: {
            nama: '',
            alamat: '',
            telepon: '',
            kode_kategori: '',
            rekening: '',
            plafond_1: 0,
            plafond_2: 0,

            // Data Contact Person 1
            nama_cp_1: '',
            email_cp_1: '',
            telepon_cp_1: '',
            hp_cp_1: '',
            alamat_cp_1: '',

            // Data Contact Person 2
            nama_cp_2: '',
            email_cp_2: '',
            telepon_cp_2: '',
            hp_cp_2: '',
            alamat_cp_2: '',
            tz: getTzUser()
        },
        validate: (data: initValue) => {
            let errors = {} as initValue;
            if (!data.nama) {
                errors.nama = 'Nama supplier wajib diisi.';
            }
            if (!data.alamat) {
                errors.alamat = 'Alamat supplier wajib diisi.';
            }
            if (!data.telepon) {
                errors.telepon = 'Telepon supplier wajib diisi.';
            }
            if (!data.kode_kategori) {
                errors.kode_kategori = 'Kategori supplier wajib diisi.';
            }
            return errors;
        },
        onSubmit: (data) => {
            setState((p) => ({ ...p, submittedData: data }));
        }
    });

    const getData = async (apiEndpoint: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const oPayload = {
                page: state.page,
                perPage: state.rows,
                keyword: state.keyword,
                sortField: state.sortField || 'updated_at',
                sortOrder: state.sortOrder || 'desc',
                filters: {
                    kategori: state.selectedSupplierCategories || null
                }
            };

            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({
                ...p,
                data: res.data.data,
                totalData: res.data.total_data
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getPrintData = async (apiEndpoint: string) => {
        setDataRekap((p) => ({ ...p, load: true }));
        try {
            const oPayload = {
                keyword: state.keyword,
                sortField: state.sortField || 'updated_at',
                sortOrder: state.sortOrder || 'desc',
                filters: {
                    kategori: state.selectedSupplierCategories || null
                }
            };

            const res = await postData(apiEndpoint, oPayload);

            let columnStyles = {
                0: { halign: 'center' },
                1: { halign: 'left' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center' }
            };

            const formattedData = transformTableData(res.data.data, {
                headerMap: HEADER_CONFIG,
                customFormatters: FORMATTER_CONFIG,
                excludeKeys: ['kode', 'nama', 'alamat', 'telepon', 'kategori', 'rekening', 'plafond_1', 'plafond_2']
            });

            setDataRekap((p) => ({
                ...p,
                data: formattedData,
                totalData: res.data.total_data,
                show: true,
                adjust: true,
                columnStyles
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setDataRekap((p) => ({ ...p, load: false }));
        }
    };

    const getDropdownData = async (apiEndpoint: string, dataKey: keyof typeof state, loadKey: keyof typeof state): Promise<void> => {
        setState((p) => ({ ...p, [loadKey]: true }));

        try {
            const oPayload = {
                keyword: state.keyword,
                sortField: 'kode',
                sortOrder: 'asc'
            };

            const res = await postData(apiEndpoint, oPayload);

            setState((p) => ({
                ...p,
                [dataKey]: res.data.data
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, [loadKey]: false }));
        }
    };

    const getFilterData = async (apiEndpoint: string, dataKey: keyof typeof state): Promise<void> => {
        setState((p) => ({ ...p, filterLoad: true }));

        try {
            const oPayload = {
                keyword: state.keyword,
                sortField: 'kode',
                sortOrder: 'asc'
            };

            const res = await postData(apiEndpoint, oPayload);

            setState((p) => ({
                ...p,
                [dataKey]: res.data.data
            }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, filterLoad: false }));
        }
    };

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

    useEffect(() => {
        getData(apiEndpointGet);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.page, state.rows, state.sortField, state.sortOrder, state.selectedSupplierCategories, state.keyword]);

    useEffect(() => {
        if (session) {
            setState((prev) => ({
                ...prev,
                session: session
            }));
        }
    }, [session]);

    return (
        <>
            <div className="p-0">
                <Toast ref={toast} position="top-right" />

                {/* <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleImport}
                style={{ display: "none" }}
            /> */}

                <Table
                    dataRekap={dataRekap}
                    setDataRekap={setDataRekap}
                    getData={getData}
                    getPrintData={getPrintData}
                    getDropdownData={getDropdownData}
                    getFilterData={getFilterData}
                    state={state}
                    setState={setState}
                    formik={formik}
                    toast={toast}
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
                    formik={formik}
                    toast={toast}
                    onLazyLoad={onLazyLoad}
                />
            </div>
        </>
    );
};

export default Page;
