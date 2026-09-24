'use client';

import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ProgressSpinner } from 'primereact/progressspinner';
import { showSuccess } from '@/lib/tools/generalTools';

interface JadwalItem {
    id: number;
    kode_jadwal: string;
    no_sip: string;
    kode_ruangan: string;
    nama_ruangan: string;
    nama_karyawan: string;
    jabatan: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    kuota: number;
    status: string;
    is_penanggung_jawab?: number | boolean;
}

interface RuanganItem {
    kode_ruangan: string;
    nama_ruangan: string;
    is_konsultasi?: number;
}

const HARI_LIST = [
    { key: 'senin', label: 'Senin' },
    { key: 'selasa', label: 'Selasa' },
    { key: 'rabu', label: 'Rabu' },
    { key: 'kamis', label: 'Kamis' },
    { key: 'jumat', label: 'Jumat' },
    { key: 'sabtu', label: 'Sabtu' },
    { key: 'minggu', label: 'Minggu' },
];

const HARI_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    senin: { label: 'Senin', bg: '#DCFCE7', color: '#15803D' },
    selasa: { label: 'Selasa', bg: '#DBEAFE', color: '#1D4ED8' },
    rabu: { label: 'Rabu', bg: '#F3E8FF', color: '#7E22CE' },
    kamis: { label: 'Kamis', bg: '#FFEDD5', color: '#C2410C' },
    jumat: { label: 'Jumat', bg: '#D1FAE5', color: '#047857' },
    sabtu: { label: 'Sabtu', bg: '#FEE2E2', color: '#B91C1C' },
    minggu: { label: 'Minggu', bg: '#FFE4E6', color: '#BE123C' },
};

const getHariIniKey = () => {
    const dayMap = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    return dayMap[new Date().getDay()] || 'senin';
};

const JadwalKaryawanGreenContent = () => {
    const toast = useRef<Toast>(null);
    const hariIniKey = useMemo(() => getHariIniKey(), []);

    // Filter & Tampilan State
    const [selectedHari, setSelectedHari] = useState<string>('hari_ini');
    const [selectedJabatan, setSelectedJabatan] = useState<string>('semua');
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [viewMode, setViewMode] = useState<'kartu' | 'tabel'>('kartu');

    // Data State
    const [jadwalList, setJadwalList] = useState<JadwalItem[]>([]);
    const [ruanganList, setRuanganList] = useState<RuanganItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resJadwal, resRuangan] = await Promise.all([
                postData('/master/jadwal-karyawan-data', { page: 1, perPage: 500, status: 'aktif' }),
                postData('/master/ruangan-dropdown', {}),
            ]);

            setJadwalList(resJadwal.data?.data || []);
            setRuanganList(resRuangan.data?.data || []);
        } catch (error) {
            console.error('Gagal memuat jadwal karyawan:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter jadwal aktif
    const filteredJadwal = useMemo(() => {
        return jadwalList.filter((item) => {
            // Filter Hari
            if (selectedHari === 'hari_ini') {
                if ((item.hari || '').toLowerCase() !== hariIniKey) return false;
            } else if (selectedHari !== 'semua') {
                if ((item.hari || '').toLowerCase() !== selectedHari) return false;
            }

            // Filter Profesi
            if (selectedJabatan !== 'semua') {
                const j = (item.jabatan || '').toLowerCase();
                if (selectedJabatan === 'dokter' && j !== 'dokter') return false;
                if (selectedJabatan === 'terapis' && !['beautician', 'terapis'].includes(j)) return false;
            }

            // Filter Pencarian
            if (searchKeyword.trim()) {
                const q = searchKeyword.toLowerCase();
                const matchNama = (item.nama_karyawan || '').toLowerCase().includes(q);
                const matchRuangan = (item.nama_ruangan || item.kode_ruangan || '').toLowerCase().includes(q);
                const matchHari = (item.hari || '').toLowerCase().includes(q);
                if (!matchNama && !matchRuangan && !matchHari) return false;
            }

            return true;
        });
    }, [jadwalList, selectedHari, selectedJabatan, searchKeyword, hariIniKey]);

    // Kelompokkan per Ruangan untuk tampilan kartu
    const ruanganGroups = useMemo(() => {
        const map: Record<string, { ruangan: RuanganItem; items: JadwalItem[] }> = {};

        ruanganList.forEach((r) => {
            map[r.kode_ruangan] = {
                ruangan: r,
                items: [],
            };
        });

        filteredJadwal.forEach((item) => {
            const code = item.kode_ruangan;
            if (!map[code]) {
                map[code] = {
                    ruangan: {
                        kode_ruangan: code,
                        nama_ruangan: item.nama_ruangan || code,
                    },
                    items: [],
                };
            }
            map[code].items.push(item);
        });

        // Urutkan item: Dokter / PJ Utama pertama
        Object.values(map).forEach((g) => {
            g.items.sort((a, b) => {
                const isPjA = a.is_penanggung_jawab ? 1 : 0;
                const isPjB = b.is_penanggung_jawab ? 1 : 0;
                if (isPjB !== isPjA) return isPjB - isPjA;
                return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
            });
        });

        return Object.values(map).filter((g) => {
            if (searchKeyword.trim()) {
                const q = searchKeyword.toLowerCase();
                const matchRoom = (g.ruangan.nama_ruangan || '').toLowerCase().includes(q);
                return matchRoom || g.items.length > 0;
            }
            return true;
        });
    }, [ruanganList, filteredJadwal, searchKeyword]);

    const formatJam = (jam: string) => {
        if (!jam) return '';
        return String(jam).slice(0, 5);
    };

    const activeHariLabel = useMemo(() => {
        if (selectedHari === 'semua') return 'Semua Hari (Senin - Minggu)';
        if (selectedHari === 'hari_ini') {
            const h = HARI_LIST.find((x) => x.key === hariIniKey);
            return `Hari Ini (${h?.label || hariIniKey})`;
        }
        const h = HARI_LIST.find((x) => x.key === selectedHari);
        return h ? `Hari ${h.label}` : selectedHari;
    }, [selectedHari, hariIniKey]);

    // Statistik Cepat
    const stats = useMemo(() => {
        const totalJadwal = filteredJadwal.length;
        const totalDokter = new Set(
            filteredJadwal.filter((j) => (j.jabatan || '').toLowerCase() === 'dokter').map((j) => j.nama_karyawan)
        ).size;
        const totalTerapis = new Set(
            filteredJadwal
                .filter((j) => ['beautician', 'terapis'].includes((j.jabatan || '').toLowerCase()))
                .map((j) => j.nama_karyawan)
        ).size;
        const totalRuanganAktif = new Set(filteredJadwal.map((j) => j.kode_ruangan)).size;

        return { totalJadwal, totalDokter, totalTerapis, totalRuanganAktif };
    }, [filteredJadwal]);

    const isFilterActive = selectedHari !== 'hari_ini' || selectedJabatan !== 'semua' || searchKeyword.trim() !== '';

    return (
        <div className="w-full">
            <Toast ref={toast} />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. KARTU HEADER & KONTROL FILTER (TEMA HIJAU KLINIK)           */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="surface-card border-round-2xl p-3 md:p-4 shadow-1 mb-4 border-1 surface-border">
                {/* Baris 1: Judul Halaman & Tombol Aksi */}
                <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                    <div className="flex align-items-center gap-3">
                        <div
                            className="flex align-items-center justify-content-center border-round-xl shadow-xs flex-shrink-0"
                            style={{
                                width: '44px',
                                height: '44px',
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#FFFFFF',
                            }}
                        >
                            <i className="pi pi-calendar text-xl" />
                        </div>
                        <div>
                            <div className="flex align-items-center gap-2">
                                <h2 className="text-xl md:text-2xl font-bold text-900 m-0">
                                    Jadwal Tugas Karyawan
                                </h2>
                                <span
                                    className="text-xs font-semibold px-2.5 py-0.5 border-round-full inline-flex align-items-center gap-1"
                                    style={{
                                        backgroundColor: '#ECFDF5',
                                        color: '#047857',
                                        border: '1px solid #A7F3D0',
                                    }}
                                >
                                    <i className="pi pi-eye text-[10px]" />
                                    Mode Lihat
                                </span>
                            </div>
                            <p className="text-500 text-xs md:text-sm m-0 mt-0.5">
                                Pantau jadwal shift dokter dan terapis yang bertugas di setiap ruangan klinik.
                            </p>
                        </div>
                    </div>

                    <div className="flex align-items-center gap-2">
                        <Button
                            size="small"
                            label="Cetak"
                            icon="pi pi-print"
                            outlined
                            style={{ borderColor: '#10B981', color: '#059669' }}
                            className="border-round-lg font-semibold px-3"
                            onClick={() => window.print()}
                            tooltip="Cetak Jadwal Tugas"
                        />
                        <Button
                            size="small"
                            label="Segarkan"
                            icon="pi pi-refresh"
                            outlined
                            severity="success"
                            className="border-round-lg font-semibold px-3"
                            loading={loading}
                            onClick={() => {
                                loadData();
                                showSuccess(toast, 'Jadwal berhasil diperbarui');
                            }}
                            tooltip="Muat Ulang Data"
                        />
                    </div>
                </div>

                {/* Baris 2: Tombol Pill Pilihan Hari (Hijau Tema Klinik) */}
                <div className="pt-3 border-top-1 surface-border">
                    <div className="flex align-items-center justify-content-between mb-2">
                        <span className="text-[11px] font-bold text-500 uppercase tracking-wider">
                            PILIH HARI JADWAL:
                        </span>
                        {isFilterActive && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedHari('hari_ini');
                                    setSelectedJabatan('semua');
                                    setSearchKeyword('');
                                }}
                                style={{
                                    color: '#059669',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                className="text-xs font-semibold flex align-items-center gap-1 p-0 transition-colors hover:underline"
                            >
                                <i className="pi pi-refresh text-[10px]" />
                                Reset ke Hari Ini
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap align-items-center gap-2">
                        {/* Tombol Hari Ini */}
                        {(() => {
                            const isHariIniActive = selectedHari === 'hari_ini';
                            return (
                                <button
                                    type="button"
                                    onClick={() => setSelectedHari('hari_ini')}
                                    style={{
                                        height: '36px',
                                        padding: '0 16px',
                                        borderRadius: '10px',
                                        border: `1px solid ${isHariIniActive ? '#059669' : '#A7F3D0'}`,
                                        backgroundColor: isHariIniActive ? '#10B981' : '#FFFFFF',
                                        color: isHariIniActive ? '#FFFFFF' : '#047857',
                                        boxShadow: isHariIniActive ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                                        transition: 'all 0.15s ease',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                    }}
                                    className="flex align-items-center gap-2 text-xs md:text-sm"
                                >
                                    <i className="pi pi-bolt text-xs" />
                                    <span>Hari Ini ({HARI_LIST.find((h) => h.key === hariIniKey)?.label})</span>
                                </button>
                            );
                        })()}

                        {/* Tombol Semua Hari */}
                        {(() => {
                            const isSemuaActive = selectedHari === 'semua';
                            return (
                                <button
                                    type="button"
                                    onClick={() => setSelectedHari('semua')}
                                    style={{
                                        height: '36px',
                                        padding: '0 16px',
                                        borderRadius: '10px',
                                        border: `1px solid ${isSemuaActive ? '#059669' : '#CBD5E1'}`,
                                        backgroundColor: isSemuaActive ? '#10B981' : '#FFFFFF',
                                        color: isSemuaActive ? '#FFFFFF' : '#334155',
                                        boxShadow: isSemuaActive ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                                        transition: 'all 0.15s ease',
                                        cursor: 'pointer',
                                        fontWeight: isSemuaActive ? 700 : 600,
                                    }}
                                    className="flex align-items-center gap-1.5 text-xs md:text-sm"
                                >
                                    <i className="pi pi-calendar text-xs" />
                                    <span>Semua Hari</span>
                                </button>
                            );
                        })()}

                        <div className="border-left-1 surface-border h-2rem hidden sm:block mx-1" />

                        {/* Tombol Setiap Hari */}
                        {HARI_LIST.map((h) => {
                            const isSelected = selectedHari === h.key;
                            const isToday = h.key === hariIniKey;
                            return (
                                <button
                                    key={h.key}
                                    type="button"
                                    onClick={() => setSelectedHari(h.key)}
                                    style={{
                                        height: '36px',
                                        padding: '0 14px',
                                        borderRadius: '10px',
                                        border: `1px solid ${isSelected ? '#059669' : '#CBD5E1'}`,
                                        backgroundColor: isSelected ? '#10B981' : '#FFFFFF',
                                        color: isSelected ? '#FFFFFF' : '#334155',
                                        boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
                                        transition: 'all 0.15s ease',
                                        cursor: 'pointer',
                                        fontWeight: isSelected ? 700 : 600,
                                    }}
                                    className="flex align-items-center gap-1.5 text-xs md:text-sm"
                                >
                                    <span>{h.label}</span>
                                    {isToday && (
                                        <span
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: isSelected ? '#FFFFFF' : '#10B981',
                                            }}
                                            title="Hari Ini"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Baris 3: Filter Petugas, Pencarian & Saklar Tampilan */}
                <div className="mt-3 pt-3 border-top-1 surface-border flex flex-wrap align-items-center justify-content-between gap-3">
                    {/* Filter Profesi Petugas */}
                    <div className="flex flex-wrap align-items-center gap-2">
                        <span className="text-[11px] font-bold text-500 uppercase mr-1">Petugas:</span>
                        {/* Semua Petugas */}
                        {(() => {
                            const isSemua = selectedJabatan === 'semua';
                            return (
                                <button
                                    type="button"
                                    onClick={() => setSelectedJabatan('semua')}
                                    style={{
                                        height: '34px',
                                        padding: '0 14px',
                                        borderRadius: '8px',
                                        border: `1px solid ${isSemua ? '#059669' : '#CBD5E1'}`,
                                        backgroundColor: isSemua ? '#10B981' : '#FFFFFF',
                                        color: isSemua ? '#FFFFFF' : '#475569',
                                        boxShadow: isSemua ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        fontWeight: isSemua ? 700 : 600,
                                    }}
                                    className="text-xs"
                                >
                                    Semua Petugas
                                </button>
                            );
                        })()}

                        {/* Dokter */}
                        {(() => {
                            const isDokter = selectedJabatan === 'dokter';
                            return (
                                <button
                                    type="button"
                                    onClick={() => setSelectedJabatan('dokter')}
                                    style={{
                                        height: '34px',
                                        padding: '0 14px',
                                        borderRadius: '8px',
                                        border: `1px solid ${isDokter ? '#059669' : '#CBD5E1'}`,
                                        backgroundColor: isDokter ? '#10B981' : '#FFFFFF',
                                        color: isDokter ? '#FFFFFF' : '#334155',
                                        boxShadow: isDokter ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        fontWeight: isDokter ? 700 : 600,
                                    }}
                                    className="text-xs flex align-items-center gap-1.5"
                                >
                                    <span
                                        style={{
                                            width: '7px',
                                            height: '7px',
                                            borderRadius: '50%',
                                            backgroundColor: isDokter ? '#FFFFFF' : '#EF4444',
                                        }}
                                    />
                                    <span>Dokter</span>
                                </button>
                            );
                        })()}

                        {/* Terapis & Beautician */}
                        {(() => {
                            const isTerapis = selectedJabatan === 'terapis';
                            return (
                                <button
                                    type="button"
                                    onClick={() => setSelectedJabatan('terapis')}
                                    style={{
                                        height: '34px',
                                        padding: '0 14px',
                                        borderRadius: '8px',
                                        border: `1px solid ${isTerapis ? '#059669' : '#CBD5E1'}`,
                                        backgroundColor: isTerapis ? '#10B981' : '#FFFFFF',
                                        color: isTerapis ? '#FFFFFF' : '#334155',
                                        boxShadow: isTerapis ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        fontWeight: isTerapis ? 700 : 600,
                                    }}
                                    className="text-xs flex align-items-center gap-1.5"
                                >
                                    <span
                                        style={{
                                            width: '7px',
                                            height: '7px',
                                            borderRadius: '50%',
                                            backgroundColor: isTerapis ? '#FFFFFF' : '#F59E0B',
                                        }}
                                    />
                                    <span>Terapis &amp; Beautician</span>
                                </button>
                            );
                        })()}
                    </div>

                    {/* Search Bar & Switcher View */}
                    <div className="flex flex-wrap align-items-center gap-2 w-full md:w-auto">
                        <IconField iconPosition="left" className="w-full sm:w-16rem">
                            <InputIcon className="pi pi-search text-xs" />
                            <InputText
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="Cari nama dokter, ruangan..."
                                style={{ height: '36px', borderRadius: '10px' }}
                                className="w-full text-xs p-inputtext-sm"
                            />
                        </IconField>
                        {searchKeyword && (
                            <Button
                                type="button"
                                icon="pi pi-times"
                                text
                                rounded
                                severity="secondary"
                                onClick={() => setSearchKeyword('')}
                                tooltip="Hapus Pencarian"
                            />
                        )}

                        {/* Segmented Switcher Kartu vs Tabel */}
                        <div
                            className="flex align-items-center p-1 border-round-xl"
                            style={{
                                height: '38px',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setViewMode('kartu')}
                                style={{
                                    height: '30px',
                                    padding: '0 14px',
                                    borderRadius: '8px',
                                    border: viewMode === 'kartu' ? '1px solid #059669' : 'none',
                                    backgroundColor: viewMode === 'kartu' ? '#10B981' : 'transparent',
                                    color: viewMode === 'kartu' ? '#FFFFFF' : '#065F46',
                                    boxShadow: viewMode === 'kartu' ? '0 1px 4px rgba(16, 185, 129, 0.35)' : 'none',
                                    cursor: 'pointer',
                                    fontWeight: viewMode === 'kartu' ? 700 : 600,
                                    transition: 'all 0.15s ease',
                                }}
                                className="flex align-items-center gap-1.5 text-xs"
                                title="Tampilan Kartu Ruangan"
                            >
                                <i className="pi pi-th-large text-xs" />
                                <span>Kartu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('tabel')}
                                style={{
                                    height: '30px',
                                    padding: '0 14px',
                                    borderRadius: '8px',
                                    border: viewMode === 'tabel' ? '1px solid #059669' : 'none',
                                    backgroundColor: viewMode === 'tabel' ? '#10B981' : 'transparent',
                                    color: viewMode === 'tabel' ? '#FFFFFF' : '#065F46',
                                    boxShadow: viewMode === 'tabel' ? '0 1px 4px rgba(16, 185, 129, 0.35)' : 'none',
                                    cursor: 'pointer',
                                    fontWeight: viewMode === 'tabel' ? 700 : 600,
                                    transition: 'all 0.15s ease',
                                }}
                                className="flex align-items-center gap-1.5 text-xs"
                                title="Tampilan Tabel Rapi"
                            >
                                <i className="pi pi-list text-xs" />
                                <span>Tabel</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Baris 4: Status Banner Ringkas Hijau */}
                <div
                    className="mt-3 p-2.5 border-round-xl flex flex-wrap align-items-center justify-content-between gap-2 text-xs"
                    style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
                >
                    <div className="flex align-items-center gap-2">
                        <span
                            className="w-1.5rem h-1.5rem border-round-circle flex align-items-center justify-content-center font-bold text-xs"
                            style={{ backgroundColor: '#D1FAE5', color: '#047857' }}
                        >
                            <i className="pi pi-calendar text-[11px]" />
                        </span>
                        <div>
                            <span className="text-600 mr-1.5">Jadwal Shift:</span>
                            <span className="font-bold" style={{ color: '#064E3B' }}>{activeHariLabel}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap align-items-center gap-2">
                        <div
                            className="bg-white px-2.5 py-1 border-round-full flex align-items-center gap-1.5 shadow-xs"
                            style={{ border: '1px solid #A7F3D0' }}
                        >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            <span className="text-500">Dokter:</span>
                            <strong className="text-900 font-bold">{stats.totalDokter}</strong>
                        </div>
                        <div
                            className="bg-white px-2.5 py-1 border-round-full flex align-items-center gap-1.5 shadow-xs"
                            style={{ border: '1px solid #A7F3D0' }}
                        >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                            <span className="text-500">Terapis:</span>
                            <strong className="text-900 font-bold">{stats.totalTerapis}</strong>
                        </div>
                        <div
                            className="bg-white px-2.5 py-1 border-round-full flex align-items-center gap-1.5 shadow-xs"
                            style={{ border: '1px solid #A7F3D0' }}
                        >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                            <span className="text-500">Ruangan Aktif:</span>
                            <strong className="text-900 font-bold">{stats.totalRuanganAktif}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. KONTEN UTAMA: KARTU RUANGAN SIMETRIS ATAU TABEL RAPI        */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {loading ? (
                <div className="surface-card border-round-2xl p-6 text-center shadow-1 border-1 surface-border">
                    <ProgressSpinner style={{ width: '40px', height: '40px' }} />
                    <p className="text-500 text-sm mt-3 m-0">Memuat jadwal tugas...</p>
                </div>
            ) : filteredJadwal.length === 0 ? (
                <div className="surface-card border-round-2xl p-6 text-center shadow-1 border-1 surface-border">
                    <div
                        className="inline-flex align-items-center justify-content-center border-round-circle mb-3"
                        style={{ width: '56px', height: '56px', backgroundColor: '#F1F5F9', color: '#64748B' }}
                    >
                        <i className="pi pi-calendar-times text-2xl" />
                    </div>
                    <h4 className="text-base font-bold text-800 m-0 mb-1">Tidak Ada Jadwal Tugas</h4>
                    <p className="text-500 text-xs md:text-sm m-0 max-w-28rem mx-auto">
                        Tidak ada petugas atau dokter yang bertugas untuk filter yang dipilih ({activeHariLabel}).
                    </p>
                    {isFilterActive && (
                        <Button
                            label="Tampilkan Semua Jadwal"
                            icon="pi pi-filter-slash"
                            size="small"
                            outlined
                            style={{ borderColor: '#10B981', color: '#059669' }}
                            className="mt-3 border-round-lg font-semibold"
                            onClick={() => {
                                setSelectedHari('semua');
                                setSelectedJabatan('semua');
                                setSearchKeyword('');
                            }}
                        />
                    )}
                </div>
            ) : viewMode === 'kartu' ? (
                /* ── TAMPILAN KARTU RUANGAN SIMETRIS & ELEGAN ── */
                <div className="grid">
                    {ruanganGroups.map((group) => {
                        const room = group.ruangan;
                        const items = group.items;
                        const hasItems = items.length > 0;
                        const isKonsul = Boolean(room.is_konsultasi);

                        return (
                            <div key={room.kode_ruangan} className="col-12 md:col-6 lg:col-4">
                                <div
                                    className={`surface-card border-round-2xl p-3 md:p-3.5 h-full flex flex-column justify-content-between border-1 transition-all ${
                                        hasItems
                                            ? 'shadow-1 hover:shadow-2'
                                            : 'surface-border opacity-70'
                                    }`}
                                    style={{
                                        borderColor: hasItems ? '#E2E8F0' : '#E2E8F0',
                                        backgroundColor: '#FFFFFF',
                                    }}
                                >
                                    {/* Header Ruangan */}
                                    <div className="flex align-items-center justify-content-between gap-2 pb-3 mb-3 border-bottom-1 surface-border">
                                        <div className="flex align-items-center gap-2.5">
                                            <div
                                                className="w-2.5rem h-2.5rem border-round-xl flex align-items-center justify-content-center flex-shrink-0"
                                                style={{
                                                    backgroundColor: isKonsul ? '#FFFBEB' : '#ECFDF5',
                                                    color: isKonsul ? '#D97706' : '#059669',
                                                    border: `1px solid ${isKonsul ? '#FDE68A' : '#A7F3D0'}`,
                                                }}
                                            >
                                                <i className={`pi ${isKonsul ? 'pi-comments' : 'pi-building'} text-base`} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm md:text-base font-bold text-900 m-0 leading-tight">
                                                    {room.nama_ruangan}
                                                </h4>
                                                <div className="flex align-items-center gap-1.5 mt-1 text-xs text-500">
                                                    <span className="font-mono font-medium">{room.kode_ruangan}</span>
                                                    <span>•</span>
                                                    <span className={isKonsul ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                                                        {isKonsul ? 'Poli Konsultasi' : 'Ruang Tindakan'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Badge Jumlah Petugas yang Rapi & Halus */}
                                        <span
                                            className="inline-flex align-items-center gap-1.5 text-xs font-semibold px-2.5 py-1 border-round-full flex-shrink-0"
                                            style={{
                                                backgroundColor: hasItems ? '#ECFDF5' : '#F1F5F9',
                                                color: hasItems ? '#047857' : '#64748B',
                                                border: `1px solid ${hasItems ? '#A7F3D0' : '#E2E8F0'}`,
                                            }}
                                        >
                                            <span
                                                className="w-1.5 h-1.5 border-round-circle flex-shrink-0"
                                                style={{ backgroundColor: hasItems ? '#10B981' : '#94A3B8' }}
                                            />
                                            {hasItems ? `${items.length} Petugas` : 'Kosong'}
                                        </span>
                                    </div>

                                    {/* Body: Daftar Petugas Simetris */}
                                    <div className="flex-1 flex flex-column gap-2.5">
                                        {!hasItems ? (
                                            <div className="py-4 px-2 text-center border-round-xl surface-50 border-1 border-dashed surface-border">
                                                <i className="pi pi-calendar-times text-400 text-xl mb-1 block" />
                                                <span className="text-xs text-500 font-medium">Tidak ada jadwal tugas hari ini</span>
                                            </div>
                                        ) : (
                                            items.map((it) => {
                                                const isDokter = (it.jabatan || '').toLowerCase() === 'dokter';
                                                const isPj = it.is_penanggung_jawab === 1 || it.is_penanggung_jawab === true;
                                                const hariCfg = HARI_CONFIG[(it.hari || '').toLowerCase()] || {
                                                    label: it.hari,
                                                    bg: '#F1F5F9',
                                                    color: '#475569',
                                                };

                                                return (
                                                    <div
                                                        key={it.id || it.kode_jadwal}
                                                        className="p-3 border-round-xl flex align-items-center justify-content-between gap-2.5 transition-all"
                                                        style={{
                                                            backgroundColor: isPj ? '#F0FDF4' : '#F8FAFC',
                                                            border: `1px solid ${isPj ? '#BBF7D0' : '#E2E8F0'}`,
                                                        }}
                                                    >
                                                        {/* Avatar & Identitas Petugas */}
                                                        <div className="flex align-items-center gap-2.5 min-w-0">
                                                            <div
                                                                className="w-2.5rem h-2.5rem border-round-circle flex align-items-center justify-content-center flex-shrink-0 font-bold text-xs"
                                                                style={{
                                                                    backgroundColor: isDokter ? '#FEE2E2' : '#FEF3C7',
                                                                    color: isDokter ? '#DC2626' : '#D97706',
                                                                    border: `1px solid ${isDokter ? '#FECACA' : '#FDE68A'}`,
                                                                }}
                                                            >
                                                                <i className={`pi ${isDokter ? 'pi-heart-fill' : 'pi-sparkles'} text-xs`} />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <div className="font-bold text-900 text-xs md:text-sm text-truncate leading-tight">
                                                                    {it.nama_karyawan}
                                                                </div>
                                                                <div className="flex flex-wrap align-items-center gap-1.5 mt-1 text-xs">
                                                                    {selectedHari === 'semua' && (
                                                                        <span
                                                                            className="font-bold text-[9px] px-1.5 py-0.2 border-round uppercase"
                                                                            style={{
                                                                                backgroundColor: hariCfg.bg,
                                                                                color: hariCfg.color,
                                                                            }}
                                                                        >
                                                                            {hariCfg.label}
                                                                        </span>
                                                                    )}
                                                                    <span
                                                                        className="font-mono font-semibold text-[11px] inline-flex align-items-center gap-1"
                                                                        style={{ color: '#065F46' }}
                                                                    >
                                                                        <i className="pi pi-clock text-[10px]" style={{ color: '#059669' }} />
                                                                        {formatJam(it.jam_mulai)} - {formatJam(it.jam_selesai)} WIB
                                                                    </span>
                                                                    <span className="text-400">•</span>
                                                                    {isPj ? (
                                                                        <span
                                                                            className="inline-flex align-items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 border-round"
                                                                            style={{
                                                                                backgroundColor: '#D1FAE5',
                                                                                color: '#065F46',
                                                                                border: '1px solid #A7F3D0',
                                                                            }}
                                                                        >
                                                                            <i className="pi pi-star-fill text-[9px] text-amber-500" />
                                                                            PJ Utama
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className="text-[10px] font-medium px-1.5 py-0.5 border-round"
                                                                            style={{
                                                                                backgroundColor: '#F1F5F9',
                                                                                color: '#64748B',
                                                                                border: '1px solid #E2E8F0',
                                                                            }}
                                                                        >
                                                                            Pendamping
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Tag Peran di Kanan */}
                                                        <span
                                                            className="text-[10px] font-bold px-2 py-1 border-round-md uppercase flex-shrink-0"
                                                            style={{
                                                                backgroundColor: isDokter ? '#FEE2E2' : '#FEF3C7',
                                                                color: isDokter ? '#B91C1C' : '#B45309',
                                                                border: `1px solid ${isDokter ? '#FECACA' : '#FDE68A'}`,
                                                            }}
                                                        >
                                                            {isDokter ? 'Dokter' : 'Terapis'}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── TAMPILAN TABEL LENGKAP & RAPI ── */
                <div className="surface-card border-round-2xl p-3 md:p-4 shadow-1 border-1 surface-border">
                    <DataTable
                        value={filteredJadwal}
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 25, 50]}
                        dataKey="id"
                        emptyMessage="Tidak ada jadwal tugas yang sesuai"
                        rowHover
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    >
                        <Column
                            header="No"
                            style={{ width: '3.5rem' }}
                            align="center"
                            body={(_, { rowIndex }) => <span className="text-500 font-bold text-xs">{rowIndex + 1}</span>}
                        />
                        <Column
                            field="nama_karyawan"
                            header="Nama Petugas"
                            sortable
                            style={{ minWidth: '15rem' }}
                            body={(item: JadwalItem) => {
                                const isDokter = (item.jabatan || '').toLowerCase() === 'dokter';
                                return (
                                    <div className="flex align-items-center gap-2.5">
                                        <div
                                            className="w-2rem h-2rem border-round-circle flex align-items-center justify-content-center flex-shrink-0 font-bold text-xs"
                                            style={{
                                                backgroundColor: isDokter ? '#FEE2E2' : '#FEF3C7',
                                                color: isDokter ? '#DC2626' : '#D97706',
                                            }}
                                        >
                                            <i className={`pi ${isDokter ? 'pi-heart-fill' : 'pi-sparkles'} text-xs`} />
                                        </div>
                                        <div>
                                            <span className="font-bold text-900 block text-sm">{item.nama_karyawan}</span>
                                            <span className="text-xs text-500">
                                                {isDokter ? 'Dokter Praktik' : (item.jabatan || 'Terapis').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        <Column
                            field="nama_ruangan"
                            header="Ruangan Bertugas"
                            sortable
                            style={{ minWidth: '13rem' }}
                            body={(item: JadwalItem) => (
                                <div className="flex align-items-center gap-1.5">
                                    <i className="pi pi-building text-emerald-600 text-xs" />
                                    <span className="font-semibold text-900 text-sm">
                                        {item.nama_ruangan || item.kode_ruangan}
                                    </span>
                                </div>
                            )}
                        />
                        <Column
                            field="hari"
                            header="Hari"
                            sortable
                            align="center"
                            style={{ minWidth: '8rem' }}
                            body={(item: JadwalItem) => {
                                const cfg = HARI_CONFIG[(item.hari || '').toLowerCase()] || {
                                    label: item.hari,
                                    bg: '#F1F5F9',
                                    color: '#475569',
                                };
                                return (
                                    <span
                                        className="font-bold text-xs uppercase px-2.5 py-0.5 border-round inline-block"
                                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                                    >
                                        {cfg.label}
                                    </span>
                                );
                            }}
                        />
                        <Column
                            field="jam_mulai"
                            header="Jam Shift"
                            sortable
                            style={{ minWidth: '11rem' }}
                            body={(item: JadwalItem) => (
                                <span className="font-mono text-sm font-semibold text-emerald-800 flex align-items-center gap-1.5">
                                    <i className="pi pi-clock text-xs text-emerald-600" />
                                    {formatJam(item.jam_mulai)} - {formatJam(item.jam_selesai)} WIB
                                </span>
                            )}
                        />
                        <Column
                            field="is_penanggung_jawab"
                            header="Peran Shift"
                            sortable
                            align="center"
                            style={{ minWidth: '10rem' }}
                            body={(item: JadwalItem) => {
                                const isPJ = item.is_penanggung_jawab === 1 || item.is_penanggung_jawab === true;
                                return isPJ ? (
                                    <span
                                        className="inline-flex align-items-center gap-1 text-xs font-bold px-2 py-0.5 border-round"
                                        style={{
                                            backgroundColor: '#D1FAE5',
                                            color: '#065F46',
                                            border: '1px solid #A7F3D0',
                                        }}
                                    >
                                        <i className="pi pi-star-fill text-[10px] text-amber-500" />
                                        PJ Utama
                                    </span>
                                ) : (
                                    <span
                                        className="text-xs font-medium px-2 py-0.5 border-round"
                                        style={{
                                            backgroundColor: '#F1F5F9',
                                            color: '#64748B',
                                            border: '1px solid #E2E8F0',
                                        }}
                                    >
                                        Pendamping
                                    </span>
                                );
                            }}
                        />
                        <Column
                            field="status"
                            header="Status"
                            align="center"
                            style={{ minWidth: '6.5rem' }}
                            body={(item: JadwalItem) => {
                                const isAktif = (item.status || 'aktif').toLowerCase() === 'aktif';
                                return (
                                    <span
                                        className="inline-flex align-items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 border-round"
                                        style={{
                                            backgroundColor: isAktif ? '#ECFDF5' : '#FEF2F2',
                                            color: isAktif ? '#047857' : '#B91C1C',
                                            border: `1px solid ${isAktif ? '#A7F3D0' : '#FECACA'}`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: isAktif ? '#10B981' : '#EF4444',
                                            }}
                                        />
                                        {isAktif ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                );
                            }}
                        />
                    </DataTable>
                </div>
            )}
        </div>
    );
};

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="flex align-items-center justify-content-center p-6">
                    <ProgressSpinner style={{ width: '40px', height: '40px' }} />
                </div>
            }
        >
            <JadwalKaryawanGreenContent />
        </Suspense>
    );
}
