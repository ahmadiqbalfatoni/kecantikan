import { FilterMatchMode } from "primereact/api";
import { AppMenuItem, MenuModel, UserRole } from "@/types/layout"
import { FormikProps } from "formik"
import { Session } from "next-auth";
import { Toast } from "primereact/toast";
import { RefObject } from "react";
import { DataRekap } from "@/types/print-tools";


export interface initValue {
    msNamaPerusahaan: string;
    msIzinOperasional: string;
    msAlamatPerusahaan: string;
    msKotaPerusahaan: string;
    msTeleponPerusahaan: string;
    msWaKlinik: string;
    msEmailPerusahaan: string;
    msWebsitePerusahaan: string;
    msLogoPerusahaan: string;
}

export interface NavState {
    user_code: string
    load: boolean
    show: boolean
    data: MenuModel[]
    menu: MenuModel[]
}

export interface State {
    load: boolean;
    data: any[];
    add: boolean;
    edit: boolean;
    delete: boolean;
    selectedUsers: any[];
    searchVal: string;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null
    submittedData: initValue | null
    imgPrev: string | null
}

export interface TableProps {
    state: State
    dataRekap: DataRekap
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>
    formik: FormikProps<initValue>
    setState: React.Dispatch<React.SetStateAction<State>>;
    getData: (apiEndpoint: string) => Promise<void>;
    getNav?: (user_code: string) => Promise<void>;
    toast: RefObject<Toast>
    navBar?: NavState;
    setNavBar?: React.Dispatch<React.SetStateAction<NavState>>;
}

export interface FormProps {
    state: State,
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>
    toast: RefObject<Toast>
    getData: (apiEndpoint: string) => Promise<void>;
}

export interface NavbarProps {
    navBar: NavState,
    setNavBar: React.Dispatch<React.SetStateAction<NavState>>;
    handleSaveNavbar: () => Promise<void>;
}
export interface MenuDisplayProps {
    data: AppMenuItem[],
    onEdit: (item: number[]) => void;
}
export interface ListMenuDisplayProps {
    data: AppMenuItem,
    indexPath?: number[];
    onEdit: (item: number[]) => void;
}

export interface RoleColors {
    admin: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    manager: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    technician: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    logistics: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    employee: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    superadmin: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
}