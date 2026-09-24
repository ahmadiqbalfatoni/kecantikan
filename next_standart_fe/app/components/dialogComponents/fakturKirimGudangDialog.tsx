'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable, DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import postData from '@/lib/axios/postData';
import { showError, formatCurrency } from '@/lib/tools/generalTools';
import { formatDateSystem } from '@/lib/tools/dateTools';

interface FakturKirimGudangDialogProps {
    visible: boolean;
    onHide: () => void;
    onSelect: (selectedPo: any) => void;
}

interface ApiError extends Error {
    response?: {
        data?: {
            message?: string;
        };
    };
}

const apiEndpointGetFakturKirimGudang = "/contoh/contoh-trx-cetak-nota/faktur-kirim-data";

const FakturKirimGudangDialog = ({ visible, onHide, onSelect }: FakturKirimGudangDialogProps) => {
    const toast = useRef<Toast>(null);
    const searchTimeoutRef = useRef<any>(null);

    // --- STATE UTAMA ---
    const [load, setLoad] = useState<boolean>(false);
    const [data, setData] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // --- PAGINATION, SORTING & SEARCH STATE ---
    const [first, setFirst] = useState<number>(0);
    const [rows, setRows] = useState<number>(5);
    const [page, setPage] = useState<number>(1);
    const [keyword, setKeyword] = useState<string>('');
    const [apiKeyword, setApiKeyword] = useState<string>('');
    const [sortField, setSortField] = useState<string>('faktur');
    const [sortOrder, setSortOrder] = useState<string>('desc');

    const getData = async () => {
        setLoad(true);
        try {
            const oPayload = {
                page: page,
                perPage: rows,
                keyword: apiKeyword,
                sortField: sortField,
                sortOrder: sortOrder,
                filters: {}
            };

            // Mengakses endpoint API secara langsung di dalam dialog
            const res = await postData(apiEndpointGetFakturKirimGudang, oPayload);
            setData(res.data.data || []);
            setTotalRecords(Number(res.data.total_data || 0));
        } catch (error: unknown) {
            const e = error as ApiError;
            showError(toast, e?.response?.data?.message || e?.message || 'Gagal memuat daftar PO referensi');
        } finally {
            setLoad(false);
        }
    };

    const onLazyLoad = (event: DataTableStateEvent) => {
        setFirst(event.first);
        setRows(event.rows);
        setPage(typeof event.page === 'number' ? event.page + 1 : 1);
        setSortField(event.sortField || 'faktur');
        setSortOrder(event.sortOrder ? (event.sortOrder === 1 ? 'asc' : 'desc') : 'desc');
    };

    useEffect(() => {
        if (visible) {
            getData();
        }
    }, [page, rows, sortField, sortOrder, apiKeyword, visible]);

    useEffect(() => {
        if (visible) {
            setKeyword('');
            setApiKeyword('');
            setPage(1);
            setFirst(0);
        }
    }, [visible]);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    // --- TEMPLATE HEADER MODERN ---
    const headerTemplate = (
        <div className="flex flex-column gap-3 w-full pr-4 pt-2">
            <span className="text-xl font-bold text-800 mb-2">Pilih Faktur Mutasi Gudang Kirim</span>
            <div className="flex align-items-center gap-2 w-full">
                <div className="relative w-full md:w-30rem">
                    <i
                        className="pi pi-search text-400"
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }}
                    ></i>
                    <InputText
                        value={keyword}
                        style={{ paddingLeft: '2.5rem' }}
                        className="w-full"
                        placeholder="Cari Kode Faktur PO..."
                        onChange={(e) => {
                            const value = e.target.value;
                            setKeyword(value);

                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                            searchTimeoutRef.current = setTimeout(() => {
                                setApiKeyword(value);
                                setPage(1);
                                setFirst(0);
                            }, 500);
                        }}
                    />
                </div>
                <Button
                    type="button"
                    icon="pi pi-filter-slash"
                    outlined
                    severity="danger"
                    tooltip="Reset Pencarian"
                    tooltipOptions={{ position: 'bottom' }}
                    style={{ width: '2.7rem', height: '2.7rem' }}
                    onClick={() => {
                        setKeyword('');
                        setApiKeyword('');
                        setPage(1);
                        setFirst(0);
                    }}
                />
            </div>
        </div>
    );

    return (
        <Dialog visible={visible} onHide={onHide} modal header={headerTemplate} style={{ width: '85vw', maxWidth: '850px' }} breakpoints={{ '960px': '95vw' }} contentStyle={{ padding: '1rem' }}>
            <Toast ref={toast} position="top-right" />
            <DataTable
                value={data}
                lazy={true}
                paginator={true}
                first={first}
                rows={rows}
                totalRecords={totalRecords}
                onPage={onLazyLoad}
                onSort={onLazyLoad}
                sortField={sortField}
                sortOrder={sortOrder === 'asc' ? 1 : -1}
                loading={load}
                onRowClick={(e) => {
                    onSelect(e.data);
                }}
                rowClassName={() => 'cursor-pointer hover:bg-gray-50'}
                emptyMessage="Faktur Mutasi Gudang Kirim tidak ditemukan."
                rowsPerPageOptions={[5, 10, 25]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
            >
                <Column field="faktur" header="Faktur" align="center" sortable style={{ minWidth: '10rem' }} />
                <Column field="petugas_kirim_nama" header="Petugas Kirim" sortable style={{ minWidth: '12rem' }} />
                <Column field="tanggal_transaksi" header="Tanggal" body={(rowData) => formatDateSystem(rowData.tanggal, 'dd-MM-yyyy')} align="center" sortable style={{ minWidth: '10rem' }} />
            </DataTable>
        </Dialog>
    );
};

export default FakturKirimGudangDialog;
