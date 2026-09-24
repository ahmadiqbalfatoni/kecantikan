import React, { ReactElement, Dispatch, SetStateAction, HTMLAttributeAnchorTarget, ReactNode } from 'react';
import { NextPage } from 'next';
import { Demo } from './demo';
import { Toast } from 'primereact/toast';
import { LargeNumberLike } from 'crypto';
import { FilterMatchMode } from 'primereact/api';
import { Session } from 'next-auth';
import { DataRekap } from './print-tools';
import { FormikProps } from 'formik';

/* Breadcrumb Types */
export interface AppBreadcrumbProps {
    className?: string;
}

export interface Breadcrumb {
    labels?: string[];
    to?: string;
}

export interface BreadcrumbItem {
    label: string;
    to?: string;
    items?: BreadcrumbItem[];
}

/* Context Types */
export type LayoutState = {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    profileSidebarVisible: boolean;
    configSidebarVisible: boolean;
    staticMenuMobileActive: boolean;
    menuHoverActive: boolean;
};

export type LayoutConfig = {
    ripple: boolean;
    inputStyle: string;
    menuMode: string;
    colorScheme: string;
    theme: string;
    scale: number;
};

export interface LayoutContextProps {
    layoutConfig: LayoutConfig;
    setLayoutConfig: Dispatch<SetStateAction<LayoutConfig>>;
    layoutState: LayoutState;
    setLayoutState: Dispatch<SetStateAction<LayoutState>>;
    onMenuToggle: () => void;
    showProfileSidebar: () => void;
}

export interface MenuContextProps {
    activeMenu: string;
    setActiveMenu: Dispatch<SetStateAction<string>>;
}

/* AppConfig Types */
export interface AppConfigProps {
    simple?: boolean;
}

/* AppTopbar Types */
export type NodeRef = MutableRefObject<ReactNode>;
export interface AppTopbarRef {
    menubutton?: HTMLButtonElement | null;
    topbarmenu?: HTMLDivElement | null;
    topbarmenubutton?: HTMLButtonElement | null;
}

/* AppMenu Types */
type CommandProps = {
    originalEvent: React.MouseEvent<HTMLAnchorElement, MouseEvent>;
    item: MenuModelItem;
};

export interface MenuProps {
    model: MenuModel[];
}

export interface MenuModel {
    label: string;
    icon?: string;
    items?: MenuModel[];
    to?: string;
    url?: string;
    target?: HTMLAttributeAnchorTarget;
    seperator?: boolean;
}

export interface AppMenuItem extends MenuModel {
    items?: AppMenuItem[];
    badge?: 'UPDATED' | 'NEW';
    badgeClass?: string;
    separator?: string;
    class?: string;
    indexPath?: number[];
    preventExact?: boolean;
    visible?: boolean;
    disabled?: boolean;
    replaceUrl?: boolean;
    command?: ({ originalEvent, item }: CommandProps) => void;
}

export interface AppMenuItemProps {
    item?: AppMenuItem;
    parentKey?: string;
    index?: number;
    root?: boolean;
    className?: string;
    load?: boolean;
}

export interface RootLayoutProps {
    children: React.ReactNode;
}

export interface StateGlobal {
    load: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    searchVal: string;
    first?: number;
    rows?: number;
    page?: number;
    totalRecords?: number;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
    };
    session: Session | null;
}

export interface TablePropsGlobal {
    dataRekap?: DataRekap | undefined;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    getData: (apiEndpoint: string) => Promise<void>;
    toast: RefObject<Toast>;
}

export interface FormPropsGlobal {
    toast: RefObject<Toast>;
    getData: (apiEndpoint: string) => Promise<void>;
}

export type TZKey = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura' | 'UTC';
export type UserRole = 'superadmin' | 'admin' | 'employee' | 'technician' | 'manager' | 'logistics';
