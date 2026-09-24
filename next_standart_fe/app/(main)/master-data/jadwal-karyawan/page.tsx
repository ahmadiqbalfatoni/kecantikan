'use client';

import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { InputSwitch } from 'primereact/inputswitch';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ProgressSpinner } from 'primereact/progressspinner';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

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
    group_key?: string;
}

interface RuanganItem {
    kode_ruangan: string;
    nama_ruangan: string;
    is_konsultasi?: number;
    total_jadwal?: number;
    total_hari?: number;
    total_hari_pj?: number;
    has_pj?: number;
}

interface SlotRow {
    rowKey: string;
    hari: string;
    nama_hari: string;
    jam_operasional: string;
    jam_mulai: string;
    jam_selesai: string;
    is_empty: boolean;
    pj_item: JadwalItem | null;
    nama_pj: string | null;
    kuota: number | string;
    status: string;
    pendamping: JadwalItem[];
    can_expand: boolean;
    all_codes: string[];
    day_session_index: number;
    day_session_total: number;
    is_first_session_of_day: boolean;
    is_last_session_of_day: boolean;
}

const HARI_ORDER: Record<string, number> = {
    senin: 1,
    selasa: 2,
    rabu: 3,
    kamis: 4,
    jumat: 5,
    sabtu: 6,
    minggu: 7,
};

const DAYS_OF_WEEK = [
    { key: 'senin', label: 'SENIN' },
    { key: 'selasa', label: 'SELASA' },
    { key: 'rabu', label: 'RABU' },
    { key: 'kamis', label: 'KAMIS' },
    { key: 'jumat', label: 'JUMAT' },
    { key: 'sabtu', label: 'SABTU' },
    { key: 'minggu', label: 'MINGGU' },
];

const HARI_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    senin: { label: 'Senin', bg: '#dcfce7', color: '#15803d' },
    selasa: { label: 'Selasa', bg: '#dbeafe', color: '#1d4ed8' },
    rabu: { label: 'Rabu', bg: '#f3e8ff', color: '#7e22ce' },
    kamis: { label: 'Kamis', bg: '#ffedd5', color: '#c2410c' },
    jumat: { label: 'Jumat', bg: '#d1fae5', color: '#047857' },
    sabtu: { label: 'Sabtu', bg: '#fee2e2', color: '#b91c1c' },
    minggu: { label: 'Minggu', bg: '#ffe4e6', color: '#be123c' },
};

const HARI_OPTIONS = [
    { label: 'Senin', value: 'senin' },
    { label: 'Selasa', value: 'selasa' },
    { label: 'Rabu', value: 'rabu' },
    { label: 'Kamis', value: 'kamis' },
    { label: 'Jumat', value: 'jumat' },
    { label: 'Sabtu', value: 'sabtu' },
    { label: 'Minggu', value: 'minggu' },
];

const JadwalKaryawanContent = () => {
    const toast = useRef<Toast>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // ── Drill-down State ──
    const ruanganParam = searchParams.get('ruangan') || '';
    const [selectedRuangan, setSelectedRuangan] = useState<string>(ruanganParam);

    // ── Data Ruangan (Tahap 1) ──
    const [ruanganList, setRuanganList] = useState<RuanganItem[]>([]);
    const [loadingRuangan, setLoadingRuangan] = useState<boolean>(false);
    const [ruanganSearch, setRuanganSearch] = useState<string>('');

    // ── Data Jadwal Ruangan Terpilih (Tahap 2) ──
    const [data, setData] = useState<JadwalItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [filterHari, setFilterHari] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<any>(null);
    const [sortField, setSortField] = useState<string>('hari');
    const [sortOrder, setSortOrder] = useState<number>(1);
    const isGroupedByDay = !sortField || sortField === 'hari';

    // ── Form & Dialog State ──
    const [karyawanOptions, setKaryawanOptions] = useState<any[]>([]);
    const [ruanganOptions, setRuanganOptions] = useState<any[]>([]);
    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    const [formData, setFormData] = useState<any>({
        kode_jadwal: '',
        no_sip: '',
        kode_ruangan: '',
        hari: 'senin',
        jam_mulai: '08:00',
        jam_selesai: '16:00',
        kuota: 10,
        status: 'aktif',
        is_penanggung_jawab: false,
    });

    // Sinkronkan selectedRuangan dengan query parameter URL
    useEffect(() => {
        setSelectedRuangan(ruanganParam);
        setPage(1);
        setSelectedRows([]);
    }, [ruanganParam]);

    // Obyek ruangan yang sedang aktif dibuka
    const activeRoomObj = useMemo(() => {
        return ruanganList.find((r) => r.kode_ruangan === selectedRuangan) || null;
    }, [ruanganList, selectedRuangan]);

    // Filter daftar ruangan berdasarkan kata kunci pencarian (Tahap 1)
    const filteredRuangans = useMemo(() => {
        if (!ruanganSearch.trim()) return ruanganList;
        const q = ruanganSearch.toLowerCase().trim();
        return ruanganList.filter(
            (r) =>
                (r.nama_ruangan || '').toLowerCase().includes(q) ||
                (r.kode_ruangan || '').toLowerCase().includes(q)
        );
    }, [ruanganList, ruanganSearch]);

    // Kelompokkan data jadwal menjadi Baris Slot Utama (Hari + Jam Operasional)
    const slotRows: SlotRow[] = useMemo(() => {
        const days = filterHari
            ? DAYS_OF_WEEK.filter((d) => d.key === filterHari)
            : DAYS_OF_WEEK;

        const result: SlotRow[] = [];

        days.forEach((day) => {
            const dayKey = day.key;
            const dayItems = data.filter(
                (item) => (item.hari || '').toLowerCase() === dayKey
            );

            if (dayItems.length === 0) {
                // Jika sedang melakukan pencarian keyword, jangan tampilkan placeholder kosong
                if (keyword.trim()) return;

                result.push({
                    rowKey: `empty_${dayKey}`,
                    hari: dayKey,
                    nama_hari: HARI_CONFIG[dayKey]?.label || dayKey,
                    jam_operasional: '-',
                    jam_mulai: '08:00',
                    jam_selesai: '16:00',
                    is_empty: true,
                    pj_item: null,
                    nama_pj: null,
                    kuota: '-',
                    status: '-',
                    pendamping: [],
                    can_expand: false,
                    all_codes: [],
                    day_session_index: 0,
                    day_session_total: 1,
                    is_first_session_of_day: true,
                    is_last_session_of_day: true,
                });
                return;
            }

            // Kelompokkan per jam operasional dalam hari yang sama
            const timeGroups: Record<string, JadwalItem[]> = {};
            dayItems.forEach((item) => {
                const jM = (item.jam_mulai || '00:00').slice(0, 5);
                const jS = (item.jam_selesai || '00:00').slice(0, 5);
                const tKey = `${jM} - ${jS}`;
                if (!timeGroups[tKey]) {
                    timeGroups[tKey] = [];
                }
                timeGroups[tKey].push(item);
            });

            const sortedTimeKeys = Object.keys(timeGroups).sort();

            sortedTimeKeys.forEach((tKey, tIdx) => {
                const groupItems = timeGroups[tKey];
                const pjItem = groupItems.find(
                    (i) => i.is_penanggung_jawab === 1 || i.is_penanggung_jawab === true
                ) || null;

                const pendampingItems = pjItem
                    ? groupItems.filter((i) => i.kode_jadwal !== pjItem.kode_jadwal)
                    : groupItems;

                const jamMulai = (groupItems[0]?.jam_mulai || '08:00').slice(0, 5);
                const jamSelesai = (groupItems[0]?.jam_selesai || '16:00').slice(0, 5);

                result.push({
                    rowKey: `${dayKey}___${tKey}`,
                    hari: dayKey,
                    nama_hari: HARI_CONFIG[dayKey]?.label || dayKey,
                    jam_operasional: tKey,
                    jam_mulai: jamMulai,
                    jam_selesai: jamSelesai,
                    is_empty: false,
                    pj_item: pjItem,
                    nama_pj: pjItem ? pjItem.nama_karyawan : null,
                    kuota: pjItem ? pjItem.kuota : (groupItems[0]?.kuota || 0),
                    status: pjItem ? pjItem.status : (groupItems[0]?.status || 'aktif'),
                    pendamping: pendampingItems,
                    can_expand: true,
                    all_codes: groupItems.map((i) => i.kode_jadwal),
                    day_session_index: tIdx,
                    day_session_total: sortedTimeKeys.length,
                    is_first_session_of_day: tIdx === 0,
                    is_last_session_of_day: tIdx === sortedTimeKeys.length - 1,
                });
            });
        });

        return result;
    }, [data, filterHari, keyword, isGroupedByDay]);

    // Load daftar ruangan lengkap beserta metrik jadwalnya
    const loadRuangan = async () => {
        setLoadingRuangan(true);
        try {
            const res = await postData('/master/ruangan-dropdown', {});
            const list: RuanganItem[] = res.data.data || [];
            setRuanganList(list);

            const opts = list.map((r: any) => ({
                label: `${r.nama_ruangan} (${r.kode_ruangan})`,
                value: r.kode_ruangan,
            }));
            setRuanganOptions(opts);
        } catch (error) {
            console.error('Gagal memuat list ruangan:', error);
        } finally {
            setLoadingRuangan(false);
        }
    };

    // Load daftar karyawan untuk pilihan dokter / terapis di dialog
    const loadKaryawan = async () => {
        try {
            const res = await postData('/master/karyawan-data', { page: 1, perPage: 200 });
            const list = (res.data.data || []).map((k: any) => ({
                label: `${k.nama} (${(k.jabatan || 'KARYAWAN').toUpperCase()}) - ${k.no_sip || '-'}`,
                value: k.no_sip,
            }));
            setKaryawanOptions(list);
        } catch (error) {
            console.error('Gagal memuat list karyawan:', error);
        }
    };

    // Load data jadwal khusus untuk ruangan yang sedang aktif (Tahap 2 - Kalender Mingguan)
    const loadData = async () => {
        if (!selectedRuangan) return;
        setLoading(true);
        try {
            const res = await postData('/master/jadwal-karyawan-data', {
                page: 1,
                perPage: 200,
                keyword,
                kode_ruangan: selectedRuangan,
                hari: filterHari || undefined,
            });

            const rawData: JadwalItem[] = res.data.data || [];
            const sortedData = [...rawData].sort((a, b) => {
                const hA = HARI_ORDER[(a.hari || '').toLowerCase()] || 99;
                const hB = HARI_ORDER[(b.hari || '').toLowerCase()] || 99;
                if (hA !== hB) return hA - hB;

                const pjA = a.is_penanggung_jawab ? 1 : 0;
                const pjB = b.is_penanggung_jawab ? 1 : 0;
                if (pjB !== pjA) return pjB - pjA;

                return (a.jam_mulai || '').localeCompare(b.jam_mulai || '');
            });

            setData(sortedData);
            setTotalRecords(res.data.total_data || sortedData.length);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data jadwal ruangan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRuangan();
        loadKaryawan();
    }, []);

    useEffect(() => {
        if (selectedRuangan) {
            loadData();
        }
    }, [selectedRuangan, keyword, filterHari]);

    // Navigasi ke Tahap 2: Buka detail ruangan
    const handleSelectRuangan = (kodeRuangan: string) => {
        setSelectedRuangan(kodeRuangan);
        const params = new URLSearchParams(searchParams.toString());
        params.set('ruangan', kodeRuangan);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Navigasi balik ke Tahap 1: Kembali ke daftar ruangan
    const handleBackToRooms = () => {
        setSelectedRuangan('');
        setKeyword('');
        setFilterHari('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ruangan');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
        loadRuangan();
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({
            kode_jadwal: '',
            no_sip: karyawanOptions.length > 0 ? karyawanOptions[0].value : '',
            kode_ruangan: selectedRuangan || (ruanganOptions.length > 0 ? ruanganOptions[0].value : ''),
            hari: filterHari || 'senin',
            jam_mulai: '08:00',
            jam_selesai: '16:00',
            kuota: 10,
            status: 'aktif',
            is_penanggung_jawab: false,
        });
        setDialogVisible(true);
    };

    // Buka form tambah jadwal dengan kode_ruangan, hari, dan jam sudah ter-pre-fill
    const handleOpenCreateForSlot = (dayKey: string, jamMulai: string = '08:00', jamSelesai: string = '16:00', isPjDefault: boolean = false, slotKuota: number | string = 10) => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({
            kode_jadwal: '',
            no_sip: karyawanOptions.length > 0 ? karyawanOptions[0].value : '',
            kode_ruangan: selectedRuangan || (ruanganOptions.length > 0 ? ruanganOptions[0].value : ''),
            hari: dayKey,
            jam_mulai: jamMulai || '08:00',
            jam_selesai: jamSelesai || '16:00',
            kuota: parseInt(String(slotKuota), 10) || 0,
            status: 'aktif',
            is_penanggung_jawab: isPjDefault,
        });
        setDialogVisible(true);
    };

    // Buka form tambah sesi baru untuk hari tertentu
    const handleOpenCreateForDay = (dayKey: string) => {
        setIsEdit(false);
        setSubmitted(false);

        const daySessions = slotRows.filter((s) => s.hari === dayKey && !s.is_empty);
        let defaultStart = '14:00';
        let defaultEnd = '20:00';
        if (daySessions.length > 0) {
            const lastSession = daySessions[daySessions.length - 1];
            if (lastSession.jam_selesai && lastSession.jam_selesai !== '-') {
                defaultStart = lastSession.jam_selesai.slice(0, 5);
                const [h, m] = defaultStart.split(':').map(Number);
                const endH = Math.min((h || 0) + 6, 23);
                defaultEnd = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
            }
        }

        setFormData({
            kode_jadwal: '',
            no_sip: karyawanOptions.length > 0 ? karyawanOptions[0].value : '',
            kode_ruangan: selectedRuangan || (ruanganOptions.length > 0 ? ruanganOptions[0].value : ''),
            hari: dayKey,
            jam_mulai: defaultStart,
            jam_selesai: defaultEnd,
            kuota: 10,
            status: 'aktif',
            is_penanggung_jawab: true,
        });
        setDialogVisible(true);
    };

    // Toggle buka-tutup row expansion per slot baris
    const toggleRowExpansion = (slot: SlotRow) => {
        setExpandedRows((prev: any) => {
            if (!prev) {
                return { [slot.rowKey]: true };
            }
            if (Array.isArray(prev)) {
                const exists = prev.some((x: any) => x.rowKey === slot.rowKey);
                return exists ? prev.filter((x: any) => x.rowKey !== slot.rowKey) : [...prev, slot];
            }
            const next = { ...prev };
            if (next[slot.rowKey]) {
                delete next[slot.rowKey];
            } else {
                next[slot.rowKey] = true;
            }
            return next;
        });
    };

    const handleOpenEdit = (rowData: JadwalItem) => {
        setIsEdit(true);
        setSubmitted(false);
        setFormData({
            ...rowData,
            kuota: parseInt(String(rowData.kuota), 10) || 0,
            is_penanggung_jawab: Boolean(rowData.is_penanggung_jawab),
        });
        setDialogVisible(true);
    };

    const handleSave = async () => {
        setSubmitted(true);
        if (!formData.no_sip || !formData.kode_ruangan || !formData.hari || !formData.jam_mulai?.trim() || !formData.jam_selesai?.trim()) {
            showError(toast, 'Harap lengkapi seluruh bidang wajib!');
            return;
        }
        setSaving(true);
        try {
            let payload = { ...formData };
            if (!payload.is_penanggung_jawab) {
                // Untuk petugas pendamping, kuota otomatis disinkronkan dengan kuota Penanggung Jawab di slot yang sama
                const matchingSlot = slotRows.find(
                    (s) =>
                        s.hari === payload.hari &&
                        s.pj_item &&
                        s.jam_mulai === (payload.jam_mulai || '').slice(0, 5) &&
                        s.jam_selesai === (payload.jam_selesai || '').slice(0, 5)
                );
                payload.kuota = matchingSlot?.kuota ?? (payload.kuota || 0);
            }
            const endpoint = isEdit ? '/master/jadwal-karyawan-update' : '/master/jadwal-karyawan-create';
            const res = await postData(endpoint, payload);
            showSuccess(toast, res.data.message || 'Berhasil disimpan');
            setDialogVisible(false);
            loadData();
            loadRuangan();
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (codes: string[]) => {
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus ${codes.length} jadwal karyawan ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/jadwal-karyawan-delete', { kode_jadwal: codes });
                    showSuccess(toast, res.data.message || 'Berhasil dihapus');
                    setSelectedRows([]);
                    loadData();
                    loadRuangan();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal menghapus data');
                }
            },
        });
    };

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* TAHAP 1: DAFTAR RUANGAN (CARD GRID)                         */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {!selectedRuangan && (
                    <div>
                        {/* Page Header */}
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                                <i className="pi pi-sparkles text-purple-600 text-2xl" />
                                Kelola Jadwal Karyawan &amp; Dokter
                            </h3>
                            <p className="text-500 text-sm m-0">
                                Pilih salah satu ruangan di bawah ini untuk melihat dan mengelola jadwal shift dokter &amp; terapis.
                            </p>
                        </div>

                        {/* 1. Baris Tombol Aksi di bawah judul halaman */}
                        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                            <Button
                                size="small"
                                label="Tambah Ruangan"
                                icon="pi pi-plus"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                onClick={() => router.push('/master-data/ruangan')}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label="Refresh"
                                icon="pi pi-refresh"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                loading={loadingRuangan}
                                onClick={loadRuangan}
                            />
                        </div>

                        {/* Tabel Data Ruangan dengan format yang sama persis dengan Pendaftaran Pasien / Master Data */}
                        <DataTable
                            value={filteredRuangans}
                            scrollable
                            paginator
                            rows={10}
                            rowsPerPageOptions={[10, 25, 50]}
                            header={
                                <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                    <span className="text-xl font-bold text-900">Data Ruangan</span>
                                    <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                                        <IconField iconPosition="left" className="w-full md:w-20rem">
                                            <InputIcon className="pi pi-search" />
                                            <InputText
                                                value={ruanganSearch}
                                                onChange={(e) => setRuanganSearch(e.target.value)}
                                                placeholder="Cari Data..."
                                                className="w-full text-sm"
                                            />
                                        </IconField>
                                        <Button
                                            type="button"
                                            icon="pi pi-filter-slash"
                                            outlined
                                            severity="danger"
                                            tooltip="Reset Filter"
                                            tooltipOptions={{ position: 'bottom' }}
                                            onClick={() => setRuanganSearch('')}
                                        />
                                    </div>
                                </div>
                            }
                            loading={loadingRuangan}
                            dataKey="kode_ruangan"
                            emptyMessage="Data Ruangan Tidak Ditemukan"
                            rowHover
                            onRowClick={(e) => handleSelectRuangan(e.data.kode_ruangan)}
                            style={{ cursor: 'pointer' }}
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                        >
                            <Column
                                field="kode_ruangan"
                                header="Kode Ruangan"
                                align="center"
                                sortable
                                style={{ minWidth: '8rem' }}
                                body={(r: RuanganItem) => <span className="font-bold text-900">{r.kode_ruangan}</span>}
                            />
                            <Column
                                field="nama_ruangan"
                                header="Nama Ruangan"
                                className="font-bold text-900"
                                sortable
                                style={{ minWidth: '14rem' }}
                                body={(r: RuanganItem) => (
                                    <div className="flex align-items-center gap-2">
                                        <span>{r.nama_ruangan}</span>
                                        {Boolean(r.is_konsultasi) && (
                                            <Tag value="Konsultasi" severity="warning" className="text-[10px] px-1.5 py-0 font-semibold" />
                                        )}
                                    </div>
                                )}
                            />
                            <Column
                                field="total_jadwal"
                                header="Jumlah Jadwal Aktif"
                                align="center"
                                sortable
                                style={{ minWidth: '10rem' }}
                                body={(r: RuanganItem) => {
                                    const count = parseInt(String(r.total_jadwal || 0), 10);
                                    return <span className="font-semibold text-900">{count} Jadwal</span>;
                                }}
                            />
                            <Column
                                field="total_hari_pj"
                                header="Status Penanggung Jawab"
                                align="center"
                                sortable
                                style={{ minWidth: '14rem' }}
                                body={(r: RuanganItem) => {
                                    const totalJadwal = parseInt(String(r.total_jadwal || 0), 10);
                                    const totalHari = parseInt(String(r.total_hari || 0), 10);
                                    const totalHariPj = parseInt(String(r.total_hari_pj || 0), 10);

                                    if (totalJadwal === 0 || totalHari === 0) {
                                        return (
                                            <Tag
                                                value="Belum ada jadwal"
                                                severity="secondary"
                                                className="text-xs px-2.5 py-1 font-medium bg-slate-100 text-slate-500"
                                            />
                                        );
                                    }

                                    const isComplete = totalHariPj >= totalHari;
                                    const isPartial = totalHariPj > 0 && totalHariPj < totalHari;

                                    let severity: 'success' | 'warning' | 'secondary' = 'secondary';
                                    let icon: string | undefined = undefined;

                                    if (isComplete) {
                                        severity = 'success';
                                        icon = 'pi pi-check-circle';
                                    } else if (isPartial) {
                                        severity = 'warning';
                                        icon = 'pi pi-exclamation-circle';
                                    } else {
                                        severity = 'secondary';
                                        icon = 'pi pi-info-circle';
                                    }

                                    return (
                                        <Tag
                                            value={`${totalHariPj} dari ${totalHari} hari ada PJ`}
                                            severity={severity}
                                            icon={icon}
                                            className="text-xs px-2.5 py-1 font-semibold"
                                        />
                                    );
                                }}
                            />
                            <Column
                                header="Aksi"
                                align="center"
                                style={{ minWidth: '7rem' }}
                                body={(r: RuanganItem) => (
                                    <div className="flex align-items-center justify-content-center gap-1">
                                        <Button
                                            label="Kelola"
                                            icon="pi pi-arrow-right"
                                            iconPos="right"
                                            size="small"
                                            severity="success"
                                            className="border-round-md font-bold text-xs px-2 py-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectRuangan(r.kode_ruangan);
                                            }}
                                            tooltip="Kelola Jadwal Ruangan"
                                            tooltipOptions={{ position: 'top' }}
                                        />
                                    </div>
                                )}
                            />
                        </DataTable>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* TAHAP 2: DETAIL JADWAL RUANGAN TERPILIH                      */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {selectedRuangan && (
                    <div>
                        {/* Header Tahap 2: Judul Ruangan di Kiri & Tombol Kembali di Pojok Kanan Atas */}
                        <div className="flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                                    <i className="pi pi-building text-purple-600 text-2xl" />
                                    Jadwal: {activeRoomObj ? activeRoomObj.nama_ruangan : selectedRuangan}
                                </h3>
                                <p className="text-500 text-sm m-0">
                                    Kelola jadwal shift kerja dokter &amp; terapis untuk ruangan {activeRoomObj?.nama_ruangan || selectedRuangan} ({selectedRuangan}).
                                </p>
                            </div>
                            <Button
                                size="small"
                                label="Daftar Ruangan"
                                icon="pi pi-arrow-left"
                                outlined
                                severity="secondary"
                                className="border-round-md font-medium px-3 ml-auto"
                                onClick={handleBackToRooms}
                            />
                        </div>

                        {/* Baris Tombol Aksi Tahap 2 */}
                        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                            <Button
                                size="small"
                                label="Tambah Jadwal"
                                icon="pi pi-plus"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                onClick={handleOpenCreate}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label="Cetak"
                                icon="pi pi-print"
                                outlined
                                className="border-round-md font-medium px-3 border-purple-600 text-purple-600"
                                onClick={() => window.print()}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label={`Hapus${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                disabled={selectedRows.length === 0}
                                className="border-round-md font-medium px-3"
                                onClick={() => {
                                    if (selectedRows.length < 1) return;
                                    const codes = selectedRows.flatMap((r: any) => r.all_codes || (r.pj_item ? [r.pj_item.kode_jadwal] : []));
                                    if (codes.length > 0) {
                                        handleDelete(codes);
                                    }
                                }}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                            <Button
                                size="small"
                                label="Refresh"
                                icon="pi pi-refresh"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                loading={loading}
                                onClick={loadData}
                            />
                        </div>

                        <style dangerouslySetInnerHTML={{
                            __html: `
                                .table-jadwal-custom tr.day-row-session > td {
                                    border-bottom: 1px solid #f1f5f9 !important;
                                }
                                .table-jadwal-custom tr.day-row-last > td {
                                    border-bottom: 2px solid #cbd5e1 !important;
                                }
                                .table-jadwal-custom td.col-hari-seamless {
                                    border-bottom: none !important;
                                    vertical-align: middle !important;
                                }
                                .table-jadwal-custom td.col-hari-inner {
                                    border-top: none !important;
                                    border-bottom: none !important;
                                    vertical-align: middle !important;
                                }
                                .table-jadwal-custom td.col-hari-last {
                                    border-top: none !important;
                                    border-bottom: 2px solid #cbd5e1 !important;
                                    vertical-align: middle !important;
                                }
                                .btn-action-outline {
                                    width: 2.1rem !important;
                                    height: 2.1rem !important;
                                    padding: 0 !important;
                                    border-radius: 6px !important;
                                    background: transparent !important;
                                    display: inline-flex !important;
                                    align-items: center !important;
                                    justify-content: center !important;
                                    transition: all 0.15s ease-in-out !important;
                                }
                                .btn-action-purple.p-button.p-button-outlined {
                                    color: #9333ea !important;
                                    border: 1.5px solid #9333ea !important;
                                }
                                .btn-action-purple.p-button.p-button-outlined:hover {
                                    background: #faf5ff !important;
                                    color: #7e22ce !important;
                                    border-color: #7e22ce !important;
                                }
                                .btn-action-teal.p-button.p-button-outlined {
                                    color: #0d9488 !important;
                                    border: 1.5px solid #0d9488 !important;
                                }
                                .btn-action-teal.p-button.p-button-outlined:hover {
                                    background: #f0fdfa !important;
                                    color: #0f766e !important;
                                    border-color: #0f766e !important;
                                }
                                .btn-action-green.p-button.p-button-outlined {
                                    color: #16a34a !important;
                                    border: 1.5px solid #16a34a !important;
                                }
                                .btn-action-green.p-button.p-button-outlined:hover {
                                    background: #f0fdf4 !important;
                                    color: #15803d !important;
                                    border-color: #15803d !important;
                                }
                                .btn-action-green.p-button.p-button-outlined:disabled,
                                .btn-action-green.p-button.p-button-outlined.p-disabled {
                                    color: #94a3b8 !important;
                                    border-color: #cbd5e1 !important;
                                    background: transparent !important;
                                    opacity: 0.45 !important;
                                    cursor: not-allowed !important;
                                }
                                .btn-action-red.p-button.p-button-outlined {
                                    color: #dc2626 !important;
                                    border: 1.5px solid #dc2626 !important;
                                }
                                .btn-action-red.p-button.p-button-outlined:hover {
                                    background: #fef2f2 !important;
                                    color: #b91c1c !important;
                                    border-color: #b91c1c !important;
                                }
                                .btn-action-red.p-button.p-button-outlined:disabled,
                                .btn-action-red.p-button.p-button-outlined.p-disabled {
                                    color: #94a3b8 !important;
                                    border-color: #cbd5e1 !important;
                                    background: transparent !important;
                                    opacity: 0.45 !important;
                                    cursor: not-allowed !important;
                                }
                            `
                        }} />

                        {/* DataTable: Pola Expand/Collapse per Baris Slot (Mengikuti Format Paket Layanan) */}
                        <DataTable
                            value={slotRows}
                            loading={loading}
                            paginator
                            rows={rows}
                            rowsPerPageOptions={[10, 25, 50]}
                            sortField={sortField}
                            sortOrder={sortOrder as any}
                            onSort={(e) => {
                                setSortField(e.sortField || 'hari');
                                setSortOrder(e.sortOrder || 1);
                            }}
                            rowClassName={(r: SlotRow) => {
                                if (!isGroupedByDay) return '';
                                return r.is_last_session_of_day ? 'day-row-last' : 'day-row-session';
                            }}
                            selection={selectedRows}
                            onSelectionChange={(e) => setSelectedRows((e.value as any[]).filter((r: any) => !r.is_empty))}
                            isDataSelectable={(e) => !e.data.is_empty}
                            expandedRows={expandedRows}
                            onRowToggle={(e) => setExpandedRows(e.data)}
                            rowExpansionTemplate={(slotData: SlotRow) => {
                                const pendampingList = slotData.pendamping || [];
                                const namaHari = HARI_CONFIG[slotData.hari]?.label || slotData.hari;

                                return (
                                    <div className="p-4 surface-50 border-round-xl border-1 surface-border my-3 shadow-xs">
                                        {/* Header Section Petugas Pendamping */}
                                        <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                                            {/* Baris 1: Judul Section + Badge Jumlah Petugas */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '6px',
                                                    backgroundColor: '#f3e8ff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <i className="pi pi-users" style={{ color: '#7e22ce', fontSize: '13px' }} />
                                                </div>
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: '700',
                                                    color: '#0f172a',
                                                    lineHeight: '1.4'
                                                }}>
                                                    Petugas Pendamping: <span style={{ color: '#1e293b' }}>{namaHari} ({slotData.jam_operasional})</span>
                                                </div>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#475569',
                                                    backgroundColor: '#f1f5f9',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '6px',
                                                    padding: '2px 8px',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {pendampingList.length} Petugas
                                                </span>
                                            </div>

                                            {/* Baris 2: Keterangan Kuota Slot */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginTop: '8px',
                                                marginLeft: '4px',
                                                fontSize: '12px',
                                                color: '#64748b',
                                                lineHeight: '1.5'
                                            }}>
                                                <i className="pi pi-info-circle" style={{ color: '#0284c7', fontSize: '13px', flexShrink: 0 }} />
                                                <span>
                                                    Kuota slot ini:{' '}
                                                    <strong style={{ color: '#0f172a', fontWeight: '700' }}>{slotData.kuota} Pasien</strong>
                                                    {slotData.pj_item ? (
                                                        <span style={{ color: '#64748b' }}> — mengikuti kuota Penanggung Jawab ({slotData.pj_item.nama_karyawan})</span>
                                                    ) : (
                                                        <span style={{ color: '#b45309', fontWeight: '600' }}> — belum ada Penanggung Jawab yang ditetapkan</span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-1 surface-border border-round overflow-hidden surface-card shadow-xs">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="surface-200 text-800 text-xs">
                                                        <th className="p-2 border-bottom-1 surface-border text-center" style={{ width: '3rem' }}>No</th>
                                                        <th className="p-2 border-bottom-1 surface-border">Nama Karyawan</th>
                                                        <th className="p-2 border-bottom-1 surface-border">Jabatan</th>
                                                        <th className="p-2 border-bottom-1 surface-border">No. SIP</th>
                                                        <th className="p-2 border-bottom-1 surface-border">Jam Operasional</th>
                                                        <th className="p-2 border-bottom-1 surface-border text-center">Status</th>
                                                        <th className="p-2 border-bottom-1 surface-border text-center" style={{ width: '7rem' }}>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pendampingList.map((item: any, idx: number) => {
                                                        const jamM = (item.jam_mulai || '').slice(0, 5);
                                                        const jamS = (item.jam_selesai || '').slice(0, 5);

                                                        return (
                                                            <tr key={item.kode_jadwal || idx} className="border-bottom-1 surface-border text-sm hover:surface-100 transition-colors">
                                                                <td className="p-2 text-500 text-center">{idx + 1}</td>
                                                                <td className="p-2 font-bold text-slate-900">
                                                                    {item.nama_karyawan || '-'}
                                                                </td>
                                                                <td className="p-2 text-slate-600 capitalize text-xs">
                                                                    {item.jabatan || 'Petugas'}
                                                                </td>
                                                                <td className="p-2 text-slate-500 text-xs">
                                                                    {item.no_sip || '-'}
                                                                </td>
                                                                <td className="p-2 text-slate-700 text-xs font-medium">
                                                                    <span className="inline-flex align-items-center">
                                                                        <i className="pi pi-clock text-[11px] text-slate-400 mr-2" />
                                                                        {jamM} - {jamS}
                                                                    </span>
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <Tag
                                                                        value={item.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                                                                        severity={item.status === 'aktif' ? 'success' : 'danger'}
                                                                        className="text-[10px] px-2 py-0.5"
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <div className="flex align-items-center justify-content-center gap-1">
                                                                        <Button
                                                                            icon="pi pi-pencil"
                                                                            text
                                                                            rounded
                                                                            size="small"
                                                                            className="w-1.75rem h-1.75rem text-slate-500 hover:text-primary p-0"
                                                                            onClick={() => handleOpenEdit(item)}
                                                                            tooltip="Edit Jadwal"
                                                                            tooltipOptions={{ position: 'top' }}
                                                                        />
                                                                        <Button
                                                                            icon="pi pi-trash"
                                                                            text
                                                                            rounded
                                                                            size="small"
                                                                            severity="danger"
                                                                            className="w-1.75rem h-1.75rem text-slate-400 hover:text-red-600 p-0"
                                                                            onClick={() => handleDelete([item.kode_jadwal])}
                                                                            tooltip="Hapus Jadwal"
                                                                            tooltipOptions={{ position: 'top' }}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {pendampingList.length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className="py-5 px-3 text-center surface-card">
                                                                <div className="flex flex-column align-items-center justify-content-center gap-2">
                                                                    <i className="pi pi-users text-400 text-3xl" />
                                                                    <div className="font-bold text-slate-700 text-sm">
                                                                        Belum ada pendamping untuk sesi ini
                                                                    </div>
                                                                    <p className="text-xs text-500 m-0 max-w-28rem line-height-3">
                                                                        Sesi {namaHari} ({slotData.jam_operasional}) saat ini belum memiliki dokter atau terapis pendamping. Klik icon <strong>&quot;Tambah Pendamping&quot;</strong> pada baris jadwal ini untuk menambahkan.
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            }}
                            dataKey="rowKey"
                            className="p-datatable-sm table-jadwal-custom"
                            emptyMessage={`Belum ada jadwal dokter/terapis untuk ruangan ${activeRoomObj?.nama_ruangan || selectedRuangan}. Silakan klik tombol "+ Tambah Jadwal".`}
                            responsiveLayout="scroll"
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                            currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                            header={
                                <div className="flex flex-column gap-3">
                                    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                        <div className="flex align-items-center gap-2">
                                            <span className="text-xl font-bold">Data Jadwal</span>
                                            <span className="text-xs text-500 font-semibold bg-slate-100 px-2 py-0.5 border-round">
                                                Total: {totalRecords} Jadwal
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                            <Dropdown
                                                value={filterHari}
                                                options={[{ label: 'Semua Hari', value: '' }, ...HARI_OPTIONS]}
                                                onChange={(e) => setFilterHari(e.value)}
                                                placeholder="Filter Hari"
                                                className="w-full sm:w-12rem p-inputtext-sm text-sm border-round-md"
                                            />
                                            <IconField iconPosition="left" className="w-full sm:w-16rem">
                                                <InputIcon className="pi pi-search" />
                                                <InputText
                                                    value={keyword}
                                                    onChange={(e) => setKeyword(e.target.value)}
                                                    placeholder="Cari Data..."
                                                    className="w-full text-sm"
                                                />
                                            </IconField>
                                            <Button
                                                type="button"
                                                icon="pi pi-filter-slash"
                                                outlined
                                                severity="danger"
                                                tooltip="Reset Filter"
                                                tooltipOptions={{ position: 'bottom' }}
                                                onClick={() => {
                                                    setKeyword('');
                                                    setFilterHari('');
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                        <span className="flex align-items-center gap-1">
                                            <i className="pi pi-info-circle text-slate-500" />
                                            <span className="font-semibold text-slate-700">KETERANGAN STATUS:</span>
                                        </span>
                                        <span className="flex align-items-center gap-1">
                                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#22c55e', boxShadow: '0 1px 3px #22c55e55' }} />
                                            Aktif
                                        </span>
                                        <span className="flex align-items-center gap-1">
                                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444', boxShadow: '0 1px 3px #ef444455' }} />
                                            Tidak Aktif
                                        </span>
                                    </div>
                                </div>
                            }
                        >
                            <Column expander={(r: SlotRow) => !r.is_empty} style={{ width: '3.5rem' }} />
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                            <Column
                                header=""
                                headerStyle={{ width: '3rem' }}
                                align="center"
                                body={(r: SlotRow) => {
                                    if (r.is_empty) return null;
                                    return (
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '3px',
                                                backgroundColor: r.status === 'aktif' ? '#22c55e' : '#ef4444',
                                                boxShadow: r.status === 'aktif' ? '0 1px 3px #22c55e55' : '0 1px 3px #ef444455',
                                            }}
                                            title={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                                        />
                                    );
                                }}
                            />
                            <Column
                                field="hari"
                                header="Hari"
                                sortable
                                align="center"
                                headerStyle={{ fontWeight: 'bold', minWidth: '9.5rem' }}
                                style={{ minWidth: '9.5rem' }}
                                bodyClassName={(r: SlotRow) => {
                                    if (!isGroupedByDay) return '';
                                    if (r.is_empty) return 'col-hari';
                                    if (r.is_first_session_of_day) return 'col-hari col-hari-seamless';
                                    if (r.is_last_session_of_day) return 'col-hari col-hari-last';
                                    return 'col-hari col-hari-inner';
                                }}
                                body={(r: SlotRow) => {
                                    if (isGroupedByDay && !r.is_first_session_of_day) {
                                        return null;
                                    }
                                    const hKey = (r.hari || '').toLowerCase();
                                    const conf = HARI_CONFIG[hKey] || { label: r.hari, bg: '#f1f5f9', color: '#334155' };
                                    const total = r.day_session_total || 1;
                                    return (
                                        <div className="flex flex-column align-items-center justify-content-center py-2">
                                            <span
                                                className="font-extrabold uppercase px-2.5 py-1 border-round-md text-xs tracking-wider shadow-xs"
                                                style={{ backgroundColor: conf.bg, color: conf.color }}
                                            >
                                                {conf.label}
                                            </span>
                                            {isGroupedByDay && total > 1 && (
                                                <span className="text-[10px] text-slate-400 font-medium mt-1.5 tracking-wide block">
                                                    {total} Sesi
                                                </span>
                                            )}
                                        </div>
                                    );
                                }}
                            />
                            <Column
                                field="nama_pj"
                                header="Penanggung Jawab"
                                sortable
                                headerStyle={{ fontWeight: 'bold', minWidth: '15rem' }}
                                style={{ minWidth: '15rem' }}
                                body={(r: SlotRow) => {
                                    if (r.is_empty) {
                                        return <span className="text-400 italic text-sm">Belum ada jadwal</span>;
                                    }
                                    if (!r.pj_item) {
                                        return (
                                            <div className="py-1 pr-3">
                                                <span
                                                    className="text-amber-800 bg-amber-50 border-1 border-amber-300 px-2.5 py-1.5 border-round-md text-xs font-semibold inline-flex align-items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer hover:bg-amber-100 transition-colors"
                                                    onClick={() => handleOpenCreateForSlot(r.hari, r.jam_mulai, r.jam_selesai, true, r.kuota || 10)}
                                                    title="Klik untuk tetapkan Penanggung Jawab sesi ini"
                                                >
                                                    <i className="pi pi-exclamation-circle text-amber-600 text-xs" />
                                                    Belum ada PJ
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="py-1 pr-3">
                                            <div className="font-bold text-slate-900">
                                                {r.pj_item.nama_karyawan}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                {r.pj_item.jabatan || 'Petugas'} {r.pj_item.no_sip ? `• SIP: ${r.pj_item.no_sip}` : ''}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Column
                                field="jam_operasional"
                                header="Jam Operasional"
                                sortable
                                headerStyle={{ fontWeight: 'bold', minWidth: '11rem' }}
                                style={{ minWidth: '11rem' }}
                                body={(r: SlotRow) => {
                                    if (r.is_empty) return <span className="text-400">-</span>;
                                    return (
                                        <span className="font-semibold text-slate-700 flex align-items-center">
                                            <i className="pi pi-clock text-xs text-slate-400 mr-2" />
                                            {r.jam_operasional}
                                        </span>
                                    );
                                }}
                            />
                            <Column
                                field="kuota"
                                header="Kuota Pasien"
                                sortable
                                headerStyle={{ fontWeight: 'bold' }}
                                body={(r: SlotRow) => {
                                    if (r.is_empty) return <span className="text-400">-</span>;
                                    return <span className="font-semibold">{r.kuota} Pasien</span>;
                                }}
                            />
                            <Column
                                header="Petugas Pendamping"
                                body={(r: SlotRow) => {
                                    if (r.is_empty) {
                                        return <span className="text-400 text-xs italic">-</span>;
                                    }
                                    const isExpanded = expandedRows && (Array.isArray(expandedRows) ? expandedRows.some((x: any) => x.rowKey === r.rowKey) : expandedRows[r.rowKey]);
                                    const pCount = (r.pendamping || []).length;
                                    return (
                                        <Button
                                            label={pCount > 0 ? `Lihat Pendamping (${pCount})` : '0 Pendamping'}
                                            icon={isExpanded ? "pi pi-chevron-up" : "pi pi-chevron-down"}
                                            text
                                            size="small"
                                            className={`p-button-sm font-semibold p-1 text-xs ${pCount > 0 ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
                                            onClick={() => toggleRowExpansion(r)}
                                            tooltip={pCount > 0 ? 'Klik untuk buka/tutup daftar petugas pendamping' : 'Klik untuk buka detail sesi pendamping'}
                                            tooltipOptions={{ position: 'top' }}
                                        />
                                    );
                                }}
                            />
                            <Column
                                header="Aksi"
                                align="center"
                                headerStyle={{ width: '11.5rem', textAlign: 'center' }}
                                style={{ minWidth: '11.5rem' }}
                                body={(r: SlotRow) => {
                                    if (r.is_empty) {
                                        return (
                                            <Button
                                                icon="pi pi-plus"
                                                label="Tambah"
                                                size="small"
                                                outlined
                                                severity="success"
                                                className="border-round-md font-semibold text-xs px-3 py-1.5 shadow-xs whitespace-nowrap"
                                                onClick={() => handleOpenCreateForSlot(r.hari, '08:00', '16:00', true, 10)}
                                                tooltip={`Tambah Jadwal untuk Hari ${HARI_CONFIG[r.hari]?.label || r.hari}`}
                                                tooltipOptions={{ position: 'top' }}
                                            />
                                        );
                                    }
                                    return (
                                        <div className="flex align-items-center justify-content-center gap-2">
                                            <Button
                                                icon="pi pi-calendar-plus"
                                                outlined
                                                className="p-button-sm border-round-md btn-action-outline btn-action-purple"
                                                onClick={() => handleOpenCreateForDay(r.hari)}
                                                tooltip={`Tambah Sesi Baru (${r.hari})`}
                                                tooltipOptions={{ position: 'top' }}
                                            />
                                            <Button
                                                icon="pi pi-user-plus"
                                                outlined
                                                className="p-button-sm border-round-md btn-action-outline btn-action-teal"
                                                onClick={() => handleOpenCreateForSlot(r.hari, r.jam_mulai, r.jam_selesai, false, r.kuota)}
                                                tooltip="Tambah Pendamping"
                                                tooltipOptions={{ position: 'top' }}
                                            />
                                            <Button
                                                icon="pi pi-pencil"
                                                outlined
                                                className="p-button-sm border-round-md btn-action-outline btn-action-green"
                                                disabled={!r.pj_item}
                                                onClick={() => r.pj_item && handleOpenEdit(r.pj_item)}
                                                tooltip="Edit Jadwal"
                                                tooltipOptions={{ position: 'top' }}
                                            />
                                            <Button
                                                icon="pi pi-trash"
                                                outlined
                                                className="p-button-sm border-round-md btn-action-outline btn-action-red"
                                                disabled={!r.pj_item}
                                                onClick={() => r.pj_item && handleDelete([r.pj_item.kode_jadwal])}
                                                tooltip="Hapus Jadwal"
                                                tooltipOptions={{ position: 'top' }}
                                            />
                                        </div>
                                    );
                                }}
                            />
                        </DataTable>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* DIALOG CREATE / EDIT JADWAL                                  */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Dialog
                header={isEdit ? 'Edit Jadwal Karyawan' : 'Tambah Jadwal Karyawan'}
                visible={dialogVisible}
                style={{ width: '520px' }}
                modal
                onHide={() => setDialogVisible(false)}
            >
                <div className="p-fluid flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Jadwal</label>
                            <InputText value={formData.kode_jadwal} disabled className="w-full text-sm border-round-md" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            Pilih Ruangan <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.kode_ruangan}
                            options={ruanganOptions}
                            onChange={(e) => setFormData({ ...formData, kode_ruangan: e.value })}
                            placeholder="Pilih Ruangan..."
                            disabled={Boolean(selectedRuangan)}
                            className="w-full text-sm border-round-md"
                        />
                        {selectedRuangan && (
                            <small className="text-500 text-xs mt-1 block">
                                Otomatis terkunci pada ruangan yang sedang dibuka: <strong>{activeRoomObj?.nama_ruangan || selectedRuangan}</strong>
                            </small>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            Dokter / Karyawan <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.no_sip}
                            options={karyawanOptions}
                            onChange={(e) => setFormData({ ...formData, no_sip: e.value })}
                            placeholder="Pilih Dokter / Karyawan..."
                            filter
                            filterBy="label"
                            className="w-full text-sm border-round-md"
                        />
                        {submitted && !formData.no_sip && (
                            <small className="text-red-500 font-semibold">Dokter/Karyawan wajib dipilih</small>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            Hari Operasional <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.hari}
                            options={HARI_OPTIONS}
                            onChange={(e) => setFormData({ ...formData, hari: e.value })}
                            placeholder="Pilih Hari..."
                            className="w-full text-sm border-round-md"
                        />
                    </div>

                    <div className="grid formgrid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">
                                Jam Mulai <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                value={formData.jam_mulai}
                                onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                                placeholder="08:00"
                                className="w-full text-sm border-round-md"
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">
                                Jam Selesai <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                value={formData.jam_selesai}
                                onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                                placeholder="16:00"
                                className="w-full text-sm border-round-md"
                            />
                        </div>
                    </div>

                    <div className="flex align-items-center justify-content-between surface-100 p-3 border-round-lg">
                        <div className="pr-3">
                            <span className="font-bold text-sm text-900 block flex align-items-center gap-1.5">
                                <i className="pi pi-star-fill text-amber-500 text-xs" />
                                Jadikan Penanggung Jawab Ruangan Ini
                            </span>
                            <span className="text-xs text-500 line-height-2">
                                {formData.is_penanggung_jawab
                                    ? 'Petugas ini adalah Penanggung Jawab utama slot ruangan & hari ini. Kuota pasien slot ditentukan oleh petugas ini.'
                                    : 'Petugas ini adalah Petugas Pendamping. Kuota pasien slot otomatis mengikuti kuota Penanggung Jawab.'}
                            </span>
                        </div>
                        <InputSwitch
                            checked={Boolean(formData.is_penanggung_jawab)}
                            onChange={(e) => setFormData({ ...formData, is_penanggung_jawab: e.value })}
                        />
                    </div>

                    {formData.is_penanggung_jawab ? (
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Kuota Maksimal Pasien (Slot Ini) <span className="text-red-500">*</span>
                            </label>
                            <InputNumber
                                value={formData.kuota}
                                onValueChange={(e) => setFormData({ ...formData, kuota: e.value || 0 })}
                                min={0}
                                showButtons
                                className="w-full text-sm border-round-md"
                            />
                            <small className="text-500 text-xs mt-1 block">
                                Kuota ini berlaku untuk seluruh slot kerja ruangan &amp; hari ini (dipegang oleh Penanggung Jawab).
                            </small>
                        </div>
                    ) : (
                        <div className="surface-50 border-1 border-200 p-2.5 border-round-md text-xs text-600 flex align-items-center gap-2">
                            <i className="pi pi-info-circle text-primary text-sm" />
                            <span>
                                <strong>Petugas Pendamping:</strong> Kuota pasien tidak diatur per individu pendamping, melainkan otomatis mengikuti kuota Penanggung Jawab pada slot ini ({formData.kuota || 0} Pasien).
                            </span>
                        </div>
                    )}

                    <Divider className="my-1" />

                    <div className="flex align-items-center justify-content-between surface-100 p-3 border-round-lg">
                        <div>
                            <span className="font-bold text-sm text-900 block">Status Jadwal</span>
                            <span className="text-xs text-500">
                                {formData.status === 'aktif'
                                    ? 'Jadwal aktif dan dapat digunakan dalam pendaftaran antrean & booking.'
                                    : 'Jadwal dinonaktifkan.'}
                            </span>
                        </div>
                        <InputSwitch
                            checked={formData.status === 'aktif'}
                            onChange={(e) => setFormData({ ...formData, status: e.value ? 'aktif' : 'nonaktif' })}
                        />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
                    <Button label="Batal" outlined severity="secondary" onClick={() => setDialogVisible(false)} size="small" />
                    <Button
                        label="Simpan"
                        icon="pi pi-check"
                        severity="success"
                        loading={saving}
                        onClick={handleSave}
                        size="small"
                        className="font-semibold"
                    />
                </div>
            </Dialog>
        </div>
    );
};

const Page = () => {
    return (
        <Suspense fallback={<div className="p-4 text-center text-500">Memuat halaman...</div>}>
            <JadwalKaryawanContent />
        </Suspense>
    );
};

export default Page;
