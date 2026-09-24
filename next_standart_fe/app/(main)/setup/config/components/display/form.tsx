'use client'

import { FormProps, initValue } from "../interfaces";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { apiEndpointCreate, apiEndpointGet } from "../endpoints";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useEffect, useRef } from "react";
import formUpload from "@/lib/axios/formData";
import { ProgressBar } from "primereact/progressbar";
import { InputTextarea } from "primereact/inputtextarea";
import { Divider } from "primereact/divider";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Message } from "primereact/message";

const Form = ({
    state,
    setState,
    formik,
    toast,
    getData
}: FormProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check user role
    const userRole = (state.session?.user?.role || '').toLowerCase();
    const isSuperAdmin = userRole === 'superadmin';

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const oHeaders = {
                "X-Level": "1",
            };

            const formData = new FormData();

            const { msLogoPerusahaan, ...rest } = input;

            const key = Object.keys(rest);
            const keterangan = Object.values(rest);

            formData.append("kode", JSON.stringify(key));
            formData.append("keterangan", JSON.stringify(keterangan));

            if (isSuperAdmin && msLogoPerusahaan && typeof msLogoPerusahaan !== 'string') {
                formData.append("msLogoPerusahaan", msLogoPerusahaan);
            }

            const vaData = await formUpload(
                apiEndpointCreate,
                formData,
                oHeaders
            );

            const res = vaData.data;

            showSuccess(
                toast,
                res.data?.message || "Pengaturan klinik berhasil disimpan"
            );

            setState((p) => ({
                ...p,
                add: false,
                edit: false,
                approval: false,
                delete: false,
            }));

            await getData(apiEndpointGet);

        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(
                toast,
                e?.message || "Gagal menyimpan pengaturan klinik"
            );
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const onFileSelect = (event: any) => {
        if (!isSuperAdmin) {
            return showError(toast, "Hanya Superadmin yang memiliki wewenang untuk mengubah logo klinik.");
        }

        const file = event?.target?.files[0];
        if (!file) return;

        if (file.size > 1024 * 1024) { // 1MB
            formik.setFieldValue("msLogoPerusahaan", null);
            return showError(toast, "File tidak boleh lebih dari 1MB.");
        }

        formik.setFieldValue("msLogoPerusahaan", file);
        setState(p => ({ ...p, imgPrev: URL.createObjectURL(file) }));
    };

    const konfigurasiFooter = (
        <>
            <Button
                type="button"
                label="Simpan Pengaturan Klinik"
                icon="pi pi-check"
                severity="success"
                className="font-bold border-round-lg px-4 shadow-2"
                onClick={() => formik.handleSubmit()}
            />
        </>
    );

    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name]}</small> : null;
    };

    useEffect(() => {
        return () => {
            if (state.imgPrev && state.imgPrev.startsWith('blob:')) {
                URL.revokeObjectURL(state.imgPrev);
            }
        };
    }, [state.imgPrev]);

    useEffect(() => {
        if (state.submittedData) {
            handleSave(state.submittedData);
        }
    }, [state.submittedData]);

    useEffect(() => {
        getData(apiEndpointGet);
    }, []);

    // Format address components for live Kop preview
    const previewAlamat = formik.values.msAlamatPerusahaan || 'Jl. Boulevard Raya Barat Blok A No. 18';
    const previewKota = formik.values.msKotaPerusahaan || 'Kota Madiun 63126';
    const previewTelp = formik.values.msTeleponPerusahaan || '(0351) 456-789';
    const previewWa = formik.values.msWaKlinik || '0812-3456-7890';
    const previewEmail = formik.values.msEmailPerusahaan || 'info@klinikkecantikan.co.id';
    const previewWeb = formik.values.msWebsitePerusahaan || 'www.klinikkecantikan.co.id';
    const previewNamaKlinik = formik.values.msNamaPerusahaan || 'KLINIK KECANTIKAN ESTETIKA';
    const previewIzin = formik.values.msIzinOperasional || 'No. 440/012/Dinkes/Klinik-Estetika/2026';

    return (
        <div className="grid justify-content-center">
            <div className="col-12 xl:col-12">
                <div className="card border-none shadow-2 p-0 overflow-hidden border-round-2xl">
                    {/* Header Banner */}
                    <div
                        className="p-4 flex align-items-center justify-content-between border-bottom-1 surface-border"
                        style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' }}
                    >
                        <div className="flex align-items-center gap-3">
                            <div
                                className="w-3rem h-3rem border-round-xl flex align-items-center justify-content-center shadow-1"
                                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff' }}
                            >
                                <i className="pi pi-building text-xl" />
                            </div>
                            <div>
                                <h3 className="m-0 font-bold text-900">Profil &amp; Pengaturan Dokumen Klinik</h3>
                                <p className="m-0 text-600 text-sm">
                                    Kelola identitas, izin operasional, kontak, dan format Kop Surat untuk seluruh dokumen rekam medis &amp; laporan
                                </p>
                            </div>
                        </div>
                    </div>

                    {state.load && (
                        <ProgressBar mode="indeterminate" style={{ height: "4px" }} />
                    )}

                    <div className="grid p-4 md:p-6">
                        {/* Bagian Kiri: Profile Identity Card & Logo Management */}
                        <div className="col-12 lg:col-4">
                            <div className="flex flex-column align-items-center p-4 surface-50 border-round-2xl border-1 surface-border h-full">
                                <span className="text-900 font-bold mb-3 flex align-items-center gap-2">
                                    <i className="pi pi-image text-emerald-600" />
                                    Logo Resmi Klinik
                                </span>

                                <div className="relative group my-2">
                                    <div
                                        className="p-3 border-circle border-2 border-emerald-500 border-dashed bg-white shadow-1 flex align-items-center justify-content-center"
                                        style={{ width: '13rem', height: '13rem' }}
                                    >
                                        {state.imgPrev ? (
                                            <img
                                                src={state.imgPrev}
                                                alt="logo_klinik"
                                                className="border-circle shadow-2"
                                                style={{ width: '11rem', height: '11rem', objectFit: 'contain' }}
                                                onError={(e: any) => {
                                                    setState((p) => ({ ...p, imgPrev: null }));
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="border-circle shadow-3 flex flex-column align-items-center justify-content-center text-white"
                                                style={{
                                                    width: '11rem',
                                                    height: '11rem',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                                                }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#ffffff' }}>
                                                    spa
                                                </span>
                                                <span className="font-bold text-xs mt-2 tracking-wider" style={{ letterSpacing: '1px' }}>
                                                    KLINIK ESTETIKA
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {isSuperAdmin && (
                                        <Button
                                            type="button"
                                            icon="pi pi-camera"
                                            className="p-button-rounded p-button-success absolute shadow-5"
                                            style={{ bottom: '12px', right: '12px', width: '3.2rem', height: '3.2rem' }}
                                            onClick={() => fileInputRef.current?.click()}
                                            tooltip="Ubah Logo Klinik (Superadmin)"
                                            tooltipOptions={{ position: 'bottom' }}
                                        />
                                    )}
                                </div>

                                {isSuperAdmin ? (
                                    <div className="text-center mt-3">
                                        <p className="text-xs text-600 line-height-3 m-0 font-medium">
                                            Format: <strong>JPG, PNG, WebP</strong> (Maks. 1MB).<br />
                                            <span className="text-emerald-700">Logo ini akan tampil pada Kop Dokumen seluruh cabang.</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4 p-3 bg-yellow-50 text-yellow-900 border-1 border-yellow-200 border-round-xl text-xs line-height-3 shadow-1 text-center">
                                        <div className="flex align-items-center justify-content-center gap-2 font-bold mb-1 text-yellow-800">
                                            <i className="pi pi-lock text-sm"></i>
                                            <span>Hak Akses Terbatas</span>
                                        </div>
                                        Foto / logo klinik hanya dapat diubah oleh <strong>Superadmin (Kantor Pusat)</strong> karena perubahan logo akan berdampak langsung ke seluruh cabang klinik.
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onFileSelect}
                                />
                            </div>
                        </div>

                        {/* Bagian Kanan: Detailed Config Form */}
                        <div className="col-12 lg:col-8 lg:pl-5">
                            <form onSubmit={formik.handleSubmit} className="grid formgrid p-fluid">

                                {/* Section 1: Identitas & Legalitas */}
                                <div className="col-12 mb-2">
                                    <span className="text-emerald-700 font-bold uppercase text-xs tracking-wider flex align-items-center gap-2">
                                        <i className="pi pi-building text-sm" />
                                        1. Identitas &amp; Legalitas Klinik (Kop Dokumen)
                                    </span>
                                    <Divider className="mt-2 mb-3" />
                                </div>

                                <div className="field col-12 mb-3">
                                    <label htmlFor="msNamaPerusahaan" className="font-semibold text-sm mb-2 text-800">
                                        Nama Resmi Klinik / Instansi <span className="text-red-500">*</span>
                                    </label>
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-building text-emerald-600" />
                                        <InputText
                                            id="msNamaPerusahaan"
                                            name="msNamaPerusahaan"
                                            value={formik.values.msNamaPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msNamaPerusahaan', e.target.value)}
                                            className={isFormFieldInvalid('msNamaPerusahaan') ? 'p-invalid p-inputtext-lg' : 'p-inputtext-lg'}
                                            placeholder="Klinik Kecantikan Estetika"
                                        />
                                    </IconField>
                                    {getFormErrorMessage('msNamaPerusahaan')}
                                </div>

                                <div className="field col-12 mb-3">
                                    <label htmlFor="msIzinOperasional" className="font-semibold text-sm mb-2 text-800">
                                        Nomor Izin Operasional Klinik (Dinkes)
                                    </label>
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-id-card text-emerald-600" />
                                        <InputText
                                            id="msIzinOperasional"
                                            name="msIzinOperasional"
                                            value={formik.values.msIzinOperasional}
                                            onChange={(e) => formik.setFieldValue('msIzinOperasional', e.target.value)}
                                            className={isFormFieldInvalid('msIzinOperasional') ? 'p-invalid' : ''}
                                            placeholder="No. 440/012/Dinkes/2026"
                                        />
                                    </IconField>
                                    {getFormErrorMessage('msIzinOperasional')}
                                </div>

                                {/* Section 2: Alamat & Lokasi */}
                                <div className="col-12 mt-3 mb-2">
                                    <span className="text-emerald-700 font-bold uppercase text-xs tracking-wider flex align-items-center gap-2">
                                        <i className="pi pi-map-marker text-sm" />
                                        2. Alamat &amp; Lokasi Klinik
                                    </span>
                                    <Divider className="mt-2 mb-3" />
                                </div>

                                <div className="field col-12 md:col-6 mb-3">
                                    <label htmlFor="msAlamatPerusahaan" className="font-semibold text-sm mb-2 text-800">
                                        Alamat Lengkap Klinik (Jalan / Gedung / No.)
                                    </label>
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-map text-emerald-600" />
                                        <InputText
                                            id="msAlamatPerusahaan"
                                            name="msAlamatPerusahaan"
                                            value={formik.values.msAlamatPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msAlamatPerusahaan', e.target.value)}
                                            className={isFormFieldInvalid('msAlamatPerusahaan') ? 'p-invalid' : ''}
                                            placeholder="Jl. Boulevard Raya Barat No. 18"
                                        />
                                    </IconField>
                                    {getFormErrorMessage('msAlamatPerusahaan')}
                                </div>

                                <div className="field col-12 md:col-6 mb-3">
                                    <label htmlFor="msKotaPerusahaan" className="font-semibold text-sm mb-2 text-800">
                                        Kota / Kabupaten &amp; Kode Pos
                                    </label>
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-compass text-emerald-600" />
                                        <InputText
                                            id="msKotaPerusahaan"
                                            name="msKotaPerusahaan"
                                            value={formik.values.msKotaPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msKotaPerusahaan', e.target.value)}
                                            className={isFormFieldInvalid('msKotaPerusahaan') ? 'p-invalid' : ''}
                                            placeholder="Kota Madiun 63126"
                                        />
                                    </IconField>
                                    {getFormErrorMessage('msKotaPerusahaan')}
                                </div>

                                {/* Section 3: Kontak & Media Komunikasi */}
                                <div className="col-12 mt-3 mb-2">
                                    <span className="text-emerald-700 font-bold uppercase text-xs tracking-wider flex align-items-center gap-2">
                                        <i className="pi pi-phone text-sm" />
                                        3. Kontak Resmi &amp; Media Komunikasi Pasien
                                    </span>
                                    <Divider className="mt-2 mb-3" />
                                </div>

                                <div className="field col-12 md:col-6 mb-3">
                                    <label htmlFor="msTeleponPerusahaan" className="font-semibold text-sm mb-2 text-800">
                                        Nomor Telepon Kantor / Hotline
                                    </label>
                                    <div className="p-inputgroup">
                                        <span className="p-inputgroup-addon bg-white">
                                            <i className="pi pi-phone text-emerald-600"></i>
                                        </span>
                                        <InputText
                                            id="msTeleponPerusahaan"
                                            name="msTeleponPerusahaan"
                                            value={formik.values.msTeleponPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msTeleponPerusahaan', e.target.value)}
                                            placeholder="(0351) 456-789"
                                            className={isFormFieldInvalid('msTeleponPerusahaan') ? 'p-invalid' : ''}
                                        />
                                    </div>
                                    {getFormErrorMessage('msTeleponPerusahaan')}
                                </div>

                                <div className="field col-12 md:col-6 mb-3">
                                    <label htmlFor="msWaKlinik" className="font-semibold text-sm mb-2 text-800">
                                        Nomor WhatsApp Pasien / CS
                                    </label>
                                    <div className="p-inputgroup">
                                        <span className="p-inputgroup-addon bg-white">
                                            <i className="pi pi-whatsapp text-emerald-600"></i>
                                        </span>
                                        <InputText
                                            id="msWaKlinik"
                                            name="msWaKlinik"
                                            value={formik.values.msWaKlinik}
                                            onChange={(e) => formik.setFieldValue('msWaKlinik', e.target.value)}
                                            placeholder="0812-3456-7890"
                                            className={isFormFieldInvalid('msWaKlinik') ? 'p-invalid' : ''}
                                        />
                                    </div>
                                    {getFormErrorMessage('msWaKlinik')}
                                </div>

                                <div className="field col-12 md:col-6 mb-3">
                                    <label htmlFor="msEmailPerusahaan" className="font-semibold text-sm mb-2 text-800">
                                        Email Resmi Klinik
                                    </label>
                                    <div className="p-inputgroup">
                                        <span className="p-inputgroup-addon bg-white">
                                            <i className="pi pi-envelope text-emerald-600"></i>
                                        </span>
                                        <InputText
                                            id="msEmailPerusahaan"
                                            name="msEmailPerusahaan"
                                            value={formik.values.msEmailPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msEmailPerusahaan', e.target.value)}
                                            placeholder="info@klinikkecantikan.co.id"
                                            className={isFormFieldInvalid('msEmailPerusahaan') ? 'p-invalid' : ''}
                                        />
                                    </div>
                                    {getFormErrorMessage('msEmailPerusahaan')}
                                </div>

                                <div className="field col-12 md:col-6 mb-3">
                                    <label htmlFor="msWebsitePerusahaan" className="font-semibold text-sm mb-2 text-800">
                                        Website Resmi Klinik
                                    </label>
                                    <div className="p-inputgroup">
                                        <span className="p-inputgroup-addon bg-white">
                                            <i className="pi pi-globe text-emerald-600"></i>
                                        </span>
                                        <InputText
                                            id="msWebsitePerusahaan"
                                            name="msWebsitePerusahaan"
                                            value={formik.values.msWebsitePerusahaan}
                                            onChange={(e) => formik.setFieldValue('msWebsitePerusahaan', e.target.value)}
                                            placeholder="www.klinikkecantikan.co.id"
                                            className={isFormFieldInvalid('msWebsitePerusahaan') ? 'p-invalid' : ''}
                                        />
                                    </div>
                                    {getFormErrorMessage('msWebsitePerusahaan')}
                                </div>

                            </form>
                        </div>

                        {/* LIVE KOP SURAT PREVIEW SECTION */}
                        <div className="col-12 mt-4">
                            <div className="border-round-2xl border-1 surface-border p-4 bg-gray-50 shadow-1">
                                <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
                                    <div className="flex align-items-center gap-2">
                                        <i className="pi pi-eye text-emerald-600 font-bold" />
                                        <span className="font-bold text-sm text-900">
                                            Pratinjau Langsung (Live Preview) Kop Dokumen Rekam Medis &amp; Laporan
                                        </span>
                                    </div>
                                    <span className="text-xs text-500 font-mono">Tampilan Kop Surat A4</span>
                                </div>

                                {/* Preview Card */}
                                <div className="bg-white p-4 border-round-xl border-1 surface-border shadow-2">
                                    <div className="flex align-items-center justify-content-between pb-3" style={{ borderBottom: '2px solid #0f172a' }}>
                                        <div className="flex align-items-center gap-3">
                                            {state.imgPrev ? (
                                                <img
                                                    src={state.imgPrev}
                                                    alt="Logo Preview"
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '10px',
                                                        objectFit: 'contain',
                                                    }}
                                                    onError={(e: any) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '12px',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#ffffff',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>spa</span>
                                                </div>
                                            )}
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a' }}>
                                                    {previewNamaKlinik}
                                                </h4>
                                                <p style={{ margin: '1px 0', fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                                                    Izin Operasional Klinik: {previewIzin}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '9.5px', color: '#64748b' }}>
                                                    {previewAlamat}, {previewKota} • Telp: {previewTelp} • WA: {previewWa}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '9.5px', color: '#64748b' }}>
                                                    Email: {previewEmail} • Website: {previewWeb}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}>Rekam Medis Elektronik (RME)</div>
                                            <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#0d9488' }}>
                                                KJ-20260914-004
                                            </div>
                                            <div style={{ fontSize: '9px', color: '#64748b' }}>
                                                Status: <strong style={{ color: '#059669' }}>SELESAI</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center mt-3 pt-2">
                                        <span className="font-bold text-xs" style={{ textDecoration: 'underline', letterSpacing: '1px' }}>
                                            LAPORAN DATA REKAM MEDIS PASIEN
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-gray-50 flex justify-content-end border-top-1 surface-border">
                        <div className="flex gap-2">
                            {konfigurasiFooter}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Form;