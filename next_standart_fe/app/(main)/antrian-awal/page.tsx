'use client';

import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import { showError } from '@/lib/tools/generalTools';
import { useFormik } from 'formik';
import { FilterMatchMode } from 'primereact/api';
import { useSession } from 'next-auth/react';
import { DataTableStateEvent } from 'primereact/datatable';
import { initValue, State } from './components/interfaces';
import { apiEndpointData } from './components/endpoints';
import Table from './components/display/table';
import GridPanggil from './components/display/grid_panggil';
import TabCetakAntrean from './components/display/tab_cetak_antrean';
import { TabPanel, TabView } from 'primereact/tabview';

const Page = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [state, setState] = useState<State>({
        load: false,
        loadGrid: false,
        data: [],
        gridData: [],
        add: false,
        bulkAdd: false,
        edit: false,
        delete: false,
        selectedDatas: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        submittedData: null,
        first: 0,
        rows: 10,
        page: 1,
        keyword: '',
        totalData: 0,
        sortField: 'no_antrian',
        sortOrder: 'asc',
        activeTab: 0,
    });

    const formik = useFormik<initValue>({
        initialValues: {
            kode_antrian: '',
            no_antrian: '',
            status: 'tersedia',
            tz: '',
        },
        validate: (data) => {
            const errors: Partial<initValue> = {};
            if (!data.no_antrian) errors.no_antrian = 'Nomor antrian wajib diisi.';
            if (!data.status) errors.status = 'Status wajib dipilih.';
            return errors;
        },
        onSubmit: (data) => {
            setState((p) => ({ ...p, submittedData: data }));
        },
    });

    const getData = async (apiEndpoint: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const oPayload = {
                page: state.page,
                perPage: state.rows,
                keyword: state.keyword,
                sortField: state.sortField,
                sortOrder: state.sortOrder,
            };
            const res = await postData(apiEndpoint, oPayload);
            setState((p) => ({ ...p, data: res.data.data, totalData: res.data.total_data }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const getGridData = async () => {
        setState((p) => ({ ...p, loadGrid: true }));
        try {
            // Ambil semua nomor aktif (bukan nonaktif) untuk grid
            const res = await postData(apiEndpointData, {
                sortField: 'no_antrian',
                sortOrder: 'asc',
            });
            setState((p) => ({ ...p, gridData: res.data.data }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, loadGrid: false }));
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
                sortOrder: event.sortOrder
                    ? event.sortOrder === 1
                        ? 'asc'
                        : 'desc'
                    : prev.sortOrder,
            };
        });
    };

    useEffect(() => {
        getData(apiEndpointData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.page, state.rows, state.sortField, state.sortOrder, state.keyword]);

    useEffect(() => {
        getGridData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (session) setState((prev) => ({ ...prev, session }));
    }, [session]);

    return (
        <>
            <Toast ref={toast} position="top-right" />

            <div className="card p-0 mb-3 border-round-xl overflow-hidden surface-border shadow-1">
                <div className="p-4 border-bottom-1 surface-border bg-teal-50">
                    <h2 className="text-3xl font-bold flex align-items-center gap-2 mb-1 text-teal-900">
                        <i className="pi pi-ticket text-teal-600 text-3xl" />
                        Antrean Pendaftaran
                    </h2>
                    <p className="text-color-secondary m-0">
                        Kelola kartu fisik nomor antrean pendaftaran pasien dan pemanggilan pasien ke loket.
                    </p>
                </div>
            </div>

            <TabView
                activeIndex={state.activeTab}
                onTabChange={(e) => setState((p) => ({ ...p, activeTab: e.index }))}
            >
                <TabPanel
                    header="Antrean Digital"
                    leftIcon="pi pi-print mr-2"
                >
                    <TabCetakAntrean
                        state={state}
                        setState={setState}
                        toast={toast}
                        getGridData={getGridData}
                    />
                </TabPanel>

                <TabPanel
                    header="Pemanggilan Antrean"
                    leftIcon="pi pi-volume-up mr-2"
                >
                    <GridPanggil
                        state={state}
                        setState={setState}
                        toast={toast}
                        getGridData={getGridData}
                    />
                </TabPanel>

                <TabPanel
                    header="Kelola Master"
                    leftIcon="pi pi-list mr-2"
                >
                    <Table
                        state={state}
                        setState={setState}
                        formik={formik}
                        toast={toast}
                        getData={getData}
                        getGridData={getGridData}
                        onLazyLoad={onLazyLoad}
                    />
                </TabPanel>
            </TabView>
        </>
    );
};

export default Page;

