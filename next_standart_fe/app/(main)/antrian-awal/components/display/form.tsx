'use client';

import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { FormProps, initValue } from '../interfaces';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiEndpointCreate, apiEndpointData, apiEndpointDelete, apiEndpointUpdate } from '../endpoints';
import { useEffect, useState } from 'react';
import { getTzUser } from '@/lib/tools/dateTools';

const statusOptions = [
    { label: 'Tersedia', value: 'tersedia' },
    { label: 'Nonaktif', value: 'nonaktif' },
];

const statusAllOptions = [
    { label: 'Tersedia',   value: 'tersedia'  },
    { label: 'Diambil',    value: 'diambil'   },
    { label: 'Dipanggil',  value: 'dipanggil' },
    { label: 'Selesai',    value: 'selesai'   },
    { label: 'Nonaktif',   value: 'nonaktif'  },
];

const Form = ({ state, setState, formik, toast, getData, getGridData }: FormProps) => {
    const isEdit = Boolean(state.edit);
    const [bulkForm, setBulkForm] = useState({ dari: '', sampai: '', status: 'tersedia' });
    const [bulkSubmitted, setBulkSubmitted] = useState(false);

    const bulkInvalid = (field: 'dari' | 'sampai') => bulkSubmitted && !bulkForm[field];

    const isInvalid = (name: keyof initValue) => !!(formik.touched[name] && formik.errors[name]);
    const errorMsg = (name: keyof initValue) =>
        isInvalid(name) ? (
            <small className="p-error">{formik.errors[name]}</small>
        ) : (
            <small className="p-error">&nbsp;</small>
        );

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));
        try {
            const endpoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;
            const body: Record<string, any> = {
                no_antrian: input.no_antrian,
                status: input.status,
                tz: getTzUser(),
            };
            if (isEdit) body['kode_antrian'] = input.kode_antrian;

            const res = await postData(endpoint, body, { 'X-Level': '1' });
            showSuccess(toast, res.data?.message || 'Data berhasil disimpan');
            formik.resetForm();
            setState((p) => ({ ...p, add: false, edit: false, delete: false }));
            await getData(apiEndpointData);
            await getGridData();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const handleBulkSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setBulkSubmitted(true);
        if (!bulkForm.dari || !bulkForm.sampai) {
            return;
        }
        setState((p) => ({ ...p, load: true }));
        try {
            const body = {
                mode: 'bulk',
                dari: bulkForm.dari,
                sampai: bulkForm.sampai,
                status: bulkForm.status,
                tz: getTzUser(),
            };
            const res = await postData(apiEndpointCreate, body, { 'X-Level': '1' });
            showSuccess(toast, res.data?.message || 'Berhasil menambahkan antrian cepat.');
            setState((p) => ({ ...p, bulkAdd: false }));
            setBulkForm({ dari: '', sampai: '', status: 'tersedia' });
            setBulkSubmitted(false);
            await getData(apiEndpointData);
            await getGridData();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));
        try {
            if (state.selectedDatas.length < 1) {
                showError(toast, 'Tidak ada data yang dipilih.');
                return;
            }
            const codes = state.selectedDatas.map((v) => v.kode_antrian);
            const res = await postData(apiEndpointDelete, { kode_antrian: codes, tz: getTzUser() });
            showSuccess(toast, res.data?.message || 'Berhasil menghapus data.');
            setState((p) => ({ ...p, selectedDatas: [], add: false, edit: false, delete: false }));
            await getData(apiEndpointData);
            await getGridData();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi kesalahan.');
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    useEffect(() => {
        if (state.submittedData) handleSave(state.submittedData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.submittedData]);

    const deleteFooter = (
        <div className="flex justify-content-center gap-2">
            <Button
                label="Batal"
                icon="pi pi-times"
                severity="secondary"
                outlined
                onClick={() => setState((p) => ({ ...p, delete: false }))}
                disabled={state.load}
            />
            <Button label="Ya, Hapus" icon="pi pi-trash" severity="danger" onClick={handleDelete} loading={state.load} />
        </div>
    );

    return (
        <>
            {/* Dialog Create / Edit */}
            <Dialog
                visible={state.add || state.edit}
                header={isEdit ? 'Edit Nomor Antrian' : 'Tambah Nomor Antrian'}
                modal
                style={{ width: '100%', maxWidth: '400px' }}
                breakpoints={{ '641px': '90vw' }}
                onHide={() => {
                    setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                    formik.resetForm();
                }}
            >
                <form onSubmit={formik.handleSubmit} className="flex flex-column gap-3 pt-2">
                    {/* Kode Antrian (read only saat edit) */}
                    {isEdit && (
                        <div className="flex flex-column gap-1">
                            <label className="font-semibold text-sm">Kode Antrian</label>
                            <InputText value={formik.values.kode_antrian || ''} disabled readOnly className="w-full" />
                        </div>
                    )}

                    {/* Nomor Antrian */}
                    <div className="flex flex-column gap-1">
                        <label htmlFor="no_antrian" className="font-semibold text-sm">
                            Nomor Antrian <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="no_antrian"
                            name="no_antrian"
                            value={formik.values.no_antrian}
                            placeholder="Contoh: 01"
                            maxLength={5}
                            onChange={(e) => formik.setFieldValue('no_antrian', e.target.value)}
                            className={isInvalid('no_antrian') ? 'p-invalid w-full' : 'w-full'}
                        />
                        {errorMsg('no_antrian')}
                    </div>

                    {/* Status */}
                    <div className="flex flex-column gap-1">
                        <label htmlFor="status" className="font-semibold text-sm">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="status"
                            name="status"
                            value={formik.values.status}
                            options={isEdit ? statusAllOptions : statusOptions}
                            onChange={(e) => formik.setFieldValue('status', e.value)}
                            placeholder="Pilih Status"
                            className={isInvalid('status') ? 'p-invalid w-full' : 'w-full'}
                        />
                        {errorMsg('status')}
                    </div>

                    <div className="flex justify-content-end border-t-1 border-300 pt-3 gap-2 mt-2">
                        <Button
                            type="button"
                            label="Batal"
                            severity="secondary"
                            outlined
                            icon="pi pi-times"
                            onClick={() => {
                                setState((p) => ({ ...p, add: false, edit: false }));
                                formik.resetForm();
                            }}
                            className="w-full md:w-auto"
                        />
                        <Button
                            type="submit"
                            severity="success"
                            label="Simpan"
                            icon="pi pi-check"
                            loading={state.load}
                            className="w-full md:w-auto"
                        />
                    </div>
                </form>
            </Dialog>

            {/* Dialog Tambah Cepat (Bulk Create) */}
            <Dialog
                visible={state.bulkAdd}
                header="Tambah Cepat Nomor Antrian"
                modal
                style={{ width: '100%', maxWidth: '450px' }}
                breakpoints={{ '641px': '90vw' }}
                onHide={() => {
                    setState((p) => ({ ...p, bulkAdd: false }));
                    setBulkForm({ dari: '', sampai: '', status: 'tersedia' });
                    setBulkSubmitted(false);
                }}
            >
                <form onSubmit={handleBulkSave} className="flex flex-column gap-3 pt-2">
                    <p className="text-color-secondary text-sm mb-2">
                        Isi rentang nomor antrian yang ingin dibuat. Sistem akan membuat semua nomor secara otomatis sesuai rentang yang ditentukan.
                    </p>

                    <div className="grid formgrid p-fluid">
                        <div className="field col-4">
                            <label htmlFor="bulk_status" className="font-semibold text-sm">
                                Status Awal <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="bulk_status"
                                value={bulkForm.status}
                                options={statusOptions}
                                onChange={(e) => setBulkForm((p) => ({ ...p, status: e.value }))}
                                placeholder="Pilih Status"
                                className="w-full"
                            />
                        </div>

                        <div className="field col-4">
                            <label htmlFor="dari" className="font-semibold text-sm">
                                Dari Nomor <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="dari"
                                value={bulkForm.dari}
                                placeholder="Contoh: 01"
                                onChange={(e) => setBulkForm((p) => ({ ...p, dari: e.target.value }))}
                                className={bulkInvalid('dari') ? 'p-invalid w-full' : 'w-full'}
                            />
                            {bulkInvalid('dari') && <small className="p-error">Nomor awal wajib diisi.</small>}
                        </div>

                        <div className="field col-4">
                            <label htmlFor="sampai" className="font-semibold text-sm">
                                Sampai Nomor <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="sampai"
                                value={bulkForm.sampai}
                                placeholder="Contoh: 50"
                                onChange={(e) => setBulkForm((p) => ({ ...p, sampai: e.target.value }))}
                                className={bulkInvalid('sampai') ? 'p-invalid w-full' : 'w-full'}
                            />
                            {bulkInvalid('sampai') && <small className="p-error">Nomor akhir wajib diisi.</small>}
                        </div>
                    </div>

                    <div className="flex justify-content-end border-t-1 border-300 pt-3 gap-2 mt-2">
                        <Button
                            type="button"
                            label="Batal"
                            severity="secondary"
                            outlined
                            icon="pi pi-times"
                            onClick={() => setState((p) => ({ ...p, bulkAdd: false }))}
                            className="w-full md:w-auto"
                        />
                        <Button
                            type="submit"
                            severity="info"
                            label="Generate Massal"
                            icon="pi pi-bolt"
                            loading={state.load}
                            className="w-full md:w-auto"
                        />
                    </div>
                </form>
            </Dialog>

            {/* Dialog Delete */}
            <Dialog
                header="Konfirmasi Hapus"
                visible={state.delete}
                onHide={() => setState((p) => ({ ...p, delete: false }))}
                modal
                style={{ width: '25rem' }}
                footer={deleteFooter}
            >
                <div className="flex flex-column align-items-center text-center gap-4 py-4">
                    <i className="pi pi-exclamation-triangle text-red-500 text-6xl" />
                    <div>
                        <h3 className="font-bold mb-2">
                            {state.selectedDatas.length > 1
                                ? `Hapus ${state.selectedDatas.length} data?`
                                : 'Hapus data ini?'}
                        </h3>
                        <p className="text-color-secondary">
                            {state.selectedDatas.length > 1 ? (
                                `Anda akan menghapus ${state.selectedDatas.length} nomor antrian secara permanen.`
                            ) : (
                                <>
                                    Nomor: <strong>{state.selectedDatas[0]?.no_antrian}</strong>
                                    <br />
                                    Kode: <strong>{state.selectedDatas[0]?.kode_antrian}</strong>
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

export default Form;
