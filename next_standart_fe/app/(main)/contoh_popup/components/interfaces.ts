import { FilterMatchMode } from 'primereact/api';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';
import { DataTableStateEvent } from 'primereact/datatable';
import { DataRekap } from '@/types/print-tools';
import { formatTime } from '@/lib/tools/dateTools';

export interface initValue extends TableData {}

export interface TableData {
    id?: number;
    kode?: string;
    nama: string;
    waktu_mulai: string;
    waktu_selesai: string;
    status: string;
    tz: string;
    updated_at?: string;
    created_at?: string;
}

export interface State {
    load: boolean;
    data: TableData[];
    add: boolean;
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
}

export interface TableProps {
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getDropdownData: (apiEndpoint: string, dataKey: keyof State, loadKey: keyof State) => Promise<void>;
    getData: (apiEndpoint: string) => Promise<void>;
    getPrintData: (apiEndpoint: string) => Promise<void>;
    onLazyLoad: (event: DataTableStateEvent) => void;
}

export interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
    getDropdownData: (apiEndpoint: string, dataKey: keyof State, loadKey: keyof State) => Promise<void>;
}

export const HEADER_CONFIG = {
    created_at: 'Waktu Dibuat',
    updated_at: 'Waktu Diperbarui'
};

export const FORMATTER_CONFIG = {
    waktu_mulai: (val: string) => formatTime(val),
    waktu_selesai: (val: string) => formatTime(val)
};

export const coaData = [{ kode: '1.100.02', keterangan: 'Kas Kecil' }];
