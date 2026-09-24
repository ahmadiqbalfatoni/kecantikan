'use client'

import { Dialog } from "primereact/dialog";
import { FormProps, InitValue, PaymentMethodType } from "../interfaces";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import {
    apiEndpointPaymentMethodCreate,
    apiEndpointPaymentMethodDelete,
    apiEndpointPaymentMethodGet,
    apiEndpointPaymentMethodUpdate
} from "../endpoints";
import postData from "@/lib/axios/postData";
import formUpload from '@/lib/axios/formData';
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useEffect, useRef } from "react";
import { getTzUser } from "@/lib/tools/dateTools";
import { getIn } from "formik";

const Form = ({
    state,
    setState,
    formik,
    toast,
    getData
}: FormProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async (input: InitValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const isEdit = Boolean(state.edit);
            const cEndPoint = isEdit ? apiEndpointPaymentMethodUpdate : apiEndpointPaymentMethodCreate;

            const formData = new FormData();

            if (isEdit && input.id) {
                formData.append('id', String(input.id));
            }
            formData.append('method_code', input.method_code);
            formData.append('method_type', input.method_type);
            formData.append('name', input.name);
            formData.append('admin_fee_type', input.admin_fee_type);
            formData.append('admin_fee_value', String(input.admin_fee_value));
            formData.append('requires_unique_code', input.requires_unique_code ? '1' : '0');
            formData.append('status', input.status ? '1' : '0');
            formData.append('tz', getTzUser());

            if (input.description) {
                formData.append('description', input.description);
            }

            if (input.method_type === 'MANUAL_TRANSFER') {
                formData.append('bank_name', input.bank_name || '');
                formData.append('account_number', input.account_number || '');
                formData.append('account_name', input.account_name || '');
            } else {
                formData.append('pg_provider', input.pg_provider || '');
                formData.append('pg_channel_code', input.pg_channel_code || '');
            }

            if (input.logo && input.logo instanceof File) {
                formData.append('logo', input.logo);
            }

            const oHeaders: Record<string, string> = {
                'X-Level': '1'
            };

            const vaData = await formUpload(cEndPoint, formData, oHeaders);
            const res = vaData.data;

            showSuccess(toast, res.message || "Berhasil menyimpan konfigurasi metode pembayaran");
            formik.resetForm();
            setState((p) => ({ ...p, add: false, edit: false, delete: false }));
            await getData(apiEndpointPaymentMethodGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi kesalahan saat menyimpan data");
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const handleDelete = async () => {
        setState((p) => ({ ...p, load: true }));

        try {
            if (state.selectedData.length < 1) {
                showError(toast, 'Tidak ada item yang dipilih untuk dihapus');
                return;
            }

            const vaKode = state.selectedData.map(v => v.method_code);
            const vaData = await postData(apiEndpointPaymentMethodDelete, { method_code: vaKode });
            const res = vaData.data;

            showSuccess(toast, res.message || "Metode pembayaran berhasil dihapus");
            setState((p) => ({ ...p, selectedData: [], add: false, edit: false, delete: false }));
            await getData(apiEndpointPaymentMethodGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi kesalahan saat menghapus data");
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    };

    const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            if (file.size > 2097152) {
                showError(toast, 'Ukuran file terlalu besar! Maksimal adalah 2MB.');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];
            if (!allowedTypes.includes(file.type)) {
                showError(toast, 'Format file tidak valid! Gunakan format JPG, PNG, atau SVG.');
                return;
            }

            formik.setFieldValue('logo', file);
        }
    };

    const deleteFooterTemplate = (
        <div className="flex justify-content-end gap-2 w-full pt-2 border-top-1 surface-border">
            <Button
                label="Batal" icon="pi pi-times" severity="secondary" text
                onClick={() => setState((p) => ({ ...p, add: false, edit: false, delete: false }))}
                disabled={state.load}
            />
            <Button
                label="Ya, Hapus" icon="pi pi-trash" severity="danger"
                onClick={handleDelete} loading={state.load} className="p-button-danger"
            />
        </div>
    );

    const isFormFieldInvalid = (name: string) => {
        const touched = getIn(formik?.touched, name);
        const error = getIn(formik?.errors, name);

        return !!(touched && typeof error === 'string' && error);
    };

    const getFormErrorMessage = (name: string) => {
        return isFormFieldInvalid(name) ? (
            <small className="p-error flex align-items-center gap-1 mt-1 font-medium transition-all">
                <i className="pi pi-exclamation-circle text-xs" />
                {getIn(formik?.errors, name)}
            </small>
        ) : (
            <small className="p-error block mt-1" style={{ visibility: 'hidden' }}>&nbsp;</small>
        );
    };

    const methodTypeOptions = [
        { label: 'Transfer Manual', value: 'MANUAL_TRANSFER' },
        { label: 'PG - Virtual Account', value: 'PG_VA' },
        { label: 'PG - QRIS', value: 'PG_QRIS' },
        { label: 'PG - E-Wallet', value: 'PG_EWALLET' },
        { label: 'PG - Credit Card', value: 'PG_CREDIT_CARD' },
        { label: 'PG - Retail Outlets', value: 'PG_RETAIL' }
    ];

    const feeTypeOptions = [
        { label: 'Nilai Tetap (IDR)', value: 'FIXED' },
        { label: 'Persentase (%)', value: 'PERCENTAGE' },
    ];

    const formatMethodType = (type: PaymentMethodType) => {
        const types: Record<PaymentMethodType, string> = {
            'MANUAL_TRANSFER': 'Transfer Manual',
            'PG_VA': 'PG - Virtual Account',
            'PG_QRIS': 'PG - QRIS',
            'PG_EWALLET': 'PG - E-Wallet',
            'PG_CREDIT_CARD': 'PG - Credit Card',
            'PG_RETAIL': 'PG - Retail Outlets'
        };
        return types[type] || type;
    };

    useEffect(() => {
        if (state.submittedData) {
            handleSave(state.submittedData);
        }
    }, [state.submittedData]);

    return (
        <>
            <Dialog
                visible={state.add || state.edit}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${state.edit ? 'pi-pencil text-primary' : 'pi-plus-circle text-success'} text-xl`} />
                        <span className="font-semibold text-xl text-900">
                            {state.edit ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}
                        </span>
                    </div>
                }
                modal
                style={{ width: '90vw', maxWidth: '1050px' }}
                breakpoints={{ '960px': '92vw', '641px': '98vw' }}
                onHide={() => {
                    setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                    formik?.resetForm();
                }}
                className="p-fluid"
            >
                <form onSubmit={formik?.handleSubmit} className="flex flex-column gap-4 mt-2 fadein animation-duration-300">

                    {/* LOGO UPLOAD AREA */}
                    <div className="surface-card p-3 border-round-xl border-1 surface-border flex flex-column sm:flex-row align-items-center gap-4 bg-gray-50-alpha-10 shadow-1">
                        <div className="relative group flex-shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleLogoChange}
                                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                                style={{ display: 'none' }}
                            />
                            <div className="relative overflow-hidden border-circle border-2 surface-border shadow-2 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}>
                                <img
                                    src={formik.values.logo instanceof File
                                        ? URL.createObjectURL(formik.values.logo)
                                        : formik.values.logo_url || '/layout/images/profile.png'}
                                    alt="Payment Logo"
                                    className="w-6rem h-6rem object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black-alpha-40 flex align-items-center justify-content-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                                    <i className="pi pi-camera text-white text-lg" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="m-0 font-bold text-700 text-base">Logo Metode Pembayaran</h4>
                            <p className="m-0 text-500 text-xs mt-1 line-height-3">
                                Format berkas: <span className="font-semibold text-700">JPG, PNG, atau SVG</span> dengan kapasitas maksimal <span className="font-semibold text-700">2MB</span>.
                            </p>
                            <Button
                                type="button"
                                label="Pilih Logo"
                                icon="pi pi-upload"
                                size="small"
                                outlined
                                severity="secondary"
                                className="mt-2 w-auto"
                                onClick={() => fileInputRef.current?.click()}
                            />
                        </div>
                    </div>

                    {/* MAIN TWO-COLUMN FORM LAYOUT */}
                    <div className="grid formgrid row-gap-3">

                        {/* LEFT COLUMN */}
                        <div className="col-12 md:col-6 flex flex-column gap-3 pr-0 md:pr-4">

                            <div className="flex gap-3">
                                <div className="flex-1 flex flex-column gap-2">
                                    <label htmlFor="method_code" className="font-semibold text-sm text-700">Kode Metode</label>
                                    <InputText
                                        id="method_code"
                                        maxLength={10}
                                        value={formik.values.method_code}
                                        onChange={(e) => formik.setFieldValue('method_code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                                        placeholder="Cth: TF00000001"
                                        disabled={state.edit}
                                        className={`${isFormFieldInvalid('method_code') ? 'p-invalid' : ''} ${state.edit ? 'bg-gray-100 font-bold text-600' : ''}`}
                                    />
                                    {getFormErrorMessage('method_code')}
                                </div>

                                <div className="flex flex-column gap-2" style={{ width: '100px' }}>
                                    <label htmlFor="status" className="font-semibold text-sm text-700">Status Aktif</label>
                                    <div className="flex align-items-center h-3rem">
                                        <InputSwitch
                                            id="status"
                                            checked={formik.values.status}
                                            onChange={(e) => formik.setFieldValue('status', e.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="name" className="font-semibold text-sm text-700">Nama Resmi Metode</label>
                                <InputText
                                    id="name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    placeholder="Cth: Bank Central Asia (BCA)"
                                    className={isFormFieldInvalid('name') ? 'p-invalid' : ''}
                                />
                                {getFormErrorMessage('name')}
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="method_type" className="font-semibold text-sm text-700">Tipe Pembayaran</label>
                                <Dropdown
                                    id="method_type"
                                    value={formik.values.method_type}
                                    options={methodTypeOptions}
                                    placeholder="Pilih Tipe Pembayaran"
                                    onChange={(e) => {
                                        formik.setFieldValue('method_type', e.value);
                                        if (e.value === 'MANUAL_TRANSFER') {
                                            formik.setFieldValue('pg_provider', '');
                                            formik.setFieldValue('pg_channel_code', '');
                                        } else {
                                            formik.setFieldValue('bank_name', '');
                                            formik.setFieldValue('account_number', '');
                                            formik.setFieldValue('account_name', '');
                                            formik.setFieldValue('requires_unique_code', false);
                                        }
                                    }}
                                    className={isFormFieldInvalid('method_type') ? 'p-invalid' : ''}
                                />
                                {getFormErrorMessage('method_type')}
                            </div>

                            <div className="grid formgrid">
                                <div className="col-12 sm:col-6 flex flex-column gap-2">
                                    <label htmlFor="admin_fee_type" className="font-semibold text-sm text-700">Tipe Biaya Admin</label>
                                    <Dropdown
                                        id="admin_fee_type"
                                        value={formik.values.admin_fee_type}
                                        options={feeTypeOptions}
                                        onChange={(e) => {
                                            formik.setFieldValue('admin_fee_type', e.value);
                                            formik.setFieldValue('admin_fee_value', 0);
                                        }}
                                    />
                                </div>
                                <div className="col-12 sm:col-6 flex flex-column gap-2">
                                    <label htmlFor="admin_fee_value" className="font-semibold text-sm text-700">Nilai Biaya Admin</label>
                                    <InputNumber
                                        id="admin_fee_value"
                                        value={formik.values.admin_fee_value}
                                        onValueChange={(e) => formik.setFieldValue('admin_fee_value', e.value || 0)}
                                        mode={formik.values.admin_fee_type === 'FIXED' ? "currency" : "decimal"}
                                        currency="IDR"
                                        locale="id-ID"
                                        min={0}
                                        max={formik.values.admin_fee_type === 'PERCENTAGE' ? 100 : undefined}
                                        suffix={formik.values.admin_fee_type === 'PERCENTAGE' ? '%' : ''}
                                        className={isFormFieldInvalid('admin_fee_value') ? 'p-invalid' : ''}
                                    />
                                    {getFormErrorMessage('admin_fee_value')}
                                </div>
                            </div>

                            <div className="flex flex-column gap-2">
                                <label htmlFor="description" className="font-semibold text-sm text-700">Keterangan / Panduan Singkat</label>
                                <InputTextarea
                                    id="description"
                                    name="description"
                                    value={formik.values.description || ''}
                                    onChange={formik.handleChange}
                                    rows={4}
                                    className="p-3 text-sm"
                                    placeholder="Masukkan deskripsi atau langkah mudah cara membayar..."
                                    autoResize
                                />
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="col-12 md:col-6 flex flex-column gap-3 pl-0 md:pl-4 border-none md:border-left-1 surface-border">

                            {/* RENDER BILA MEMILIH TRANSFER MANUAL */}
                            {formik.values.method_type === 'MANUAL_TRANSFER' && (
                                <div className="flex flex-column gap-3 fadein animation-duration-300">
                                    <div className="surface-card p-3 border-round-xl border-1 surface-border bg-blue-50-alpha-10 flex align-items-center justify-content-between gap-3">
                                        <div className="flex align-items-center gap-3">
                                            <i className="pi pi-building text-blue-500 text-2xl" />
                                            <div>
                                                <h5 className="m-0 font-bold text-700">Detail Rekening Manual</h5>
                                                <p className="m-0 text-xs text-500 mt-1">Gunakan kode unik untuk automasi verifikasi manual.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* TAMBAHAN KODE UNIK (REQUIRES UNIQUE CODE) */}
                                    <div className="surface-card p-3 border-round-xl border-1 surface-border flex align-items-center justify-content-between bg-blue-50-alpha-5">
                                        <div className="flex flex-column gap-1">
                                            <span className="font-semibold text-sm text-800 flex align-items-center gap-2">
                                                <i className="pi pi-hashtag text-blue-500" /> Butuh Kode Unik Transfer
                                            </span>
                                            <span className="text-xs text-500">Sistem otomatis mengurangi/menambahkan digit unik pada nominal transfer.</span>
                                        </div>
                                        <InputSwitch
                                            id="requires_unique_code"
                                            checked={formik.values.requires_unique_code}
                                            onChange={(e) => formik.setFieldValue('requires_unique_code', e.value)}
                                        />
                                    </div>

                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="bank_name" className="font-semibold text-sm text-700">Nama Bank Resmi</label>
                                        <InputText
                                            id="bank_name"
                                            value={formik.values.bank_name || ''}
                                            onChange={formik.handleChange}
                                            placeholder="Cth: BANK MANDIRI"
                                            className={isFormFieldInvalid('bank_name') ? 'p-invalid' : ''}
                                        />
                                        {getFormErrorMessage('bank_name')}
                                    </div>

                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="account_number" className="font-semibold text-sm text-700">Nomor Rekening</label>
                                        <InputText
                                            id="account_number"
                                            value={formik.values.account_number || ''}
                                            onChange={(e) => formik.setFieldValue('account_number', e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="Cth: 124000392911"
                                            className={isFormFieldInvalid('account_number') ? 'p-invalid' : ''}
                                        />
                                        {getFormErrorMessage('account_number')}
                                    </div>

                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="account_name" className="font-semibold text-sm text-700">Nama Pemilik Rekening</label>
                                        <InputText
                                            id="account_name"
                                            value={formik.values.account_name || ''}
                                            onChange={formik.handleChange}
                                            placeholder="Cth: PT SOLUSI TEKNOLOGI PRIMA"
                                            className={isFormFieldInvalid('account_name') ? 'p-invalid' : ''}
                                        />
                                        {getFormErrorMessage('account_name')}
                                    </div>
                                </div>
                            )}

                            {/* RENDER BILA MEMILIH INTEGRASI PAYMENT GATEWAY (PG_*) */}
                            {formik.values.method_type !== 'MANUAL_TRANSFER' && formik.values.method_type && (
                                <div className="flex flex-column gap-3 fadein animation-duration-300">
                                    <div className="surface-card p-3 border-round-xl border-1 surface-border bg-purple-50-alpha-10 flex align-items-center gap-3">
                                        <i className="pi pi-key text-purple-500 text-2xl" />
                                        <div>
                                            <h5 className="m-0 font-bold text-700">Integrasi Otomatis PG ({formatMethodType(formik.values.method_type)})</h5>
                                            <p className="m-0 text-xs text-500 mt-1">Sistem akan melakukan rekonsiliasi pembayaran instan via provider terpilih.</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="pg_provider" className="font-semibold text-sm text-700">Provider Payment Gateway</label>
                                        <InputText
                                            id="pg_provider"
                                            value={formik.values.pg_provider || ''}
                                            onChange={formik.handleChange}
                                            placeholder="Cth: MIDTRANS, XENDIT, DUITKU"
                                            className={isFormFieldInvalid('pg_provider') ? 'p-invalid' : ''}
                                        />
                                        {getFormErrorMessage('pg_provider')}
                                    </div>

                                    <div className="flex flex-column gap-2">
                                        <label htmlFor="pg_channel_code" className="font-semibold text-sm text-700">Kode Saluran (PG Channel Code)</label>
                                        <InputText
                                            id="pg_channel_code"
                                            value={formik.values.pg_channel_code || ''}
                                            onChange={(e) => formik.setFieldValue('pg_channel_code', e.target.value.toUpperCase())}
                                            placeholder="Cth: MANDIRI_VA, QRIS, SHOPEEPAY"
                                            className={isFormFieldInvalid('pg_channel_code') ? 'p-invalid' : ''}
                                        />
                                        {getFormErrorMessage('pg_channel_code')}
                                    </div>
                                </div>
                            )}

                            {/* JIKA BELUM MEMILIH TIPE METODE */}
                            {!formik.values.method_type && (
                                <div className="flex flex-column align-items-center justify-content-center py-8 border-1 border-dashed border-300 border-round-xl bg-gray-50 text-center">
                                    <i className="pi pi-credit-card text-400 text-4xl mb-3" />
                                    <span className="text-sm font-semibold text-700">Menunggu Pemilihan Tipe</span>
                                    <p className="text-xs text-500 max-w-15rem m-0 mt-2">
                                        Pilih tipe pembayaran di kolom kiri untuk melengkapi detail konfigurasi transfer atau integrasi.
                                    </p>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ACTION FOOTER */}
                    <div className='flex justify-content-end mt-4 pt-3 border-top-1 surface-border gap-2'>
                        <Button
                            type="button"
                            label="Batal"
                            icon="pi pi-times"
                            severity="secondary"
                            outlined
                            className="px-4 w-auto"
                            disabled={state?.load}
                            onClick={() => {
                                setState((p) => ({ ...p, add: false, edit: false, delete: false }));
                                formik?.resetForm();
                            }}
                        />
                        <Button
                            type="submit"
                            label={state?.edit ? 'Perbarui Metode' : 'Simpan Metode'}
                            icon="pi pi-check"
                            className="px-4 w-auto"
                            loading={state?.load}
                        />
                    </div>
                </form>
            </Dialog>

            {/* CONFIRM DELETE DIALOG */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2 text-red-600">
                        <i className="pi pi-exclamation-triangle text-xl" />
                        <span className="font-semibold">Konfirmasi Penghapusan</span>
                    </div>
                }
                visible={state.delete}
                onHide={() => setState((p) => ({ ...p, add: false, edit: false, delete: false }))}
                modal
                style={{ width: '90%', maxWidth: '420px' }}
                footer={deleteFooterTemplate}
                className="p-fluid"
            >
                <div className="flex flex-column align-items-center text-center gap-3 py-2">
                    <div className="bg-red-50 p-4 border-circle flex align-items-center justify-content-center mb-1">
                        <i className="pi pi-trash text-red-500 text-3xl" />
                    </div>
                    <div>
                        <h4 className="font-bold text-800 m-0">
                            {state.selectedData.length > 1 ? `Hapus ${state.selectedData.length} Metode Pembayaran?` : 'Hapus Metode Pembayaran?'}
                        </h4>
                        <p className="text-600 text-sm mt-2 line-height-3">
                            {state.selectedData.length > 1 ? (
                                <>
                                    Anda akan menghapus secara permanen <span className="font-semibold text-800">{state.selectedData.length} metode pembayaran</span> dari sistem.
                                </>
                            ) : (
                                <>
                                    Anda akan menghapus secara permanen metode pembayaran <span className="font-semibold text-800">{state.selectedData[0]?.method_code || ''}</span> ({state.selectedData[0]?.name}).
                                </>
                            )}
                            <br />
                            <span className="text-red-500 font-medium text-xs bg-red-50 border-round px-2 py-1 inline-block mt-3">
                                <i className="pi pi-info-circle mr-1" /> Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                            </span>
                        </p>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default Form;