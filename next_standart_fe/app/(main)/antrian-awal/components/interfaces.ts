import { FilterMatchMode } from 'primereact/api';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';
import { DataTableStateEvent } from 'primereact/datatable';

export interface TableData {
    kode_antrian: string;
    no_antrian: string;
    status: 'tersedia' | 'diambil' | 'dipanggil' | 'selesai' | 'nonaktif';
    created_at?: string;
    updated_at?: string;
}

export interface initValue {
    kode_antrian?: string;
    no_antrian: string;
    status: string;
    tz?: string;
}

export interface State {
    load: boolean;
    loadGrid: boolean;
    data: TableData[];
    gridData: TableData[];
    add: boolean;
    bulkAdd: boolean;
    edit: boolean;
    delete: boolean;
    selectedDatas: TableData[];
    searchVal: string;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
    submittedData: initValue | null;
    first: number;
    rows: number;
    page: number;
    keyword: string;
    totalData: number;
    sortField: string;
    sortOrder: string;
    activeTab: number;
}

export interface TableProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
    getGridData: () => Promise<void>;
    onLazyLoad: (event: DataTableStateEvent) => void;
}

export interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
    getGridData: () => Promise<void>;
}

export interface GridPanggilProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: RefObject<Toast>;
    getGridData: () => Promise<void>;
}

export interface AmbilResult {
    kode_antrian: string;
    no_antrian: string;
    diambil_at: string;
    antrean_menunggu: number;
    nama_klinik: string;
}

export interface TabCetakAntreanProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: RefObject<Toast>;
    getGridData: () => Promise<void>;
}

export const STATUS_LABELS: Record<string, { label: string; severity: string }> = {
    tersedia:  { label: 'Tersedia',  severity: 'success' },
    diambil:   { label: 'Diambil',   severity: 'info'    },
    dipanggil: { label: 'Dipanggil', severity: 'warning' },
    selesai:   { label: 'Selesai',   severity: 'secondary' },
    nonaktif:  { label: 'Nonaktif',  severity: 'danger'  },
};

