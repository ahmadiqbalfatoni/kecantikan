'use client';

import { DataTable } from 'primereact/datatable';
import { FORMATTER_CONFIG, HEADER_CONFIG, initValue, TableData, TableProps } from '../interfaces';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { formatDateSystem, formatTime, formatTimeStringToDate } from '@/lib/tools/dateTools';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import Form from './form';
import { apiEndpointGet } from '../endpoints';
import { useRef } from 'react';
import postData from '@/lib/axios/postData';
import { transformTableData } from '@/lib/tools/printTools/transformData';

const Table = ({ dataRekap, setDataRekap, state, setState, formik, toast, getData, getDropdownData, getPrintData, onLazyLoad }: TableProps) => {
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-xl font-bold">Tabel Data</span>

            <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                <span className="p-input-icon-left w-full md:w-20rem">
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            value={state.searchVal}
                            className="w-full"
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
                    tooltip="Reset Semua Filter"
                    tooltipOptions={{ position: 'bottom' }}
                    onClick={() => {
                        setState((p) => ({
                            ...p,
                            searchVal: '',
                            keyword: '',
                            page: 1,
                            first: 0
                        }));
                    }}
                />
            </div>
        </div>
    );

    const actionBodyTemplate = (rowData: TableData) => (
        <div className="flex justify-content-center gap-2">
            <Button
                icon="pi pi-pencil"
                outlined
                className="p-button-sm"
                onClick={() => {
                    const mappedValues: Record<string, any> = { ...formik.values };

                    Object.keys(mappedValues).forEach((key) => {
                        const tableKey = key as keyof TableData;

                        if (rowData[tableKey] !== undefined && rowData[tableKey] !== null) {
                            mappedValues[key] = rowData[tableKey];
                        }
                    });

                    if (rowData.kode) {
                        mappedValues.kode = rowData.kode;
                    }
                    if (rowData.waktu_mulai) {
                        mappedValues.waktu_mulai = formatTimeStringToDate(rowData.waktu_mulai);
                    }

                    if (rowData.waktu_selesai) {
                        mappedValues.waktu_selesai = formatTimeStringToDate(rowData.waktu_selesai);
                    }

                    formik.setValues(mappedValues as initValue);
                    setState((p) => ({ ...p, add: false, delete: false, edit: true }));
                }}
                tooltip="Edit"
            />
            <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm" onClick={() => setState((p) => ({ ...p, delete: true, selectedDatas: [rowData] }))} tooltip="Hapus" />
        </div>
    );

    return (
        <>
            <div className="card">
                <div className="flex justify-content-between items-start mb-6">
                    <div className="flex flex-column">
                        <h3 className="text-2xl font-semibold flex align-items-center gap-2">
                            <i className="pi pi-clock text-blue-600 text-3xl"></i>Jam Shift
                        </h3>
                        <p className="text-gray-500">Kelola dan konfigurasi jam operasional shift kerja kasir di setiap cabang toko Anda.</p>
                    </div>
                </div>

                <div className="flex flex-row flex-wrap items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Baru"
                        icon="pi pi-plus"
                        outlined
                        severity="success"
                        onClick={() => {
                            formik.resetForm();
                            setState((p) => ({ ...p, selectedDatas: [], add: true, edit: false }));
                        }}
                    />
                    <Divider layout="vertical" />
                    <Button size="small" label="Cetak" icon="pi pi-print" outlined onClick={() => getPrintData(apiEndpointGet)} loading={dataRekap.load} />
                    <Divider layout="vertical" />
                    <Button
                        size="small"
                        label={`Hapus${state.selectedDatas.length > 0 ? ` (${state.selectedDatas.length})` : ''}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        onClick={() => {
                            if (state.selectedDatas.length < 1) {
                                setState((p) => ({ ...p, selectedDatas: [], delete: false }));
                                return;
                            }
                            setState((p) => ({ ...p, delete: true }));
                        }}
                        disabled={state.selectedDatas.length === 0}
                    />
                    <Divider layout="vertical" />
                    <Button size="small" label="Refresh" icon="pi pi-refresh" outlined onClick={() => getData(apiEndpointGet)} loading={state.load} />
                </div>

                <DataTable
                    value={state.data}
                    scrollable
                    lazy={true}
                    paginator={true}
                    first={state.first}
                    rows={state.rows}
                    totalRecords={state.totalData}
                    onPage={onLazyLoad}
                    onSort={onLazyLoad}
                    sortField={state.sortField}
                    sortOrder={state.sortOrder === 'asc' ? 1 : -1}
                    selectionMode={'multiple'}
                    header={headerTemplate}
                    loading={state.load}
                    selection={state.selectedDatas}
                    onSelectionChange={(e) => setState((p) => ({ ...p, selectedDatas: e.value }))}
                    dataKey="kode"
                    emptyMessage="Data Kosong"
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column field="kode" header="Kode" align="center" sortable style={{ minWidth: '8rem' }}></Column>
                    <Column field="nama" header="Nama" style={{ minWidth: '16rem' }}></Column>
                    <Column field="waktu_mulai" header="Waktu Mulai" body={(rowData) => formatTime(rowData.waktu_mulai)} align="center" sortable style={{ minWidth: '14rem' }}></Column>
                    <Column field="waktu_selesai" header="Waktu Selesai" body={(rowData) => formatTime(rowData.waktu_selesai)} align="center" sortable style={{ minWidth: '14rem' }}></Column>
                    {/* <Column field="status" header="Status" align="center" style={{ minWidth: '10rem' }}></Column> */}
                    <Column field="created_at" header="Waktu Dibuat" body={(rowData) => formatDateSystem(rowData.created_at)} align="center" sortable style={{ minWidth: '14rem' }}></Column>
                    <Column field="updated_at" header="Waktu Diperbarui" body={(rowData) => formatDateSystem(rowData.updated_at)} align="center" sortable style={{ minWidth: '14rem' }}></Column>
                    <Column header="Aksi" body={actionBodyTemplate} align="center" frozen alignFrozen="right" style={{ minWidth: '8rem' }}></Column>
                </DataTable>
            </div>

            <Form getData={getData} getDropdownData={getDropdownData} toast={toast} state={state} setState={setState} formik={formik} />
        </>
    );
};

export default Table;
