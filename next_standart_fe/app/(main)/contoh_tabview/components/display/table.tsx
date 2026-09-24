'use client';

import { DataTable } from 'primereact/datatable';
import { initValue, TableData, TableProps } from '../interfaces';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { formatDateSystem, getTzUser } from '@/lib/tools/dateTools';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { OverlayPanel } from 'primereact/overlaypanel';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import Form from './form';
import { apiEndpointGet, apiEndpointGetSupplierCategories, apiEndpointDelete } from '../endpoints';
import { useRef } from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { Dialog } from 'primereact/dialog';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';

const Table = ({ dataRekap, setDataRekap, state, setState, formik, toast, getData, getPrintData, getDropdownData, getFilterData, onLazyLoad }: TableProps) => {
    const op = useRef<OverlayPanel>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    if (state.add || state.edit) {
        return <Form getData={getData} getDropdownData={getDropdownData} toast={toast} state={state} setState={setState} formik={formik} />;
    }

    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));

        try {
            if (state.selectedDatas.length < 1) {
                showError(toast, 'Tidak ada data yang dipilih.');
                return;
            }

            const vaCode = state.selectedDatas.map((v) => v.kode);

            const vaData = await postData(apiEndpointDelete, { kode: vaCode, tz: getTzUser() });
            const res = vaData.data;

            showSuccess(toast, res.message || res.data?.message || 'Berhasil menghapus data.');
            setState((p) => ({ ...p, selectedDatas: [], add: false, edit: false, delete: false }));
            await getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan.');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const deleteFooterTemplate = (
        <div className="flex justify-content-center gap-2">
            <Button
                label="Batal"
                icon="pi pi-times"
                severity="secondary"
                outlined
                onClick={() => {
                    setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                }}
                disabled={state.load}
            />
            <Button label="Ya, Hapus" icon="pi pi-trash" severity="danger" onClick={handleDelete} loading={state.load} />
        </div>
    );

    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-xl font-bold">Tabel Data</span>

            <div className="flex gap-2">
                <Button
                    type="button"
                    icon="pi pi-filter"
                    label="Filter"
                    outlined
                    loading={state.filterLoad}
                    severity={state.selectedSupplierCategories && state.selectedSupplierCategories.length > 0 ? 'warning' : 'secondary'}
                    onClick={(e) => {
                        op.current?.toggle(e);
                        getFilterData(apiEndpointGetSupplierCategories, 'supplierCategoriesOptions');
                    }}
                />

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
                            selectedSupplierCategories: null,
                            page: 1,
                            first: 0
                        }));
                    }}
                />
            </div>

            <OverlayPanel ref={op} style={{ width: '350px' }}>
                <div className="flex flex-column gap-3">
                    <span className="font-bold text-lg border-bottom-1 border-300 pb-2">Filter Spesifik</span>

                    <div className="flex flex-column gap-3">
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Kategori Supplier</label>

                            <MultiSelect
                                value={state.selectedSupplierCategories}
                                options={state.supplierCategoriesOptions}
                                optionLabel="keterangan"
                                optionValue="kode"
                                placeholder="Pilih Kategori"
                                filter
                                maxSelectedLabels={3}
                                display="chip"
                                className="w-full"
                                onChange={(e) => {
                                    setState((p) => ({
                                        ...p,
                                        selectedSupplierCategories: e.value,
                                        page: 1,
                                        first: 0
                                    }));
                                }}
                            />
                        </div>
                    </div>
                </div>
            </OverlayPanel>
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

                    if (rowData.kode) mappedValues.kode = rowData.kode;
                    if (rowData.updated_by_fullname) mappedValues.updated_by_fullname = rowData.updated_by_fullname;
                    if (rowData.created_by_fullname) mappedValues.created_by_fullname = rowData.created_by_fullname;
                    if (rowData.updated_at) mappedValues.updated_at = formatDateSystem(rowData.updated_at);

                    formik.setValues(mappedValues as initValue);
                    setState((p) => ({ ...p, add: false, delete: false, edit: true }));
                }}
                tooltip="Edit"
            />
            <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm" onClick={() => setState((p) => ({ ...p, delete: true, selectedDatas: [rowData] }))} tooltip="Hapus" />
        </div>
    );

    const alamatBodyTemplate = (rowData: TableData) => {
        const alamat = rowData.alamat || '-';
        return (
            <div className="white-space-nowrap overflow-hidden text-overflow-ellipsis" title={alamat} style={{ maxWidth: '16rem' }}>
                {alamat}
            </div>
        );
    };

    return (
        <>
            <div className="card">
                <div className="flex justify-content-between items-start mb-6">
                    <div className="flex flex-column">
                        <h3 className="text-2xl font-semibold flex align-items-center gap-2">
                            <i className="pi pi-fw pi-users text-blue-600 text-3xl"></i>Daftar Supplier
                        </h3>
                        <p className="text-gray-500">Kelola data supplier Anda dengan mudah dan efisien.</p>
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
                    <Column field="nama" header="Nama Supplier" sortable style={{ minWidth: '16rem' }}></Column>
                    <Column field="kategori" header="Kategori" style={{ minWidth: '12rem' }}></Column>
                    <Column field="telepon" header="No. Telepon" style={{ minWidth: '11rem' }}></Column>
                    <Column field="alamat" header="Alamat" body={alamatBodyTemplate} style={{ minWidth: '18rem' }}></Column>
                    <Column field="created_at" header="Waktu Dibuat" body={(rowData) => formatDateSystem(rowData.created_at)} align="center" sortable style={{ minWidth: '14rem' }}></Column>
                    <Column field="updated_at" header="Waktu Diperbarui" body={(rowData) => formatDateSystem(rowData.updated_at)} align="center" sortable style={{ minWidth: '14rem' }}></Column>
                    <Column header="Aksi" body={actionBodyTemplate} align="center" frozen alignFrozen="right" style={{ minWidth: '8rem' }}></Column>
                </DataTable>
            </div>

            {/* Dialog Hapus */}
            <Dialog header="Konfirmasi Hapus" visible={state.delete} onHide={() => setState((p) => ({ ...p, add: false, edit: false, delete: false }))} modal style={{ width: '25rem' }} footer={deleteFooterTemplate}>
                <div className="flex flex-column align-items-center text-center gap-4 py-4">
                    <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
                    <div>
                        <h3 className="font-bold mb-2">{state.selectedDatas.length > 1 ? `Hapus ${state.selectedDatas.length} data?` : 'Hapus data ini?'}</h3>
                        <p className="text-color-secondary">
                            {state.selectedDatas.length > 1 ? (
                                `Anda akan menghapus ${state.selectedDatas.length} item secara permanen.`
                            ) : (
                                <>
                                    Anda akan menghapus item: <br />
                                    <strong>
                                        {state.selectedDatas[0]?.kode || ''} - {state.selectedDatas[0]?.nama || ''}
                                    </strong>
                                </>
                            )}
                            <br />
                            <br />
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default Table;
