/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';

import { FormProps, InitValue, DetailData } from '../interfaces';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { getTzUser, formatDateSystem } from '@/lib/tools/dateTools';
import postData from '@/lib/axios/postData';

// Dialog pickers
import SalesDialog from '@/app/components/dialogComponents/salesmanDialog';
import ItemPickerDialog from '@/app/components/dialogComponents/itemPickerDialog';

// Endpoints (Silakan sesuaikan impor atau jalurnya jika diperlukan)
import {
    apiEndpointCreate,
    apiEndpointUpdate,
    apiEndpointGetGudang,
    apiEndpointGetBarang
} from '../endpoints';
import FakturKirimGudangDialog from '@/app/components/dialogComponents/fakturKirimGudangDialog';

const Form = ({ state, setState, formik, toast, getData, getDropdownData }: FormProps) => {
    const detailsRef = useRef(formik.values.detail);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    // Menentukan jenis operasi mutasi saat ini
    const isKirim = state.jenisMutasi === 'kirim' || (state.edit && state.activeTab === 0);
    const isTerima = state.jenisMutasi === 'terima' || (state.edit && state.activeTab === 1);

    const isFormFieldInvalid = (name: keyof InitValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof InitValue) => {
        const error = formik?.errors[name];
        return isFormFieldInvalid(name) && typeof error === 'string' ? (
            <small className="p-error text-xs block mt-1">{error}</small>
        ) : (
            <></>
        );
    };

    // --- MANAJEMEN BARIS DETAIL BARANG ---
    const handleDeleteRow = (kode: string) => {
        const updatedDetail = (detailsRef.current || []).filter((d) => d.kode_barang !== kode);
        formik.setFieldValue('detail', updatedDetail);
    };

    const handleCommitChange = (kode: string, field: 'qty_kirim' | 'qty_terima', value: number) => {
        const updated = (detailsRef.current || []).map((item) => {
            if (item.kode_barang === kode) {
                return { ...item, [field]: value };
            }
            return item;
        });
        formik.setFieldValue('detail', updated, false);
    };

    // --- PENCARIAN BARCODE & PICKER ---
    const handleBarcodeEnter = async (barcode: string) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const oPayload = {
                // barcode: barcode,
                kode: barcode,
            };

            // const res = await postData(apiEndpointGetBarang, oPayload);
            // const foundItems = res.data?.data || [];

            // handleItemAdded([foundItems]);
            showSuccess(toast, `Produk berhasil ditambahkan ke rincian.`);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memproses pencarian barcode produk.');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleItemAdded = (selectedItems: any[]) => {
        const currentDetails = [...(formik.values.detail || [])];

        selectedItems.forEach((newItem) => {
            const existingIndex = currentDetails.findIndex((d) => d.kode_barang === newItem.kode);

            if (existingIndex > -1) {
                const targetItem = { ...currentDetails[existingIndex] };
                if (isKirim) {
                    targetItem.qty_kirim = (targetItem.qty_kirim || 0) + 1;
                } else if (isTerima) {
                    targetItem.qty_terima = (targetItem.qty_terima || 0) + 1;
                }
                currentDetails[existingIndex] = targetItem;
            } else {
                const newDetail: DetailData = {
                    barcode: newItem.barcode || '',
                    kode_barang: newItem.kode || newItem.kode_barang || '',
                    nama_barang: newItem.nama || newItem.nama_barang || '',
                    satuan: newItem.satuan || newItem.kode_satuan || 'PCS',
                    sisa_stok: newItem.sisa_stok || newItem.stock || 0,
                    qty_kirim: isKirim ? 1 : 0,
                    qty_terima: isTerima ? 1 : 0
                };
                currentDetails.push(newDetail);
            }
        });

        formik.setFieldValue('detail', currentDetails);
    };

    // --- HANDLER SIMPAN ---
    const handleSave = async (input: InitValue) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const isEdit = Boolean(state.edit);
            const targetEndpoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;

            const payload = {
                ...input,
                tanggal_transaksi: formatDateSystem(input.tanggal_transaksi, 'yyyy-MM-dd'),
                jenis_mutasi: isKirim ? 'Kirim' : 'Terima',
                tz: getTzUser()
            };

            // const res = await postData(targetEndpoint, payload);
            showSuccess(toast, 'Berhasil menyimpan transaksi mutasi.');
            handleCancel();
            if (getData) await getData();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal menyimpan transaksi mutasi.');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleCancel = () => {
        setState((p) => ({ ...p, add: false, edit: false, jenisMutasi: null }));
        formik.resetForm();
    };

    // Sinkronisasi referensi baris item detail
    useEffect(() => {
        detailsRef.current = formik.values.detail;
    }, [formik.values.detail]);

    useEffect(() => {
        if (getDropdownData && state.gudangOptions.length == 0) {
            getDropdownData(apiEndpointGetGudang, 'gudangOptions', 'gudangsLoad');
        }
    }, [state.add, state.edit]);

    return (
        <div className="card">
            {/* Header Dokumen */}
            <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-5 gap-3 border-bottom-1 border-100 pb-4">
                <div className="flex flex-column">
                    <h3 className="text-2xl font-bold text-900 m-0 flex align-items-center gap-2">
                        <i className={`pi ${isKirim ? 'pi-external-link text-green-600' : 'pi-box text-blue-600'} text-3xl`}></i>
                        <span>{state.edit ? 'Edit Dokumen Mutasi' : 'Buat Dokumen Mutasi Baru'}</span>
                    </h3>
                    <p className="text-sm text-500 mt-1">
                        Formulir {isKirim ? 'Pengiriman Stok Cabang/Internal (BK)' : 'Penerimaan Stok Cabang/Internal (BA)'}
                    </p>
                </div>
            </div>

            <form onSubmit={formik.handleSubmit}>
                {/* PANEL METADATA: DIDESAIN KANAN KIRI / SPLIT 1 BARIS */}
                <div className="surface-card p-4 border-round-xl border-1 surface-border mb-4">
                    <span className="text-base font-bold text-gray-900 border-bottom-1 surface-border pb-2 mb-4 block">
                        <i className="pi pi-file-edit text-blue-500 mr-2"></i>Informasi Dokumen Mutasi
                    </span>

                    <div className="grid">
                        {/* SISI KIRI: METADATA UTAMA */}
                        <div className="col-12 md:col-6 flex flex-column gap-3 pr-2 md:pr-4 border-right-none md:border-right-1 surface-border">
                            <div className="flex flex-column gap-2">
                                <label className="font-bold text-xs text-800">
                                    {isKirim ? 'No. Faktur Kirim (BK)' : 'No. Faktur Terima (BA)'}
                                </label>
                                <InputText
                                    disabled
                                    value={formik.values.faktur || 'Otomatis (Sistem)'}
                                    className="bg-gray-50 border-gray-200 text-sm"
                                />
                            </div>

                            <div className="flex flex-column gap-2">
                                <label className="font-bold text-xs text-800">Tanggal Transaksi <span className="text-red-500">*</span></label>
                                <Calendar
                                    value={formik.values.tanggal_transaksi ? new Date(formik.values.tanggal_transaksi) : null}
                                    onChange={(e) => formik.setFieldValue('tanggal_transaksi', e.value || '')}
                                    dateFormat="yy-mm-dd"
                                    showIcon
                                    placeholder="Pilih Tanggal Transaksi"
                                    className={isFormFieldInvalid('tanggal_transaksi') ? 'p-invalid w-full' : 'w-full'}
                                />
                                {getFormErrorMessage('tanggal_transaksi')}
                            </div>

                            <div className="flex flex-column gap-2">
                                <label className="font-bold text-xs text-800">Gudang Pengirim (Asal) <span className="text-red-500">*</span></label>
                                <Dropdown
                                    value={formik.values.dari_gudang}
                                    options={state.gudangOptions}
                                    optionLabel="keterangan"
                                    loading={state.gudangsLoad}
                                    optionValue="kode"
                                    filter
                                    placeholder={isTerima ? "Menunggu Referensi BK..." : "Pilih Gudang Asal..."}
                                    disabled={state.edit || isTerima} // Terkunci jika BA/Terima karena mengikuti dokumen BK rujukan
                                    onChange={(e) => {
                                        const sel = state.gudangOptions.find(g => g.kode === e.value);
                                        formik.setFieldValue('dari_gudang', e.value || '');
                                        formik.setFieldValue('dari_gudang_nama', sel?.keterangan || '');
                                    }}
                                    className={isFormFieldInvalid('dari_gudang') ? 'p-invalid w-full text-sm' : 'w-full text-sm'}
                                />
                                {getFormErrorMessage('dari_gudang')}
                            </div>

                            <div className="flex flex-column gap-2">
                                <label className="font-bold text-xs text-800">Petugas Pengirim <span className="text-red-500">*</span></label>
                                <div className="p-inputgroup">
                                    <InputText
                                        readOnly
                                        value={formik.values.dikirim_oleh_nama || formik.values.dikirim_oleh || ''}
                                        placeholder={isTerima ? "Menunggu Referensi BK..." : "Pilih Petugas Kirim..."}
                                        className={isFormFieldInvalid('dikirim_oleh') ? 'p-invalid text-sm bg-gray-50' : 'text-sm bg-gray-50'}
                                    />
                                    <Button
                                        type="button"
                                        icon="pi pi-search"
                                        disabled={state.edit || isTerima}
                                        onClick={() => setState(p => ({ ...p, showPetugasDialog: true, whichPetugasTarget: 'kirim' }))}
                                    />
                                </div>
                                {getFormErrorMessage('dikirim_oleh')}
                            </div>
                        </div>

                        {/* SISI KANAN: REFERENSI & TUJUAN */}
                        <div className="col-12 md:col-6 flex flex-column gap-3 pl-2 md:pl-4">
                            {/* Field Referensi BK hanya tampil saat mode Penerimaan (BA) */}
                            {isTerima && (
                                <div className="flex flex-column gap-2">
                                    <label className="font-bold text-xs text-800">Referensi Faktur Kirim (BK) <span className="text-red-500">*</span></label>
                                    <div className="p-inputgroup">
                                        <InputText
                                            readOnly
                                            value={formik.values.faktur_kirim || ''} // Menggunakan properti terpisah faktur_kirim
                                            placeholder="Klik Cari untuk memilih rujukan BK..."
                                            className={isFormFieldInvalid('faktur_kirim') ? 'p-invalid text-sm bg-gray-50' : 'text-sm bg-gray-50'}
                                        />
                                        <Button
                                            type="button"
                                            icon="pi pi-search"
                                            disabled={state.edit} // Hanya dikunci saat edit dokumen BA yang sudah tersimpan
                                            onClick={() => setState(p => ({ ...p, showFakturKirimDialog: true }))}
                                        />
                                    </div>
                                    {getFormErrorMessage('faktur_kirim')}
                                </div>
                            )}

                            {/* Jarak penyeimbang tinggi baris jika berada di mode Kirim (BK) */}
                            {/* {isKirim && <div className="hidden md:block" style={{ height: '53px' }} />} */}

                            <div className="flex flex-column gap-2">
                                <label className="font-bold text-xs text-800">Gudang Penerima (Tujuan) <span className="text-red-500">*</span></label>
                                <Dropdown
                                    value={formik.values.ke_gudang}
                                    options={state.gudangOptions}
                                    optionLabel="keterangan"
                                    optionValue="kode"
                                    loading={state.gudangsLoad}
                                    filter
                                    placeholder={isTerima ? "Menunggu Referensi BK..." : "Pilih Gudang Tujuan..."}
                                    disabled={state.edit || isTerima}
                                    onChange={(e) => {
                                        const sel = state.gudangOptions.find(g => g.kode === e.value);
                                        formik.setFieldValue('ke_gudang', e.value || '');
                                        formik.setFieldValue('ke_gudang_nama', sel?.keterangan || '');
                                    }}
                                    className={isFormFieldInvalid('ke_gudang') ? 'p-invalid w-full text-sm' : 'w-full text-sm'}
                                />
                                {getFormErrorMessage('ke_gudang')}
                            </div>

                            <div className="flex flex-column gap-2">
                                <label className="font-bold text-xs text-800">Petugas Penerima <span className="text-red-500">*</span></label>
                                <div className="p-inputgroup">
                                    <InputText
                                        readOnly
                                        value={formik.values.diterima_oleh_nama || formik.values.diterima_oleh || ''}
                                        placeholder="Pilih Petugas Terima..."
                                        className={isFormFieldInvalid('diterima_oleh') ? 'p-invalid text-sm bg-gray-50' : 'text-sm bg-gray-50'}
                                    />
                                    <Button
                                        type="button"
                                        icon="pi pi-search"
                                        onClick={() => setState(p => ({ ...p, showPetugasDialog: true, whichPetugasTarget: 'terima' }))}
                                    />
                                </div>
                                {getFormErrorMessage('diterima_oleh')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AREA SEARCH BARANG / BARCODE */}
                <div className="my-4 pt-3">
                    <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-4">
                        <div className="flex flex-column">
                            <span className="text-lg font-bold text-gray-900 m-0 flex align-items-center gap-2">
                                <i className="pi pi-list text-blue-500"></i> Rincian Barang Mutasi
                            </span>
                            <span className="text-xs text-500 mt-1">
                                Kelola daftar persediaan barang yang akan dipindahkan antar gudang di bawah ini.
                            </span>
                        </div>

                        {/* Barcode input hanya diaktifkan saat Kirim (BK). Pada Penerimaan (BA), barang ditarik dari data kiriman asal */}
                        {isKirim && (
                            <div className="w-full md:w-28rem">
                                <div className="p-inputgroup shadow-1 border-round-lg overflow-hidden">
                                    <span className="p-inputgroup-addon bg-blue-50 border-blue-100 px-3">
                                        <i className="pi pi-barcode text-blue-600 text-lg"></i>
                                    </span>
                                    <InputText
                                        placeholder="Ketik barcode produk (Tekan Enter)..."
                                        className="text-sm py-2 px-3 border-blue-100"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.currentTarget.value.trim();
                                                if (val) {
                                                    handleBarcodeEnter(val);
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        icon="pi pi-search"
                                        className="bg-blue-600 border-blue-600 px-4"
                                        onClick={() => setState((p) => ({ ...p, showItemDialog: true }))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DETAIL WORKSPACE TABLE */}
                    <div className="surface-card border-round-xl shadow-1 border-1 surface-border overflow-hidden">
                        <DataTable
                            value={formik.values.detail}
                            className="text-sm"
                            responsiveLayout="scroll"
                            dataKey="kode_barang"
                            emptyMessage="Belum ada detail barang mutasi yang dimasukkan."
                        >
                            <Column field="barcode" header="BARCODE" style={{ minWidth: '10rem' }} />
                            <Column field="kode_barang" header="KODE BARANG" style={{ minWidth: '10rem' }} />
                            <Column field="nama_barang" header="NAMA BARANG" style={{ minWidth: '18rem' }} />
                            <Column field="satuan" header="SATUAN" align="center" style={{ minWidth: '7rem' }} />
                            <Column field="sisa_stok" header="STOK SEKARANG" align="right" body={(r) => r.sisa_stok?.toLocaleString('id-ID')} style={{ minWidth: '10rem' }} />

                            {/* Qty Kirim (Hanya Editable di mode BK / Kirim) */}
                            <Column
                                field="qty_kirim"
                                header="QTY KIRIM"
                                align="right"
                                style={{ minWidth: '9rem' }}
                                body={(rowData: DetailData) => (
                                    <InputNumber
                                        value={rowData.qty_kirim}
                                        onValueChange={(e) => {
                                            const val = e.value !== null && e.value !== undefined ? e.value : 0;
                                            handleCommitChange(rowData.kode_barang, 'qty_kirim', val);
                                        }}
                                        disabled={!isKirim}
                                        min={0}
                                        inputClassName="text-right p-2 font-bold text-gray-900 w-full"
                                        className="w-full text-sm"
                                    />
                                )}
                            />

                            {/* Qty Terima (Hanya Editable di mode BA / Terima) */}
                            {isTerima && (
                                <Column
                                    field="qty_terima"
                                    header="QTY TERIMA"
                                    align="right"
                                    style={{ minWidth: '9rem' }}
                                    body={(rowData: DetailData) => (
                                        <InputNumber
                                            value={rowData.qty_terima}
                                            onValueChange={(e) => {
                                                const val = e.value !== null && e.value !== undefined ? e.value : 0;
                                                handleCommitChange(rowData.barcode, 'qty_terima', val);
                                            }}
                                            min={0}
                                            inputClassName="text-right p-2 font-bold text-blue-600 w-full"
                                            className="w-full text-sm"
                                        />
                                    )}
                                />
                            )}

                            {/* Tombol Aksi Hapus Baris Item */}
                            {isKirim && (
                                <Column
                                    header="AKSI"
                                    align="center"
                                    style={{ minWidth: '5rem' }}
                                    frozen
                                    alignFrozen="right"
                                    body={(rowData: DetailData) => (
                                        <Button
                                            type="button"
                                            icon="pi pi-trash"
                                            outlined
                                            severity="danger"
                                            className="p-button-sm p-button-rounded border-1"
                                            onClick={() => handleDeleteRow(rowData.kode_barang)}
                                        />
                                    )}
                                />
                            )}
                        </DataTable>
                    </div>
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="flex flex-column sm:flex-row justify-content-end px-4 py-4 border-top-1 surface-border bg-gray-50 border-round-bottom-xl gap-2 mt-5">
                    <Button
                        type="button"
                        label="Batal"
                        icon="pi pi-times"
                        className="p-button-outlined p-button-secondary text-xs md:text-sm order-2 sm:order-1 px-4"
                        onClick={() => setShowCancelDialog(true)}
                    />
                    <Button
                        type="button"
                        label="Simpan"
                        icon="pi pi-check"
                        className="bg-green-600 border-green-600 text-xs md:text-sm order-1 sm:order-2 px-5 py-2 shadow-1"
                        onClick={() => handleSave(formik.values)}
                        loading={state.load}
                    />
                </div>
            </form>

            {/* DIALOG KONFIRMASI BATAL */}
            <Dialog
                header="Konfirmasi Pembatalan"
                visible={showCancelDialog}
                style={{ width: '420px' }}
                modal
                onHide={() => setShowCancelDialog(false)}
                footer={() => (
                    <div className="flex justify-content-end gap-2">
                        <Button type="button" label="Kembali" icon="pi pi-play" outlined className="p-button-secondary text-xs px-3 py-2" onClick={() => setShowCancelDialog(false)} />
                        <Button
                            type="button"
                            label="Ya, Batalkan"
                            icon="pi pi-trash"
                            severity="danger"
                            className="text-xs px-3 py-2"
                            onClick={() => {
                                setShowCancelDialog(false);
                                handleCancel();
                            }}
                        />
                    </div>
                )}
            >
                <div className="flex align-items-start gap-3 p-2">
                    <i className="pi pi-exclamation-triangle text-amber-500 mt-1" style={{ fontSize: '2rem' }} />
                    <div className="flex flex-column gap-1">
                        <span className="text-900 font-semibold text-base">Batalkan pengisian mutasi?</span>
                        <span className="text-gray-600 text-sm leading-normal">
                            Seluruh draft rincian barang yang telah dimasukkan akan terhapus secara permanen.
                        </span>
                    </div>
                </div>
            </Dialog>

            {/* PICKER DIALOGS */}
            <SalesDialog
                visible={state.showPetugasDialog}
                multiple={false}
                onSelect={(event) => {
                    const selectedStaff = event[0];
                    if (state.whichPetugasTarget === 'kirim') {
                        formik.setFieldValue('dikirim_oleh', selectedStaff.kode);
                        formik.setFieldValue('dikirim_oleh_nama', selectedStaff.nama);
                    } else {
                        formik.setFieldValue('diterima_oleh', selectedStaff.kode);
                        formik.setFieldValue('diterima_oleh_nama', selectedStaff.nama);
                    }
                    setState(p => ({ ...p, showPetugasDialog: false }));
                }}
                onHide={() => setState((p) => ({ ...p, showPetugasDialog: false }))}
            />

            <ItemPickerDialog
                visible={state.showItemDialog}
                onHide={() => setState((p) => ({ ...p, showItemDialog: false }))}
                onSelect={handleItemAdded}
                multiple={true}
            />

            <FakturKirimGudangDialog
                visible={state.showFakturKirimDialog}
                onHide={() => setState((p) => ({ ...p, showFakturKirimDialog: false }))}
                onSelect={(v) => {
                    formik.setValues((prev) => ({
                        ...prev,
                        faktur_kirim: v.faktur,
                        dari_gudang: v.dari_gudang || '',
                        dari_gudang_nama: v.ket_gudang_kirim || '',
                        ke_gudang: v.ke_gudang || '',
                        ke_gudang_nama: v.ket_gudang_terima || '',
                        dikirim_oleh: v.petugas_kirim || '',
                        dikirim_oleh_nama: v.petugas_kirim_nama || '',
                        detail: (v.detail || []).map((item: any) => ({
                            barcode: item.barcode || '',
                            kode_barang: item.kode_barang || '',
                            nama_barang: item.nama_barang || '',
                            satuan: item.satuan || 'PCS',
                            sisa_stok: item.sisa_stok || 0,
                            qty_kirim: item.qty_kirim || 0,
                            qty_terima: item.qty_kirim
                        }))
                    }));
                    setState((p) => ({ ...p, showFakturKirimDialog: false }));
                }}
            />
        </div>
    );
};

export default Form;