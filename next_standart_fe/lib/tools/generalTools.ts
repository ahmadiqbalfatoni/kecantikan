/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk helper umum yang digunakan di seluruh project
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

import { MenuModel } from "@/types";
import { Toast } from "primereact/toast";
import { RefObject } from "react";
import postData from "../axios/postData";
import { CompanyConfig } from "@/types/general";


export const showSuccess = (toast: RefObject<Toast>, detail: string) => {
    toast?.current?.show({ severity: "success", summary: "Success", detail: detail, life: 3000 });
};

export const showError = (toast: RefObject<Toast>, detail: string) => {
    toast?.current?.show({ severity: "error", summary: "Error", detail: detail, life: 3000 });
};

export const showWarning = (toast: RefObject<Toast>, detail: string) => {
    toast?.current?.show({ severity: "warn", summary: "Peringatan", detail: detail, life: 3000 });
};

export const showInfo = (toast: RefObject<Toast>, detail: string) => {
    toast?.current?.show({ severity: "info", summary: "Informasi", detail: detail, life: 3000 });
};


export const findMatchingItem = (menuData: Array<MenuModel>, url: string) => {
    for (const item of menuData) {
        if (item.to && new RegExp(`^${item.to}(/|$)`).test(url)) {
            return true;
        }
        if (item.items) {
            if (findMatchingItem(item.items, url)) return true;
        }
    }
    return false;
}

export const findToValuesRecursive = (data: Array<MenuModel>, searchToValue: string) => {
    const matching = [] as Array<MenuModel>;
    const searchBase = searchToValue ? searchToValue.split('?')[0] : '';

    function search(items: Array<MenuModel>) {
        if (!items || !Array.isArray(items)) return;
        for (const item of items) {
            const itemBase = item.to ? item.to.split('?')[0] : '';
            if (item.to === searchToValue || (itemBase && itemBase === searchBase)) {
                matching.push(item);
            }
            if (item.items) search(item.items);
        }
    }

    search(data);
    return matching;
}

let configCache: CompanyConfig | null = null;

export const defaultKeys = ['msNamaPerusahaan', 'msSubNamaPerusahaan', 'msAlamatPerusahaan', 'msKotaPerusahaan', 'msTeleponPerusahaan', 'msNamaPimpinan', 'msLogoPerusahaan', 'msCatatanKasir', 'msPPN', 'nominalPoint', 'msVideoDisplay'];

export const getCompanyConfigs = async (apiEndpoint: string, forceRefresh = false): Promise<CompanyConfig> => {
    if (configCache && !forceRefresh) {
        return configCache;
    }

    try {
        const res = await postData(apiEndpoint, { kode: defaultKeys });

        if (res.data && res.data.data) {
            configCache = res.data.data;
            return configCache as CompanyConfig;
        }

        if (configCache) return configCache;
        throw new Error(res.data?.message || 'Gagal memuat konfigurasi');
    } catch (error) {
        if (configCache) {
            return configCache;
        }
        if (typeof window !== 'undefined') {
            const localData = localStorage.getItem('ms_company_config');
            if (localData) {
                try {
                    configCache = JSON.parse(localData);
                    return configCache as CompanyConfig;
                } catch (_) {}
            }
        }
        console.error('Error fetching company configs:', error);
        throw error;
    }
};

export const getSingleDBConfig = async (apiEndpoint: string, kode: string): Promise<string> => {
    const configs = await getCompanyConfigs(apiEndpoint);
    return configs[kode] || '';
};



export const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(value));
};

export const formatRupiah = formatCurrency;

export const formatReceiptCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '0';
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(value));
};