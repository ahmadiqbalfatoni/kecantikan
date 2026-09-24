'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { DataTable, DataTableStateEvent, DataTableProps } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { OverlayPanel } from 'primereact/overlaypanel';
import { MultiSelect } from 'primereact/multiselect';
import postData from '@/lib/axios/postData';
import { formatCurrency, showError } from '@/lib/tools/generalTools';
import { Dropdown } from 'primereact/dropdown';
import { apiEndpointGet } from '@/app/(main)/setup/users/components/endpoints';
import { TableData } from '@/app/(main)/setup/users/components/interfaces';

interface UserDialogProps {
    visible: boolean;
    onHide: () => void;
    onSelect: (selectedItems: TableData[]) => void;
    multiple?: boolean;
    filters?: Record<string, any>;
}

interface ApiError extends Error {
    response?: {
        data?: {
            message?: string;
        };
    };
}

const UserDialog = ({ visible, onHide, onSelect, multiple = true, filters = {} }: UserDialogProps) => {
    const toast = useRef<Toast>(null);
    const op = useRef<OverlayPanel>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Main Data State
    const [load, setLoad] = useState<boolean>(false);
    const [data, setData] = useState<TableData[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [selectedDatas, setSelectedDatas] = useState<TableData[]>([]);

    // Dropdown Categories State
    // const [loadCategories, setLoadCategories] = useState<boolean>(false);
    // const [dataCategories, setDataCategories] = useState<CategoryData[]>([]);

    // Pagination & Search State
    const [first, setFirst] = useState<number>(0);
    const [rows, setRows] = useState<number>(10);
    const [page, setPage] = useState<number>(1);
    const [keyword, setKeyword] = useState<string>('');
    const [apiKeyword, setApiKeyword] = useState<string>('');

    // Filters State
    const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null);
    const [selectedWarehouses, setSelectedWarehouses] = useState<string | null>(null);

    // Sorting State
    const [sortField, setSortField] = useState<string>('created_at');
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
                filters: filters
            };

            const res = await postData(apiEndpointGet, oPayload);
            setData(res.data.data);
            const total = res.data.total_data || res.data.totalRecords || 0;
            setTotalRecords(Number(total));
        } catch (error: unknown) {
            const e = error as ApiError;
            showError(toast, e?.response?.data?.message || e?.message || 'Gagal mengambil data.');
        } finally {
            setLoad(false);
        }
    };

    const onLazyLoad = (event: DataTableStateEvent) => {
        setFirst(event.first);
        setRows(event.rows);
        setPage(typeof event.page === 'number' ? event.page + 1 : 1);
        setSortField(event.sortField || 'created_at');
        setSortOrder(event.sortOrder ? (event.sortOrder === 1 ? 'asc' : 'desc') : 'desc');
    };

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (visible) {
            getData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rows, sortField, sortOrder, apiKeyword, visible]);

    useEffect(() => {
        if (visible) {
            setSelectedDatas([]);
            setKeyword('');
            setApiKeyword('');
            setSelectedCategories(null);
            setSelectedWarehouses(null);
            setPage(1);
            setFirst(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const hasActiveFilters = selectedCategories && selectedCategories.length > 0;

    const headerTemplate = (
        <div className="flex flex-column gap-3 w-full pr-4 pt-2">
            <span className="text-xl font-bold text-800 mb-2">Pilih User</span>

            <div className="flex align-items-center gap-2 w-full">
                {/* <Button type="button" icon="pi pi-filter" label="Filter" outlined severity={hasActiveFilters ? 'warning' : 'secondary'} onClick={(e) => op.current?.toggle(e)} className="w-auto" /> */}

                <div className="relative w-full md:w-30rem" style={{ position: 'relative' }}>
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
                        placeholder="Ketik untuk mencari nama atau email..."
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
                    tooltip="Reset Pencarian & Filter"
                    tooltipOptions={{ position: 'bottom' }}
                    style={{ width: '2.7rem', height: '2.7rem' }}
                    onClick={() => {
                        setKeyword('');
                        setApiKeyword('');
                        setSelectedCategories(null);
                        setPage(1);
                        setFirst(0);
                    }}
                />
            </div>

            {/* <OverlayPanel ref={op} style={{ width: '350px' }}>
                <div className="flex flex-column gap-3">
                    <span className="font-bold text-lg border-bottom-1 border-300 pb-2">Filter Spesifik</span>
                    <div className="flex flex-column gap-3">
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Kategori Barang</label>
                            <MultiSelect
                                onShow={() => getDropdownData(apiEndpointGetCategoryItems, setDataCategories, setLoadCategories)}
                                value={selectedCategories}
                                options={dataCategories}
                                placeholder="Pilih Kategori..."
                                filter
                                optionLabel="keterangan"
                                optionValue="kode"
                                display="chip"
                                className="w-full"
                                onChange={(e) => {
                                    setSelectedCategories(e.value as string[]);
                                    setPage(1);
                                    setFirst(0);
                                }}
                                emptyMessage={loadCategories ? 'Memuat data...' : 'Tidak ada kategori ditemukan.'}
                                loading={loadCategories}
                                showClear
                            />
                        </div>
                    </div>
                </div>
            </OverlayPanel> */}
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2 pt-3 border-t-1 surface-border">
            <Button label="Batal" icon="pi pi-times" severity="secondary" outlined onClick={onHide} />
            <Button
                label={`Pilih User ${selectedDatas.length > 0 ? `(${selectedDatas.length})` : ''}`}
                icon="pi pi-check"
                severity="success"
                disabled={selectedDatas.length === 0}
                onClick={() => {
                    const aMappedSelectedDatas = selectedDatas.map((item) => ({
                        ...item
                    }));

                    onSelect(aMappedSelectedDatas);
                    onHide();
                }}
            />
        </div>
    );

    return (
        <Dialog visible={visible} onHide={onHide} modal header={headerTemplate} footer={dialogFooter} style={{ width: '85vw', maxWidth: '600px' }} breakpoints={{ '960px': '95vw' }} contentStyle={{ padding: '1rem' }}>
            <Toast ref={toast} position="top-right" />

            {multiple ? (
                <DataTable
                    value={data}
                    scrollable
                    scrollHeight="450px"
                    lazy={true}
                    paginator={true}
                    first={first}
                    rows={rows}
                    totalRecords={totalRecords}
                    onPage={onLazyLoad}
                    onSort={onLazyLoad}
                    sortField={sortField}
                    sortOrder={sortOrder === 'asc' ? 1 : -1}
                    dataKey="user_code"
                    loading={load}
                    emptyMessage="Data tidak ditemukan."
                    rowsPerPageOptions={[5, 10, 20]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    selectionMode="multiple"
                    selection={selectedDatas}
                    onSelectionChange={(e) => setSelectedDatas(e.value as TableData[])}
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column field="username" header="Email" align="center" sortable style={{ minWidth: '8rem' }}></Column>
                    <Column field="fullname" header="Nama" style={{ minWidth: '16rem' }}></Column>
                </DataTable>
            ) : (
                <DataTable
                    value={data}
                    scrollable
                    scrollHeight="450px"
                    lazy={true}
                    paginator={true}
                    first={first}
                    rows={rows}
                    totalRecords={totalRecords}
                    onPage={onLazyLoad}
                    onSort={onLazyLoad}
                    sortField={sortField}
                    sortOrder={sortOrder === 'asc' ? 1 : -1}
                    dataKey="user_code"
                    loading={load}
                    emptyMessage="Data tidak ditemukan."
                    rowsPerPageOptions={[5, 10, 20]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    selectionMode="single"
                    selection={selectedDatas[0] || null}
                    onSelectionChange={(e) => setSelectedDatas(e.value ? [e.value as TableData] : [])}
                >
                    <Column selectionMode="single" headerStyle={{ width: '3rem' }} />
                    <Column field="username" header="Email" align="center" sortable style={{ minWidth: '8rem' }}></Column>
                    <Column field="fullname" header="Nama" style={{ minWidth: '16rem' }}></Column>
                </DataTable>
            )}
        </Dialog>
    );
};

export default UserDialog;
