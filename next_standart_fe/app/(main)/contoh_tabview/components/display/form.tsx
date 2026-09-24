'use client';

import { FormProps, initValue } from '../interfaces';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { apiEndpointCreate, apiEndpointUpdate, apiEndpointGet, apiEndpointGetSupplierCategories } from '../endpoints';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { useEffect, useState } from 'react';
import { formatDateSystem, getTzUser } from '@/lib/tools/dateTools';
import { TabView, TabPanel } from 'primereact/tabview';
import { InputNumber } from 'primereact/inputnumber';
import postData from '@/lib/axios/postData';
import { Dialog } from 'primereact/dialog';

const Form = ({ state, setState, formik, toast, getData, getDropdownData }: FormProps) => {
    const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const isEdit = Boolean(state.edit);
            const cEndPoint = isEdit ? apiEndpointUpdate : apiEndpointCreate;

            const oHeaders: Record<string, string> = {
                'X-Level': '1'
            };

            // Menggunakan pengiriman JSON murni
            const vaData = await postData(cEndPoint, input, oHeaders);
            const res = vaData.data;

            showSuccess(toast, res.message || 'Berhasil Menyimpan Data');
            handleCancel();
            await getData(apiEndpointGet);
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Terjadi Kesalahan');
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const handleCancel = () => {
        setState((p) => ({
            ...p,
            add: false,
            edit: false,
            activeStep: 0
        }));
        formik?.resetForm();
    };

    const triggerCancel = () => {
        if (formik?.dirty) {
            setShowCancelDialog(true);
        } else {
            handleCancel();
        }
    };

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);
    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name] as string}</small> : null;
    };

    const getTabForField = (fieldName: string): number => {
        // Tab 0: Informasi Dasar
        if (['nama', 'kode_kategori', 'telepon', 'alamat'].includes(fieldName)) {
            return 0;
        }
        // Tab 1: Informasi Keuangan
        if (['rekening', 'plafond_1', 'plafond_2'].includes(fieldName)) {
            return 1;
        }
        // Tab 2: Contact Person 1
        if (fieldName.endsWith('_1')) {
            return 2;
        }
        // Tab 3: Contact Person 2
        if (fieldName.endsWith('_2')) {
            return 3;
        }
        return 0;
    };

    const hasTabErrors = (tabIndex: number): boolean => {
        if (!formik || formik.submitCount === 0) return false;
        if (!formik?.errors) return false;
        const errorFields = Object.keys(formik.errors);
        return errorFields.some((field) => getTabForField(field) === tabIndex);
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

    const cancelDialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Lanjutkan Isi" icon="pi pi-play" outlined className="p-button-secondary text-xs md:text-sm px-3 py-2" onClick={() => setShowCancelDialog(false)} />
            <Button
                type="button"
                label="Ya, Batalkan"
                icon="pi pi-trash"
                severity="danger"
                className="text-xs md:text-sm px-3 py-2"
                onClick={() => {
                    setShowCancelDialog(false);
                    handleCancel();
                }}
            />
        </div>
    );

    useEffect(() => {
        getDropdownData(apiEndpointGetSupplierCategories, 'supplierCategoriesData', 'supplierCategoriesLoad');
    }, [state.edit, state.add]);

    useEffect(() => {
        if (formik && formik.submitCount > 0 && Object.keys(formik.errors).length > 0) {
            const errorFields = Object.keys(formik.errors);
            const errorTabs = errorFields.map(getTabForField);
            const lowestErrorTab = Math.min(...errorTabs);

            if (lowestErrorTab !== Infinity && lowestErrorTab !== state.activeStep) {
                setState((p) => ({ ...p, activeStep: lowestErrorTab }));
            }
        }
    }, [formik?.submitCount, formik?.errors]);

    useEffect(() => {
        if (state.submittedData) handleSave(state.submittedData);
    }, [state.submittedData]);

    return (
        <div className="card">
            <div className="flex justify-content-between align-items-start mb-4 ">
                <div className="flex flex-column">
                    <h3 className="text-2xl font-semibold flex align-items-center gap-2">
                        <i className="pi pi-users text-blue-600 text-3xl"></i>
                        {state.add ? 'Penambahan Supplier Baru' : `Perubahan Supplier #${formik?.values.kode}`}
                    </h3>
                    <p className="text-gray-500">
                        {state.add
                            ? 'Daftarkan supplier baru lengkap dengan informasi identitas, keuangan, serta data contact person.'
                            : `Terakhir diperbarui oleh ${formik?.values.updated_by_fullname ? formik?.values.updated_by_fullname : formik?.values.created_by_fullname} pada ${
                                  formik?.values.updated_at
                                      ? formatDateSystem(formik?.values.updated_at, 'EEEE, dd MMMM yyyy') +
                                        ' pukul ' +
                                        formatDateSystem(formik?.values.updated_at, 'HH:mm') +
                                        ' ' +
                                        (getTzUser() === 'Asia/Jakarta' ? ' WIB' : getTzUser() === 'Asia/Makassar' ? ' WITA' : getTzUser() === 'Asia/Jayapura' ? ' WIT' : '')
                                      : 'hari ini'
                              }.`}
                    </p>
                </div>
                <Button type="button" icon="pi pi-times" label="Batal" outlined severity="danger" size="small" className="border-round-lg text-xs md:text-sm px-3 py-2" onClick={triggerCancel} loading={state?.load} />
            </div>

            <form onSubmit={formik?.handleSubmit}>
                <div className="py-2">
                    <TabView className="browser-style-tabs" activeIndex={state.activeStep} onTabChange={(e) => setState((p) => ({ ...p, activeStep: e.index }))}>
                        {/* TAB 0: INFORMASI DASAR */}
                        <TabPanel
                            header={
                                <div className={`flex align-items-center gap-2 ${hasTabErrors(0) ? 'text-red-500' : ''}`}>
                                    <i className="pi pi-id-card"></i>
                                    <span>Informasi Dasar</span>
                                    {hasTabErrors(0) && <i className="pi pi-exclamation-circle text-red-500 animation-duration-300 fadein" style={{ fontSize: '0.95rem' }}></i>}
                                </div>
                            }
                        >
                            <div className="pt-4 animation-duration-300 fadein">
                                <div className="mb-4">
                                    <h3 className="m-0 text-lg md:text-xl font-bold text-800 flex align-items-center gap-2">
                                        <i className="pi pi-id-card text-blue-500"></i>Informasi Dasar
                                    </h3>
                                    <span className="text-xs md:text-sm text-500">Detail nama, kategori, telepon, dan alamat operasional supplier.</span>
                                </div>

                                <div className="p-4 border-round surface-50 border-1 surface-border mb-3">
                                    <div className="grid formgrid p-fluid">
                                        {state.edit && (
                                            <div className="field col-12 md:col-6 mb-3">
                                                <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">KODE SUPPLIER</label>
                                                <InputText value={formik?.values.kode} disabled className="w-full" />
                                            </div>
                                        )}

                                        <div className={`field col-12 ${state.edit ? 'md:col-6' : 'md:col-12'} mb-3`}>
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">
                                                NAMA SUPPLIER <span className="text-red-500">*</span>
                                            </label>
                                            <InputText
                                                value={formik?.values.nama}
                                                onChange={(e) => formik?.setFieldValue('nama', e.target.value)}
                                                placeholder="Contoh: PT. Sumber Makmur"
                                                className={isFormFieldInvalid('nama') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('nama')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">
                                                KATEGORI SUPPLIER <span className="text-red-500">*</span>
                                            </label>
                                            <Dropdown
                                                value={formik?.values.kode_kategori}
                                                onShow={() => getDropdownData(apiEndpointGetSupplierCategories, 'supplierCategoriesData', 'supplierCategoriesLoad')}
                                                filter
                                                loading={state.supplierCategoriesLoad}
                                                optionLabel="keterangan"
                                                optionValue="kode"
                                                emptyMessage={renderEmptyMessage(state.supplierCategoriesLoad)}
                                                options={state.supplierCategoriesData}
                                                onChange={(e) => formik?.setFieldValue('kode_kategori', e.value)}
                                                placeholder="Pilih Kategori..."
                                                className={isFormFieldInvalid('kode_kategori') ? 'p-invalid w-full' : 'w-full'}
                                                showClear
                                            />
                                            {getFormErrorMessage('kode_kategori')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">
                                                TELEPON SUPPLIER <span className="text-red-500">*</span>
                                            </label>
                                            <InputText
                                                value={formik?.values.telepon}
                                                onChange={(e) => formik?.setFieldValue('telepon', e.target.value)}
                                                placeholder="Contoh: 0218843212 / 0812345678"
                                                className={isFormFieldInvalid('telepon') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('telepon')}
                                        </div>

                                        <div className="field col-12 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">
                                                ALAMAT SUPPLIER <span className="text-red-500">*</span>
                                            </label>
                                            <InputText
                                                value={formik?.values.alamat}
                                                onChange={(e) => formik?.setFieldValue('alamat', e.target.value)}
                                                placeholder="Alamat lengkap supplier"
                                                className={isFormFieldInvalid('alamat') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('alamat')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        {/* TAB 1: INFORMASI KEUANGAN */}
                        <TabPanel
                            header={
                                <div className={`flex align-items-center gap-2 ${hasTabErrors(1) ? 'text-red-500' : ''}`}>
                                    <i className="pi pi-credit-card"></i>
                                    <span>Informasi Keuangan</span>
                                    {hasTabErrors(1) && <i className="pi pi-exclamation-circle text-red-500 animation-duration-300 fadein" style={{ fontSize: '0.95rem' }}></i>}
                                </div>
                            }
                        >
                            <div className="pt-4 animation-duration-300 fadein">
                                <div className="mb-4">
                                    <h3 className="m-0 text-lg md:text-xl font-bold text-800 flex align-items-center gap-2">
                                        <i className="pi pi-credit-card text-blue-500"></i>Informasi Keuangan
                                    </h3>
                                    <span className="text-xs md:text-sm text-500">Atur nomor rekening transaksi serta batasan kredit/plafond belanja supplier.</span>
                                </div>

                                <div className="p-4 border-round surface-50 border-1 surface-border mb-3">
                                    <div className="grid formgrid p-fluid">
                                        <div className="field col-12 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">NOMOR REKENING</label>
                                            <InputText
                                                value={formik?.values.rekening}
                                                onChange={(e) => formik?.setFieldValue('rekening', e.target.value)}
                                                placeholder="Masukkan nomor rekening pembayaran"
                                                className={isFormFieldInvalid('rekening') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('rekening')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">BATAS PLAFOND 1</label>
                                            <div className="p-inputgroup">
                                                <span className="p-inputgroup-addon bg-gray-50 text-xs font-bold text-500">Rp</span>
                                                <InputNumber
                                                    value={formik?.values.plafond_1}
                                                    onValueChange={(e) => formik?.setFieldValue('plafond_1', e.value || 0)}
                                                    placeholder="0"
                                                    inputClassName="text-right"
                                                    className={isFormFieldInvalid('plafond_1') ? 'p-invalid' : ''}
                                                />
                                            </div>
                                            {getFormErrorMessage('plafond_1')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">BATAS PLAFOND 2</label>
                                            <div className="p-inputgroup">
                                                <span className="p-inputgroup-addon bg-gray-50 text-xs font-bold text-500">Rp</span>
                                                <InputNumber
                                                    value={formik?.values.plafond_2}
                                                    onValueChange={(e) => formik?.setFieldValue('plafond_2', e.value || 0)}
                                                    placeholder="0"
                                                    inputClassName="text-right"
                                                    className={isFormFieldInvalid('plafond_2') ? 'p-invalid' : ''}
                                                />
                                            </div>
                                            {getFormErrorMessage('plafond_2')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        {/* TAB 2: CONTACT PERSON 1 */}
                        <TabPanel
                            header={
                                <div className={`flex align-items-center gap-2 ${hasTabErrors(2) ? 'text-red-500' : ''}`}>
                                    <i className="pi pi-user"></i>
                                    <span>Contact Person 1</span>
                                    {hasTabErrors(2) && <i className="pi pi-exclamation-circle text-red-500 animation-duration-300 fadein" style={{ fontSize: '0.95rem' }}></i>}
                                </div>
                            }
                        >
                            <div className="pt-4 animation-duration-300 fadein">
                                <div className="mb-4">
                                    <h3 className="m-0 text-lg md:text-xl font-bold text-800 flex align-items-center gap-2">
                                        <i className="pi pi-user text-blue-500"></i>Contact Person Utama (CP 1)
                                    </h3>
                                    <span className="text-xs md:text-sm text-500">Informasi detail mengenai penanggung jawab atau perwakilan utama dari pihak supplier.</span>
                                </div>

                                <div className="p-4 border-round surface-50 border-1 surface-border mb-3">
                                    <div className="grid formgrid p-fluid">
                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">NAMA LENGKAP CP 1</label>
                                            <InputText
                                                value={formik?.values.nama_cp_1}
                                                onChange={(e) => formik?.setFieldValue('nama_cp_1', e.target.value)}
                                                placeholder="Nama lengkap perwakilan"
                                                className={isFormFieldInvalid('nama_cp_1') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('nama_cp_1')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">ALAMAT EMAIL CP 1</label>
                                            <InputText
                                                value={formik?.values.email_cp_1}
                                                onChange={(e) => formik?.setFieldValue('email_cp_1', e.target.value)}
                                                placeholder="contoh: cp1@supplier.com"
                                                className={isFormFieldInvalid('email_cp_1') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('email_cp_1')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">TELEPON KANTOR CP 1</label>
                                            <InputText
                                                value={formik?.values.telepon_cp_1}
                                                onChange={(e) => formik?.setFieldValue('telepon_cp_1', e.target.value)}
                                                placeholder="Contoh: 021883344"
                                                className={isFormFieldInvalid('telepon_cp_1') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('telepon_cp_1')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">NOMOR HP CP 1</label>
                                            <InputText
                                                value={formik?.values.hp_cp_1}
                                                onChange={(e) => formik?.setFieldValue('hp_cp_1', e.target.value)}
                                                placeholder="Contoh: 081299990000"
                                                className={isFormFieldInvalid('hp_cp_1') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('hp_cp_1')}
                                        </div>

                                        <div className="field col-12 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">ALAMAT CP 1</label>
                                            <InputText
                                                value={formik?.values.alamat_cp_1}
                                                onChange={(e) => formik?.setFieldValue('alamat_cp_1', e.target.value)}
                                                placeholder="Alamat domisili CP 1"
                                                className={isFormFieldInvalid('alamat_cp_1') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('alamat_cp_1')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        {/* TAB 3: CONTACT PERSON 2 */}
                        <TabPanel
                            header={
                                <div className={`flex align-items-center gap-2 ${hasTabErrors(3) ? 'text-red-500' : ''}`}>
                                    <i className="pi pi-user-plus"></i>
                                    <span>Contact Person 2</span>
                                    {hasTabErrors(3) && <i className="pi pi-exclamation-circle text-red-500 animation-duration-300 fadein" style={{ fontSize: '0.95rem' }}></i>}
                                </div>
                            }
                        >
                            <div className="pt-4 animation-duration-300 fadein">
                                <div className="mb-4">
                                    <h3 className="m-0 text-lg md:text-xl font-bold text-800 flex align-items-center gap-2">
                                        <i className="pi pi-user-plus text-blue-500"></i>Contact Person Sekunder (CP 2)
                                    </h3>
                                    <span className="text-xs md:text-sm text-500">Informasi detail kontak cadangan atau pendukung dari pihak supplier jika perwakilan utama tidak dapat dihubungi.</span>
                                </div>

                                <div className="p-4 border-round surface-50 border-1 surface-border mb-3">
                                    <div className="grid formgrid p-fluid">
                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">NAMA LENGKAP CP 2</label>
                                            <InputText
                                                value={formik?.values.nama_cp_2}
                                                onChange={(e) => formik?.setFieldValue('nama_cp_2', e.target.value)}
                                                placeholder="Nama lengkap perwakilan sekunder"
                                                className={isFormFieldInvalid('nama_cp_2') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('nama_cp_2')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">ALAMAT EMAIL CP 2</label>
                                            <InputText
                                                value={formik?.values.email_cp_2}
                                                onChange={(e) => formik?.setFieldValue('email_cp_2', e.target.value)}
                                                placeholder="contoh: cp2@supplier.com"
                                                className={isFormFieldInvalid('email_cp_2') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('email_cp_2')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">TELEPON KANTOR CP 2</label>
                                            <InputText
                                                value={formik?.values.telepon_cp_2}
                                                onChange={(e) => formik?.setFieldValue('telepon_cp_2', e.target.value)}
                                                placeholder="Contoh: 021883345"
                                                className={isFormFieldInvalid('telepon_cp_2') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('telepon_cp_2')}
                                        </div>

                                        <div className="field col-12 md:col-6 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">NOMOR HP CP 2</label>
                                            <InputText
                                                value={formik?.values.hp_cp_2}
                                                onChange={(e) => formik?.setFieldValue('hp_cp_2', e.target.value)}
                                                placeholder="Contoh: 081299990011"
                                                className={isFormFieldInvalid('hp_cp_2') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('hp_cp_2')}
                                        </div>

                                        <div className="field col-12 mb-3">
                                            <label className="font-semibold text-xs md:text-sm text-700 uppercase mb-2 block tracking-wider">ALAMAT CP 2</label>
                                            <InputText
                                                value={formik?.values.alamat_cp_2}
                                                onChange={(e) => formik?.setFieldValue('alamat_cp_2', e.target.value)}
                                                placeholder="Alamat domisili CP 2"
                                                className={isFormFieldInvalid('alamat_cp_2') ? 'p-invalid w-full' : 'w-full'}
                                            />
                                            {getFormErrorMessage('alamat_cp_2')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                    </TabView>
                </div>

                <div className="flex justify-content-between px-5 py-4 border-top-1 surface-border bg-gray-50">
                    {Number(state.activeStep) > 0 ? (
                        <Button
                            key="btn-back"
                            type="button"
                            label="Kembali"
                            icon="pi pi-arrow-left"
                            className="p-button-outlined p-button-secondary px-4 text-xs md:text-sm"
                            onClick={() => setState((p) => ({ ...p, activeStep: Math.max(Number(p.activeStep) - 1, 0) }))}
                        />
                    ) : (
                        <Button key="btn-cancel-under" type="button" label="Kembali ke Daftar" icon="pi pi-arrow-left" className="p-button-outlined p-button-secondary px-4 text-xs md:text-sm" onClick={triggerCancel} loading={state?.load} />
                    )}

                    {Number(state.activeStep) < 3 ? (
                        <Button
                            key="btn-next"
                            type="button"
                            label="Selanjutnya"
                            icon="pi pi-arrow-right"
                            iconPos="right"
                            className="bg-blue-600 border-blue-600 px-4 text-xs md:text-sm"
                            onClick={() => setState((p) => ({ ...p, activeStep: Math.min(Number(p.activeStep) + 1, 3) }))}
                        />
                    ) : (
                        <Button key="btn-save" type="submit" label="Simpan" icon="pi pi-save" className="bg-green-600 border-green-600 px-5 text-xs md:text-sm" loading={state?.load} />
                    )}
                </div>
            </form>

            {/* --- DIALOG KONFIRMASI PEMBATALAN --- */}
            <Dialog header="Konfirmasi Pembatalan" visible={showCancelDialog} style={{ width: '450px' }} modal footer={cancelDialogFooter} onHide={() => setShowCancelDialog(false)} className="browser-style-dialog">
                <div className="flex align-items-start gap-3 p-3">
                    <i className="pi pi-exclamation-triangle text-amber-500 mt-1" style={{ fontSize: '2.5rem' }} />
                    <div className="flex flex-column gap-1">
                        <span className="text-900 font-semibold text-base">Apakah Anda yakin ingin membatalkan?</span>
                        <span className="text-gray-600 leading-normal">
                            Semua data yang telah Anda masukkan pada formulir ini akan <strong>hilang secara permanen</strong>.
                        </span>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default Form;
