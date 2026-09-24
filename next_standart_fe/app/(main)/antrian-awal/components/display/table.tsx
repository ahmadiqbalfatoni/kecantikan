'use client';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Divider } from 'primereact/divider';
import { TableData, TableProps } from '../interfaces';
import { apiEndpointData } from '../endpoints';

const STATUS_DOT: Record<string, { color: string; label: string }> = {
    tersedia:  { color: '#22c55e', label: 'Tersedia'  },
    diambil:   { color: '#3b82f6', label: 'Diambil'   },
    dipanggil: { color: '#f59e0b', label: 'Dipanggil' },
    selesai:   { color: '#94a3b8', label: 'Selesai'   },
    nonaktif:  { color: '#ef4444', label: 'Nonaktif'  },
};
import Form from './form';
import { useRef } from 'react';
import { formatDateSystem } from '@/lib/tools/dateTools';

const Table = ({ state, setState, formik, toast, getData, getGridData, onLazyLoad }: TableProps) => {
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const kodeWithDotTemplate = (rowData: TableData) => {
        const sq = STATUS_DOT[rowData.status] || { color: '#94a3b8', label: rowData.status };
        return (
            <div className="flex align-items-center gap-2">
                <span
                    title={sq.label}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        backgroundColor: sq.color,
                        flexShrink: 0,
                        border: `2px solid ${sq.color}aa`,
                        boxShadow: `0 1px 4px ${sq.color}55`,
                    }}
                />
                <span className="font-mono text-sm font-semibold">{rowData.kode_antrian}</span>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex justify-content-center gap-2">
            <Button
                icon="pi pi-pencil"
                outlined
                className="p-button-sm border-round-md"
                tooltip="Edit"
                onClick={() => {
                    formik.setValues({
                        kode_antrian: rowData.kode_antrian,
                        no_antrian: rowData.no_antrian,
                        status: rowData.status,
                        tz: '',
                    });
                    setState((p) => ({ ...p, add: false, edit: true, delete: false }));
                }}
            />
            <Button
                icon="pi pi-trash"
                outlined
                severity="danger"
                className="p-button-sm border-round-md"
                tooltip="Hapus"
                onClick={() => setState((p) => ({ ...p, delete: true, selectedDatas: [rowData] }))}
            />
        </div>
    );

    const headerTemplate = (
        <div className="flex flex-column gap-3">
            {/* Baris atas: judul + pencarian */}
            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-xl font-bold">Data Master Nomor Antrian</span>
                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                    <span className="p-input-icon-left w-full md:w-20rem">
                        <IconField iconPosition="left">
                            <InputIcon className="pi pi-search" />
                            <InputText
                                value={state.searchVal}
                                className="w-full text-sm"
                                placeholder="Cari Data..."
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setState((p) => ({ ...p, searchVal: value }));
                                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                    searchTimeoutRef.current = setTimeout(() => {
                                        setState((p) => ({ ...p, keyword: value, page: 1, first: 0 }));
                                    }, 500);
                                }}
                            />
                        </IconField>
                    </span>
                    <Button
                        type="button"
                        icon="pi pi-filter-slash"
                        outlined
                        severity="danger"
                        tooltip="Reset Filter"
                        tooltipOptions={{ position: 'bottom' }}
                        onClick={() => setState((p) => ({ ...p, searchVal: '', keyword: '', page: 1, first: 0 }))}
                    />
                </div>
            </div>
            {/* Legenda warna status */}
            <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                <span className="flex align-items-center gap-1">
                    <i className="pi pi-info-circle" />
                    <span className="font-semibold">KETERANGAN STATUS:</span>
                </span>
                {Object.entries(STATUS_DOT).map(([key, val]) => (
                    <span key={key} className="flex align-items-center gap-1">
                        <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor: val.color, boxShadow:`0 1px 3px ${val.color}55` }} />
                        {val.label}
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-list text-purple-600 text-2xl" />
                        Kelola Master Nomor Antrian
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan nomor kartu antrian fisik klinik.
                    </p>
                </div>

                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Baru"
                        icon="pi pi-plus"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        onClick={() => {
                            formik.resetForm();
                            setState((p) => ({ ...p, add: true, bulkAdd: false, edit: false, selectedDatas: [] }));
                        }}
                    />
                    <Button
                        size="small"
                        label="Tambah Cepat"
                        icon="pi pi-bolt"
                        outlined
                        severity="info"
                        className="border-round-md font-medium px-3"
                        tooltip="Buat banyak nomor antrian sekaligus (contoh: 01 sampai 50)"
                        onClick={() => {
                            setState((p) => ({ ...p, bulkAdd: true, add: false, edit: false, selectedDatas: [] }));
                        }}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label={`Hapus${state.selectedDatas.length > 0 ? ` (${state.selectedDatas.length})` : ''}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        disabled={state.selectedDatas.length === 0}
                        className="border-round-md font-medium px-3"
                        onClick={() => {
                            if (state.selectedDatas.length < 1) return;
                            setState((p) => ({ ...p, delete: true }));
                        }}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        loading={state.load}
                        onClick={() => getData(apiEndpointData)}
                    />
                </div>

                <DataTable
                    value={state.data}
                    scrollable
                    lazy
                    paginator
                    first={state.first}
                    rows={state.rows}
                    totalRecords={state.totalData}
                    onPage={onLazyLoad}
                    onSort={onLazyLoad}
                    sortField={state.sortField}
                    sortOrder={state.sortOrder === 'asc' ? 1 : -1}
                    selectionMode="multiple"
                    header={headerTemplate}
                    loading={state.load}
                    selection={state.selectedDatas}
                    onSelectionChange={(e) => setState((p) => ({ ...p, selectedDatas: e.value }))}
                    dataKey="kode_antrian"
                    emptyMessage="Data Kosong"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column field="kode_antrian" header="Kode" body={kodeWithDotTemplate} align="left" style={{ minWidth: '11rem' }} headerStyle={{ paddingLeft: 'calc(1rem + 30px)' }} />
                    <Column field="no_antrian" header="No. Antrian" align="center" sortable style={{ minWidth: '8rem' }} />
                    <Column field="created_at" header="Dibuat" body={(r) => formatDateSystem(r.created_at)} align="center" sortable style={{ minWidth: '14rem' }} />
                    <Column field="updated_at" header="Diperbarui" body={(r) => formatDateSystem(r.updated_at)} align="center" sortable style={{ minWidth: '14rem' }} />
                    <Column header="Aksi" body={actionBodyTemplate} align="center" frozen alignFrozen="right" style={{ minWidth: '8rem' }} />
                </DataTable>
            </div>

            <Form state={state} setState={setState} formik={formik} toast={toast} getData={getData} getGridData={getGridData} />
        </>
    );
};

export default Table;
