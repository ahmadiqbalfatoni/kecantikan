import { FilterMatchMode } from 'primereact/api';
import { FormikProps } from 'formik';
import { Session } from 'next-auth';
import { Toast } from 'primereact/toast';
import { RefObject } from 'react';
import { DataTableStateEvent } from 'primereact/datatable';
import { DataRekap } from '@/types/print-tools';
import { MenuItemOptions } from 'primereact/menuitem';

export interface initValue extends TableData {}

export interface TableData {
    id?: number;
    kode?: string;
    nama: string;
    alamat?: string | null;
    telepon?: string | null;
    kode_kategori?: string | null;
    kategori?: string | null;
    rekening?: string | null;
    plafond_1?: number;
    plafond_2?: number;

    // Contact Person 1
    nama_cp_1?: string | null;
    email_cp_1?: string | null;
    telepon_cp_1?: string | null;
    hp_cp_1?: string | null;
    alamat_cp_1?: string | null;

    // Contact Person 2
    nama_cp_2?: string | null;
    email_cp_2?: string | null;
    telepon_cp_2?: string | null;
    hp_cp_2?: string | null;
    alamat_cp_2?: string | null;
    tz: string;
    created_by?: string;
    created_by_fullname?: string;
    created_at?: string;
    updated_by?: string;
    updated_by_fullname?: string;
    updated_at?: string;
    deleted_by?: string;
    deleted_at?: string;
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

    // State Form
    activeStep: number;
    // packagingLevel: number;
    // uploadMethod: 'upload' | 'camera';
    // isDragging: boolean;
    // isCameraActive: boolean;
    // cameraStream: MediaStream | null;
    // previewUrl: string;

    // Load data for dropdowns
    supplierCategoriesLoad: boolean;

    // Data for dropdowns
    supplierCategoriesData: any[];

    first: number;
    rows: number;
    page: number;
    keyword: string;
    totalData: number;
    sortField: string;
    sortOrder: string;

    filterLoad: boolean;
    selectedSupplierCategories: string | null;
    supplierCategoriesOptions: any[];
}

export interface BaseProps {
    getDropdownData: (apiEndpoint: string, dataKey: keyof State, loadKey: keyof State) => Promise<void>;
}

export interface TableProps extends BaseProps {
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
    getPrintData: (apiEndpoint: string) => Promise<void>;
    onLazyLoad: (event: DataTableStateEvent) => void;
    getFilterData: (apiEndpoint: string, dataKey: keyof State) => Promise<void>;
}

export interface FormProps extends BaseProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
}

export const HEADER_CONFIG = {
    created_at: 'Waktu Dibuat',
    updated_at: 'Waktu Diperbarui'
};

export const FORMATTER_CONFIG = {
    // harga: (val: number) => formatRupiah(val)
};
