'use client';

import { getCompanyConfigs } from '@/lib/tools/generalTools';
import { CompanyConfig } from '@/types/general';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConfigContextType {
    config: CompanyConfig | null;
    isLoading: boolean;
    refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    const [config, setConfig] = useState<CompanyConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const apiEndpoint = '/setup/config-data';

    const fetchAndStoreConfig = async () => {
        setIsLoading(true);
        try {
            const data = await getCompanyConfigs(apiEndpoint, true);
            setConfig(data);
            localStorage.setItem('ms_company_config', JSON.stringify(data));
        } catch (err) {
            console.error('Gagal memuat konfigurasi perusahaan:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const localData = localStorage.getItem('ms_company_config');
        if (localData) {
            setConfig(JSON.parse(localData));
            setIsLoading(false);
        }

        const silentBackgroundSync = async () => {
            try {
                const freshData = await getCompanyConfigs(apiEndpoint, true);
                const freshDataString = JSON.stringify(freshData);

                if (freshDataString !== localData) {
                    setConfig(freshData);
                    localStorage.setItem('ms_company_config', freshDataString);
                    console.log('Konfigurasi database diperbarui & disinkronkan ke lokal.');
                }
            } catch (err) {
                console.warn('Background config sync skipped:', err);
            } finally {
                setIsLoading(false);
            }
        };

        silentBackgroundSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refreshConfig = async () => {
        await fetchAndStoreConfig();
    };

    return <ConfigContext.Provider value={{ config, isLoading, refreshConfig }}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig harus digunakan di dalam ConfigProvider');
    }
    return context;
};
