'use client';

import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';
import { showError } from '@/lib/tools/generalTools';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { useSession } from 'next-auth/react';
import { State } from './components/interfaces';
import { apiEndpointData } from './components/endpoints';
import { PanelAntrianRuangan } from './components/PanelAntrianRuangan';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const AntreanLayananPage = () => {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const ruanganParam = searchParams.get('ruangan') || '';
    const [selectedRuangan, setSelectedRuangan] = useState<string>(ruanganParam);

    useEffect(() => {
        if (session?.user?.role === 'superadmin') {
            router.replace('/dashboard');
        }
    }, [session, router]);

    useEffect(() => {
        setSelectedRuangan(ruanganParam);
    }, [ruanganParam]);

    const handleBackToList = () => {
        setSelectedRuangan('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ruangan');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
    };

    const [state, setState] = useState<State>({
        load: false,
        loadGrid: false,
        data: [],
        gridData: [],
        searchVal: '',
        filters: { global: { value: null, matchMode: FilterMatchMode.CONTAINS } },
        session: null,
        first: 0,
        rows: 10,
        page: 1,
        keyword: '',
        totalData: 0,
        sortField: 'nomor_antrian',
        sortOrder: 'asc',
        activeTab: 0,
        autoRefresh: true,
        filterJenis: '',
    });

    const getGridData = async () => {
        setState((p) => ({ ...p, loadGrid: true }));
        try {
            const res = await postData(apiEndpointData, {
                sortField: 'nomor_antrian',
                sortOrder: 'asc',
            });
            setState((p) => ({ ...p, gridData: res.data.data || [] }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan saat memuat grid antrean');
        } finally {
            setState((p) => ({ ...p, loadGrid: false }));
        }
    };

    useEffect(() => {
        getGridData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (session) setState((prev) => ({ ...prev, session }));
    }, [session]);

    const typeParam = searchParams.get('type') || '';
    const isKonsul = typeParam === 'konsul';

    return (
        <>
            <Toast ref={toast} position="top-right" />

            {/* Title Card Header */}
            <div className="card p-0 mb-3 border-round-xl surface-border shadow-1 overflow-hidden">
                <div className={`px-4 py-3 border-bottom-1 surface-border ${isKonsul ? 'bg-teal-50' : !typeParam ? 'bg-indigo-50' : 'bg-blue-50'} flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3`}>
                    <div>
                        <h2 className={`text-xl sm:text-2xl font-bold flex align-items-center gap-2 mb-1 ${isKonsul ? 'text-teal-900' : !typeParam ? 'text-indigo-900' : 'text-blue-900'}`}>
                            <i className={`pi ${isKonsul ? 'pi-comments text-teal-600' : !typeParam ? 'pi-calendar-times text-indigo-600' : 'pi-sparkles text-blue-600'} text-2xl`} />
                            {isKonsul
                                ? 'Panel Antrean Konsultasi Pasien'
                                : typeParam === 'layanan'
                                ? 'Panel Antrean Layanan & Tindakan Pasien'
                                : 'Panel Monitoring Antrean Ruangan'}
                        </h2>
                        <p className="text-color-secondary m-0 text-xs sm:text-sm">
                            {isKonsul
                                ? 'Kelola dan panggil nomor antrean konsultasi dokter pasien berdasar lokasi ruangan konsultasi secara real-time.'
                                : typeParam === 'layanan'
                                ? 'Kelola dan panggil nomor antrean tindakan pasien berdasar lokasi ruangan tindakan secara real-time.'
                                : 'Monitoring dan kelola antrean seluruh ruangan klinik secara real-time.'}
                        </p>
                    </div>

                    {selectedRuangan && (
                        <Button
                            type="button"
                            label="Kembali ke Daftar Ruangan"
                            icon="pi pi-arrow-left"
                            className="font-bold text-xs border-round-lg shadow-2 bg-white text-teal-800 border-1 border-teal-300 hover:bg-teal-100 hover:border-teal-400 py-2 px-3 flex-shrink-0 transition-all"
                            onClick={handleBackToList}
                        />
                    )}
                </div>
            </div>

            {/* Panel Antrian Ruangan */}
            <PanelAntrianRuangan
                state={state}
                setState={setState}
                toast={toast}
                getGridData={getGridData}
                initialRuangan={ruanganParam}
                selectedRuangan={selectedRuangan}
                setSelectedRuangan={setSelectedRuangan}
                handleBackToList={handleBackToList}
            />
        </>
    );
};

export default AntreanLayananPage;
