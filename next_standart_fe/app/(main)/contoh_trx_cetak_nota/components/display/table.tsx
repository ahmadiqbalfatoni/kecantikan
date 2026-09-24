'use client';

import React, { useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';

import { formatDateSystem, getTzUser } from '@/lib/tools/dateTools';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import postData from '@/lib/axios/postData';

import { TableProps, TableData } from '../interfaces';
import Form from './form'; // Mengimpor Form yang memuat Formik transactional Form
import SalesDialog from '@/app/components/dialogComponents/salesmanDialog';
import { apiEndpointDelete, apiEndpointGetEdit, apiEndpointGetGudang, apiEndpointGetMutasiList } from '../endpoints';
import { Tooltip } from 'primereact/tooltip';
import { useReactToPrint } from 'react-to-print';
import CetakNota from './cetakNota';

const Table = ({
    dataRekap,
    setDataRekap,
    state,
    setState,
    formik,
    toast,
    getData,
    getFilterData,
    getDropdownData,
    getPrintData,
    onLazyLoad
}: TableProps) => {
    const op = useRef<OverlayPanel>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const componentRef = useRef<any>(null);

    const handleTriggerPrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: state.dataNota ? `Nota-Mutasi-${state.dataNota.faktur}` : 'Nota-Mutasi',
        onAfterPrint: () => setState((p) => ({ ...p, dataNota: null, }))
    });

    // Eksekusi Massal / Tunggal Penghapusan Mutasi Stock
    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            if (state.selectedDatas.length < 1) {
                showError(toast, 'Tidak ada data transaksi yang dipilih.');
                return;
            }
            const cFaktur = state.selectedDatas.map(v => v.faktur);
            // const resData = await postData(apiEndpointDelete, { faktur: cFaktur, tz: getTzUser() });
            showSuccess(toast, 'Berhasil menghapus data.');
            getData();
            setState((p) => ({ ...p, selectedDatas: [], add: false, edit: false, jenisMutasi: null, delete: false }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal menghapus transaksi terpilih');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handlePrintNote = async (rowData: TableData) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpointGetEdit, { faktur: rowData.faktur });
            setState((p) => ({ ...p, dataNota: res.data.data }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memuat rincian nota untuk dicetak');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    // Handler Menyiapkan Form Pengeditan Data (Mengambil Detail Aset dari BE)
    const handleEditClick = async (rowData: TableData) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const res = await postData(apiEndpointGetEdit, { faktur: rowData.faktur });
            formik.setValues(res.data.data);
            setState((p) => ({ ...p, add: false, edit: true, delete: false, jenisMutasi: null }));
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengambil rincian mutasi untuk diedit');
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
                onClick={() => setState((p) => ({ ...p, delete: false }))}
                disabled={state.load}
            />
            <Button
                label="Ya, Batalkan"
                icon="pi pi-trash"
                severity="danger"
                onClick={handleDelete}
                loading={state.load}
            />
        </div>
    );



    // Toolbar Header Template dengan Kalender Periode di Sisi Kiri
    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-3">
            {/* SISI KIRI: Filter Periode Mutasi Tanggal Utama di Luar */}
            <div className="flex align-items-center flex-wrap gap-2">
                <div className="flex align-items-center gap-2">
                    <span className="text-xs font-bold text-600">Periode Mutasi:</span>
                    <Calendar
                        value={state.tanggalAwal ? new Date(state.tanggalAwal) : null}
                        onChange={(e) => {
                            const val = e.value ? formatDateSystem(e.value, 'yyyy-MM-dd') : '';
                            setState((p) => ({ ...p, tanggalAwal: val || '', page: 1, first: 0 }));
                        }}
                        dateFormat="yy-mm-dd"
                        showIcon
                        placeholder="Mulai Tanggal"
                        className="w-11rem text-sm"
                    />
                    <span className="text-xs text-500 font-bold">s.d</span>
                    <Calendar
                        value={state.tanggalAkhir ? new Date(state.tanggalAkhir) : null}
                        onChange={(e) => {
                            const val = e.value ? formatDateSystem(e.value, 'yyyy-MM-dd') : '';
                            setState((p) => ({ ...p, tanggalAkhir: val || '', page: 1, first: 0 }));
                        }}
                        dateFormat="yy-mm-dd"
                        showIcon
                        placeholder="Akhir Tanggal"
                        className="w-11rem text-sm"
                    />
                </div>
            </div>

            {/* SISI KANAN: Filter Modal (Gudang & Petugas), Kolom Cari, & Reset */}
            <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                <Button
                    type="button"
                    icon="pi pi-filter"
                    label="Filter"
                    outlined
                    severity={
                        state.selectedGudangKirim ||
                            state.selectedGudangTerima ||
                            state.selectedPetugasKirim ||
                            state.selectedPetugasTerima
                            ? 'warning'
                            : 'secondary'
                    }
                    onClick={(e) => {
                        const isCurrentlyOpen = op.current?.getElement() !== null;
                        op.current?.toggle(e);

                        if (!isCurrentlyOpen) {
                            getFilterData(apiEndpointGetGudang, 'gudangOptions');
                        }
                    }}
                />

                <span className="p-input-icon-left w-full md:w-18rem">
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            value={state.searchVal}
                            className="w-full text-sm"
                            placeholder="Cari No. Faktur..."
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
                        const rangeBulanIni = new Date();
                        setState((p) => ({
                            ...p,
                            searchVal: '',
                            keyword: '',
                            tanggalAwal: new Date(rangeBulanIni.getFullYear(), rangeBulanIni.getMonth(), 1),
                            tanggalAkhir: rangeBulanIni,
                            selectedGudangKirim: null,
                            selectedGudangTerima: null,
                            selectedPetugasKirim: null,
                            selectedPetugasTerima: null,
                            page: 1,
                            first: 0
                        }));
                    }}
                />
            </div>

            {/* OVERLAY PANEL: Filter Multi-Dropdown & Pencarian Dialog Staff */}
            <OverlayPanel ref={op} style={{ width: '420px' }}>
                <div className="flex flex-column gap-3">
                    <span className="font-bold text-lg border-bottom-1 border-300 pb-2">Filter Spesifik</span>

                    <div className="flex flex-column gap-3">
                        {/* Dropdown Gudang Asal */}
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Gudang Pengirim</label>
                            <Dropdown
                                value={state.selectedGudangKirim}
                                options={state.gudangOptions}
                                optionLabel="keterangan"
                                optionValue="kode"
                                placeholder="Semua Gudang Asal"
                                filter
                                showClear
                                className="w-full text-sm"
                                onChange={(e) => {
                                    setState((p) => ({ ...p, selectedGudangKirim: e.value, page: 1, first: 0 }));
                                }}
                            />
                        </div>

                        {/* Dropdown Gudang Tujuan */}
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Gudang Penerima</label>
                            <Dropdown
                                value={state.selectedGudangTerima}
                                options={state.gudangOptions}
                                optionLabel="keterangan"
                                optionValue="kode"
                                placeholder="Semua Gudang Tujuan"
                                filter
                                showClear
                                className="w-full text-sm"
                                onChange={(e) => {
                                    setState((p) => ({ ...p, selectedGudangTerima: e.value, page: 1, first: 0 }));
                                }}
                            />
                        </div>

                        {/* Dialog Pencarian Petugas Pengirim */}
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Petugas Pengirim</label>
                            <div className="p-inputgroup">
                                <InputText
                                    readOnly
                                    value={state.selectedPetugasKirim || ''}
                                    placeholder="Pilih Petugas Kirim..."
                                    className="text-sm"
                                />
                                <Button
                                    type="button"
                                    icon="pi pi-search"
                                    onClick={() => setState(p => ({ ...p, showPetugasDialog: true, whichPetugasTarget: 'kirim' }))}
                                />
                                {state.selectedPetugasKirim && (
                                    <Button
                                        type="button"
                                        icon="pi pi-times"
                                        severity="danger"
                                        onClick={() => setState(p => ({ ...p, selectedPetugasKirim: null, page: 1, first: 0 }))}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Dialog Pencarian Petugas Penerima */}
                        <div className="flex flex-column gap-2 w-full">
                            <label className="font-semibold text-sm">Petugas Penerima</label>
                            <div className="p-inputgroup">
                                <InputText
                                    readOnly
                                    value={state.selectedPetugasTerima || ''}
                                    placeholder="Pilih Petugas Terima..."
                                    className="text-sm"
                                />
                                <Button
                                    type="button"
                                    icon="pi pi-search"
                                    onClick={() => setState(p => ({ ...p, showPetugasDialog: true, whichPetugasTarget: 'terima' }))}
                                />
                                {state.selectedPetugasTerima && (
                                    <Button
                                        type="button"
                                        icon="pi pi-times"
                                        severity="danger"
                                        onClick={() => setState(p => ({ ...p, selectedPetugasTerima: null, page: 1, first: 0 }))}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );

    // Template Render Badge Status Penerimaan (Kirim vs Terima)
    const statusBodyTemplate = (rowData: TableData) => {
        const isReceived = rowData.status_penerimaan === 'Sudah Diterima';
        return <Tag severity={isReceived ? 'success' : 'danger'} value={rowData.status_penerimaan} />;
    };

    const actionBodyTemplate = (rowData: TableData) => {
        return (
            <div className="flex justify-content-center gap-2">
                {state.activeTab === 0 && (
                    <Button
                        icon="pi pi-print"
                        outlined
                        severity='info'
                        className="p-button-sm"
                        onClick={() => handlePrintNote(rowData)}
                        tooltip="Cetak Slip"
                    />
                )}
                <Button
                    disabled={!rowData.allow_update}
                    icon="pi pi-pencil"
                    outlined
                    className="p-button-sm"
                    onClick={() => handleEditClick(rowData)}
                    tooltip="Edit Mutasi"
                />
                <Button
                    disabled={!rowData.allow_delete}
                    icon="pi pi-trash"
                    outlined
                    severity="danger"
                    className="p-button-sm"
                    onClick={() => setState((p) => ({ ...p, delete: true, selectedDatas: [rowData as any] }))}
                    tooltip="Hapus / Batalkan"
                />
            </div>
        );
    };

    const fakturBodyTemplate = (rowData: TableData) => {
        const isReceived = rowData.status_penerimaan === 'Sudah Diterima' || state.activeTab === 1;
        const statusLabel = isReceived ? 'Sudah Diterima' : 'Belum Diterima';
        const boxColor = isReceived ? 'bg-green-500' : 'bg-red-500';

        return (
            <div className="flex align-items-center gap-3">
                <span
                    className={`block border-round-sm flex-shrink-0 status-box-tooltip ${boxColor}`}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    data-pr-tooltip={statusLabel}
                ></span>
                <span className="font-semibold text-color">{rowData.faktur}</span>
            </div>
        );
    };

    useEffect(() => {
        if (state.dataNota) {
            handleTriggerPrint();
        }
    }, [state.dataNota]);

    if ((state.add && state.jenisMutasi) || state.edit) {
        return (
            <Form
                getData={getData}
                getDropdownData={getDropdownData}
                toast={toast}
                state={state}
                setState={setState}
                formik={formik}
            />
        );
    }

    return (
        <>
            <div className="card">
                <div className="flex justify-content-between items-start mb-6">
                    <div className="flex flex-column">
                        <h3 className="text-2xl font-semibold flex align-items-center gap-2">
                            <i className="pi pi-sort-alt text-blue-600 text-3xl"></i>Mutasi Antar Gudang
                        </h3>
                        <p className="text-gray-500">Kirim dan terima log perpindahan persediaan stok internal gudang secara real-time.</p>
                    </div>
                </div>

                {/* Tab Switcher Mutasi */}
                <div className="flex gap-2 mb-4 bg-gray-100 p-2 border-round-xl w-fit">
                    <Button
                        label="Kirim Stock (BK)"
                        icon="pi pi-external-link"
                        className={`p-button-sm ${state.activeTab === 0 ? 'p-button-primary' : 'p-button-text text-gray-700'}`}
                        onClick={() => setState((p) => ({ ...p, activeTab: 0 }))}
                    />
                    <Button
                        label="Terima Stock (BA)"
                        icon="pi pi-box"
                        className={`p-button-sm ${state.activeTab === 1 ? 'p-button-primary' : 'p-button-text text-gray-700'}`}
                        onClick={() => setState((p) => ({ ...p, activeTab: 1 }))}
                    />
                </div>

                <div className="flex flex-row flex-wrap items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Baru"
                        icon="pi pi-plus"
                        outlined
                        severity="success"
                        onClick={() => setState((p) => ({ ...p, add: true }))} // Membuka Dialog Pop-up Pilihan BK/BA
                    />
                    <Divider layout="vertical" />
                    <Button
                        size="small"
                        label="Cetak"
                        icon="pi pi-print"
                        outlined
                        onClick={() => getPrintData()}
                        loading={dataRekap.load}
                    />
                    <Divider layout="vertical" />
                    <Button
                        size="small"
                        label={`Hapus ${state.selectedDatas.length > 0 ? ` (${state.selectedDatas.length})` : ''}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        onClick={() => {
                            if (state.selectedDatas.length < 1) return;
                            setState((p) => ({ ...p, delete: true }));
                        }}
                        disabled={state.selectedDatas.length === 0}
                    />
                    <Divider layout="vertical" />
                    <Button
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        onClick={() => getData()}
                        loading={state.load}
                    />
                </div>

                {/* BOX KETERANGAN STATUS (LEGEND) MUTASI */}
                <div className="flex flex-wrap align-items-center gap-4 mb-3 p-3 surface-50 border-round-xl border-1 surface-border">
                    <span className="flex align-items-center text-xs font-bold text-500 uppercase tracking-wider mr-2">
                        <i className="pi pi-info-circle mr-2"></i> Keterangan Status Mutasi:
                    </span>

                    <div className="flex align-items-center gap-2">
                        <span className="block bg-green-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Sudah Diterima</span>
                    </div>

                    <div className="flex align-items-center gap-2">
                        <span className="block bg-red-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Belum Diterima</span>
                    </div>
                </div>
                <Tooltip target=".status-box-tooltip" position="top" style={{ whiteSpace: 'nowrap' }} />

                <DataTable
                    value={state.data}
                    scrollable
                    lazy={true}
                    paginator={true}
                    first={state.first}
                    rows={state.rows}
                    totalRecords={state.totalRecords}
                    onPage={onLazyLoad}
                    onSort={onLazyLoad}
                    sortField={state.sortField}
                    sortOrder={state.sortOrder === 'asc' ? 1 : -1}
                    selectionMode={'multiple'}
                    header={headerTemplate}
                    loading={state.load}
                    selection={state.selectedDatas}
                    onSelectionChange={(e) => {
                        const selectableRows = (e.value || []).filter((row: TableData) => row.allow_delete);
                        setState((p) => ({ ...p, selectedDatas: selectableRows }));
                    }}
                    isDataSelectable={(e) => e.data.allow_delete}
                    dataKey="faktur"
                    emptyMessage="Data Mutasi Kosong"
                    rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} mutasi"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column field="faktur" header="FAKTUR" align="left" body={fakturBodyTemplate} style={{ minWidth: '14rem' }} sortable />
                    <Column field="tanggal_transaksi" header="TANGGAL" body={(r) => formatDateSystem(r.tanggal_transaksi, 'dd-MM-yyyy')} align="center" style={{ minWidth: '10rem' }} sortable />
                    {/* Render Bersyarat Berdasarkan Tab Aktif */}
                    {state.activeTab === 1 && (
                        <Column field="faktur_terima" header="FAKTUR ASAL" align="center" style={{ minWidth: '11rem' }} />
                    )}

                    <Column field="ket_gudang_kirim" header="GUDANG ASAL" style={{ minWidth: '14rem' }} />
                    <Column field="ket_gudang_terima" header="GUDANG TUJUAN" style={{ minWidth: '14rem' }} />

                    {state.activeTab === 0 ? (
                        <Column field="petugas_kirim" header="PETUGAS KIRIM" style={{ minWidth: '11rem' }} />
                    ) : (
                        <Column field="petugas_terima" header="PETUGAS TERIMA" style={{ minWidth: '11rem' }} />
                    )}

                    {state.activeTab === 0 && (
                        <Column field="faktur_terima" header="FAKTUR PENERIMA" body={(r) => r.faktur_terima || '-'} align="center" style={{ minWidth: '11rem' }} />
                    )}

                    <Column field="username_operator" header="OPERATOR" style={{ minWidth: '10rem' }} />
                    <Column header="AKSI" align="center" frozen alignFrozen="right" style={{ minWidth: '8rem' }} body={actionBodyTemplate} />
                </DataTable>
            </div>

            {/* Dialog Pop-up Jenis Pembuatan Mutasi Baru */}
            <Dialog visible={state.add} header="Pilih Jenis Mutasi" modal style={{ width: '400px' }} onHide={() => setState((p) => ({ ...p, add: false }))}>
                <div className="flex flex-column gap-3 py-2">
                    <Button
                        label="Kirim Stock ke Gudang Lain"
                        icon="pi pi-external-link"
                        className="bg-green-600 border-green-600 w-full text-sm py-3"
                        onClick={() => {
                            formik.resetForm();
                            setState((p) => ({ ...p, selectedDatas: [], add: true, edit: false, jenisMutasi: 'kirim' }));
                        }}
                    />
                    <Button
                        label="Terima Stock dari Gudang Lain"
                        icon="pi pi-box"
                        className="bg-blue-600 border-blue-600 w-full text-sm py-3"
                        onClick={() => {
                            formik.resetForm();
                            setState((p) => ({ ...p, selectedDatas: [], add: true, edit: false, jenisMutasi: 'terima' }));
                        }}
                    />
                </div>
            </Dialog>

            {/* Dialog Konfirmasi Hapus */}
            <Dialog header="Konfirmasi Hapus" visible={state.delete} onHide={() => setState((p) => ({ ...p, delete: false }))} modal style={{ width: '25rem' }} footer={deleteFooterTemplate}>
                <div className="flex flex-column align-items-center text-center gap-4 py-4">
                    <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
                    <div>
                        <h3 className="font-bold mb-2">Hapus data ini?</h3>
                        <p className="text-color-secondary">
                            Yakin ingin menghapus Faktur: <br />
                            <strong>{state.selectedDatas.map(v => v.faktur).join(', ')}</strong>
                            <br />
                            <br />
                            Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                </div>
            </Dialog>

            {/* Dialog Pencarian Petugas (Staff/Karyawan F9) */}
            <SalesDialog
                visible={state.showPetugasDialog}
                multiple={false}
                onSelect={(event) => {
                    const selectedStaff = event[0];
                    if (state.whichPetugasTarget === 'kirim') {
                        setState(p => ({
                            ...p,
                            selectedPetugasKirim: selectedStaff.kode,
                            selectedNamaPetugasKirim: selectedStaff.nama,
                            showPetugasDialog: false,
                            page: 1,
                            first: 0
                        }));
                    } else {
                        setState(p => ({
                            ...p,
                            selectedPetugasTerima: selectedStaff.kode,
                            selectedNamaPetugasTerima: selectedStaff.nama,
                            showPetugasDialog: false,
                            page: 1,
                            first: 0
                        }));
                    }
                }}
                onHide={() => setState((p) => ({ ...p, showPetugasDialog: false }))}
            />

            <CetakNota ref={componentRef} data={state.dataNota} />
        </>
    );
};

export default Table;