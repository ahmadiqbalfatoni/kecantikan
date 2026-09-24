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

interface ItemPickerDialogProps {
    visible: boolean;
    onHide: () => void;
    onSelect: (selectedItems: any[]) => void;
    multiple?: boolean;
    priceField?: 'harga_jual_1' | 'harga_beli_1';
}

interface ApiError extends Error {
    response?: {
        data?: {
            message?: string;
        };
    };
}

const apiEndpointGet = 'contoh/master/barang/barang-data'
const apiEndpointGetCategoryItems = 'contoh/master/kategori/kategori-data';
const apiEndpointGetWarehouses = 'contoh/master/gudang/gudang-data';

const ItemPickerDialog = ({ visible, onHide, onSelect, multiple = true, priceField = 'harga_jual_1' }: ItemPickerDialogProps) => {
    const toast = useRef<Toast>(null);
    const op = useRef<OverlayPanel>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Main Data State
    const [load, setLoad] = useState<boolean>(false);
    const [data, setData] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [selectedDatas, setSelectedDatas] = useState<any[]>([]);

    // Dropdown Categories State
    const [loadCategories, setLoadCategories] = useState<boolean>(false);
    const [dataCategories, setDataCategories] = useState<any[]>([]);

    // Dropdown Warehouses State
    const [loadWarehouses, setLoadWarehouses] = useState<boolean>(false);
    const [dataWarehouses, setDataWarehouses] = useState<any[]>([]);

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
        if (!selectedWarehouses) return;
        setLoad(true);
        try {
            const oPayload = {
                page: page,
                perPage: rows,
                keyword: apiKeyword,
                sortField: sortField,
                sortOrder: sortOrder,
                filters: {
                    kategori: selectedCategories || null,
                    gudang: selectedWarehouses ? [selectedWarehouses] : null
                }
            };

            const res = await postData(apiEndpointGet, oPayload);
            setData(res.data.data);
            const total = res.data.total_data || res.data.totalRecords || 0;
            setTotalRecords(Number(total));
        } catch (error: unknown) {
            const e = error as ApiError;
            showError(toast, e?.response?.data?.message || e?.message || 'Gagal mengambil data barang');
        } finally {
            setLoad(false);
        }
    };

    const loadWarehousesAndSetDefault = async () => {
        setLoadWarehouses(true);
        try {
            const oPayload = {
                keyword: '',
                sortField: 'kode',
                sortOrder: 'asc'
            };

            const res = await postData(apiEndpointGetWarehouses, oPayload);
            const aWarehouses = res.data.data || [];
            setDataWarehouses(aWarehouses);

            // Set otomatis ke gudang index pertama
            if (aWarehouses.length > 0 && aWarehouses[0]?.kode) {
                setSelectedWarehouses(aWarehouses[0].kode);
            }
        } catch (error: unknown) {
            const e = error as ApiError;
            showError(toast, e?.response?.data?.message || e?.message || 'Gagal memuat data master gudang');
        } finally {
            setLoadWarehouses(false);
        }
    };

    const getDropdownData = async (apiEndpoint: string, setDataState: React.Dispatch<React.SetStateAction<any[] | any[]>>, setLoadState: React.Dispatch<React.SetStateAction<boolean>>): Promise<void> => {
        setLoadState(true);
        try {
            const oPayload = {
                keyword: '',
                sortField: 'kode',
                sortOrder: 'asc'
            };

            const res = await postData(apiEndpoint, oPayload);
            setDataState(res.data.data || []);
        } catch (error: unknown) {
            const e = error as ApiError;
            showError(toast, e?.response?.data?.message || e?.message || 'Gagal memuat data opsi filter');
        } finally {
            setLoadState(false);
        }
    };

    // const getWarehousesAndSetDefault = async () => {
    //     await getDropdownData(apiEndpointGetWarehouses, setDataWarehouses, setLoadWarehouses);

    //     if (dataWarehouses.length > 0 && dataWarehouses[0]?.kode) {
    //         setSelectedWarehouses([dataWarehouses[0].kode]);
    //     }
    // };

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
        if (visible && selectedWarehouses) {
            getData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rows, sortField, sortOrder, apiKeyword, selectedCategories, selectedWarehouses, visible]);

    useEffect(() => {
        if (visible) {
            setSelectedDatas([]);
            setKeyword('');
            setApiKeyword('');
            setSelectedCategories(null);
            setSelectedWarehouses(null);
            setPage(1);
            setFirst(0);

            loadWarehousesAndSetDefault();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const hasActiveFilters = selectedCategories && selectedCategories.length > 0;

    const headerTemplate = (
        <div className="flex flex-column gap-3 w-full pr-4 pt-2">
            <span className="text-xl font-bold text-800 mb-2">Pilih Barang</span>

            <div className="flex align-items-center gap-2 w-full">
                <Button type="button" icon="pi pi-filter" label="Filter" outlined severity={hasActiveFilters ? 'warning' : 'secondary'} onClick={(e) => op.current?.toggle(e)} className="w-auto" />

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
                        placeholder="Ketik untuk mencari nama atau kode barang..."
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
                        if (dataWarehouses.length > 0 && dataWarehouses[0]?.kode) {
                            setSelectedWarehouses(dataWarehouses[0].kode);
                        }
                    }}
                />
                <Dropdown
                    value={selectedWarehouses}
                    options={dataWarehouses}
                    placeholder="Pilih Gudang..."
                    filter
                    optionLabel="keterangan"
                    optionValue="kode"
                    className="w-full md:w-15rem shadow-none"
                    style={{ border: '1px solid #cbd5e1', height: '2.7rem' }}
                    onChange={(e) => {
                        setSelectedWarehouses(e.value);
                        setPage(1);
                        setFirst(0);
                    }}
                    emptyMessage={loadWarehouses ? 'Memuat data...' : 'Tidak ada gudang.'}
                    loading={loadWarehouses}
                />
            </div>

            <OverlayPanel ref={op} style={{ width: '350px' }}>
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
            </OverlayPanel>
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2 pt-3 border-t-1 surface-border">
            <Button label="Batal" icon="pi pi-times" severity="secondary" outlined onClick={onHide} />
            <Button
                label={`Pilih Barang ${selectedDatas.length > 0 ? `(${selectedDatas.length})` : ''}`}
                icon="pi pi-check"
                severity="success"
                disabled={selectedDatas.length === 0}
                onClick={() => {
                    const oActiveWarehouse = dataWarehouses.find((w) => w.kode === selectedWarehouses);
                    const cWarehouseLabel = oActiveWarehouse ? oActiveWarehouse.keterangan : '';

                    const aMappedSelectedDatas = selectedDatas.map((item) => ({
                        ...item,
                        kode_gudang: selectedWarehouses,
                        gudang: cWarehouseLabel
                    }));

                    onSelect(aMappedSelectedDatas);
                    onHide();
                }}
            />
        </div>
    );

    return (
        <Dialog visible={visible} onHide={onHide} modal header={headerTemplate} footer={dialogFooter} style={{ width: '85vw', maxWidth: '1100px' }} breakpoints={{ '960px': '95vw' }} contentStyle={{ padding: '1rem' }}>
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
                    dataKey="kode"
                    loading={load}
                    emptyMessage="Barang tidak ditemukan."
                    rowsPerPageOptions={[5, 10, 20]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    selectionMode="multiple"
                    selection={selectedDatas}
                    onSelectionChange={(e) => setSelectedDatas(e.value as any[])}
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column field="kode" header="Kode" align="center" sortable style={{ minWidth: '8rem' }}></Column>
                    <Column field="nama" header="Nama Barang" style={{ minWidth: '16rem' }}></Column>
                    <Column field="kategori" header="Kategori Barang" style={{ minWidth: '12rem' }}></Column>
                    {/* <Column field="gudang" header="Gudang" body={(r) => r.gudang || '-'} style={{ minWidth: '12rem' }}></Column> */}
                    <Column
                        field="total_stok"
                        header="Stok"
                        align="center"
                        sortable
                        style={{ minWidth: '6rem' }}
                        body={(rowData) => {
                            if (rowData.status_stok === '1') {
                                return (
                                    <span className="font-bold text-blue-600" title="Unlimited Stock">
                                        ∞
                                    </span>
                                );
                            }
                            const nStok = Number(rowData.total_stok) || 0;
                            const bIsNegative = nStok < 0;
                            const cSatuan = rowData.kode_satuan_1 || rowData.keterangan_satuan_1 || 'UNIT';

                            return (
                                <span className={` ${bIsNegative ? 'text-red-500' : 'text-gray-800'}`}>
                                    {nStok.toString()} <span className="text-md text-500 font-normal">{cSatuan}</span>
                                </span>
                            );
                        }}
                    />
                    <Column field={priceField} header="Harga" body={(rowData: any) => formatCurrency(rowData[priceField] ?? 0)} align="right" sortable style={{ minWidth: '10rem' }} />
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
                    dataKey="kode"
                    loading={load}
                    emptyMessage="Barang tidak ditemukan."
                    rowsPerPageOptions={[5, 10, 20]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    selectionMode="single"
                    selection={selectedDatas[0] || null}
                    onSelectionChange={(e) => setSelectedDatas(e.value ? [e.value as any] : [])}
                >
                    <Column selectionMode="single" headerStyle={{ width: '3rem' }} />
                    <Column field="kode" header="Kode" align="center" sortable style={{ minWidth: '8rem' }}></Column>
                    <Column field="nama" header="Nama Barang" style={{ minWidth: '16rem' }}></Column>
                    <Column field="kategori" header="Kategori Barang" style={{ minWidth: '12rem' }}></Column>
                    {/* <Column field="gudang" header="Gudang" body={(r) => r.gudang || '-'} style={{ minWidth: '12rem' }}></Column> */}
                    <Column
                        field="total_stok"
                        header="Stok"
                        align="center"
                        sortable
                        style={{ minWidth: '6rem' }}
                        body={(rowData) => {
                            if (rowData.status_stok === '1') {
                                return (
                                    <span className="font-bold text-blue-600" title="Unlimited Stock">
                                        ∞
                                    </span>
                                );
                            }
                            const nStok = Number(rowData.total_stok) || 0;
                            const bIsNegative = nStok < 0;
                            const cSatuan = rowData.kode_satuan_1 || rowData.keterangan_satuan_1 || 'UNIT';

                            return (
                                <span className={` ${bIsNegative ? 'text-red-500' : 'text-gray-800'}`}>
                                    {nStok.toString()} <span className="text-md text-500 font-normal">{cSatuan}</span>
                                </span>
                            );
                        }}
                    />
                    <Column field="harga_jual_1" header="Harga" body={(rowData: any) => formatCurrency(rowData.harga_jual_1 ?? 0)} align="right" sortable style={{ minWidth: '10rem' }} />
                </DataTable>
            )}
        </Dialog>
    );
};

export default ItemPickerDialog;
