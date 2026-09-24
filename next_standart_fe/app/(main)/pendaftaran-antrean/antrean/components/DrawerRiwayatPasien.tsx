'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';
import {
    ArrowLeft,
    Clock,
    User,
    AlertTriangle,
    FileText,
    Activity,
    Stethoscope,
    Sparkles,
    Building2,
    CheckCircle2,
    ClipboardList,
    Image as ImageIcon,
    ZoomIn,
    Printer,
} from 'lucide-react';
import { RMEReportPrint } from './RMEReportPrint';

export const IconMedicalRecord: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
    size = 16,
    className = '',
    style,
}) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        className={className}
        style={style}
    >
        {/* Document outline with rounded corners and folded corner */}
        <path
            d="M14.5 1.5H6.5C4.6 1.5 3 3.1 3 5v14c0 1.9 1.6 3.5 3.5 3.5h11c1.9 0 3.5-1.6 3.5-3.5V7.5L14.5 1.5z"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
        <path
            d="M14.5 1.5V6c0 .8.7 1.5 1.5 1.5h4.5"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Avatar Head (Larger & Bolder on top-left) */}
        <circle cx="8.8" cy="6" r="2.2" fill="currentColor" stroke="none" />
        {/* Avatar Shoulders / Suit */}
        <path
            d="M5.5 13v-.3c0-1.8 1.4-2.8 3.3-2.8s3.3 1 3.3 2.8v.3h-1.4l-.7-1.4-.7 1.4z"
            fill="currentColor"
            stroke="none"
        />
        {/* Document Data Bars (Solid Bold Lines) */}
        <rect x="5.5" y="14.8" width="13" height="1.6" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="5.5" y="17.4" width="13" height="1.6" rx="0.8" fill="currentColor" stroke="none" />
        <rect x="5.5" y="20" width="7.5" height="1.6" rx="0.8" fill="currentColor" stroke="none" />
    </svg>
);

interface DrawerRiwayatPasienProps {
    visible: boolean;
    onHide: () => void;
    noRm: string;
    namaPasien?: string;
    excludeKodeKunjungan?: string;
    toast?: React.RefObject<Toast>;
}

const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
            return url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, '');
        }
        return url;
    }
    const clean = url.startsWith('/') ? url : `/${url}`;
    return clean;
};

export const DrawerRiwayatPasien: React.FC<DrawerRiwayatPasienProps> = ({
    visible,
    onHide,
    noRm,
    namaPasien = 'Pasien',
    excludeKodeKunjungan,
    toast,
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [riwayatList, setRiwayatList] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    // Selected visit for detailed EMR dossier view (null = Table view)
    const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

    // Modal Print Laporan RME
    const [printModalVisible, setPrintModalVisible] = useState<boolean>(false);
    const [visitToPrint, setVisitToPrint] = useState<any | null>(null);

    // Modal Zoom Preview Foto
    const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>('');
    const [previewPhotoTitle, setPreviewPhotoTitle] = useState<string>('');

    useEffect(() => {
        if (visible && noRm) {
            setSelectedVisit(null);
            setGlobalFilter('');
            fetchRiwayat();
        }
    }, [visible, noRm, excludeKodeKunjungan]);

    const fetchRiwayat = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/pasien-rekam-medis', {
                no_rm: noRm,
                exclude_kode_kunjungan: excludeKodeKunjungan || '',
                only_selesai: true,
                page: 1,
                perPage: 100, // Load complete history for table view
            });

            const rawData = res.data?.data || [];
            // Filter agar HANYA kunjungan yang sudah 'selesai' yang ditampilkan (kunjungan yang sedang berlangsung tidak ditampilkan)
            const data = rawData.filter((item: any) => {
                const status = (item.status_kunjungan || '').toLowerCase();
                if (status !== 'selesai') return false;
                if (excludeKodeKunjungan && item.kode_kunjungan === excludeKodeKunjungan) return false;
                return true;
            });
            const total = data.length;

            setRiwayatList(data);
            setTotalRecords(total);
        } catch (error: any) {
            if (toast) {
                showError(toast, error?.response?.data?.message || 'Gagal memuat riwayat rekam medis pasien');
            }
        } finally {
            setLoading(false);
        }
    };

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

    const formatShortDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch (_) {
            return dateStr;
        }
    };

    const openPhotoZoom = (url: string, title: string) => {
        setPreviewPhotoUrl(getFullImageUrl(url));
        setPreviewPhotoTitle(title);
        setPreviewModalVisible(true);
    };

    // Filtered data for DataTable search (hanya kunjungan selesai)
    const filteredRiwayatList = riwayatList.filter((item) => {
        if (item.status_kunjungan?.toLowerCase() !== 'selesai') return false;
        if (!globalFilter) return true;
        const q = globalFilter.toLowerCase();
        const tgl = item.tanggal_kunjungan || '';
        const kode = item.kode_kunjungan || '';
        const dokter = item.header_rekam_medis?.dokter_nama || '';
        const diagnosis = item.header_rekam_medis?.diagnosis || '';
        const layanan = (item.layanan || []).map((l: any) => l.nama_layanan).join(' ');
        return (
            tgl.toLowerCase().includes(q) ||
            kode.toLowerCase().includes(q) ||
            dokter.toLowerCase().includes(q) ||
            diagnosis.toLowerCase().includes(q) ||
            layanan.toLowerCase().includes(q)
        );
    });

    // Custom Header Drawer — clean & compact
    const customHeader = (
        <div className="flex align-items-center w-full pr-4" style={{ gap: '12px' }}>
            <div
                className="flex align-items-center justify-content-center flex-shrink-0"
                style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#ccfbf1',
                    color: '#0f766e',
                }}
            >
                <IconMedicalRecord size={18} />
            </div>
            <div>
                <div className="text-base font-bold text-900 line-height-1 flex align-items-center" style={{ gap: '8px' }}>
                    <span>{namaPasien}</span>
                </div>
                <div className="flex align-items-center mt-1.5 text-xs text-500" style={{ gap: '8px' }}>
                    <span
                        className="font-mono font-bold text-teal-800 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center"
                        style={{ borderRadius: '6px', fontSize: '11px', height: '22px', padding: '0 8px', lineHeight: 1 }}
                    >
                        RM: {noRm || '-'}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-600">{totalRecords} Riwayat Kunjungan Selesai</span>
                </div>
            </div>
        </div>
    );

    // Helper untuk membedakan visual data terisi vs data kosong/placeholder
    const renderFieldContent = (val?: string | null, fallbackText: string = 'Tidak ada catatan') => {
        const isBlank =
            !val ||
            val.trim() === '' ||
            val.trim() === '-' ||
            val.toLowerCase() === 'tidak ada' ||
            val.toLowerCase().startsWith('tidak') ||
            val.toLowerCase().startsWith('belum') ||
            val.toLowerCase().startsWith('(tidak');

        if (isBlank) {
            return (
                <span
                    style={{
                        color: '#94a3b8',
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: '12px',
                        display: 'block',
                        lineHeight: 1.6,
                    }}
                >
                    {val && val.trim() !== '' && val.trim() !== '-' ? val : fallbackText}
                </span>
            );
        }
        return (
            <span
                style={{
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: '12px',
                    display: 'block',
                    lineHeight: 1.6,
                }}
            >
                {val}
            </span>
        );
    };

    // ==========================================
    // RENDER DETAIL VIEW FOR SELECTED VISIT
    // ==========================================
    const renderDetailView = () => {
        if (!selectedVisit) return null;

        const origIdx = riwayatList.findIndex(
            (k) => k.kode_kunjungan === selectedVisit.kode_kunjungan
        );
        const visitNumber = riwayatList.length - (origIdx !== -1 ? origIdx : 0);
        const headerRM = selectedVisit.header_rekam_medis || {};
        const layananList = selectedVisit.layanan || [];
        const isSelesai = selectedVisit.status_kunjungan === 'selesai';

        // Cek foto before awal
        let beforeFotoUrl = headerRM.foto_before || '';
        if (!beforeFotoUrl && layananList.length > 0) {
            for (const lay of layananList) {
                const foundBefore = (lay.rekam_medis?.fotos || []).find(
                    (f: any) => f.tipe === 'before' || f.tipe === 'foto_before'
                );
                if (foundBefore?.url_foto) {
                    beforeFotoUrl = foundBefore.url_foto;
                    break;
                }
            }
        }

        const hasAllergy =
            headerRM.riwayat_alergi &&
            headerRM.riwayat_alergi.trim() !== '' &&
            headerRM.riwayat_alergi.trim() !== '-' &&
            headerRM.riwayat_alergi.toLowerCase() !== 'tidak ada';

        return (
            <div
                className="flex flex-column gap-3 animate-fadein"
                style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
            >
                {/* ── TOP BAR: Back + Status Visit ── */}
                <div className="flex align-items-center justify-content-between pb-3 border-bottom-1 surface-border flex-wrap gap-2">
                    <Button
                        type="button"
                        icon="pi pi-arrow-left"
                        label="Kembali ke Tabel Riwayat"
                        size="small"
                        outlined
                        severity="secondary"
                        className="text-xs font-bold py-1.5 px-3 border-round-lg text-slate-700 surface-border hover:surface-100"
                        onClick={() => setSelectedVisit(null)}
                    />
                    <div className="flex align-items-center gap-2 flex-wrap">
                        <Button
                            label="Cetak RME"
                            icon={<IconMedicalRecord size={15} style={{ marginRight: '8px' }} />}
                            size="small"
                            className="text-xs font-bold py-1.5 px-3 border-round-lg bg-teal-600 text-white border-none hover:bg-teal-700 shadow-1 transition-all"
                            onClick={() => {
                                setVisitToPrint(selectedVisit);
                                setPrintModalVisible(true);
                            }}
                        />
                        <span
                            className="text-[11px] font-bold text-slate-700 bg-slate-100 border-round-md border-1 surface-border inline-flex align-items-center justify-content-center"
                            style={{ height: '24px', padding: '0 10px', borderRadius: '6px', lineHeight: 1, letterSpacing: '0.025em' }}
                        >
                            {selectedVisit.kode_kunjungan}
                        </span>
                        {isSelesai ? (
                            <span
                                className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0 uppercase"
                                style={{
                                    height: '24px',
                                    padding: '0 10px',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1,
                                    letterSpacing: '0.025em',
                                }}
                            >
                                Selesai
                            </span>
                        ) : (
                            <span
                                className="text-[11px] font-bold text-blue-700 bg-blue-50 border-1 border-blue-200 inline-flex align-items-center justify-content-center flex-shrink-0 uppercase"
                                style={{
                                    height: '24px',
                                    padding: '0 10px',
                                    borderRadius: '6px',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1,
                                    letterSpacing: '0.025em',
                                }}
                            >
                                Sedang Berlangsung
                            </span>
                        )}
                    </div>
                </div>

                {/* ── VISIT INFO CARD ── */}
                <div className="p-3 surface-50 border-round-xl border-1 surface-border shadow-none">
                    <div className="grid formgrid -m-1.5 align-items-center">
                        <div className="col-12 md:col-8 p-1.5">
                            <div className="bg-white border-round-lg border-1 surface-border p-3 h-full flex align-items-center" style={{ gap: '14px' }}>
                                <div
                                    className="text-white border-round-lg text-center flex-shrink-0 flex flex-column justify-content-center"
                                    style={{ backgroundColor: '#0f766e', minWidth: '64px', padding: '8px 12px', borderRadius: '8px' }}
                                >
                                    <span className="font-bold text-[9px] uppercase tracking-wider block" style={{ opacity: 0.9 }}>
                                        VISIT
                                    </span>
                                    <span className="text-xl font-black block line-height-1 mt-1">
                                        #{visitNumber}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm md:text-base font-bold text-900 m-0 mb-1.5 truncate">
                                        {formatDateIndo(selectedVisit.tanggal_kunjungan)}
                                    </h3>
                                    <div className="flex align-items-center flex-wrap text-xs text-slate-500" style={{ gap: '12px' }}>
                                        <span className="flex align-items-center font-medium">
                                            <Clock size={14} className="text-teal-600 flex-shrink-0" style={{ marginRight: '6px' }} />
                                            {selectedVisit.jam_datang || '-'} WIB
                                        </span>
                                        <span>•</span>
                                        <span className="flex align-items-center font-medium">
                                            <ClipboardList size={14} className="text-teal-600 flex-shrink-0" style={{ marginRight: '6px' }} />
                                            {layananList.length} Sesi Layanan
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 md:col-4 p-1.5">
                            {headerRM.dokter_nama ? (
                                <div className="bg-white border-round-lg border-1 surface-border p-3 h-full flex align-items-center" style={{ gap: '12px' }}>
                                    <div
                                        className="flex align-items-center justify-content-center flex-shrink-0 font-bold"
                                        style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#ccfbf1', color: '#0f766e' }}
                                    >
                                        <User size={16} />
                                    </div>
                                    <div className="overflow-hidden min-w-0">
                                        <span
                                            className="block text-slate-500 font-bold uppercase text-[10px] mb-1.5"
                                            style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                        >
                                            Dokter Penanggung Jawab
                                        </span>
                                        <span className="font-semibold text-slate-900 text-xs block truncate" style={{ lineHeight: 1.3 }}>
                                            dr. {headerRM.dokter_nama.replace(/^dr\.\s*/i, '')}
                                        </span>
                                        {headerRM.no_sip && (
                                            <span className="text-slate-500 block text-[10.5px] mt-0.5 truncate" style={{ lineHeight: 1.2, fontWeight: 500 }}>
                                                SIP: {headerRM.no_sip}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border-round-lg border-1 surface-border p-3 h-full flex align-items-center text-slate-400 text-xs italic" style={{ gap: '8px' }}>
                                    <User size={16} className="text-slate-400 flex-shrink-0" />
                                    <span>Dokter belum ditentukan</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── ALLERGY ALERT (Aksen Medis: Soft Rose) ── */}
                {hasAllergy && (
                    <div
                        className="p-3 border-round-xl border-1 flex align-items-center"
                        style={{
                            backgroundColor: '#fff1f2',
                            borderColor: '#fecdd3',
                            borderLeft: '4px solid #e11d48',
                            gap: '12px',
                        }}
                    >
                        <AlertTriangle size={18} style={{ color: '#e11d48' }} className="flex-shrink-0" />
                        <div className="flex flex-column">
                            <span
                                className="text-xs font-bold uppercase tracking-wider mb-0.5"
                                style={{ color: '#be123c', letterSpacing: '0.05em' }}
                            >
                                Peringatan Alergi Pasien
                            </span>
                            <span
                                className="text-xs font-semibold"
                                style={{ color: '#881337', lineHeight: 1.4 }}
                            >
                                {headerRM.riwayat_alergi}
                            </span>
                        </div>
                    </div>
                )}

                {/* ── SECTION 1: ANAMNESIS & RIWAYAT PASIEN ── */}
                <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3">
                    <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                        <div className="flex align-items-center" style={{ gap: '8px' }}>
                            <FileText size={14} className="text-teal-600 flex-shrink-0" />
                            <span
                                className="text-xs font-bold text-teal-800 uppercase"
                                style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                            >
                                ANAMNESIS &amp; RIWAYAT PASIEN
                            </span>
                        </div>
                        <span
                            className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                                height: '24px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                letterSpacing: '0.025em',
                            }}
                        >
                            Riwayat Medis
                        </span>
                    </div>

                    <div className="grid formgrid text-xs -m-1.5">
                        <div className="col-12 md:col-4 p-1.5">
                            <div className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column justify-content-between">
                                <div>
                                    <span
                                        className="text-slate-500 font-bold uppercase block mb-1.5 text-[10px]"
                                        style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                    >
                                        Keluhan Utama
                                    </span>
                                    <div className="text-xs font-semibold text-slate-800" style={{ lineHeight: 1.6 }}>
                                        {renderFieldContent(headerRM.keluhan, 'Tidak ada keluhan khusus')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 md:col-4 p-1.5">
                            <div className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column justify-content-between">
                                <div>
                                    <span
                                        className="text-slate-500 font-bold uppercase block mb-1.5 text-[10px]"
                                        style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                    >
                                        Durasi Keluhan
                                    </span>
                                    <div className="text-xs font-semibold text-slate-800" style={{ lineHeight: 1.6 }}>
                                        {renderFieldContent(headerRM.durasi_keluhan, 'Tidak disebutkan')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 md:col-4 p-1.5">
                            <div className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column justify-content-between">
                                <div>
                                    <span
                                        className="text-slate-500 font-bold uppercase block mb-1.5 text-[10px]"
                                        style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                    >
                                        Treatment Sebelumnya
                                    </span>
                                    <div className="text-xs font-semibold text-slate-800" style={{ lineHeight: 1.6 }}>
                                        {renderFieldContent(headerRM.riwayat_treatment, 'Belum pernah treatment sebelumnya')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Foto Before Awal */}
                    {beforeFotoUrl && (
                        <div className="bg-white border-round-lg border-1 surface-border p-3 flex align-items-center" style={{ gap: '14px' }}>
                            <div
                                className="relative border-round-md overflow-hidden border-1 surface-border cursor-pointer shadow-1 flex-shrink-0"
                                style={{ width: '56px', height: '56px' }}
                                onClick={() => openPhotoZoom(beforeFotoUrl, `Foto Kondisi Awal — ${formatDateIndo(selectedVisit.tanggal_kunjungan)}`)}
                            >
                                <img
                                    src={getFullImageUrl(beforeFotoUrl)}
                                    alt="Foto Awal"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.src.includes('/api/assets')) {
                                            target.src = `/api/assets${beforeFotoUrl}`;
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 bg-black-alpha-30 opacity-0 hover:opacity-100 flex align-items-center justify-content-center transition-all">
                                    <ZoomIn size={16} className="text-white" />
                                </div>
                            </div>
                            <div className="text-xs">
                                <span className="font-bold text-900 block mb-1">Foto Kondisi Awal Pasien</span>
                                <span className="text-500 text-[11px]">Klik untuk melihat foto ukuran penuh</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── SECTION 2: EVALUASI KULIT (5 Card Konsisten) ── */}
                <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3">
                    <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                        <div className="flex align-items-center" style={{ gap: '8px' }}>
                            <Activity size={14} className="text-teal-600 flex-shrink-0" />
                            <span
                                className="text-xs font-bold text-teal-800 uppercase"
                                style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                            >
                                HASIL EVALUASI KULIT
                            </span>
                        </div>
                        <span
                            className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                                height: '24px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                letterSpacing: '0.025em',
                            }}
                        >
                            5 Parameter
                        </span>
                    </div>

                    <div className="grid formgrid text-xs -m-1.5">
                        {(() => {
                            const items = [
                                {
                                    label: 'Jenis Kulit',
                                    value: headerRM.pemeriksaan_skin_type || 'Normal',
                                    isFinding:
                                        Boolean(headerRM.pemeriksaan_skin_type) &&
                                        headerRM.pemeriksaan_skin_type !== '-' &&
                                        headerRM.pemeriksaan_skin_type.toLowerCase() !== 'normal',
                                },
                                {
                                    label: 'Acne',
                                    value:
                                        headerRM.pemeriksaan_acne && headerRM.pemeriksaan_acne !== '-'
                                            ? headerRM.pemeriksaan_acne
                                            : 'Tidak Ada',
                                    isFinding:
                                        Boolean(headerRM.pemeriksaan_acne) &&
                                        headerRM.pemeriksaan_acne !== '-' &&
                                        headerRM.pemeriksaan_acne.toLowerCase() !== 'tidak ada',
                                },
                                {
                                    label: 'Inflamasi',
                                    value:
                                        headerRM.pemeriksaan_inflammation && headerRM.pemeriksaan_inflammation !== '-'
                                            ? headerRM.pemeriksaan_inflammation
                                            : 'Tidak Ada',
                                    isFinding:
                                        Boolean(headerRM.pemeriksaan_inflammation) &&
                                        headerRM.pemeriksaan_inflammation !== '-' &&
                                        headerRM.pemeriksaan_inflammation.toLowerCase() !== 'tidak ada',
                                },
                                {
                                    label: 'Pigmentasi',
                                    value:
                                        headerRM.pemeriksaan_pigmentation && headerRM.pemeriksaan_pigmentation !== '-'
                                            ? headerRM.pemeriksaan_pigmentation
                                            : 'Tidak Ada',
                                    isFinding:
                                        Boolean(headerRM.pemeriksaan_pigmentation) &&
                                        headerRM.pemeriksaan_pigmentation !== '-' &&
                                        headerRM.pemeriksaan_pigmentation.toLowerCase() !== 'tidak ada',
                                },
                                {
                                    label: 'Sensitivitas',
                                    value: headerRM.pemeriksaan_sensitivity || 'Rendah',
                                    isFinding:
                                        headerRM.pemeriksaan_sensitivity === 'Tinggi' ||
                                        headerRM.pemeriksaan_sensitivity === 'Sedang',
                                },
                            ];

                            return items.map((item, idx) => {
                                let badgeStyle: React.CSSProperties = {
                                    backgroundColor: '#f8fafc',
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    fontWeight: 700,
                                };

                                if (item.isFinding) {
                                    if (item.label === 'Jenis Kulit') {
                                        badgeStyle = {
                                            backgroundColor: '#f1f5f9',
                                            color: '#334155',
                                            border: '1px solid #cbd5e1',
                                            fontWeight: 700,
                                        };
                                    } else {
                                        badgeStyle = {
                                            backgroundColor: '#f0fdfa',
                                            color: '#0f766e',
                                            border: '1px solid #99f6e4',
                                            fontWeight: 700,
                                        };
                                    }
                                }

                                return (
                                    <div key={idx} className="col-6 sm:col-4 md:col p-1.5">
                                        <div className="bg-white border-round-lg border-1 surface-border p-3 text-center flex flex-column justify-content-between h-full">
                                            <span
                                                className="text-slate-500 font-bold uppercase block mb-2 text-[10px]"
                                                style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                            >
                                                {item.label}
                                            </span>
                                            <span
                                                className="inline-flex align-items-center justify-content-center text-[11px] font-bold"
                                                style={{
                                                    ...badgeStyle,
                                                    height: '24px',
                                                    padding: '0 10px',
                                                    borderRadius: '6px',
                                                    lineHeight: 1,
                                                    letterSpacing: '0.025em',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {item.value}
                                            </span>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* ── SECTION 3: SOAP KLINIS (1 Grid Setara 4 Kolom: S, O, A, P) ── */}
                <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3">
                    <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                        <div className="flex align-items-center" style={{ gap: '8px' }}>
                            <Stethoscope size={14} className="text-teal-600 flex-shrink-0" />
                            <span
                                className="text-xs font-bold text-teal-800 uppercase"
                                style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                            >
                                SOAP KLINIS &amp; DIAGNOSIS
                            </span>
                        </div>
                        <span
                            className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                                height: '24px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                letterSpacing: '0.025em',
                            }}
                        >
                            Rekam Medis
                        </span>
                    </div>

                    <div className="grid formgrid text-xs -m-1.5">
                        {/* S — Subjective */}
                        <div className="col-12 sm:col-6 lg:col-3 p-1.5">
                            <div
                                className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                style={{ borderLeftColor: '#0f766e' }}
                            >
                                <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                    <FileText size={14} className="text-teal-600 flex-shrink-0" />
                                    <span
                                        className="text-xs font-bold text-teal-900 uppercase"
                                        style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                    >
                                        S — Subjective
                                    </span>
                                </div>
                                <div className="flex-grow-1 text-slate-800 text-xs font-semibold" style={{ lineHeight: 1.6 }}>
                                    {renderFieldContent(headerRM.subjective || headerRM.keluhan, '(Tidak dicatat)')}
                                </div>
                            </div>
                        </div>

                        {/* O — Objective */}
                        <div className="col-12 sm:col-6 lg:col-3 p-1.5">
                            <div
                                className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                style={{ borderLeftColor: '#0f766e' }}
                            >
                                <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                    <Activity size={14} className="text-teal-600 flex-shrink-0" />
                                    <span
                                        className="text-xs font-bold text-teal-900 uppercase"
                                        style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                    >
                                        O — Objective
                                    </span>
                                </div>
                                <div className="flex-grow-1 text-slate-800 text-xs font-semibold" style={{ lineHeight: 1.6 }}>
                                    {renderFieldContent(headerRM.objective, '(Tidak dicatat)')}
                                </div>
                            </div>
                        </div>

                        {/* A — Assessment & Diagnosis */}
                        <div className="col-12 sm:col-6 lg:col-3 p-1.5">
                            <div
                                className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                style={{ borderLeftColor: '#0f766e' }}
                            >
                                <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                    <Stethoscope size={14} className="text-teal-600 flex-shrink-0" />
                                    <span
                                        className="text-xs font-bold text-teal-900 uppercase"
                                        style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                    >
                                        A — Assessment
                                    </span>
                                </div>
                                <div className="flex-grow-1 text-slate-800 text-xs font-semibold" style={{ lineHeight: 1.6 }}>
                                    {(() => {
                                        const dx =
                                            headerRM.diagnosis &&
                                            headerRM.diagnosis !== '-' &&
                                            headerRM.diagnosis.trim() !== ''
                                                ? headerRM.diagnosis
                                                : null;
                                        const assess =
                                            headerRM.assessment &&
                                            headerRM.assessment !== '-' &&
                                            headerRM.assessment.trim() !== ''
                                                ? headerRM.assessment
                                                : null;

                                        if (!dx && !assess) {
                                            return renderFieldContent(null, '(Tidak dicatat)');
                                        }

                                        return (
                                            <div className="flex flex-column" style={{ gap: '8px' }}>
                                                {dx && (
                                                    <div>
                                                        <span
                                                            className="text-[10px] font-bold text-slate-500 uppercase block mb-1"
                                                            style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                                        >
                                                            Dx Medis:
                                                        </span>
                                                        {renderFieldContent(dx)}
                                                    </div>
                                                )}
                                                {assess && (
                                                    <div>
                                                        <span
                                                            className="text-[10px] font-bold text-slate-500 uppercase block mb-1"
                                                            style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                                        >
                                                            Keterangan:
                                                        </span>
                                                        {renderFieldContent(assess)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* P — Plan */}
                        <div className="col-12 sm:col-6 lg:col-3 p-1.5">
                            <div
                                className="bg-white border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                style={{ borderLeftColor: '#0f766e' }}
                            >
                                <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                    <ClipboardList size={14} className="text-teal-600 flex-shrink-0" />
                                    <span
                                        className="text-xs font-bold text-teal-900 uppercase"
                                        style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                    >
                                        P — Plan
                                    </span>
                                </div>
                                <div className="flex-grow-1 text-slate-800 text-xs font-semibold" style={{ lineHeight: 1.6 }}>
                                    {renderFieldContent(headerRM.plan, 'Tidak ada rencana khusus')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── SECTION 4: SESI TINDAKAN & HASIL TREATMENT ── */}
                <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3">
                    <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                        <div className="flex align-items-center" style={{ gap: '8px' }}>
                            <Sparkles size={14} className="text-teal-600 flex-shrink-0" />
                            <span
                                className="text-xs font-bold text-teal-800 uppercase"
                                style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                            >
                                SESI TINDAKAN &amp; HASIL TREATMENT
                            </span>
                        </div>
                        <span
                            className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                                height: '24px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                                lineHeight: 1,
                                letterSpacing: '0.025em',
                            }}
                        >
                            {layananList.length} Sesi
                        </span>
                    </div>

                    <div>
                        {layananList.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500 italic bg-white border-round-lg border-1 surface-border flex flex-column align-items-center justify-content-center" style={{ gap: '8px' }}>
                                <FileText size={18} className="text-slate-400" />
                                <span>Tidak ada catatan tindakan pada kunjungan ini.</span>
                            </div>
                        ) : (
                            <div className="flex flex-column gap-3">
                                {layananList.map((layanan: any, lIdx: number) => {
                                    const isKonsul =
                                        (layanan.nama_ruangan &&
                                            layanan.nama_ruangan.toLowerCase().includes('konsul')) ||
                                        layanan.jenis_layanan === 'konsultasi';
                                    const fotos = layanan.rekam_medis?.fotos || [];

                                    const validFormData = (
                                        layanan.rekam_medis?.formatted_data_form || []
                                    ).filter(
                                        (f: any) =>
                                            f.key &&
                                            f.key !== 'undefined' &&
                                            f.key !== 'null' &&
                                            f.value &&
                                            f.value !== '-' &&
                                            f.value !== ''
                                    );

                                    const terapisList: any[] = Array.isArray(layanan.terapis_pendamping) && layanan.terapis_pendamping.length > 0
                                        ? layanan.terapis_pendamping
                                        : (Array.isArray(layanan.daftar_petugas) && layanan.daftar_petugas.length > 0
                                            ? layanan.daftar_petugas.filter((p: any) => !p.is_dokter_pj && p.role !== 'DOKTER')
                                            : (Array.isArray(headerRM.terapis_list) ? headerRM.terapis_list : []));

                                    const dokterPelaksana = layanan.petugas || layanan.rekam_medis?.dokter_penanggung_jawab || (
                                        Array.isArray(layanan.daftar_petugas) ? layanan.daftar_petugas.find((p: any) => p.is_dokter_pj || p.role === 'DOKTER') : null
                                    ) || (headerRM.dokter_nama ? { nama: headerRM.dokter_nama, jabatan: headerRM.dokter_jabatan || 'Dokter', no_sip: headerRM.no_sip } : null);

                                    const allPetugas: any[] = [];
                                    if (dokterPelaksana) {
                                        allPetugas.push({
                                            nama: dokterPelaksana.nama,
                                            no_sip: dokterPelaksana.kode_karyawan || dokterPelaksana.no_sip || headerRM.no_sip || '-',
                                            role: (dokterPelaksana.jabatan || 'DOKTER').toUpperCase(),
                                        });
                                    }
                                    terapisList.forEach((t: any) => {
                                        allPetugas.push({
                                            nama: t.nama || t.nama_petugas,
                                            no_sip: t.no_sip || t.sip || '-',
                                            role: (t.role || t.jabatan || 'TERAPIS').toUpperCase(),
                                        });
                                    });

                                    const hasNotes = Boolean(
                                        layanan.catatan_petugas ||
                                        layanan.catatan_tindakan ||
                                        layanan.catatan_hasil_treatment
                                    );

                                    const hasAnyContent =
                                        allPetugas.length > 0 ||
                                        hasNotes ||
                                        validFormData.length > 0 ||
                                        fotos.length > 0;

                                    return (
                                        <div
                                            key={layanan.kode_antrian_layanan || lIdx}
                                            className="border-round-xl border-1 surface-border overflow-hidden bg-white shadow-none"
                                        >
                                            {/* Header Sesi */}
                                            <div className="surface-100 px-3 py-2.5 border-bottom-1 surface-border flex align-items-center justify-content-between flex-wrap gap-2">
                                                <div className="flex align-items-center min-w-0" style={{ gap: '10px' }}>
                                                    <span
                                                        className="text-[11px] font-bold inline-flex align-items-center justify-content-center flex-shrink-0 uppercase"
                                                        style={{
                                                            height: '24px',
                                                            padding: '0 10px',
                                                            borderRadius: '6px',
                                                            lineHeight: 1,
                                                            letterSpacing: '0.025em',
                                                            backgroundColor: isKonsul ? '#f0f9ff' : '#f0fdf4',
                                                            color: isKonsul ? '#0284c7' : '#16a34a',
                                                            border: `1px solid ${isKonsul ? '#bae6fd' : '#bbf7d0'}`
                                                        }}
                                                    >
                                                        {isKonsul ? 'KONSULTASI' : 'TINDAKAN'}
                                                    </span>
                                                    <span className="font-bold text-900 text-xs md:text-sm truncate min-w-0" style={{ lineHeight: 1.3 }}>
                                                        {layanan.nama_layanan || 'Pelayanan Klinis'}
                                                    </span>
                                                </div>
                                                <div className="flex align-items-center flex-shrink-0" style={{ gap: '8px' }}>
                                                    {layanan.status && (
                                                        <span
                                                            className="text-[11px] font-bold inline-flex align-items-center justify-content-center flex-shrink-0 uppercase"
                                                            style={{
                                                                height: '24px',
                                                                padding: '0 10px',
                                                                borderRadius: '6px',
                                                                lineHeight: 1,
                                                                letterSpacing: '0.025em',
                                                                backgroundColor: layanan.status.toLowerCase() === 'selesai' ? '#f0fdf4' : '#eff6ff',
                                                                color: layanan.status.toLowerCase() === 'selesai' ? '#16a34a' : '#2563eb',
                                                                border: `1px solid ${layanan.status.toLowerCase() === 'selesai' ? '#bbf7d0' : '#bfdbfe'}`
                                                            }}
                                                        >
                                                            {layanan.status}
                                                        </span>
                                                    )}
                                                    {layanan.nama_ruangan && (
                                                        <span
                                                            className="text-[11px] text-slate-700 font-semibold inline-flex align-items-center bg-white border-1 surface-border flex-shrink-0"
                                                            style={{ height: '24px', padding: '0 10px', borderRadius: '6px', lineHeight: 1, gap: '6px' }}
                                                        >
                                                            <Building2 size={13} className="text-teal-600 flex-shrink-0" />
                                                            <span className="truncate max-w-10rem">{layanan.nama_ruangan}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sesi Content (Kotak-Kotak Konsisten dengan Bagian Atas) */}
                                            <div className="p-3 flex flex-column gap-3 text-xs">
                                                {/* KOTAK 1: Dokter & Petugas Pelaksana Ruangan */}
                                                {allPetugas.length > 0 && (
                                                    <div className="surface-50 border-round-lg border-1 surface-border p-3">
                                                        <div className="flex align-items-center justify-content-between pb-2 mb-2 border-bottom-1 surface-border">
                                                            <div className="flex align-items-center" style={{ gap: '8px' }}>
                                                                <User size={14} className="text-teal-600 flex-shrink-0" />
                                                                <span
                                                                    className="text-xs font-bold text-teal-800 uppercase"
                                                                    style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                                                                >
                                                                    Dokter &amp; Petugas Pelaksana Ruangan
                                                                </span>
                                                            </div>
                                                            <span
                                                                className="text-[11px] font-bold border-round-md bg-white border-1 surface-border text-slate-600 inline-flex align-items-center justify-content-center"
                                                                style={{ borderRadius: '6px', height: '24px', padding: '0 10px', lineHeight: 1, letterSpacing: '0.025em' }}
                                                            >
                                                                {allPetugas.length} Petugas
                                                            </span>
                                                        </div>
                                                        <div className="grid formgrid -m-1">
                                                            {allPetugas.map((p: any, pIdx: number) => (
                                                                <div key={pIdx} className={`col-12 ${allPetugas.length > 1 ? 'sm:col-6' : ''} p-1`}>
                                                                    <div className="bg-white p-3 border-round-md border-1 surface-border flex align-items-center justify-content-between gap-2 h-full">
                                                                        <div className="flex align-items-center min-w-0" style={{ gap: '12px' }}>
                                                                            <div
                                                                                className="flex align-items-center justify-content-center flex-shrink-0 font-bold text-xs"
                                                                                style={{
                                                                                    width: '30px',
                                                                                    height: '30px',
                                                                                    minWidth: '30px',
                                                                                    minHeight: '30px',
                                                                                    borderRadius: '50%',
                                                                                    backgroundColor: p.role === 'DOKTER' ? '#ccfbf1' : '#f0fdf4',
                                                                                    color: '#0f766e',
                                                                                    border: '1px solid #99f6e4'
                                                                                }}
                                                                            >
                                                                                {p.role === 'DOKTER' ? 'Dr' : 'Pt'}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <span
                                                                                    className="font-semibold text-slate-900 text-xs block truncate"
                                                                                    style={{ lineHeight: 1.3 }}
                                                                                    title={p.nama}
                                                                                >
                                                                                    {p.nama}
                                                                                </span>
                                                                                <span
                                                                                    className="text-slate-500 block text-[10.5px] mt-0.5 truncate"
                                                                                    style={{ lineHeight: 1.2, fontWeight: 500 }}
                                                                                >
                                                                                    SIP: {p.no_sip}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <span
                                                                            className="text-[11px] font-bold inline-flex align-items-center justify-content-center flex-shrink-0 uppercase"
                                                                            style={{
                                                                                height: '24px',
                                                                                padding: '0 10px',
                                                                                borderRadius: '6px',
                                                                                lineHeight: 1,
                                                                                letterSpacing: '0.025em',
                                                                                backgroundColor: p.role === 'DOKTER' ? '#ecfdf5' : '#f0fdfa',
                                                                                color: '#0f766e',
                                                                                border: '1px solid #99f6e4'
                                                                            }}
                                                                        >
                                                                            {p.role}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* KOTAK 2: Catatan Klinis Sesi (SOAP Style Kotak-Kotak Beraksen Teal) */}
                                                {hasNotes && (
                                                    <div className="grid formgrid -m-1.5">
                                                        {/* Catatan Petugas */}
                                                        {layanan.catatan_petugas && (
                                                            <div
                                                                className={`col-12 ${
                                                                    layanan.catatan_tindakan && layanan.catatan_hasil_treatment
                                                                        ? 'lg:col-4 md:col-6'
                                                                        : (layanan.catatan_tindakan || layanan.catatan_hasil_treatment ? 'md:col-6' : '')
                                                                } p-1.5`}
                                                            >
                                                                <div
                                                                    className="surface-50 border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                                                    style={{ borderLeftColor: '#0f766e' }}
                                                                >
                                                                    <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                                                        <FileText size={14} className="text-teal-600 flex-shrink-0" />
                                                                        <span
                                                                            className="text-xs font-bold text-teal-900 uppercase"
                                                                            style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                                                        >
                                                                            Catatan Petugas Ruangan
                                                                        </span>
                                                                    </div>
                                                                    <div
                                                                        className="flex-grow-1 text-xs font-semibold text-slate-800"
                                                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.6 }}
                                                                    >
                                                                        {renderFieldContent(layanan.catatan_petugas)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Catatan Tindakan */}
                                                        {layanan.catatan_tindakan && (
                                                            <div
                                                                className={`col-12 ${
                                                                    layanan.catatan_petugas && layanan.catatan_hasil_treatment
                                                                        ? 'lg:col-4 md:col-6'
                                                                        : (layanan.catatan_petugas || layanan.catatan_hasil_treatment ? 'md:col-6' : '')
                                                                } p-1.5`}
                                                            >
                                                                <div
                                                                    className="surface-50 border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                                                    style={{ borderLeftColor: '#0f766e' }}
                                                                >
                                                                    <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                                                        <Activity size={14} className="text-teal-600 flex-shrink-0" />
                                                                        <span
                                                                            className="text-xs font-bold text-teal-900 uppercase"
                                                                            style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                                                        >
                                                                            Catatan Prosedur / Tindakan
                                                                        </span>
                                                                    </div>
                                                                    <div
                                                                        className="flex-grow-1 text-xs font-semibold text-slate-800"
                                                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.6 }}
                                                                    >
                                                                        {renderFieldContent(layanan.catatan_tindakan)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Hasil Treatment */}
                                                        {layanan.catatan_hasil_treatment && (
                                                            <div
                                                                className={`col-12 ${
                                                                    layanan.catatan_petugas && layanan.catatan_tindakan
                                                                        ? 'lg:col-4 md:col-6'
                                                                        : (layanan.catatan_petugas || layanan.catatan_tindakan ? 'md:col-6' : '')
                                                                } p-1.5`}
                                                            >
                                                                <div
                                                                    className="surface-50 border-round-lg border-1 surface-border p-3 h-full flex flex-column border-left-3"
                                                                    style={{ borderLeftColor: '#0f766e' }}
                                                                >
                                                                    <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                                                        <Sparkles size={14} className="text-teal-600 flex-shrink-0" />
                                                                        <span
                                                                            className="text-xs font-bold text-teal-900 uppercase"
                                                                            style={{ letterSpacing: '0.04em', lineHeight: 1.2 }}
                                                                        >
                                                                            Hasil Treatment &amp; Evaluasi
                                                                        </span>
                                                                    </div>
                                                                    <div
                                                                        className="flex-grow-1 text-xs font-semibold text-slate-800"
                                                                        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.6 }}
                                                                    >
                                                                        {renderFieldContent(layanan.catatan_hasil_treatment)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* KOTAK 3: Data & Parameter Klinis Ruangan */}
                                                {validFormData.length > 0 && (
                                                    <div className="surface-50 border-round-lg border-1 surface-border p-3">
                                                        <div className="flex align-items-center pb-2 mb-2 border-bottom-1 surface-border" style={{ gap: '8px' }}>
                                                            <ClipboardList size={14} className="text-teal-600 flex-shrink-0" />
                                                            <span
                                                                className="text-xs font-bold text-teal-800 uppercase"
                                                                style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                                                            >
                                                                Data &amp; Parameter Klinis Ruangan
                                                            </span>
                                                        </div>
                                                        <div className="grid formgrid -m-1">
                                                            {validFormData.map((f: any, fIdx: number) => (
                                                                <div key={fIdx} className="col-12 sm:col-6 md:col-4 p-1">
                                                                    <div className="bg-white p-3 border-round-md border-1 surface-border h-full flex flex-column justify-content-between">
                                                                        <span
                                                                            className="text-slate-500 font-bold uppercase block mb-1.5 text-[10px] truncate"
                                                                            style={{ letterSpacing: '0.06em', lineHeight: 1.2 }}
                                                                        >
                                                                            {f.label}
                                                                        </span>
                                                                        <span
                                                                            className="font-semibold text-slate-900 text-xs block break-words"
                                                                            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.6 }}
                                                                        >
                                                                            {renderFieldContent(f.value)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* KOTAK 4: Dokumentasi Foto Sesi */}
                                                {fotos && fotos.length > 0 && (
                                                    <div className="surface-50 border-round-lg border-1 surface-border p-3">
                                                        <div className="flex align-items-center justify-content-between pb-2 mb-2 border-bottom-1 surface-border">
                                                            <div className="flex align-items-center" style={{ gap: '8px' }}>
                                                                <ImageIcon size={14} className="text-teal-600 flex-shrink-0" />
                                                                <span
                                                                    className="text-xs font-bold text-teal-800 uppercase"
                                                                    style={{ letterSpacing: '0.05em', lineHeight: 1.2 }}
                                                                >
                                                                    Dokumentasi Foto Sesi (Sebelum &amp; Sesudah)
                                                                </span>
                                                            </div>
                                                            <span className="text-[10.5px] text-slate-500 italic">
                                                                Klik untuk perbesar
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap align-items-center" style={{ gap: '12px' }}>
                                                            {fotos.map((foto: any, fIdx: number) => {
                                                                const isBefore =
                                                                    foto.tipe === 'before' || foto.tipe === 'foto_before';
                                                                const isAfter =
                                                                    foto.tipe === 'after' || foto.tipe === 'foto_after';
                                                                const badgeLabel = isBefore
                                                                    ? 'BEFORE'
                                                                    : isAfter
                                                                    ? 'AFTER'
                                                                    : String(foto.tipe || 'FOTO').toUpperCase();
                                                                const fullUrl = getFullImageUrl(foto.url_foto);

                                                                return (
                                                                    <div
                                                                        key={foto.id || fIdx}
                                                                        className="bg-white p-2.5 border-round-lg border-1 surface-border flex flex-column align-items-center cursor-pointer hover:shadow-1 transition-all"
                                                                        style={{ gap: '8px' }}
                                                                        onClick={() =>
                                                                            openPhotoZoom(
                                                                                foto.url_foto,
                                                                                `${badgeLabel} — ${layanan.nama_layanan || 'Treatment'}`
                                                                            )
                                                                        }
                                                                    >
                                                                        <div
                                                                            className="relative border-round-md overflow-hidden border-1 surface-border bg-gray-50"
                                                                            style={{ width: '68px', height: '68px' }}
                                                                        >
                                                                            <img
                                                                                src={fullUrl}
                                                                                alt={badgeLabel}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => {
                                                                                    const target = e.target as HTMLImageElement;
                                                                                    if (
                                                                                        !target.src.includes('/api/assets') &&
                                                                                        foto.url_foto
                                                                                    ) {
                                                                                        target.src = `/api/assets${foto.url_foto}`;
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <div className="absolute inset-0 bg-black-alpha-30 opacity-0 hover:opacity-100 flex align-items-center justify-content-center transition-all">
                                                                                <ZoomIn size={16} className="text-white" />
                                                                            </div>
                                                                        </div>
                                                                        <span
                                                                            className="text-[10px] font-bold inline-flex align-items-center justify-content-center uppercase"
                                                                            style={{
                                                                                height: '22px',
                                                                                padding: '0 8px',
                                                                                borderRadius: '4px',
                                                                                lineHeight: 1,
                                                                                letterSpacing: '0.025em',
                                                                                backgroundColor: isBefore ? '#f1f5f9' : '#ecfdf5',
                                                                                color: isBefore ? '#475569' : '#059669',
                                                                                border: `1px solid ${isBefore ? '#cbd5e1' : '#a7f3d0'}`
                                                                            }}
                                                                        >
                                                                            {badgeLabel}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Fallback jika tidak ada konten khusus */}
                                                {!hasAnyContent && (
                                                    <div className="surface-50 border-round-lg border-1 surface-border p-3 text-xs text-slate-400 italic flex align-items-center" style={{ gap: '10px' }}>
                                                        <CheckCircle2 size={15} className="text-teal-600 flex-shrink-0" />
                                                        <span>
                                                            Sesi pelayanan telah selesai sesuai prosedur standar klinis tanpa catatan khusus.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ==========================================
    // RENDER TABLE VIEW (DEFAULT LIST)
    // ==========================================
    const renderTableView = () => {
        // DataTable header matching standard laporan toolbar design
        const tableHeader = (
            <div className="flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="flex align-items-center gap-2">
                    <Clock size={18} className="text-teal-600 flex-shrink-0" />
                    <span className="text-base font-bold text-800">
                        Daftar Riwayat Kunjungan Pasien
                    </span>
                </div>
                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                    <IconField iconPosition="left" className="w-full md:w-20rem">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder="Cari kunjungan, dokter, layanan..."
                            className="w-full text-sm"
                        />
                    </IconField>
                    <Button
                        type="button"
                        icon="pi pi-filter-slash"
                        outlined
                        severity="danger"
                        size="small"
                        className="border-round-lg"
                        tooltip="Reset Filter"
                        tooltipOptions={{ position: 'bottom' }}
                        onClick={() => setGlobalFilter('')}
                    />
                </div>
            </div>
        );

        return (
            <div className="flex flex-column gap-3">
                {/* Legend Box Keterangan Status Sesuai Desain Laporan */}
                <div className="flex flex-wrap align-items-center gap-4 p-3 surface-50 border-round-xl border-1 surface-border">
                    <span className="flex align-items-center text-xs font-bold text-500 uppercase tracking-wider mr-2">
                        <i className="pi pi-info-circle mr-2" /> KETERANGAN STATUS:
                    </span>
                    <div className="flex align-items-center gap-2">
                        <span
                            className="block border-round-sm"
                            style={{ width: '12px', height: '12px', backgroundColor: '#22c55e' }}
                        />
                        <span className="text-xs font-semibold text-700">Selesai</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span
                            className="block border-round-sm"
                            style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b' }}
                        />
                        <span className="text-xs font-semibold text-700">Sedang Berlangsung</span>
                    </div>
                </div>

                {/* Card Container Tabel Sesuai Desain Laporan */}
                <div className="card p-3 border-round-xl border-1 surface-border surface-card shadow-1">
                    <DataTable
                        value={filteredRiwayatList}
                        loading={loading}
                        emptyMessage="Tidak ada data riwayat kunjungan pasien ditemukan."
                        className="p-datatable-sm"
                        rowHover
                        paginator
                        rows={10}
                        rowsPerPageOptions={[5, 10, 20]}
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                        header={tableHeader}
                        responsiveLayout="scroll"
                    >
                        {/* 1. Status Indicator (Kolom Pertama Sesuai Standar Laporan) */}
                        <Column
                            header=""
                            headerStyle={{ width: '3.5rem' }}
                            align="center"
                            body={(rowData) => {
                                const isSelesai = rowData.status_kunjungan === 'selesai';
                                const color = isSelesai ? '#22c55e' : '#f59e0b';
                                return (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '14px',
                                            height: '14px',
                                            borderRadius: '3px',
                                            backgroundColor: color,
                                            boxShadow: `0 1px 3px ${color}55`,
                                            verticalAlign: 'middle',
                                        }}
                                        title={isSelesai ? 'Status: Selesai' : 'Status: Sedang Berlangsung'}
                                    />
                                );
                            }}
                        />

                        {/* Tanggal Kunjungan */}
                        <Column
                            header="Tanggal Kunjungan"
                            sortable
                            sortField="tanggal_kunjungan"
                            headerStyle={{ fontWeight: 'bold' }}
                            style={{ minWidth: '160px' }}
                            body={(rowData) => (
                                <div>
                                    <div className="font-bold text-900">
                                        {formatShortDate(rowData.tanggal_kunjungan)}
                                    </div>
                                    {rowData.jam_datang && (
                                        <div className="text-xs text-500 mt-1">
                                            {rowData.jam_datang} WIB
                                        </div>
                                    )}
                                </div>
                            )}
                        />

                        {/* Kode Kunjungan */}
                        <Column
                            header="Kode"
                            sortable
                            sortField="kode_kunjungan"
                            headerStyle={{ fontWeight: 'bold' }}
                            style={{ width: '130px' }}
                            body={(rowData) => (
                                <span className="font-mono font-semibold text-color-secondary text-xs">
                                    {rowData.kode_kunjungan || ''}
                                </span>
                            )}
                        />

                        {/* Dokter / Petugas Pelaksana (Terapis ada di dalam riwayat) */}
                        <Column
                            header="Dokter / Petugas"
                            sortable
                            sortField="header_rekam_medis.dokter_nama"
                            headerStyle={{ fontWeight: 'bold' }}
                            style={{ minWidth: '180px' }}
                            body={(rowData) => {
                                let dokter = rowData.header_rekam_medis?.dokter_nama;
                                const layList = rowData.layanan || [];

                                if (!dokter && layList.length > 0) {
                                    for (const lay of layList) {
                                        if (lay.petugas?.nama) {
                                            dokter = lay.petugas.nama;
                                            break;
                                        }
                                        if (Array.isArray(lay.daftar_petugas)) {
                                            const pj = lay.daftar_petugas.find((p: any) => p.is_dokter_pj || p.role === 'DOKTER');
                                            if (pj?.nama) {
                                                dokter = pj.nama;
                                                break;
                                            }
                                        }
                                        if (lay.rekam_medis?.dokter_penanggung_jawab?.nama) {
                                            dokter = lay.rekam_medis.dokter_penanggung_jawab.nama;
                                            break;
                                        }
                                    }
                                }

                                if (!dokter) {
                                    return null;
                                }

                                const cleanDokter =
                                    dokter.toLowerCase().startsWith('dr') || dokter.includes(',')
                                        ? dokter
                                        : `dr. ${dokter}`;

                                return (
                                    <span className="font-semibold text-900 text-sm">
                                        {cleanDokter}
                                    </span>
                                );
                            }}
                        />

                {/* Layanan */}
                <Column
                    header="Layanan"
                    headerStyle={{ fontWeight: 'bold' }}
                    style={{ minWidth: '180px' }}
                    body={(rowData) => {
                        const layList = rowData.layanan || [];
                        if (layList.length === 0) return null;

                        // Ambil nama layanan unik agar layanan yang sama pada sesi Konsultasi & Tindakan tidak tampil dobel
                        const uniqueLayananNames = Array.from(
                            new Set(layList.map((l: any) => l.nama_layanan).filter(Boolean))
                        );

                        return (
                            <div className="flex flex-column gap-1">
                                {uniqueLayananNames.slice(0, 2).map((nama: any, lIdx: number) => (
                                    <span
                                        key={lIdx}
                                        className="text-900 text-truncate block font-medium"
                                        title={nama}
                                        style={{ maxWidth: '200px' }}
                                    >
                                        {nama}
                                    </span>
                                ))}
                                {uniqueLayananNames.length > 2 && (
                                    <span className="text-xs text-teal-700 font-bold">
                                        +{uniqueLayananNames.length - 2} lainnya
                                    </span>
                                )}
                            </div>
                        );
                    }}
                />

                {/* Aksi */}
                <Column
                    header="Aksi"
                    align="center"
                    alignHeader="center"
                    headerStyle={{ width: '110px', textAlign: 'center', fontWeight: 'bold' }}
                    style={{ width: '110px', textAlign: 'center' }}
                    body={(rowData) => (
                        <div className="flex align-items-center justify-content-center gap-2">
                            <Button
                                icon="pi pi-eye"
                                outlined
                                severity="info"
                                size="small"
                                className="p-button-sm border-round-lg"
                                tooltip="Lihat Detail RME"
                                tooltipOptions={{ position: 'top' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVisit(rowData);
                                }}
                            />
                            <Button
                                icon={<IconMedicalRecord size={15} />}
                                outlined
                                severity="success"
                                size="small"
                                className="p-button-sm border-round-lg"
                                tooltip="Cetak Laporan RME"
                                tooltipOptions={{ position: 'top' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setVisitToPrint(rowData);
                                    setPrintModalVisible(true);
                                }}
                            />
                        </div>
                    )}
                />
            </DataTable>
        </div>
    </div>
);
};

    return (
        <>
            <Sidebar
                visible={visible}
                position="right"
                onHide={onHide}
                header={customHeader}
                className="w-full md:w-11 lg:w-10 xl:w-9"
                style={{ maxWidth: '1280px' }}
            >
                <div className="p-1 md:p-3 pb-6">
                    {loading ? (
                        <div className="flex flex-column align-items-center justify-content-center p-6 text-center surface-card border-round-2xl border-1 surface-border my-4 shadow-1">
                            <ProgressSpinner style={{ width: '44px', height: '44px' }} strokeWidth="4" />
                            <div className="text-sm font-bold text-700 mt-3">Memuat riwayat rekam medis pasien...</div>
                            <span className="text-xs text-500 mt-1">Mengambil data kunjungan, konsultasi dokter, dan tindakan</span>
                        </div>
                    ) : riwayatList.length === 0 ? (
                        <div className="flex flex-column align-items-center justify-content-center p-6 text-center surface-card border-round-2xl border-1 surface-border my-4 shadow-1">
                            <div className="w-4rem h-4rem bg-teal-50 border-circle flex align-items-center justify-content-center mb-3 text-teal-600 shadow-1">
                                <i className="pi pi-folder-open text-3xl" />
                            </div>
                            <h3 className="text-lg font-black text-800 m-0">Belum Ada Riwayat Rekam Medis</h3>
                            <p className="text-xs text-500 mt-2 line-height-3 max-w-24rem m-0">
                                Pasien ini belum memiliki catatan rekam medis atau riwayat tindakan tersimpan di sistem.
                            </p>
                        </div>
                    ) : selectedVisit ? (
                        renderDetailView()
                    ) : (
                        renderTableView()
                    )}
                </div>
            </Sidebar>

            {/* MODAL ZOOM PREVIEW FOTO HIGH RESOLUTION */}
            <Dialog
                header={previewPhotoTitle || 'Dokumentasi Foto Treatment'}
                visible={previewModalVisible}
                onHide={() => setPreviewModalVisible(false)}
                className="w-full max-w-30rem mx-3"
                contentClassName="p-0 text-center bg-black-alpha-90 flex align-items-center justify-content-center"
                dismissableMask
            >
                {previewPhotoUrl ? (
                    <div className="p-3 w-full flex flex-column align-items-center justify-content-center">
                        <img
                            src={previewPhotoUrl}
                            alt="Foto Treatment Preview"
                            className="w-full border-round-xl shadow-4"
                            style={{ maxHeight: '75vh', objectFit: 'contain' }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (previewPhotoUrl && !target.src.includes('/api/assets')) {
                                    const cleanUrl = previewPhotoUrl.replace(/^https?:\/\/[^/]+/, '');
                                    target.src = `/api/assets${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}`;
                                }
                            }}
                        />
                    </div>
                ) : null}
            </Dialog>
            {/* MODAL PRINT LAPORAN REKAM MEDIS ELEKTRONIK (RME) */}
            <RMEReportPrint
                visible={printModalVisible}
                onHide={() => setPrintModalVisible(false)}
                visitData={visitToPrint}
            />
        </>
    );
};
