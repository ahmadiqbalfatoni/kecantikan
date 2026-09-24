/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File daftar interface untuk page users
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


import { FilterMatchMode } from "primereact/api";
import { AppMenuItem, MenuModel, UserRole } from "@/types/layout";
import { FormikProps } from "formik";
import { Session } from "next-auth";
import { Toast } from "primereact/toast";
import { RefObject } from "react";
import { DataRekap } from "@/types/print-tools";

export interface initValue {
    user_code: string;
    fullname: string;
    username: string;
    password?: string;
    telp: string;
    status: '0' | '1';
    role: UserRole;
}

export interface TableData {
    user_code: string;
    fullname: string;
    username: string;
    telp: string;
    status: '0' | '1';
    role: UserRole;
    created_at: string | Date;
}

export interface NavState {
    user_code: string;
    load: boolean;
    show: boolean;
    data: MenuModel[];
    menu: MenuModel[];
}

export interface State {
    load: boolean;
    data: TableData[];
    add: boolean;
    edit: boolean;
    delete: boolean;
    selectedData: TableData[];
    searchVal: string;

    // Properti baru untuk Lazy Pagination
    first?: number;
    page?: number;
    rows?: number;
    totalRecords?: number;

    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
        status: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
        role: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
    submittedData: initValue | null;
}

export interface TableProps {
    state: State;
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    formik: FormikProps<initValue>;
    setState: React.Dispatch<React.SetStateAction<State>>;
    getData: (apiEndpoint: string) => Promise<void>;
    getNav?: (user_code: string) => Promise<void>;
    toast: RefObject<Toast>;
    navBar?: NavState;
    setNavBar?: React.Dispatch<React.SetStateAction<NavState>>;
}

export interface FormProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    formik: FormikProps<initValue>;
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
}

export interface NavbarProps {
    navBar: NavState;
    setNavBar: React.Dispatch<React.SetStateAction<NavState>>;
    handleSaveNavbar: () => Promise<void>;
}

export interface MenuDisplayProps {
    data: AppMenuItem[];
    onEdit: (item: number[]) => void;
}

export interface ListMenuDisplayProps {
    data: AppMenuItem;
    indexPath?: number[];
    onEdit: (item: number[]) => void;
}

export interface RoleColors {
    admin: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    support: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    user: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
    superadmin: 'success' | 'info' | 'warning' | 'danger' | null | undefined;
}