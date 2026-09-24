'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Printer, Download, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import postData from '@/lib/axios/postData';

import { IconMedicalRecord } from './DrawerRiwayatPasien';

interface RMEReportPrintProps {
    visible: boolean;
    onHide: () => void;
    visitData: any | null;
}

export const RMEReportPrint: React.FC<RMEReportPrintProps> = ({
    visible,
    onHide,
    visitData,
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    const [clinicConfig, setClinicConfig] = useState<any>({
        msNamaPerusahaan: 'KLINIK KECANTIKAN ESTETIKA',
        msIzinOperasional: 'No. 440/012/Dinkes/Klinik-Estetika/2026',
        msAlamatPerusahaan: 'Jl. Boulevard Raya Barat Blok A No. 18',
        msKotaPerusahaan: 'Kota Madiun 63126',
        msTeleponPerusahaan: '(0351) 456-789',
        msWaKlinik: '0812-3456-7890',
        msEmailPerusahaan: 'info@klinikkecantikan.co.id',
        msWebsitePerusahaan: 'www.klinikkecantikan.co.id',
        msLogoPerusahaan: '',
    });

    useEffect(() => {
        if (visible) {
            postData('/setup/config-data', {
                kode: [
                    'msNamaPerusahaan',
                    'msIzinOperasional',
                    'msAlamatPerusahaan',
                    'msKotaPerusahaan',
                    'msTeleponPerusahaan',
                    'msWaKlinik',
                    'msEmailPerusahaan',
                    'msWebsitePerusahaan',
                    'msLogoPerusahaan',
                ]
            }).then((res) => {
                if (res?.data?.data) {
                    setClinicConfig((prev: any) => ({
                        ...prev,
                        ...res.data.data
                    }));
                }
            }).catch(() => {});
        }
    }, [visible]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: visitData?.kode_kunjungan ? `RME-${visitData.kode_kunjungan}-${visitData.no_rm || ''}` : 'Laporan-Rekam-Medis',
    });

    if (!visitData) return null;

    // Helper functions
    const headerRM = visitData.header_rekam_medis || {};
    const layananList = visitData.layanan || [];
    const patientName = visitData.nama_pasien || '-';
    const noRm = visitData.no_rm || '-';

    const formatDateIndo = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch (_) {
            return dateStr;
        }
    };

    const formatDateSimple = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch (_) {
            return dateStr;
        }
    };

    const calculateAge = (birthDateStr?: string) => {
        if (!birthDateStr) return '';
        try {
            const birth = new Date(birthDateStr);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                age--;
            }
            return age > 0 ? ` (${age} Thn)` : '';
        } catch (_) {
            return '';
        }
    };

    // Format address components
    const formatFullAddress = () => {
        const parts = [
            visitData.patokan,
            visitData.kelurahan_desa ? `Kel. ${visitData.kelurahan_desa}` : '',
            visitData.kecamatan ? `Kec. ${visitData.kecamatan}` : '',
            visitData.kota_kabupaten,
            visitData.provinsi,
            visitData.kode_pos,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : '-';
    };

    // Format gender
    const formatGender = (g?: string) => {
        if (!g) return '-';
        const up = g.toUpperCase();
        if (up === 'L' || up === 'LAKI-LAKI' || up === 'PRIA') return 'Laki-Laki';
        if (up === 'P' || up === 'PEREMPUAN' || up === 'WANITA') return 'Perempuan';
        return g;
    };

    // Extract vital signs and structured form entries
    const formFieldsCombined: { label: string; value: any }[] = [];
    layananList.forEach((lay: any) => {
        const formItems = lay.rekam_medis?.formatted_data_form || [];
        formItems.forEach((f: any) => {
            if (f.label && f.value !== undefined && f.value !== null && String(f.value).trim() !== '') {
                formFieldsCombined.push({
                    label: f.label,
                    value: f.value,
                });
            }
        });
    });

    let resolvedDokterName = headerRM.dokter_nama || visitData.dokter_nama;
    if (!resolvedDokterName && layananList.length > 0) {
        for (const lay of layananList) {
            if (lay.petugas?.nama) {
                resolvedDokterName = lay.petugas.nama;
                break;
            }
            if (Array.isArray(lay.daftar_petugas)) {
                const pj = lay.daftar_petugas.find((p: any) => p.is_dokter_pj || p.role === 'DOKTER');
                if (pj?.nama) {
                    resolvedDokterName = pj.nama;
                    break;
                }
            }
            if (lay.rekam_medis?.dokter_penanggung_jawab?.nama) {
                resolvedDokterName = lay.rekam_medis.dokter_penanggung_jawab.nama;
                break;
            }
        }
    }
    const dokterName = resolvedDokterName || 'dr. Penanggung Jawab';
    const dokterFormatted = dokterName.toLowerCase().startsWith('dr.') || dokterName.includes(',')
        ? dokterName
        : `dr. ${dokterName}`;

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={
                <div className="flex align-items-center justify-content-between w-full pr-3">
                    <div className="flex align-items-center gap-2">
                        <div className="w-2rem h-2rem border-round-lg bg-teal-50 text-teal-700 flex align-items-center justify-content-center shadow-1">
                            <IconMedicalRecord size={20} className="text-teal-700" />
                        </div>
                        <div>
                            <span className="font-bold text-base text-900 block">Cetak Laporan Rekam Medis Pasien (RME)</span>
                            <span className="text-xs text-500 font-mono">No. RM: {noRm} • Kunjungan: {visitData.kode_kunjungan}</span>
                        </div>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Button
                            label="Cetak Dokumen"
                            icon="pi pi-print"
                            severity="success"
                            size="small"
                            className="font-bold border-round-lg px-3 shadow-1"
                            onClick={() => handlePrint()}
                        />
                    </div>
                </div>
            }
            modal
            style={{ width: '90vw', maxWidth: '960px' }}
            contentClassName="p-0 bg-gray-100"
            footer={
                <div className="flex justify-content-between align-items-center px-3 py-2 bg-white border-top-1 surface-border">
                    <span className="text-xs text-500">
                        Pastikan ukuran kertas printer diatur ke <strong>A4</strong> (Portrait) dengan Margin Default/Minimum.
                    </span>
                    <div className="flex gap-2">
                        <Button
                            label="Tutup"
                            icon="pi pi-times"
                            severity="secondary"
                            outlined
                            size="small"
                            className="border-round-lg"
                            onClick={onHide}
                        />
                        <Button
                            label="Cetak Sekarang"
                            icon="pi pi-print"
                            severity="success"
                            size="small"
                            className="font-bold border-round-lg px-4"
                            onClick={() => handlePrint()}
                        />
                    </div>
                </div>
            }
        >
            {/* PREVIEW CONTAINER */}
            <div className="p-3 md:p-5 flex justify-content-center overflow-auto" style={{ maxHeight: '76vh' }}>
                <div
                    ref={printRef}
                    className="rme-print-document bg-white text-900 shadow-3 p-4 md:p-6 border-round-md"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        margin: '0 auto',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        fontFamily: "'Inter', Arial, Helvetica, sans-serif",
                        color: '#0f172a',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* CSS FOR PRINT */}
                    <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 8mm 10mm 8mm 10mm;
                            }
                            body {
                                background: #ffffff !important;
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                            }
                            .rme-print-document {
                                width: 100% !important;
                                min-height: auto !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                box-shadow: none !important;
                                border-radius: 0 !important;
                                font-size: 8.5px !important;
                                line-height: 1.3 !important;
                                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
                        .rme-table-info {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        .rme-table-info tr {
                            border-bottom: 1px dashed #f1f5f9;
                        }
                        .rme-table-info tr:last-child {
                            border-bottom: none;
                        }
                        .rme-table-info td {
                            padding: 2.5px 3px;
                            vertical-align: top;
                            font-size: 8.5px;
                            line-height: 1.3;
                        }
                        .rme-table-info td.rme-label {
                            width: 105px;
                            color: #475569;
                            font-weight: 500;
                            white-space: nowrap;
                        }
                        .rme-table-info td.rme-colon {
                            width: 10px;
                            text-align: center;
                            color: #64748b;
                            font-weight: 600;
                            padding-left: 0;
                            padding-right: 0;
                        }
                        .rme-table-info td.rme-value {
                            color: #0f172a;
                            font-weight: 700;
                        }
                        .rme-section-header {
                            background-color: #f8fafc;
                            border-left: 3px solid #0284c7;
                            border-bottom: 1px solid #e2e8f0;
                            padding: 3px 6px;
                            font-weight: 700;
                            font-size: 8.5px;
                            text-transform: uppercase;
                            letter-spacing: 0.4px;
                            color: #0f172a;
                            margin-top: 5px;
                            margin-bottom: 3px;
                            border-radius: 0 3px 3px 0;
                        }
                        .rme-border-box {
                            border: 1px solid #cbd5e1;
                            border-radius: 4px;
                            padding: 4px 6px;
                            background-color: #ffffff;
                        }
                        .rme-data-table {
                            width: 100%;
                            border-collapse: collapse;
                            border: 1px solid #cbd5e1;
                            margin-top: 3px;
                        }
                        .rme-data-table th {
                            background-color: #f1f5f9;
                            border: 1px solid #cbd5e1;
                            padding: 5px 6px;
                            font-size: 8px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.3px;
                            color: #0f172a;
                            vertical-align: middle;
                        }
                        .rme-data-table td {
                            border: 1px solid #cbd5e1;
                            padding: 5px 6px;
                            font-size: 8.5px;
                            vertical-align: top;
                            line-height: 1.35;
                            color: #0f172a;
                        }
                        .rme-skin-grid {
                            display: grid;
                            grid-template-columns: repeat(5, 1fr);
                            gap: 4px;
                            margin-bottom: 3px;
                        }
                        .rme-skin-card {
                            border: 1px solid #cbd5e1;
                            border-radius: 3px;
                            background-color: #f8fafc;
                            padding: 3px 2px;
                            text-align: center;
                            min-height: 34px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            box-sizing: border-box;
                        }
                        .rme-skin-card .rme-skin-label {
                            font-size: 7px;
                            color: #64748b;
                            font-weight: 600;
                            text-transform: uppercase;
                            line-height: 1;
                            letter-spacing: 0.2px;
                        }
                        .rme-skin-card .rme-skin-value {
                            font-size: 8px;
                            color: #0f172a;
                            font-weight: 700;
                            margin-top: 2px;
                            line-height: 1.15;
                            word-break: break-word;
                        }
                    `}</style>

                    {/* 1. HEADER / KOP KLINIK */}
                    <div className="flex align-items-center justify-content-between pb-1 mb-1" style={{ borderBottom: '1.5px solid #0f172a' }}>
                        <div className="flex align-items-center gap-2">
                            {clinicConfig.msLogoPerusahaan ? (
                                <img
                                    src={clinicConfig.msLogoPerusahaan}
                                    alt="Logo Klinik"
                                    style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '8px',
                                        objectFit: 'contain',
                                        flexShrink: 0,
                                    }}
                                    onError={(e: any) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                                        flexShrink: 0,
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                        spa
                                    </span>
                                </div>
                            )}
                            <div>
                                <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 800, letterSpacing: '0.3px', color: '#0f172a', lineHeight: 1.15 }}>
                                    {clinicConfig.msNamaPerusahaan || 'KLINIK KECANTIKAN ESTETIKA'}
                                </h1>
                                <p style={{ margin: 0, fontSize: '8px', color: '#475569', fontWeight: 600 }}>
                                    {clinicConfig.msIzinOperasional ? `Izin Operasional Klinik: ${clinicConfig.msIzinOperasional}` : 'Izin Operasional Klinik: No. 440/012/Dinkes/Klinik-Estetika/2026'}
                                </p>
                                <p style={{ margin: 0, fontSize: '7.5px', color: '#64748b' }}>
                                    {[clinicConfig.msAlamatPerusahaan, clinicConfig.msKotaPerusahaan].filter(Boolean).join(', ') || 'Jl. Boulevard Raya Barat Blok A No. 18, Kota Madiun 63126'}
                                    {clinicConfig.msTeleponPerusahaan ? ` • Telp: ${clinicConfig.msTeleponPerusahaan}` : ' • Telp: (0351) 456-789'}
                                    {clinicConfig.msWaKlinik ? ` • WA: ${clinicConfig.msWaKlinik}` : ' • WA: 0812-3456-7890'}
                                </p>
                                <p style={{ margin: 0, fontSize: '7.5px', color: '#64748b' }}>
                                    {clinicConfig.msEmailPerusahaan ? `Email: ${clinicConfig.msEmailPerusahaan}` : 'Email: info@klinikkecantikan.co.id'}
                                    {clinicConfig.msWebsitePerusahaan ? ` • Website: ${clinicConfig.msWebsitePerusahaan}` : ' • Website: www.klinikkecantikan.co.id'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div style={{ fontSize: '7.5px', color: '#94a3b8', fontStyle: 'italic' }}>Rekam Medis Elektronik (RME)</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'monospace', color: '#0284c7', lineHeight: 1.1 }}>
                                {visitData.kode_kunjungan || '-'}
                            </div>
                            <div style={{ fontSize: '7.5px', color: '#64748b' }}>
                                Status: <strong style={{ color: '#059669', textTransform: 'uppercase' }}>{visitData.status_kunjungan || 'SELESAI'}</strong>
                            </div>
                        </div>
                    </div>

                    {/* 2. JUDUL DOKUMEN */}
                    <div className="text-center" style={{ margin: '2px 0 4px 0' }}>
                        <h2 style={{ margin: 0, fontSize: '11px', fontWeight: 800, textDecoration: 'underline', letterSpacing: '0.5px', color: '#0f172a' }}>
                            LAPORAN DATA REKAM MEDIS PASIEN
                        </h2>
                    </div>

                    {/* 3. INFORMASI KUNJUNGAN & IDENTITAS PASIEN (2 KOLOM SEJAJAR) */}
                    <div className="grid mb-1" style={{ margin: '0 -3px' }}>
                        {/* Kolom Kiri: Informasi Kunjungan */}
                        <div className="col-6 p-1">
                            <div className="rme-section-header" style={{ marginTop: 0 }}>
                                Informasi Kunjungan
                            </div>
                            <div className="rme-border-box h-full">
                                <table className="rme-table-info">
                                    <tbody>
                                        <tr>
                                            <td className="rme-label">Tanggal Kunjungan</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{formatDateIndo(visitData.tanggal_kunjungan)}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">No. Kunjungan</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value font-mono text-teal-800">{visitData.kode_kunjungan || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Jaminan / Penjamin</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">Umum / Mandiri</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Nama Poli / Ruangan</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{layananList[0]?.nama_ruangan || 'Ruang Konsultasi & Treatment'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Dokter Pemeriksa</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{dokterFormatted}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Waktu Pemeriksaan</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{formatDateSimple(visitData.tanggal_kunjungan)} {visitData.jam_datang ? `(${visitData.jam_datang} WIB)` : ''}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Kolom Kanan: Identitas Pasien */}
                        <div className="col-6 p-1">
                            <div className="rme-section-header" style={{ marginTop: 0 }}>
                                Identitas Pasien
                            </div>
                            <div className="rme-border-box h-full">
                                <table className="rme-table-info">
                                    <tbody>
                                        <tr>
                                            <td className="rme-label">No. Rekam Medis</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value font-mono text-teal-800">{noRm}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">NIK / Identitas</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value font-mono">{visitData.nik || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Nama Pasien</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{patientName}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Jenis Kelamin / Usia</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{formatGender(visitData.jenis_kelamin)}{calculateAge(visitData.tanggal_lahir)}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Alamat</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{formatFullAddress()}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">No. HP / WA</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{visitData.no_hp || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Alergi Obat / Zat</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value" style={{ color: (visitData.alergi || headerRM.riwayat_alergi) ? '#b91c1c' : '#475569' }}>
                                                {visitData.alergi || headerRM.riwayat_alergi || 'Tidak Ada Riwayat Alergi'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 4. SUBJEKTIF & OBJEKTIF (2 KOLOM SEJAJAR SIDE-BY-SIDE) */}
                    <div className="grid mb-1" style={{ margin: '0 -3px' }}>
                        {/* Kolom Kiri: I. SUBJEKTIF */}
                        <div className="col-6 p-1">
                            <div className="rme-section-header">
                                I. Subjektif (Anamnesis &amp; Keluhan)
                            </div>
                            <div className="rme-border-box h-full" style={{ minHeight: '88px' }}>
                                <table className="rme-table-info">
                                    <tbody>
                                        <tr>
                                            <td className="rme-label">Keluhan Utama</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{headerRM.keluhan || headerRM.subjective || visitData.catatan_pasien || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Durasi Keluhan</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{headerRM.durasi_keluhan || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Riwayat Treatment</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value">{headerRM.riwayat_treatment || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="rme-label">Riwayat Alergi</td>
                                            <td className="rme-colon">:</td>
                                            <td className="rme-value" style={{ color: headerRM.riwayat_alergi ? '#b91c1c' : '#475569' }}>
                                                {headerRM.riwayat_alergi || visitData.alergi || 'Tidak Ada'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Kolom Kanan: II. OBJEKTIF */}
                        <div className="col-6 p-1">
                            <div className="rme-section-header">
                                II. Objektif (Pemeriksaan &amp; Kulit)
                            </div>
                            <div className="rme-border-box h-full" style={{ minHeight: '88px' }}>
                                <div style={{ fontSize: '8px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>
                                    Karakteristik Kulit Pasien:
                                </div>
                                <div className="rme-skin-grid">
                                    <div className="rme-skin-card">
                                        <span className="rme-skin-label">Tipe</span>
                                        <strong className="rme-skin-value">{headerRM.pemeriksaan_skin_type || 'Normal'}</strong>
                                    </div>
                                    <div className="rme-skin-card">
                                        <span className="rme-skin-label">Inflamasi</span>
                                        <strong className="rme-skin-value">{headerRM.pemeriksaan_inflammation || 'Tidak Ada'}</strong>
                                    </div>
                                    <div className="rme-skin-card">
                                        <span className="rme-skin-label">Acne</span>
                                        <strong className="rme-skin-value">{headerRM.pemeriksaan_acne || 'Tidak Ada'}</strong>
                                    </div>
                                    <div className="rme-skin-card">
                                        <span className="rme-skin-label">Pigmentasi</span>
                                        <strong className="rme-skin-value">{headerRM.pemeriksaan_pigmentation || 'Normal'}</strong>
                                    </div>
                                    <div className="rme-skin-card">
                                        <span className="rme-skin-label">Sensitivitas</span>
                                        <strong className="rme-skin-value">{headerRM.pemeriksaan_sensitivity || 'Normal'}</strong>
                                    </div>
                                </div>

                                {headerRM.objective && (
                                    <div className="mt-1 pt-1 border-top-1 surface-border" style={{ fontSize: '8px', lineHeight: 1.3 }}>
                                        <span style={{ color: '#475569', fontWeight: 600 }}>Temuan Fisik: </span>
                                        <span style={{ color: '#0f172a', fontWeight: 700 }}>{headerRM.objective}</span>
                                    </div>
                                )}

                                {formFieldsCombined.length > 0 && (
                                    <div className="mt-1 pt-1 border-top-1 surface-border">
                                        <div style={{ fontSize: '8px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                                            Form Ruangan:
                                        </div>
                                        <div className="grid" style={{ margin: '0 -2px' }}>
                                            {formFieldsCombined.slice(0, 4).map((f, fIdx) => (
                                                <div key={fIdx} className="col-6" style={{ padding: '1px 2px', fontSize: '7.5px' }}>
                                                    <span style={{ color: '#475569', fontWeight: 500 }}>{f.label}: </span>
                                                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>{String(f.value)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 5. ASSESSMENT (DIAGNOSIS) & PLANNING (TINDAKAN) */}
                    <div className="rme-section-header">
                        III. Assessment &amp; Penatalaksanaan Tindakan (Planning)
                    </div>
                    <div className="rme-border-box mb-1">
                        {/* Diagnosis & Plan note in compact row */}
                        <div className="flex flex-wrap gap-2 justify-content-between align-items-center mb-1 pb-1 border-bottom-1 surface-border" style={{ fontSize: '8.5px' }}>
                            <div>
                                <span style={{ color: '#475569', fontWeight: 500 }}>Diagnosis Utama:</span>{' '}
                                <strong style={{ color: '#0f172a', fontWeight: 700, fontSize: '9px' }}>
                                    {headerRM.diagnosis || visitData.diagnosis || '-'}
                                </strong>
                                {headerRM.assessment && (
                                    <span style={{ color: '#475569', marginLeft: '6px', fontWeight: 500 }}>
                                        ({headerRM.assessment})
                                    </span>
                                )}
                            </div>
                            {headerRM.plan && (
                                <div style={{ fontSize: '8px', color: '#334155' }}>
                                    <span style={{ color: '#475569', fontWeight: 500 }}>Anjuran / Terapi:</span>{' '}
                                    <strong style={{ color: '#0f172a', fontWeight: 700 }}>{headerRM.plan}</strong>
                                </div>
                            )}
                        </div>

                        {/* Rincian Layanan & Tindakan */}
                        {layananList.length > 0 ? (
                            <table className="rme-data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '28px', textAlign: 'center' }}>No</th>
                                        <th>Nama Layanan / Tindakan</th>
                                        <th style={{ width: '100px' }}>Ruangan</th>
                                        <th style={{ width: '130px' }}>Petugas / Pelaksana</th>
                                        <th>Catatan Hasil Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {layananList.map((lay: any, idx: number) => {
                                        const dokterObj = lay.petugas || lay.rekam_medis?.dokter_penanggung_jawab || null;
                                        const terapisList: any[] = Array.isArray(lay.terapis_pendamping) ? lay.terapis_pendamping : [];
                                        const allDaftarPetugas: any[] = Array.isArray(lay.daftar_petugas) && lay.daftar_petugas.length > 0
                                            ? lay.daftar_petugas
                                            : [];
                                        const catatan = lay.catatan_hasil_treatment || lay.catatan_tindakan || lay.catatan_petugas || '-';

                                        return (
                                            <tr key={idx}>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                                                <td style={{ fontWeight: 700, color: '#0f172a' }}>{lay.nama_layanan || 'Pelayanan Klinik'}</td>
                                                <td>{lay.nama_ruangan || '-'}</td>
                                                <td>
                                                    {allDaftarPetugas.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '8px' }}>
                                                            {allDaftarPetugas.map((p: any, pIdx: number) => (
                                                                <div key={pIdx} style={{ lineHeight: '1.2' }}>
                                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.nama}</span>
                                                                    <span style={{ color: p.is_dokter_pj ? '#0284c7' : '#7c3aed', fontSize: '7.5px', fontWeight: 600 }}> ({p.role || p.jabatan || 'PETUGAS'})</span>
                                                                    {p.no_sip && p.no_sip !== '-' && (
                                                                        <div style={{ fontSize: '7px', color: '#64748b' }}>SIP: {p.no_sip}</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (dokterObj || terapisList.length > 0) ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '8px' }}>
                                                            {dokterObj && (
                                                                <div style={{ lineHeight: '1.2' }}>
                                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{dokterObj.nama}</span>
                                                                    <span style={{ color: '#0284c7', fontSize: '7.5px', fontWeight: 600 }}> (Dokter/PJ)</span>
                                                                    {(dokterObj.kode_karyawan || dokterObj.no_sip) && (
                                                                        <div style={{ fontSize: '7px', color: '#64748b' }}>SIP: {dokterObj.kode_karyawan || dokterObj.no_sip}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {terapisList.map((t: any, tIdx: number) => (
                                                                <div key={tIdx} style={{ lineHeight: '1.2' }}>
                                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{t.nama || t.nama_petugas}</span>
                                                                    <span style={{ color: '#7c3aed', fontSize: '7.5px', fontWeight: 600 }}> ({(t.role || t.jabatan || 'TERAPIS').toUpperCase()})</span>
                                                                    {t.no_sip && t.no_sip !== '-' && (
                                                                        <div style={{ fontSize: '7px', color: '#64748b' }}>SIP: {t.no_sip}</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '8px', fontWeight: 700 }}>{dokterFormatted}</span>
                                                    )}
                                                </td>
                                                <td style={{ color: catatan === '-' ? '#94a3b8' : '#0f172a' }}>{catatan}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8', fontSize: '8px', padding: '4px' }}>
                                Tidak ada tindakan / konsultasi tercatat.
                            </p>
                        )}
                    </div>

                    {/* 6. PENGESAHAN & TANDA TANGAN */}
                    <div style={{ pageBreakInside: 'avoid', marginTop: '10px', paddingTop: '4px' }}>
                        <div className="flex justify-content-between align-items-end">
                            <div style={{ fontSize: '7.5px', color: '#64748b', maxWidth: '320px', lineHeight: 1.3 }}>
                                <p style={{ margin: 0 }}>
                                    Dokumen Rekam Medis Elektronik (RME) ini diterbitkan secara sah melalui Sistem Informasi Manajemen Klinik.
                                </p>
                                <p style={{ margin: '2px 0 0 0', fontFamily: 'monospace', color: '#94a3b8' }}>
                                    Dicetak pada: {formatDateSimple(new Date().toISOString())}
                                </p>
                            </div>

                            <div className="text-center" style={{ minWidth: '190px' }}>
                                <div style={{ fontSize: '8.5px', color: '#334155', fontWeight: 500 }}>
                                    {clinicConfig.msKotaPerusahaan || 'Kota Madiun'}, {formatDateSimple(visitData.tanggal_kunjungan || new Date().toISOString())}
                                </div>
                                <div style={{ fontSize: '8.5px', fontWeight: 600, color: '#0f172a', marginTop: '1px' }}>
                                    Dokter Penanggung Jawab Pasien
                                </div>
                                <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '7.5px', color: '#cbd5e1', fontStyle: 'italic' }}>
                                        (Tanda Tangan &amp; Cap Digital)
                                    </span>
                                </div>
                                <div style={{ fontSize: '9.5px', fontWeight: 800, textDecoration: 'underline', color: '#0f172a' }}>
                                    {dokterFormatted}
                                </div>
                                <div style={{ fontSize: '7.5px', color: '#64748b', fontFamily: 'monospace', marginTop: '1px' }}>
                                    SIP: {headerRM.no_sip || visitData.no_sip || '440/SIP-D/2026/001'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

export default RMEReportPrint;
