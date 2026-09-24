'use client';

import { Dialog } from 'primereact/dialog';
import { coaData, FormProps, initValue } from '../interfaces';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { apiEndpointCreate, apiEndpointDelete, apiEndpointGet, apiEndpointUpdate } from '../endpoints';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { useEffect } from 'react';
import { formatDateSystem, getTzUser } from '@/lib/tools/dateTools';
import { InputSwitch } from 'primereact/inputswitch';
import { Calendar } from 'primereact/calendar';

const Form = ({ state, setState, formik, toast, getData, getDropdownData }: FormProps) => {
    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const isEdit = Boolean(state.edit);

            const cEndPoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;

            const oHeaders: Record<string, string> = {
                'X-Level': '1'
            };

            const oBody: Record<string, any> = {
                nama: input.nama,
                waktu_mulai: formatDateSystem(input.waktu_mulai),
                waktu_selesai: formatDateSystem(input.waktu_selesai),
                status: input.status,
                tz: getTzUser()
            };

            if (isEdit) {
                oBody['kode'] = input.kode;
            }

            const vaData = await postData(cEndPoint, oBody, oHeaders);
            const res = vaData.data;

            showSuccess(toast, res.data?.message || 'Berhasil Menyimpan Data');
            formik.resetForm();
            setState((p) => ({ ...p, add: false, edit: false, delete: false }));
            await getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

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

            showSuccess(toast, res.data?.message || 'Berhasil menghapus data.');
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

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name]}</small> : <small className="p-error">&nbsp;</small>;
    };

    const renderEmptyMessage = (isLoading: boolean) => {
        if (isLoading) {
            return (
                <div className="flex align-items-center justify-content-center p-3 text-500">
                    <i className="pi pi-spinner pi-spin mr-2" style={{ fontSize: '1.2rem' }}></i>
                    <span>Memuat data ...</span>
                </div>
            );
        }
        return <div className="p-3 text-500 text-center">Tidak ada data tersedia.</div>;
    };

    useEffect(() => {
        if (state.submittedData) {
            handleSave(state.submittedData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.submittedData]);

    return (
        <>
            <Dialog
                visible={state.add || state.edit}
                header={state.edit ? 'Edit Data Shift' : 'Tambah Shift Baru'}
                modal
                style={{ width: '100%', maxWidth: '420px' }}
                breakpoints={{ '641px': '90vw' }}
                onHide={() => {
                    setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                    formik?.resetForm();
                }}
            >
                <form onSubmit={formik?.handleSubmit} className="flex gap-3 flex-column pt-2">
                    <div className="flex gap-2 flex-column w-full">
                        <div className="flex flex-column gap-1 w-full">
                            <label htmlFor="kode" className="font-semibold text-sm">
                                Kode Shift
                            </label>
                            <InputText
                                id="kode"
                                name="kode"
                                disabled
                                value={formik?.values.kode || ''}
                                placeholder="Otomatis"
                                readOnly
                                onChange={(e) => {
                                    if (!state.edit) formik?.setFieldValue('kode', e.target.value);
                                }}
                                className={isFormFieldInvalid('kode') ? 'p-invalid w-full' : 'w-full'}
                            />
                            {getFormErrorMessage('kode')}
                        </div>

                        <div className="flex flex-column gap-1 w-full">
                            <label htmlFor="nama" className="font-semibold text-sm">
                                Nama Shift <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="nama"
                                name="nama"
                                value={formik?.values.nama}
                                placeholder="Contoh: SHIFT 1"
                                onChange={(e) => formik?.setFieldValue('nama', e.target.value)}
                                className={isFormFieldInvalid('nama') ? 'p-invalid w-full' : 'w-full'}
                            />
                            {getFormErrorMessage('nama')}
                        </div>

                        {/* 2. JAM MULAI & JAM SELESAI */}
                        <div className="flex flex-column md:flex-row gap-3 w-full">
                            {/* JAM MULAI */}
                            <div className="flex flex-column gap-1 w-full">
                                <label htmlFor="waktu_mulai" className="font-semibold text-sm">
                                    Jam Mulai <span className="text-red-500">*</span>
                                </label>
                                <Calendar
                                    id="waktu_mulai"
                                    name="waktu_mulai"
                                    value={formik?.values.waktu_mulai ? new Date(formik?.values.waktu_mulai) : null}
                                    onChange={(e) => formik?.setFieldValue('waktu_mulai', e.value)}
                                    timeOnly
                                    hourFormat="24"
                                    placeholder="Pilih Jam Mulai"
                                    className={isFormFieldInvalid('waktu_mulai') ? 'p-invalid w-full' : 'w-full'}
                                />
                                {getFormErrorMessage('waktu_mulai')}
                            </div>

                            {/* JAM SELESAI */}
                            <div className="flex flex-column gap-1 w-full">
                                <label htmlFor="waktu_selesai" className="font-semibold text-sm">
                                    Jam Selesai <span className="text-red-500">*</span>
                                </label>
                                <Calendar
                                    id="waktu_selesai"
                                    name="waktu_selesai"
                                    value={formik?.values.waktu_selesai ? new Date(formik?.values.waktu_selesai) : null}
                                    onChange={(e) => formik?.setFieldValue('waktu_selesai', e.value)}
                                    timeOnly
                                    hourFormat="24"
                                    placeholder="Pilih Jam Selesai"
                                    className={isFormFieldInvalid('waktu_selesai') ? 'p-invalid w-full' : 'w-full'}
                                />
                                {getFormErrorMessage('waktu_selesai')}
                            </div>
                        </div>

                        {/* ROW 3: Status Aktif / Tidak */}
                        <div className="flex align-items-center gap-2 mt-2">
                            <InputSwitch id="status" name="is_active" checked={formik?.values.status === '1'} onChange={(e) => formik?.setFieldValue('status', e.value ? '1' : '0')} />
                            <label htmlFor="status" className="font-semibold text-sm cursor-pointer select-none">
                                Status Shift Aktif
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-content-end mt-3 border-t-1 border-300 pt-3 gap-2">
                        <Button
                            label="Batal"
                            severity="secondary"
                            outlined
                            icon="pi pi-times"
                            onClick={() => {
                                setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                                formik?.resetForm();
                            }}
                            className="w-full md:w-auto"
                        />
                        <Button type="submit" severity="success" label="Simpan" icon="pi pi-check" loading={state?.load} className="w-full md:w-auto" />
                    </div>
                </form>
            </Dialog>

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

export default Form;
