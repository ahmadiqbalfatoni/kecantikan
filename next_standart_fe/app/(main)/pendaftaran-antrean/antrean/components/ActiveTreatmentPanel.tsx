'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { Dialog } from 'primereact/dialog';
import { OverlayPanel } from 'primereact/overlaypanel';
import { AntrianLayananData, RuanganFormField } from './interfaces';
import { FormRuanganFotoUploader } from './FormRuanganFotoUploader';
import { RekomendasiTreatmentPanel, RekomendasiItem } from './RekomendasiTreatmentPanel';
import { DialogHasilTerbitAntrian } from './DialogHasilTerbitAntrian';
import { HasilTreatmentPanel } from './HasilTreatmentPanel';
import { DrawerRiwayatPasien } from './DrawerRiwayatPasien';
import {
    Briefcase,
    Building2,
    User,
    Users,
    ChevronDown,
    History,
    Volume2,
    Ban,
    CheckCircle2,
    Sparkles,
    Stethoscope,
    Clock,
    ShoppingBag,
    MapPin,
    Info,
} from 'lucide-react';

interface ActiveTreatmentPanelProps {
    activePatient: AntrianLayananData | null;
    nextWaitingPatient: AntrianLayananData | null;
    kodeRuangan: string;
    namaRuangan: string;
    isKonsultasi?: boolean;
    toast: React.RefObject<Toast>;
    getGridData: () => void;
    handleAksi: (item: AntrianLayananData, customAksi?: string, skipFormValidation?: boolean) => void;
    playChime: () => void;
    speakNomorLayanan: (noAntrian: string, namaPasien?: string, namaRuangan?: string) => void;
    onManageFormClick?: () => void;
    petugasJagaList?: any[];
}

export const ActiveTreatmentPanel: React.FC<ActiveTreatmentPanelProps> = ({
    activePatient,
    nextWaitingPatient,
    kodeRuangan,
    namaRuangan,
    isKonsultasi = false,
    toast,
    getGridData,
    handleAksi,
    playChime,
    speakNomorLayanan,
    petugasJagaList,
}) => {
    const [fields, setFields] = useState<RuanganFormField[]>([]);
    const [loadingFields, setLoadingFields] = useState<boolean>(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [catatanPetugas, setCatatanPetugas] = useState<string>('');
    const [rekomendasiItems, setRekomendasiItems] = useState<RekomendasiItem[]>([]);
    const [saving, setSaving] = useState<boolean>(false);
    const [drawerRiwayatVisible, setDrawerRiwayatVisible] = useState<boolean>(false);

    // Rekam Medis (trx_rekam_medis) Header Data State
    const [headerRMData, setHeaderRMData] = useState({
        foto_before: '',
        keluhan: '',
        durasi_keluhan: '',
        riwayat_alergi: '',
        riwayat_treatment: '',
        pemeriksaan_acne: 'Tidak Ada',
        pemeriksaan_inflammation: 'Tidak Ada',
        pemeriksaan_skin_type: 'Normal',
        pemeriksaan_pigmentation: 'Tidak Ada',
        pemeriksaan_sensitivity: 'Rendah',
        diagnosis: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    });
    const [lanjutKeTindakan, setLanjutKeTindakan] = useState<boolean>(true);
    const [uploadingBefore, setUploadingBefore] = useState<boolean>(false);
    const pendingBeforePhotoRef = useRef<{ base64: string; fileName: string } | null>(null);
    const [resepProdukDokter, setResepProdukDokter] = useState<any[]>([]);
    const [loadingResepProduk, setLoadingResepProduk] = useState<boolean>(false);

    const [selectedPetugas, setSelectedPetugas] = useState<string>('');

    // Dropdown / Popover Petugas Pendamping
    const helperOpRef = useRef<OverlayPanel>(null);
    const [activeHelperData, setActiveHelperData] = useState<{
        pj: string;
        jam: string;
        ruangan: string;
        helpers: any[];
    } | null>(null);

    const getCompanionSummary = (companions: any[], total: number) => {
        const count = total || (companions ? companions.length : 0);
        if (count <= 0) return '';
        const getName = (c: any) => c?.nama_karyawan || c?.nama || c?.nama_petugas || '';
        if (count === 1) return getName(companions[0]) || '1 petugas';
        if (count === 2) return `${getName(companions[0])}, ${getName(companions[1])}`;
        return `${getName(companions[0])}, ${getName(companions[1])}, +${count - 2} lainnya`;
    };

    const [selectedTerapisList, setSelectedTerapisList] = useState<Array<{
        no_sip: string;
        nama: string;
        jabatan?: string;
        role?: string;
        jam_mulai?: string;
        jam_selesai?: string;
        shift?: string;
        kode_jadwal?: string;
    }>>([]);

    const isBookingPatient = useMemo(() => Boolean(activePatient?.kode_booking), [activePatient?.kode_booking]);

    const bookingNoSip = useMemo(() => (activePatient as any)?.booking_no_sip || (isBookingPatient ? activePatient?.kode_karyawan : null), [activePatient?.kode_karyawan, (activePatient as any)?.booking_no_sip, isBookingPatient]);
    const bookingNamaPetugas = useMemo(() => (activePatient as any)?.booking_nama_petugas || (isBookingPatient ? activePatient?.nama_petugas : null), [activePatient?.nama_petugas, (activePatient as any)?.booking_nama_petugas, isBookingPatient]);
    const bookingKodeJadwal = (activePatient as any)?.booking_kode_jadwal;
    const bookingJabatanPetugas = (activePatient as any)?.booking_jabatan_petugas;

    // Helper untuk mengekstrak no_sip murni dari value option (bisa berupa no_sip atau no_sip#kode_jadwal)
    const extractNoSip = (val?: string) => (val ? String(val).split('#')[0] : '');
    const isDoctorChangedFromBooking = false;

    // Jadwal Karyawan Ruangan State
    const [activeRoomSchedules, setActiveRoomSchedules] = useState<any[]>([]);

    useEffect(() => {
        if (petugasJagaList && petugasJagaList.length > 0) {
            setActiveRoomSchedules(petugasJagaList);
        } else if (kodeRuangan) {
            const fetchJadwal = async () => {
                try {
                    const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
                    let dayName = (activePatient as any)?.booking_hari || '';
                    if (!dayName && (activePatient as any)?.booking_tanggal_booking) {
                        dayName = days[new Date((activePatient as any).booking_tanggal_booking).getDay()];
                    }
                    if (!dayName) {
                        dayName = days[new Date().getDay()];
                    }
                    const res = await postData('/master/jadwal-karyawan-data', {
                        kode_ruangan: kodeRuangan,
                        hari: dayName.toLowerCase(),
                        status: 'aktif',
                    });
                    const list: any[] = res.data?.data || [];
                    setActiveRoomSchedules(list);
                } catch (_) {
                    setActiveRoomSchedules([]);
                }
            };
            fetchJadwal();
        } else {
            setActiveRoomSchedules([]);
        }
    }, [petugasJagaList, kodeRuangan, activePatient?.kode_antrian_layanan]);

    // Resolusi Otomatis Dokter PJ & Petugas Pendamping dari Jadwal Karyawan
    const { scheduledPj, scheduledHelpers } = useMemo(() => {
        const schedules = activeRoomSchedules && activeRoomSchedules.length > 0 ? activeRoomSchedules : (petugasJagaList || []);
        if (!schedules || schedules.length === 0) {
            return { scheduledPj: null, scheduledHelpers: [] };
        }

        // Cari jadwal berdasarkan rentang jam operasional
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const matchingShiftSchedules = schedules.filter((item: any) => {
            if (!item.jam_mulai || !item.jam_selesai) return true;
            const [sH, sM] = item.jam_mulai.split(':').map(Number);
            const [eH, eM] = item.jam_selesai.split(':').map(Number);
            const startMins = sH * 60 + (sM || 0);
            let endMins = eH * 60 + (eM || 0);
            if (endMins <= startMins) endMins += 24 * 60;
            return currentMins >= startMins && currentMins <= endMins;
        });

        // Jika ada jadwal yang pas dengan jam sekarang, gunakan itu; jika tidak, gunakan seluruh jadwal aktif hari ini untuk ruangan tersebut
        const activeShiftList = matchingShiftSchedules.length > 0 ? matchingShiftSchedules : schedules;

        // 1. DOKTER / PJ RUANGAN:
        // Prioritas 1: is_penanggung_jawab === 1 (atau true)
        // Prioritas 2 (fallback jika tidak ada flag PJ): role dokter pertama
        let pj = activeShiftList.find((item: any) => item.is_penanggung_jawab === 1 || item.is_penanggung_jawab === true) || null;
        if (!pj) {
            pj = activeShiftList.find((item: any) => String(item.jabatan || '').toLowerCase().includes('dokter')) || null;
        }

        // 2. PETUGAS PENDAMPING / HELPER:
        // Semua petugas di jadwal ruangan yang BUKAN PJ
        const pjSip = pj?.no_sip || pj?.kode_jadwal;
        const seen = new Set<string>();
        if (pjSip) seen.add(pjSip);

        const helpers: any[] = [];
        for (const item of activeShiftList) {
            const sip = item.no_sip || item.kode_jadwal;
            if (sip && !seen.has(sip)) {
                seen.add(sip);
                helpers.push(item);
            }
        }

        return { scheduledPj: pj, scheduledHelpers: helpers };
    }, [activeRoomSchedules, petugasJagaList]);

    const currentSelectedOfficer = useMemo(() => {
        if (scheduledPj) {
            return {
                nama: scheduledPj.nama_karyawan || scheduledPj.nama,
                no_sip: scheduledPj.no_sip,
                value: scheduledPj.no_sip,
                jabatan: scheduledPj.jabatan || 'Dokter',
                is_penanggung_jawab: true,
                jam_mulai: scheduledPj.jam_mulai,
                jam_selesai: scheduledPj.jam_selesai,
            };
        }
        if (activePatient?.kode_karyawan || activePatient?.nama_petugas) {
            return {
                nama: activePatient.nama_petugas || 'Petugas Medis',
                no_sip: activePatient.kode_karyawan || '',
                value: activePatient.kode_karyawan || '',
                jabatan: activePatient.jabatan_petugas || 'Dokter',
                is_penanggung_jawab: false,
            };
        }
        return null;
    }, [scheduledPj, activePatient]);

    const availablePetugasOptions = useMemo(() => {
        if (scheduledPj) {
            return [{
                label: `${scheduledPj.nama_karyawan || scheduledPj.nama} (${scheduledPj.jabatan || 'Dokter'})`,
                value: scheduledPj.no_sip,
                nama: scheduledPj.nama_karyawan || scheduledPj.nama,
                jabatan: scheduledPj.jabatan || 'Dokter',
                no_sip: scheduledPj.no_sip,
                is_penanggung_jawab: true,
            }];
        }
        return [];
    }, [scheduledPj]);

    // Sinkronisasi otomatis selectedPetugas dan selectedTerapisList dari jadwal
    useEffect(() => {
        if (scheduledPj?.no_sip) {
            setSelectedPetugas(scheduledPj.no_sip);
        } else if (activePatient?.kode_karyawan) {
            setSelectedPetugas(activePatient.kode_karyawan);
        } else {
            setSelectedPetugas('');
        }
    }, [scheduledPj, activePatient?.kode_karyawan]);

    useEffect(() => {
        if (scheduledHelpers.length > 0) {
            const mapped = scheduledHelpers.map((h: any) => ({
                no_sip: h.no_sip || h.kode_jadwal || '-',
                sip: h.no_sip || h.kode_jadwal || '-',
                nama: h.nama_karyawan || h.nama || 'Petugas Pendamping',
                jabatan: h.jabatan || 'terapis',
                role: (h.jabatan || 'TERAPIS').toUpperCase(),
                jam_mulai: h.jam_mulai || '',
                jam_selesai: h.jam_selesai || '',
                shift: h.jam_mulai && h.jam_selesai ? `${h.jam_mulai.slice(0, 5)} - ${h.jam_selesai.startsWith('24:00') ? '00:00' : h.jam_selesai.slice(0, 5)}` : '',
                kode_jadwal: h.kode_jadwal || '',
            }));
            setSelectedTerapisList(mapped);
        } else {
            setSelectedTerapisList([]);
        }
    }, [scheduledHelpers]);

    const currentSelectedTerapis = selectedTerapisList.length > 0 ? selectedTerapisList[0] : null;

    // Step state: 'form' (Form Penanganan) vs 'hasil' (Hasil Treatment & Produk Kasir)
    const [activeStep, setActiveStep] = useState<'form' | 'hasil'>('form');
    // Setelah simpan, kunci semua input form agar tidak bisa diubah lagi
    const [isFormSaved, setIsFormSaved] = useState<boolean>(false);
    const [isHasilSaved, setIsHasilSaved] = useState<boolean>(false);

    // Modal Sukses Terbit Antrean & Transaksi
    const [showHasilModal, setShowHasilModal] = useState<boolean>(false);
    const [hasilAntrianList, setHasilAntrianList] = useState<any[]>([]);
    const [hasilTransaksiDraft, setHasilTransaksiDraft] = useState<any | null>(null);
    const [hasilKodeKunjungan, setHasilKodeKunjungan] = useState<string>('');
    const [hasilPasienNama, setHasilPasienNama] = useState<string>('');
    const [hasilNoRm, setHasilNoRm] = useState<string>('');

    useEffect(() => {
        if (kodeRuangan) {
            loadFormFields();
        }
    }, [kodeRuangan]);

    const [currentAntrianId, setCurrentAntrianId] = useState<string>('');

    // ── Patient-init effect ──────────────────────────────────────────────────
    useEffect(() => {
        const antrianId = activePatient?.kode_antrian_layanan;
        if (antrianId) {
            const ap = activePatient as any;

            if (antrianId !== currentAntrianId) {
                // New patient in the panel — reset form state
                setCurrentAntrianId(antrianId);

                let initialForm: any = {};
                let hasForm = false;
                if (activePatient.hasil_form) {
                    try {
                        initialForm = typeof activePatient.hasil_form === 'string'
                            ? JSON.parse(activePatient.hasil_form)
                            : activePatient.hasil_form;
                        hasForm = Object.keys(initialForm).length > 0;
                    } catch (_) {}
                }
                setFormData(initialForm);
                setCatatanPetugas(activePatient.catatan_petugas || '');

                // Dokter / PJ & Petugas Pendamping Otomatis dari Jadwal Karyawan
                if (scheduledPj?.no_sip) {
                    setSelectedPetugas(scheduledPj.no_sip);
                } else if (activePatient.kode_karyawan) {
                    setSelectedPetugas(activePatient.kode_karyawan);
                } else {
                    setSelectedPetugas('');
                }

                // Determine default terapis pendamping (Prioritas: Form tersimpan -> Booking -> Jadwal Karyawan/Helpers)
                let defaultTerapisList: Array<{
                    no_sip: string;
                    nama: string;
                    jabatan?: string;
                    role?: string;
                    jam_mulai?: string;
                    jam_selesai?: string;
                    shift?: string;
                    kode_jadwal?: string;
                }> = [];

                if (Array.isArray(initialForm?.terapis_pendamping) && initialForm.terapis_pendamping.length > 0) {
                    const seenSips = new Set<string>();
                    for (const t of initialForm.terapis_pendamping) {
                        const sipKey = extractNoSip(t.no_sip || t.sip || t.value) || t.no_sip || t.sip || t.nama || t.nama_petugas || '';
                        if (sipKey && !seenSips.has(sipKey)) {
                            seenSips.add(sipKey);
                            defaultTerapisList.push({
                                no_sip: extractNoSip(t.no_sip || t.sip || t.value) || t.no_sip || t.sip || '-',
                                nama: t.nama || t.nama_petugas || 'Terapis',
                                jabatan: t.jabatan || t.role || 'terapis',
                                role: (t.role || t.jabatan || 'TERAPIS').toUpperCase(),
                                jam_mulai: t.jam_mulai || '',
                                jam_selesai: t.jam_selesai || '',
                                shift: t.shift || (t.jam_mulai && t.jam_selesai ? `${t.jam_mulai.slice(0, 5)} - ${t.jam_selesai.slice(0, 5)}` : ''),
                                kode_jadwal: t.kode_jadwal || '',
                            });
                        }
                    }
                } else if (initialForm?.terapis_pendamping?.no_sip || initialForm?.terapis_pendamping?.nama) {
                    const t = initialForm.terapis_pendamping;
                    defaultTerapisList = [{
                        no_sip: extractNoSip(t.no_sip || t.sip || t.value) || t.no_sip || t.sip || '-',
                        nama: t.nama || t.nama_petugas || 'Terapis',
                        jabatan: t.jabatan || t.role || 'terapis',
                        role: (t.role || t.jabatan || 'TERAPIS').toUpperCase(),
                        jam_mulai: t.jam_mulai || '',
                        jam_selesai: t.jam_selesai || '',
                        shift: t.shift || '',
                        kode_jadwal: t.kode_jadwal || '',
                    }];
                } else if (Array.isArray(ap.booking_petugas_pendamping) && ap.booking_petugas_pendamping.length > 0) {
                    const seenSips = new Set<string>();
                    for (const c of ap.booking_petugas_pendamping) {
                        const sipKey = extractNoSip(c.no_sip || c.sip || c.value) || c.no_sip || c.nama_petugas || c.nama_karyawan || c.nama || '';
                        if (sipKey && !seenSips.has(sipKey)) {
                            seenSips.add(sipKey);
                            defaultTerapisList.push({
                                no_sip: extractNoSip(c.no_sip || c.sip || c.value) || c.no_sip || '',
                                nama: c.nama_petugas || c.nama_karyawan || c.nama || 'Terapis',
                                jabatan: c.jabatan_petugas || c.jabatan || 'terapis',
                                role: (c.jabatan_petugas || c.jabatan || 'TERAPIS').toUpperCase(),
                                jam_mulai: c.jam_mulai || ap.booking_jam_mulai || '',
                                jam_selesai: c.jam_selesai || ap.booking_jam_selesai || '',
                                shift: c.jam_mulai && c.jam_selesai ? `${c.jam_mulai.slice(0, 5)} - ${c.jam_selesai.slice(0, 5)}` : '',
                                kode_jadwal: c.kode_jadwal || '',
                            });
                        }
                    }
                } else if (scheduledHelpers && scheduledHelpers.length > 0) {
                    const seenSips = new Set<string>();
                    for (const h of scheduledHelpers) {
                        const sipKey = h.no_sip || h.kode_jadwal || h.nama_karyawan || h.nama || '';
                        if (sipKey && !seenSips.has(sipKey)) {
                            seenSips.add(sipKey);
                            defaultTerapisList.push({
                                no_sip: h.no_sip || h.kode_jadwal || '-',
                                nama: h.nama_karyawan || h.nama || 'Petugas Pendamping',
                                jabatan: h.jabatan || 'terapis',
                                role: (h.jabatan || 'TERAPIS').toUpperCase(),
                                jam_mulai: h.jam_mulai || '',
                                jam_selesai: h.jam_selesai || '',
                                shift: h.jam_mulai && h.jam_selesai ? `${h.jam_mulai.slice(0, 5)} - ${h.jam_selesai.startsWith('24:00') ? '00:00' : h.jam_selesai.slice(0, 5)}` : '',
                                kode_jadwal: h.kode_jadwal || '',
                            });
                        }
                    }
                }
                setSelectedTerapisList(defaultTerapisList);

                setHeaderRMData({
                    foto_before: ap.foto_before || ap.data_konsultasi_foto_before || '',
                    keluhan: ap.keluhan || ap.data_konsultasi_keluhan || '',
                    durasi_keluhan: ap.durasi_keluhan || ap.data_konsultasi_durasi_keluhan || '',
                    riwayat_alergi: ap.riwayat_alergi || ap.data_konsultasi_riwayat_alergi || '',
                    riwayat_treatment: ap.riwayat_treatment || ap.data_konsultasi_riwayat_treatment || '',
                    pemeriksaan_acne: ap.pemeriksaan_acne || ap.data_konsultasi_pemeriksaan_acne || 'Tidak Ada',
                    pemeriksaan_inflammation: ap.pemeriksaan_inflammation || ap.data_konsultasi_pemeriksaan_inflammation || 'Tidak Ada',
                    pemeriksaan_skin_type: ap.pemeriksaan_skin_type || ap.data_konsultasi_pemeriksaan_skin_type || 'Normal',
                    pemeriksaan_pigmentation: ap.pemeriksaan_pigmentation || ap.data_konsultasi_pemeriksaan_pigmentation || 'Tidak Ada',
                    pemeriksaan_sensitivity: ap.pemeriksaan_sensitivity || ap.data_konsultasi_pemeriksaan_sensitivity || 'Rendah',
                    diagnosis: ap.diagnosis || ap.data_konsultasi_diagnosis || '',
                    subjective: ap.subjective || ap.data_konsultasi_subjective || '',
                    objective: ap.objective || ap.data_konsultasi_objective || '',
                    assessment: ap.assessment || ap.data_konsultasi_assessment || '',
                    plan: ap.plan || ap.data_konsultasi_plan || '',
                });

                setActiveStep(hasForm ? 'hasil' : 'form');
                setIsFormSaved(hasForm);
                setIsHasilSaved(false);

                if (isKonsultasi) {
                    loadPendaftaranItems(activePatient.kode_kunjungan);
                } else {
                    setRekomendasiItems([]);
                }
            }
        } else {
            // No patient — clear panel
            setCurrentAntrianId('');
            setFormData({});
            setCatatanPetugas('');
            setRekomendasiItems([]);
            setActiveStep('form');
            setIsFormSaved(false);
            setIsHasilSaved(false);
        }
    }, [activePatient?.kode_antrian_layanan, isKonsultasi]);

    // ── Petugas fallback effect ──────────────────────────────────────────────
    useEffect(() => {
        if (scheduledPj?.no_sip && !selectedPetugas) {
            setSelectedPetugas(scheduledPj.no_sip);
        }
    }, [scheduledPj, selectedPetugas]);

    const loadPendaftaranItems = async (kodeKunjungan?: string) => {
        if (!kodeKunjungan) return;
        try {
            const res = await postData('/master/antrian-layanan-pendaftaran-items', {
                kode_kunjungan: kodeKunjungan,
                for_referral: true,
            });
            if (['00', '0000', 200, '200'].includes(res?.data?.status) || res?.status === 200) {
                if (res?.data?.data?.length > 0) {
                    setRekomendasiItems(res.data.data);
                } else {
                    setRekomendasiItems([]);
                }
            } else {
                setRekomendasiItems([]);
            }
        } catch (e) {
            setRekomendasiItems([]);
        }
    };

    const loadResepProdukDokter = async (kodeKunjungan?: string, kodeAntrian?: string) => {
        if (!kodeKunjungan && !kodeAntrian) {
            setResepProdukDokter([]);
            return;
        }
        if (Array.isArray(activePatient?.rekomendasi_produk_dokter) && activePatient.rekomendasi_produk_dokter.length > 0) {
            setResepProdukDokter(activePatient.rekomendasi_produk_dokter);
            return;
        }
        setLoadingResepProduk(true);
        try {
            const res = await postData('/master/kunjungan-produk-rekomendasi', {
                kode_kunjungan: kodeKunjungan,
                kode_antrian_layanan: kodeAntrian,
            });
            if (['00', '0000', 200].includes(res.data?.status) || res.status === 200) {
                setResepProdukDokter(res.data?.data || []);
            } else {
                setResepProdukDokter([]);
            }
        } catch (_) {
            setResepProdukDokter([]);
        } finally {
            setLoadingResepProduk(false);
        }
    };

    useEffect(() => {
        if (activePatient?.kode_kunjungan || activePatient?.kode_antrian_layanan) {
            loadResepProdukDokter(activePatient.kode_kunjungan, activePatient.kode_antrian_layanan);
        } else {
            setResepProdukDokter([]);
        }
    }, [activePatient?.kode_antrian_layanan, activePatient?.kode_kunjungan, activePatient?.rekomendasi_produk_dokter]);

    const handleBeforePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showError(toast, 'File harus berupa gambar (JPG, PNG, WEBP, dll)');
            return;
        }
        try {
            setUploadingBefore(true);
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });

            pendingBeforePhotoRef.current = { base64, fileName: file.name };
            setHeaderRMData((prev) => ({ ...prev, foto_before: base64 }));
            const inputEl = document.getElementById('before_photo_input_tindakan') as HTMLInputElement | null;
            if (inputEl) inputEl.value = '';
        } catch (_) {
            showError(toast, 'Gagal memproses foto before');
        } finally {
            setUploadingBefore(false);
        }
    };


    const loadFormFields = async () => {
        if (!kodeRuangan) return;
        setLoadingFields(true);
        try {
            const res = await postData('/master/ruangan-form-data', { kode_ruangan: kodeRuangan });
            setFields(res.data.data || []);
        } catch (_) {
            // silent fail
        } finally {
            setLoadingFields(false);
        }
    };

    const handleFieldChange = (key: string, value: any) => {
        if (isFormSaved) return;
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const executeSaveForm = async (targetStatus?: string) => {
        if (!activePatient) return;
        setSaving(true);
        try {
            const cleanSip = extractNoSip(scheduledPj?.no_sip || selectedPetugas || currentSelectedOfficer?.no_sip);
            const finalNoSip = cleanSip || (scheduledPj?.no_sip || selectedPetugas || activePatient.kode_karyawan || '');
            const finalTerapisList = (scheduledHelpers.length > 0 ? scheduledHelpers : selectedTerapisList).map((t: any) => ({
                no_sip: extractNoSip(t.no_sip || t.sip || t.value) || t.no_sip || t.sip || '-',
                sip: extractNoSip(t.no_sip || t.sip || t.value) || t.no_sip || t.sip || '-',
                nama: t.nama_karyawan || t.nama || 'Petugas Pendamping',
                jabatan: t.jabatan || 'terapis',
                role: t.role || (t.jabatan || 'TERAPIS').toUpperCase(),
                jam_mulai: t.jam_mulai || '',
                jam_selesai: t.jam_selesai || '',
                shift: t.shift || (t.jam_mulai && t.jam_selesai ? `${t.jam_mulai.slice(0, 5)} - ${t.jam_selesai.startsWith('24:00') ? '00:00' : t.jam_selesai.slice(0, 5)}` : ''),
                kode_jadwal: t.kode_jadwal || '',
            }));

            const dokterNama = scheduledPj?.nama_karyawan || scheduledPj?.nama || currentSelectedOfficer?.nama || activePatient.nama_petugas || 'PJ Ruangan';
            const dokterPelaksanaObj = {
                nama: dokterNama,
                no_sip: finalNoSip,
                jabatan: scheduledPj?.jabatan || currentSelectedOfficer?.jabatan || 'Dokter',
                role: (scheduledPj?.jabatan || currentSelectedOfficer?.jabatan || 'DOKTER').toUpperCase(),
            };

            const updatedFormData = {
                ...formData,
                dokter_pelaksana: dokterPelaksanaObj,
                terapis_pendamping: finalTerapisList,
                petugas_pendamping: finalTerapisList,
            };

            let finalHeaderData = { ...headerRMData };
            if (pendingBeforePhotoRef.current || (finalHeaderData.foto_before && finalHeaderData.foto_before.startsWith('data:image/'))) {
                try {
                    const base64Data = pendingBeforePhotoRef.current?.base64 || finalHeaderData.foto_before;
                    const fileName = pendingBeforePhotoRef.current?.fileName || 'foto_before.jpg';
                    const resUpload = await postData('/master/ruangan-form-upload-foto', {
                        image_base64: base64Data,
                        file_name: fileName,
                        prefix: 'before',
                    });
                    const pathUpload = resUpload?.data?.data?.file_path || resUpload?.data?.file_path;
                    if (pathUpload) {
                        pendingBeforePhotoRef.current = null;
                        finalHeaderData.foto_before = pathUpload;
                        setHeaderRMData((prev) => ({ ...prev, foto_before: pathUpload }));
                    }
                } catch (errUpload) {
                    console.error('Gagal upload foto before saat simpan form:', errUpload);
                }
            }

            const payload: any = {
                kode_antrian_layanan: activePatient.kode_antrian_layanan,
                kode_karyawan: finalNoSip,
                no_sip: finalNoSip,
                hasil_form: updatedFormData,
                header_data: finalHeaderData,
                lanjut_ke_tindakan: lanjutKeTindakan ? 1 : 0,
                catatan_petugas: catatanPetugas,
                rekomendasi_items: rekomendasiItems,
                dokter_pelaksana: dokterPelaksanaObj,
                terapis_pendamping: finalTerapisList,
                petugas_pendamping: finalTerapisList,
                diubah_dari_booking: false,
                petugas_asal_booking: bookingNamaPetugas || null,
                no_sip_asal_booking: bookingNoSip || null,
                petugas_pengganti: null,
                catatan_perubahan_petugas: null,
            };
            if (targetStatus) {
                payload.status_tindakan = targetStatus;
            }

            const res = await postData('/master/antrian-layanan-simpan-rekomendasi', payload);
            showSuccess(toast, res.data.message || 'Form penanganan berhasil disimpan.');

            const antrianBaru = res.data?.data?.antrian_layanan_baru || [];
            const trxDraft = res.data?.data?.transaksi_draft || null;
            const kodeKunjungan = res.data?.data?.kode_kunjungan || '';

            // Simpan info pasien SEBELUM getGridData() mengosongkan activePatient
            if (antrianBaru.length > 0 || trxDraft) {
                setHasilPasienNama(activePatient?.nama_pasien || '');
                setHasilNoRm(activePatient?.no_rm || '');
                setHasilAntrianList(antrianBaru);
                setHasilTransaksiDraft(trxDraft);
                setHasilKodeKunjungan(kodeKunjungan);
            }

            // Update local officer info so header badge displays doctor name immediately
            if (finalNoSip) {
                activePatient.nama_petugas = dokterNama;
                activePatient.kode_karyawan = finalNoSip;
            }

            // Kunci form setelah berhasil simpan tanpa mengosongkan nilainya (form tidak bisa diotak-atik)
            setIsFormSaved(true);

            // Refresh data
            getGridData();

            if (antrianBaru.length > 0 || trxDraft) {
                setShowHasilModal(true);
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan catatan & rekomendasi penanganan');
        } finally {
            setSaving(false);
        }
    };

    // State Konfirmasi Simpan
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [targetStatusToSave, setTargetStatusToSave] = useState<string | undefined>(undefined);

    const handleSaveForm = (targetStatus?: string) => {
        if (!activePatient) return;

        // Validation: Petugas / Dokter PJ wajib dijadwalkan
        if (!scheduledPj && !selectedPetugas) {
            showError(toast, 'Belum ada Dokter / PJ yang dijadwalkan untuk ruangan ini pada Jadwal Karyawan!');
            return;
        }

        // Validation: Check if consultation recommendation has unavailable destination rooms
        if (isKonsultasi && lanjutKeTindakan) {
            const unavailableService = rekomendasiItems.find(
                (item) => ['layanan', 'paket_layanan'].includes(item.jenis) && (item.is_petugas_available === false || Boolean(item.is_not_started_today) || Boolean(item.is_past_today))
            );
            if (unavailableService) {
                showError(
                    toast,
                    unavailableService.alasan_tidak_tersedia ||
                        `Tidak dapat melanjutkan tindakan ke ruangan "${unavailableService.nama_ruangan || 'tujuan'}" karena jadwal shift petugas belum dimulai atau telah berakhir.`
                );
                return;
            }
        }

        // Check mandatory fields
        for (const f of fields) {
            if (f.is_required) {
                const val = formData[f.label_field];
                if (f.tipe_field === 'upload_foto') {
                    const hasBefore = val && typeof val === 'object' && val.before;
                    if (!hasBefore) {
                        showError(toast, `Field '${f.label_field}' wajib mengunggah foto!`);
                        return;
                    }
                } else if (!val) {
                    showError(toast, `Field '${f.label_field}' wajib diisi!`);
                    return;
                }
            }
        }

        setTargetStatusToSave(targetStatus);
        setShowConfirmModal(true);
    };

    const handleConfirmAccept = () => {
        setShowConfirmModal(false);
        executeSaveForm(targetStatusToSave);
    };

    // ─── IF NO PATIENT IS CURRENTLY IN TREATMENT ─────────────────────────────
    if (!activePatient) {
        return (
            <>
                <div className="card shadow-2 border-round-xl p-4 surface-card border-top-3 border-teal-500 mb-4">
                    <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3">
                        <div className="flex align-items-center gap-3">
                            <div className="w-3rem h-3rem border-circle bg-teal-100 text-teal-700 flex align-items-center justify-content-center text-xl font-bold flex-shrink-0">
                                👨‍⚕️
                            </div>
                            <div>
                                <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-1 border-round-md inline-block mb-1">
                                    Sesi Penanganan Ruangan: {namaRuangan}
                                </span>
                                <h3 className="text-xl font-bold text-900 m-0">Belum Ada Pasien Yang Sedang Ditangani</h3>
                                <p className="text-xs text-500 m-0 mt-1">
                                    {nextWaitingPatient
                                        ? `Pasien berikutnya: No. #${nextWaitingPatient.nomor_antrian} — ${nextWaitingPatient.nama_pasien} (${nextWaitingPatient.nama_layanan})`
                                        : 'Tidak ada antrean pasien yang sedang menunggu di ruangan ini.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex align-items-center gap-2 flex-wrap">
                            {nextWaitingPatient && (
                                <Button
                                    label={`📢 Panggil Pasien Next (#${nextWaitingPatient.nomor_antrian})`}
                                    icon="pi pi-megaphone"
                                    size="small"
                                    className="font-bold bg-teal-600 border-none text-white"
                                    onClick={() => handleAksi(nextWaitingPatient, 'dipanggil')}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <DialogHasilTerbitAntrian
                    visible={showHasilModal}
                    onHide={() => setShowHasilModal(false)}
                    pasienNama={hasilPasienNama}
                    noRm={hasilNoRm}
                    kodeKunjungan={hasilKodeKunjungan}
                    antrianList={hasilAntrianList}
                    transaksiDraft={hasilTransaksiDraft}
                />
            </>
        );
    }

    const dataKonsul = activePatient as any;
    const hasDataKonsul = !!(
        dataKonsul?.kode_antrian_asal ||
        (dataKonsul?.data_konsultasi_keluhan && dataKonsul?.data_konsultasi_keluhan !== '-') ||
        (dataKonsul?.data_konsultasi_diagnosis && dataKonsul?.data_konsultasi_diagnosis !== '-') ||
        dataKonsul?.data_konsultasi_hasil_form ||
        resepProdukDokter.length > 0
    );

    let extraFormFields: Array<{ label: string; value: any }> = [];
    if (dataKonsul?.data_konsultasi_hasil_form) {
        try {
            const rawObj = typeof dataKonsul.data_konsultasi_hasil_form === 'string'
                ? JSON.parse(dataKonsul.data_konsultasi_hasil_form)
                : dataKonsul.data_konsultasi_hasil_form;
            if (rawObj && typeof rawObj === 'object') {
                Object.entries(rawObj).forEach(([k, v]) => {
                    if (v && typeof v !== 'object' && !['area_yang_ditangani', 'kondisi_kulit', 'produk_bahan_digunakan', 'jumlah_satuan', 'catatan_tindakan', 'catatan_petugas', 'kondisi_setelah_tindakan', 'catatan_hasil_treatment', 'persetujuan_tindakan'].includes(k)) {
                        const label = k.replace(/_/g, ' ').toUpperCase();
                        extraFormFields.push({ label, value: String(v) });
                    }
                });
            }
        } catch (_) {}
    }

    const renderPetugasSelector = () => {
        const jamStr = scheduledPj?.jam_mulai && scheduledPj?.jam_selesai
            ? `${scheduledPj.jam_mulai.slice(0, 5)} - ${scheduledPj.jam_selesai.startsWith('24:00') ? '00:00' : scheduledPj.jam_selesai.slice(0, 5)}`
            : '';
        const companions = scheduledHelpers || [];
        const totalCompanions = companions.length;
        const hasCompanions = totalCompanions > 0;
        const companionSummary = getCompanionSummary(companions, totalCompanions);
        const fullCompanionNames = companions.map((c: any) => c.nama_karyawan || c.nama || c.nama_petugas).join(', ');

        return (
            <div className="surface-card border-1 surface-border border-round-xl p-3 sm:p-4 shadow-1">
                {/* ═══════════════════════════════════════════════════════════ */}
                {/* HEADER: TITLE, ROOM & JADWAL KARYAWAN NOTE                  */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="flex align-items-center gap-2 mb-3 pb-2.5 border-bottom-1 surface-border">
                    <i className="pi pi-id-card text-teal-600 text-sm" />
                    <span className="text-xs font-bold text-700 uppercase tracking-wider">
                        DOKTER & PETUGAS RUANGAN
                    </span>
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* CARD SLOT JADWAL PETUGAS (DESAIN PERSIS SEPERTI PENDAFTARAN) */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {scheduledPj ? (
                    <div className="w-full flex flex-column justify-content-between border-round-xl p-3 border-2 border-primary-200 surface-50 shadow-1 transition-all">
                        <div>
                            {/* Jam Sesi & Status Badge */}
                            <div className="flex align-items-center justify-content-between mb-2">
                                <div className="flex align-items-center gap-2">
                                    <Clock size={16} className="text-primary" />
                                    <span className="font-bold text-sm text-900">
                                        {jamStr ? `${jamStr} WIB` : 'Jadwal Hari Ini'}
                                    </span>
                                </div>
                                <Tag
                                    value="BERTUGAS"
                                    severity="success"
                                    className="text-xs px-2.5 font-bold"
                                />
                            </div>

                            {/* Petugas PJ */}
                            <div className="flex align-items-center gap-2 mb-2 flex-wrap">
                                <User size={15} className="text-primary flex-shrink-0" />
                                <span className="font-bold text-sm text-900">
                                    {scheduledPj.nama_karyawan || scheduledPj.nama}
                                </span>
                                <Tag
                                    value="PJ"
                                    className="text-[10px] font-bold px-1.5 py-0 border-round bg-orange-500 text-white"
                                />
                                {scheduledPj.jabatan && (
                                    <span className="text-xs text-500 font-medium capitalize">
                                        ({scheduledPj.jabatan})
                                    </span>
                                )}
                            </div>

                            {/* Petugas Pendamping (Detail helper muncul secara dropdown / popover) */}
                            {hasCompanions && (
                                <div className="flex align-items-center mb-2" style={{ minHeight: '26px' }}>
                                    <div
                                        className="inline-flex align-items-center gap-1.5 text-[11px] min-w-0 cursor-pointer overflow-hidden text-emerald-800 hover:text-emerald-900 transition-colors"
                                        title={`Daftar Pendamping: ${fullCompanionNames}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveHelperData({
                                                pj: scheduledPj.nama_karyawan || scheduledPj.nama,
                                                jam: jamStr ? `${jamStr} WIB` : 'Jadwal Hari Ini',
                                                ruangan: namaRuangan || 'Ruangan',
                                                helpers: companions,
                                            });
                                            helperOpRef.current?.toggle(e);
                                        }}
                                    >
                                        <span className="font-semibold text-emerald-800 flex-shrink-0">
                                            +{totalCompanions} pendamping
                                        </span>
                                        <span
                                            className="text-emerald-700 text-overflow-ellipsis overflow-hidden white-space-nowrap min-w-0"
                                            title={fullCompanionNames}
                                        >
                                            ({companionSummary})
                                        </span>
                                        <ChevronDown size={12} className="text-emerald-600 flex-shrink-0 ml-0.5 opacity-80" />
                                    </div>
                                </div>
                            )}

                            {/* Ruangan */}
                            <div className="flex align-items-center gap-2 text-xs text-500">
                                <MapPin size={13} className="text-400" />
                                <span>{namaRuangan || 'Ruangan'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="surface-card border-1 border-dashed surface-border border-round-lg p-3 text-center flex flex-column align-items-center justify-content-center gap-1.5 my-auto">
                        <div className="w-2.2rem h-2.2rem border-round-circle bg-amber-50 text-amber-600 flex align-items-center justify-content-center">
                            <i className="pi pi-exclamation-circle text-base" />
                        </div>
                        <span className="text-xs font-semibold text-700">
                            Belum ada PJ yang dijadwalkan untuk ruangan ini.
                        </span>
                        <span className="text-[11px] text-500">
                            Silakan tetapkan PJ di menu Jadwal Karyawan.
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SATU CARD TERPADU: STATUS PASIEN + FORM PENANGANAN (MENYATU)        */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="card shadow-2 border-round-xl p-0 mb-3 surface-card overflow-hidden border-1 surface-border">
                {/* SECTION 1: NO. ANTREAN, INFO PASIEN & TOMBOL AKSI (SATU BARIS RAMPING & RAPI) */}
                <div
                    className="p-3 sm:px-4 bg-white"
                    style={{
                        borderBottom: '1px solid #e5e7eb'
                    }}
                >
                    <div className="flex flex-column lg:flex-row lg:align-items-end justify-content-between gap-3">
                        {/* Sisi Kiri: Kotak No. Antrean + Detail Pasien */}
                        <div className="flex align-items-center" style={{ gap: '14px' }}>
                            {/* Nomor Antrean: KOTAK MINT RAMPING */}
                            <div
                                className="flex flex-column align-items-center justify-content-center flex-shrink-0"
                                style={{
                                    width: '82px',
                                    minWidth: '82px',
                                    height: '68px',
                                    borderRadius: '14px',
                                    backgroundColor: '#f0fdf9',
                                    border: '1.5px solid #a7f3d0',
                                    padding: '4px'
                                }}
                            >
                                <span
                                    className="font-bold uppercase tracking-wider text-center"
                                    style={{
                                        fontSize: '10px',
                                        color: '#0d9488',
                                        letterSpacing: '0.4px',
                                        lineHeight: '1.1'
                                    }}
                                >
                                    NO. ANTREAN
                                </span>
                                <span
                                    className="font-black text-gray-900 tracking-tight text-center"
                                    style={{
                                        fontSize: '30px',
                                        lineHeight: '1',
                                        marginTop: '1px'
                                    }}
                                >
                                    {activePatient.nomor_antrian}
                                </span>
                            </div>

                            {/* Info Pasien (Nama + RM di baris 1, Chip Layanan di baris 2) */}
                            <div className="flex flex-column justify-content-center" style={{ gap: '6px' }}>
                                {/* Baris 1: Nama Pasien & No. RM (Sejajar Sempurna) */}
                                <div className="flex align-items-center flex-wrap" style={{ gap: '10px' }}>
                                    <h2
                                        className="text-xl sm:text-2xl font-extrabold text-900 m-0 tracking-tight"
                                        style={{ lineHeight: '1.2' }}
                                    >
                                        {activePatient.nama_pasien || 'Pasien'}
                                    </h2>
                                    <span
                                        className="font-bold tracking-wide"
                                        style={{
                                            color: '#64748b',
                                            fontSize: '13.5px',
                                            lineHeight: '1.2',
                                            display: 'inline-flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        RM: {activePatient.no_rm}
                                    </span>
                                </div>

                                {/* Baris 2: Chip Layanan (Dibuat Lebih Besar & Jelas) */}
                                <div className="flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                                    <span
                                        className="inline-flex align-items-center px-3 py-1 font-medium"
                                        style={{
                                            background: '#f0fdfa',
                                            border: '1px solid #99f6e4',
                                            borderRadius: '8px',
                                            color: '#0d9488',
                                            fontSize: '13px',
                                            gap: '7px',
                                            lineHeight: '1.4'
                                        }}
                                    >
                                        <Stethoscope size={15} style={{ color: '#0d9488' }} className="flex-shrink-0" />
                                        <span className="capitalize">{activePatient.nama_layanan || 'Konsultasi'}</span>
                                    </span>
                                    {resepProdukDokter.length > 0 && (
                                        <span
                                            className="inline-flex align-items-center px-3 py-1 font-medium"
                                            style={{
                                                background: '#fffbeb',
                                                border: '1px solid #fde68a',
                                                borderRadius: '8px',
                                                color: '#b45309',
                                                fontSize: '13px',
                                                gap: '7px',
                                                lineHeight: '1.4'
                                            }}
                                        >
                                            <ShoppingBag size={14} style={{ color: '#d97706' }} className="flex-shrink-0" />
                                            <span>Resep Dokter: <strong>{resepProdukDokter.length} Produk</strong></span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sisi Kanan: Action Buttons (Diletakkan di bagian bawah sejajar) */}
                        <div className="flex align-items-center justify-content-start lg:justify-content-end flex-wrap gap-2 align-self-end pb-0.5">
                            {/* Tombol Batalkan */}
                            <Button
                                type="button"
                                size="small"
                                className="text-xs font-semibold transition-all flex align-items-center border-1"
                                style={{
                                    background: '#ffffff',
                                    borderColor: '#fca5a5',
                                    color: '#dc2626',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    gap: '6px'
                                }}
                                onClick={() => handleAksi(activePatient, 'batal')}
                            >
                                <Ban size={14} style={{ color: '#dc2626' }} />
                                <span>Batalkan</span>
                            </Button>

                            {/* Tombol Riwayat pasien */}
                            <Button
                                type="button"
                                size="small"
                                className="text-xs font-semibold transition-all flex align-items-center border-1"
                                style={{
                                    background: '#ffffff',
                                    borderColor: '#e2e8f0',
                                    color: '#334155',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    gap: '6px'
                                }}
                                onClick={() => setDrawerRiwayatVisible(true)}
                            >
                                <History size={14} style={{ color: '#475569' }} />
                                <span>Riwayat pasien</span>
                            </Button>

                            {/* Tombol Panggil ulang */}
                            <Button
                                type="button"
                                size="small"
                                className="text-xs font-semibold transition-all flex align-items-center border-1"
                                style={{
                                    background: '#ffffff',
                                    borderColor: '#e2e8f0',
                                    color: '#334155',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    gap: '6px'
                                }}
                                onClick={() => {
                                    playChime();
                                    speakNomorLayanan(activePatient.nomor_antrian, activePatient.nama_pasien, namaRuangan);
                                }}
                            >
                                <Volume2 size={14} style={{ color: '#475569' }} />
                                <span>Panggil ulang</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* 2. FORM PENANGANAN (FLOW MENYATU LANGSUNG DALAM 1 CARD CONTAINER)   */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {isKonsultasi ? (
                /* RUANG KONSULTASI DOKTER VIEW */
                <div className="p-3 sm:p-4 flex flex-column gap-4 bg-white">
                    {/* SECTION PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP) */}
                    {renderPetugasSelector()}

                    {/* 1. ANAMNESIS & RIWAYAT PASIEN */}
                    <div className="p-3 border-round-xl border-1 surface-border bg-white">
                        <label className="block text-xs font-extrabold text-700 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border flex align-items-center gap-2">
                            <i className="pi pi-book text-500 text-sm" />
                            1. ANAMNESIS &amp; RIWAYAT PASIEN (REKAM MEDIS)
                        </label>
                        <div className="grid formgrid p-fluid text-sm">
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Keluhan Utama Pasien</label>
                                <InputTextarea
                                    value={headerRMData.keluhan}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, keluhan: e.target.value })}
                                    rows={2}
                                    placeholder="Tuliskan keluhan utama pasien..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Durasi Keluhan</label>
                                <InputText
                                    value={headerRMData.durasi_keluhan}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, durasi_keluhan: e.target.value })}
                                    placeholder="Misal: 2 minggu, 1 bulan..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Riwayat Alergi Pasien</label>
                                <InputTextarea
                                    value={headerRMData.riwayat_alergi}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, riwayat_alergi: e.target.value })}
                                    rows={2}
                                    placeholder="Riwayat alergi obat / kosmetik / bahan..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Riwayat Treatment Sebelumnya</label>
                                <InputTextarea
                                    value={headerRMData.riwayat_treatment}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, riwayat_treatment: e.target.value })}
                                    rows={2}
                                    placeholder="Perawatan kulit/klinik yang pernah dikunjungi..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. HASIL PEMERIKSAAN KULIT */}
                    <div className="p-3 border-round-xl border-1 surface-border bg-white">
                        <label className="block text-xs font-extrabold text-700 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border flex align-items-center gap-2">
                            <i className="pi pi-check-circle text-500 text-sm" />
                            2. HASIL PEMERIKSAAN KULIT
                        </label>
                        <div className="grid formgrid p-fluid text-sm">
                            <div className="col-12 md:col-4 mb-3">
                                <label className="block text-xs font-semibold mb-1">Pemeriksaan Acne</label>
                                <Dropdown
                                    value={headerRMData.pemeriksaan_acne}
                                    options={[
                                        { label: 'Tidak Ada', value: 'Tidak Ada' },
                                        { label: 'Ringan', value: 'Ringan' },
                                        { label: 'Sedang', value: 'Sedang' },
                                        { label: 'Berat', value: 'Berat' },
                                    ]}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_acne: e.value })}
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-4 mb-3">
                                <label className="block text-xs font-semibold mb-1">Pemeriksaan Inflammation</label>
                                <Dropdown
                                    value={headerRMData.pemeriksaan_inflammation}
                                    options={[
                                        { label: 'Tidak Ada', value: 'Tidak Ada' },
                                        { label: 'Ringan', value: 'Ringan' },
                                        { label: 'Sedang', value: 'Sedang' },
                                        { label: 'Berat', value: 'Berat' },
                                    ]}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_inflammation: e.value })}
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-4 mb-3">
                                <label className="block text-xs font-semibold mb-1">Jenis / Tipe Kulit</label>
                                <Dropdown
                                    value={headerRMData.pemeriksaan_skin_type}
                                    options={[
                                        { label: 'Normal', value: 'Normal' },
                                        { label: 'Kering', value: 'Kering' },
                                        { label: 'Berminyak', value: 'Berminyak' },
                                        { label: 'Kombinasi', value: 'Kombinasi' },
                                        { label: 'Sensitif', value: 'Sensitif' },
                                    ]}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_skin_type: e.value })}
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Pemeriksaan Pigmentasi</label>
                                <Dropdown
                                    value={headerRMData.pemeriksaan_pigmentation}
                                    options={[
                                        { label: 'Tidak Ada', value: 'Tidak Ada' },
                                        { label: 'Melasma', value: 'Melasma' },
                                        { label: 'PIH', value: 'PIH' },
                                        { label: 'Freckles', value: 'Freckles' },
                                        { label: 'Lentigo', value: 'Lentigo' },
                                    ]}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_pigmentation: e.value })}
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Sensitivitas Kulit</label>
                                <Dropdown
                                    value={headerRMData.pemeriksaan_sensitivity}
                                    options={[
                                        { label: 'Rendah', value: 'Rendah' },
                                        { label: 'Sedang', value: 'Sedang' },
                                        { label: 'Tinggi', value: 'Tinggi' },
                                    ]}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_sensitivity: e.value })}
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. DIAGNOSIS DOKTER & SOAP MEDIS */}
                    <div className="p-3 border-round-xl border-1 surface-border bg-white">
                        <label className="block text-xs font-extrabold text-700 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border flex align-items-center gap-2">
                            <i className="pi pi-file-edit text-500 text-sm" />
                            3. DIAGNOSIS DOKTER &amp; SOAP MEDIS
                        </label>
                        <div className="grid formgrid p-fluid text-sm">
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">Diagnosis Dokter</label>
                                <InputText
                                    value={headerRMData.diagnosis}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, diagnosis: e.target.value })}
                                    placeholder="Diagnosis medis..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-6 mb-3">
                                <label className="block text-xs font-semibold mb-1">SOAP (Plan / Perencanaan)</label>
                                <InputText
                                    value={headerRMData.plan}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, plan: e.target.value })}
                                    placeholder="Rencana penanganan / treatment..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-4 mb-3">
                                <label className="block text-xs font-semibold mb-1">SOAP (Subjective)</label>
                                <InputTextarea
                                    value={headerRMData.subjective}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, subjective: e.target.value })}
                                    rows={2}
                                    placeholder="Catatan subjektif pasien..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-4 mb-3">
                                <label className="block text-xs font-semibold mb-1">SOAP (Objective)</label>
                                <InputTextarea
                                    value={headerRMData.objective}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, objective: e.target.value })}
                                    rows={2}
                                    placeholder="Catatan objektif fisik..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                            <div className="col-12 md:col-4 mb-3">
                                <label className="block text-xs font-semibold mb-1">SOAP (Assessment)</label>
                                <InputTextarea
                                    value={headerRMData.assessment}
                                    onChange={(e) => setHeaderRMData({ ...headerRMData, assessment: e.target.value })}
                                    rows={2}
                                    placeholder="Penilaian klinis dokter..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md"
                                />
                            </div>
                        </div>
                    </div>

                    {/* KONTROL UI: LANJUT KE TREATMENT? (HANYA JIKA BUKAN DARI KONSULTASI WAJIB) */}
                    {!((activePatient as any)?.wajib_konsultasi === 'wajib' || (activePatient?.nama_layanan && !activePatient.nama_layanan.toLowerCase().includes('konsul'))) && (
                        <div className="p-3 surface-50 border-round-lg border-1 surface-border flex align-items-center justify-content-between">
                            <div>
                                <span className="font-bold text-sm text-900 block">Lanjut ke Treatment Sesi Ini?</span>
                                <span className="text-xs text-500">Jika Ya, sistem otomatis menerbitkan antrean di ruang tindakan pasien tanpa daftar ulang.</span>
                            </div>
                            <div className="flex align-items-center gap-3">
                                <div className="flex align-items-center gap-1">
                                    <Checkbox
                                        inputId="lanjut_ya_active"
                                        checked={lanjutKeTindakan}
                                        disabled={isFormSaved}
                                        onChange={(e) => setLanjutKeTindakan(true)}
                                    />
                                    <label htmlFor="lanjut_ya_active" className="text-sm font-bold text-700 cursor-pointer">Ya (Lanjut Treatment)</label>
                                </div>
                                <div className="flex align-items-center gap-1">
                                    <Checkbox
                                        inputId="lanjut_tidak_active"
                                        checked={!lanjutKeTindakan}
                                        disabled={isFormSaved}
                                        onChange={(e) => {
                                            setLanjutKeTindakan(false);
                                            setRekomendasiItems((prev) => prev.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)));
                                        }}
                                    />
                                    <label htmlFor="lanjut_tidak_active" className="text-sm font-bold text-500 cursor-pointer">Tidak</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION INFORMASI TERDAFTAR TREATMENT ATAU PILIH REKOMENDASI */}
                    {lanjutKeTindakan && (
                        ((activePatient as any)?.wajib_konsultasi === 'wajib' || (activePatient?.nama_layanan && !activePatient.nama_layanan.toLowerCase().includes('konsul'))) ? (
                            <div className="surface-card p-4 border-round-xl border-1 surface-border bg-teal-50/80 shadow-1 flex align-items-center justify-content-between">
                                <div className="flex align-items-center gap-3">
                                    <div className="w-3rem h-3rem border-circle bg-teal-100 flex align-items-center justify-content-center text-teal-700">
                                        <i className="pi pi-check-circle text-2xl" />
                                    </div>
                                    <div>
                                        <span className="font-extrabold text-teal-900 text-sm block">PASIEN TERDAFTAR TREATMENT: {activePatient.nama_layanan}</span>
                                        <span className="text-xs text-teal-700">Setelah sesi konsultasi disimpan, sistem otomatis menerbitkan antrean ke ruang tindakan untuk perawatan ini.</span>
                                    </div>
                                </div>
                                <Tag value="Treatment Terdaftar" severity="info" className="px-3 py-1 font-bold text-xs" />
                            </div>
                        ) : (
                            <RekomendasiTreatmentPanel
                                toast={toast}
                                selectedItems={rekomendasiItems}
                                onChangeSelectedItems={setRekomendasiItems}
                                disabled={isFormSaved}
                                kodeCabang={(activePatient as any)?.kode_cabang}
                            />
                        )
                    )}

                    {/* SECTION CATATAN DOKTER / OBSERVASI KONSULTASI */}
                    <div className="p-3 border-round-xl border-1 surface-border bg-white">
                        <label className="block text-xs font-extrabold text-700 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                            <i className="pi pi-pencil text-500 text-sm" />
                            CATATAN DOKTER &amp; OBSERVASI KONSULTASI
                        </label>
                        <InputTextarea
                            value={catatanPetugas}
                            onChange={(e) => setCatatanPetugas(e.target.value)}
                            rows={4}
                            placeholder="Tuliskan rincian hasil konsultasi, resep, atau catatan khusus observasi pasien..."
                            disabled={isFormSaved}
                            className="w-full text-sm border-round-md bg-white border-300"
                        />
                    </div>

                    {/* SAVE ACTION FOOTER BAR */}
                    <div className="flex align-items-center justify-content-end gap-3 mt-2 pt-3 border-top-1 surface-border">
                        {isFormSaved ? (
                            <Tag value="✅ Form Penanganan & Konsultasi Telah Disimpan & Dikunci" severity="success" className="px-3 py-2 text-xs font-bold" />
                        ) : (
                            <Button
                                label="Simpan Form & Selesaikan Konsultasi"
                                icon="pi pi-check-circle"
                                severity="success"
                                size="small"
                                loading={saving}
                                onClick={() => handleSaveForm('selesai')}
                                className="font-bold text-xs bg-teal-600 border-none border-round-lg px-4 text-white shadow-2"
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* RUANG TINDAKAN VIEW */
                <div className="flex flex-column gap-0">
                    {/* TAB HEADER FOR TREATMENT ROOM */}
                    <div className="flex flex-column sm:flex-row align-items-center justify-content-between p-3 bg-white border-bottom-1 surface-border gap-2">
                        <div className="flex align-items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setActiveStep('form')}
                                className={`flex align-items-center gap-2 px-3 py-2 border-round-lg font-bold text-xs cursor-pointer border-none transition-all ${
                                    activeStep === 'form'
                                        ? 'bg-teal-700 text-white shadow-2'
                                        : 'surface-card text-700 hover:surface-200 border-1 surface-border'
                                }`}
                            >
                                <span>1. Form Penanganan Ruangan</span>
                            </button>

                            <i className="pi pi-chevron-right text-400 text-sm hidden sm:inline-block" />

                            <button
                                type="button"
                                onClick={() => setActiveStep('hasil')}
                                className={`flex align-items-center gap-2 px-3 py-2 border-round-lg font-bold text-xs cursor-pointer border-none transition-all ${
                                    activeStep === 'hasil'
                                        ? 'bg-teal-700 text-white shadow-2'
                                        : 'surface-card text-700 hover:surface-200 border-1 surface-border'
                                }`}
                            >
                                <span>2. Hasil Treatment (Foto After) &amp; Rekomendasi Produk</span>
                            </button>
                        </div>
                    </div>

                    {activeStep === 'form' ? (
                        /* TAB 1: FORM PENANGANAN RUANGAN TINDAKAN */
                        <div className="p-3 sm:p-4 flex flex-column gap-4 bg-white">
                            {/* SECTION PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP) */}
                            {renderPetugasSelector()}

                            {/* SECTION FOTO BEFORE (SEBELUM TINDAKAN / TREATMENT) */}
                            <div className="p-3 border-round-xl border-1 surface-border bg-white">
                                <div className="flex align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border">
                                    <label className="text-xs font-extrabold text-700 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                        <i className="pi pi-camera text-teal-600 text-sm" />
                                        FOTO BEFORE (SEBELUM TINDAKAN / TREATMENT)
                                    </label>
                                    <span className="text-[10px] text-500 font-semibold">
                                        {headerRMData.foto_before ? '✅ Foto Terunggah' : 'Dokumentasi Kondisi Awal Pasien'}
                                    </span>
                                </div>
                                <div className="flex flex-column sm:flex-row align-items-center gap-3">
                                    {headerRMData.foto_before ? (
                                        <div className="relative border-round-xl overflow-hidden border-2 border-teal-500 shadow-1 text-center bg-teal-50/40 p-2" style={{ maxWidth: '220px' }}>
                                            <img
                                                src={headerRMData.foto_before}
                                                alt="Foto Before"
                                                className="w-full border-round-lg shadow-1"
                                                style={{ maxHeight: '160px', objectFit: 'cover' }}
                                            />
                                            {!isFormSaved && (
                                                <div className="flex gap-2 mt-2 justify-content-center">
                                                    <Button
                                                        type="button"
                                                        label="Ganti Foto"
                                                        icon="pi pi-refresh"
                                                        size="small"
                                                        outlined
                                                        severity="info"
                                                        className="text-xs font-bold p-1 px-2.5"
                                                        onClick={() => document.getElementById('before_photo_input_tindakan')?.click()}
                                                        loading={uploadingBefore}
                                                    />
                                                    <Button
                                                        type="button"
                                                        label="Hapus"
                                                        icon="pi pi-trash"
                                                        size="small"
                                                        outlined
                                                        severity="danger"
                                                        className="text-xs font-bold p-1 px-2.5"
                                                        onClick={() => {
                                                            pendingBeforePhotoRef.current = null;
                                                            setHeaderRMData({ ...headerRMData, foto_before: '' });
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div
                                            className="border-2 border-dashed border-300 hover:border-teal-500 border-round-xl flex flex-column align-items-center justify-content-center p-4 text-center cursor-pointer bg-gray-50 hover:bg-teal-50/30 transition-all w-full sm:w-22rem"
                                            onClick={() => !isFormSaved && document.getElementById('before_photo_input_tindakan')?.click()}
                                        >
                                            {uploadingBefore ? (
                                                <div className="py-2">
                                                    <ProgressSpinner style={{ width: '28px', height: '28px' }} />
                                                    <span className="text-xs text-500 block mt-1 font-semibold">Mengunggah Foto Before...</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <i className="pi pi-cloud-upload text-teal-600 text-3xl mb-1.5" />
                                                    <span className="text-xs font-bold text-700 block">Unggah Foto Before Tindakan</span>
                                                    <span className="text-[10px] text-400 block mt-0.5">Format: JPG, PNG, WEBP (Maks 5MB)</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <input
                                        id="before_photo_input_tindakan"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleBeforePhotoUpload}
                                        disabled={isFormSaved || uploadingBefore}
                                    />
                                </div>
                            </div>

                            {/* 1. DISPLAY FORM HASIL KONSULTASI DOKTER DI RUANG TINDAKAN (READ-ONLY) */}
                            {hasDataKonsul && (
                                <div className="p-3 border-round-xl border-1 surface-border bg-white">
                                    <div className="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
                                        <i className="pi pi-file-edit text-500 text-sm" />
                                        <span className="font-extrabold text-700 text-xs uppercase tracking-wider">FORM HASIL KONSULTASI DOKTER (DARI SESI KONSULTASI)</span>
                                    </div>
                                    <div className="grid text-xs">
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Keluhan Utama Pasien:</span>
                                            <span className="font-bold text-900 text-sm block">{dataKonsul.data_konsultasi_keluhan || '-'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Riwayat Alergi:</span>
                                            <span className="font-bold text-red-600 text-sm block">{dataKonsul.data_konsultasi_riwayat_alergi || 'Tidak Ada'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Diagnosis Dokter:</span>
                                            <span className="font-bold text-900 text-sm block">{dataKonsul.data_konsultasi_diagnosis || '-'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Rencana Penanganan (SOAP Plan):</span>
                                            <span className="font-bold text-900 text-sm block">{dataKonsul.data_konsultasi_plan || dataKonsul.data_konsultasi_assessment || '-'}</span>
                                        </div>

                                        {extraFormFields.length > 0 && (
                                            <div className="col-12 mt-2 pt-2 border-top-1 surface-border grid">
                                                <span className="font-bold text-700 block col-12 mb-1">Catatan Isian Tambahan Konsultasi:</span>
                                                {extraFormFields.map((ef, idx) => (
                                                    <div key={idx} className="col-12 md:col-6 mb-1">
                                                        <span className="font-semibold text-color-secondary block">{ef.label}:</span>
                                                        <span className="font-bold text-900">{ef.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2. DISPLAY PRODUK PILIHAN DOKTER KONSULTASI */}
                            {resepProdukDokter.length > 0 && (
                                <div className="p-3 border-round-xl border-1 surface-border bg-white shadow-xs">
                                    <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
                                        <div className="flex align-items-center gap-2">
                                            <div className="w-2rem h-2rem border-round-md bg-amber-50 text-amber-600 flex align-items-center justify-content-center flex-shrink-0">
                                                <i className="pi pi-shopping-bag text-sm" />
                                            </div>
                                            <div>
                                                <span className="font-extrabold text-700 text-xs uppercase tracking-wider block">
                                                    PRODUK &amp; RESEP PILIHAN DOKTER KONSULTASI
                                                </span>
                                                <span className="text-[11px] text-500">
                                                    Direkomendasikan oleh dokter untuk pasien ini &amp; otomatis diteruskan ke kasir
                                                </span>
                                            </div>
                                        </div>
                                        <Tag
                                            severity="warning"
                                            value={`${resepProdukDokter.length} Produk`}
                                            icon="pi pi-sparkles"
                                            className="text-xs font-bold px-2.5 py-1"
                                        />
                                    </div>

                                    <div className="grid">
                                        {resepProdukDokter.map((prod: any, idx: number) => {
                                            const hrg = parseFloat(prod.harga || prod.harga_jual || 0);
                                            const qty = parseInt(prod.qty || 1, 10);
                                            const total = prod.subtotal ? parseFloat(prod.subtotal) : hrg * qty;
                                            return (
                                                <div key={idx} className="col-12 md:col-6 mb-2">
                                                    <div className="p-2.5 border-round-lg border-1 border-amber-200 bg-amber-50/50 flex align-items-center justify-content-between gap-2">
                                                        <div className="flex align-items-center gap-2.5 min-w-0">
                                                            <div className="w-2.2rem h-2.2rem border-round-md bg-white border-1 border-amber-200 text-amber-700 flex align-items-center justify-content-center font-bold text-xs flex-shrink-0">
                                                                <i className="pi pi-box text-sm" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-xs text-900 block truncate" title={prod.nama_produk || prod.nama}>
                                                                    {prod.nama_produk || prod.nama}
                                                                </span>
                                                                <span className="text-[11px] text-600 block">
                                                                    {prod.kode_produk} • {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(hrg)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="inline-block bg-amber-600 text-white font-bold text-xs px-2 py-0.5 border-round-md">
                                                                {qty} {prod.satuan || 'pcs'}
                                                            </span>
                                                            {total > 0 && (
                                                                <span className="text-[10px] text-amber-900 font-bold block mt-0.5">
                                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(total)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SECTION CATATAN PETUGAS / OBSERVASI RUANGAN */}
                            <div className="p-3 border-round-xl border-1 surface-border bg-white">
                                <label className="block text-xs font-extrabold text-700 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                                    <i className="pi pi-pencil text-500 text-sm" />
                                    CATATAN PETUGAS &amp; OBSERVASI TINDAKAN RUANGAN
                                </label>
                                <InputTextarea
                                    value={catatanPetugas}
                                    onChange={(e) => setCatatanPetugas(e.target.value)}
                                    rows={4}
                                    placeholder="Tuliskan rincian hasil tindakan, obat/alat yang digunakan, resep, atau catatan khusus observasi pasien saat berada di ruangan ini..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md bg-white border-300"
                                />
                            </div>

                            {/* ACTION FOOTER BAR: LANJUT KE STEP 2 */}
                            <div className="flex align-items-center justify-content-end gap-3 mt-2 pt-3 border-top-1 surface-border">
                                <Button
                                    label="Selanjutnya →"
                                    icon="pi pi-arrow-right"
                                    iconPos="right"
                                    severity="success"
                                    size="small"
                                    onClick={() => {
                                        if (!selectedPetugas) {
                                            showError(toast, 'Petugas / Dokter Penanggung Jawab wajib dipilih!');
                                            return;
                                        }
                                        setActiveStep('hasil');
                                    }}
                                    className="font-bold text-xs bg-teal-600 border-none border-round-lg px-4 text-white shadow-2"
                                />
                            </div>
                        </div>
                    ) : (
                        /* TAB 2: PANEL HASIL TREATMENT & REKOMENDASI PRODUK KASIR */
                        <div className="p-3 sm:p-4 bg-white">
                            <HasilTreatmentPanel
                                activePatient={activePatient}
                                toast={toast}
                                getGridData={getGridData}
                                kodeRuangan={kodeRuangan}
                                namaRuangan={namaRuangan}
                                savedFormData={{ ...formData, foto_before: headerRMData.foto_before }}
                                savedCatatanPetugas={catatanPetugas}
                                savedPetugasNama={scheduledPj?.nama_karyawan || scheduledPj?.nama || activePatient?.nama_petugas}
                                selectedPetugas={selectedPetugas}
                                initialFotoBeforeUrl={headerRMData.foto_before}
                                onFotoBeforeChange={(url) => setHeaderRMData((prev) => ({ ...prev, foto_before: url }))}
                                onHasilSavedChange={(saved) => setIsHasilSaved(saved)}
                            />
                        </div>
                    )}
                </div>
            )}
            </div>

            {/* CONFIRM DIALOG & HASIL MODAL */}
            <Dialog
                visible={showConfirmModal && !showHasilModal}
                onHide={() => setShowConfirmModal(false)}
                header="Konfirmasi Penanganan & Rekomendasi"
                style={{ width: '480px' }}
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Batal"
                            icon="pi pi-times"
                            className="p-button-outlined p-button-secondary text-xs"
                            onClick={() => setShowConfirmModal(false)}
                        />
                        <Button
                            label="Ya, Simpan & Terbitkan"
                            icon="pi pi-check"
                            className="p-button-success font-bold text-xs"
                            onClick={handleConfirmAccept}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 py-1 text-left">
                    <div className="p-3 border-round-xl" style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4' }}>
                        <span className="text-[10px] font-bold uppercase block" style={{ color: '#0d9488' }}>Pasien Aktif</span>
                        <span className="font-extrabold text-sm block" style={{ color: '#134e4a' }}>{activePatient?.nama_pasien || hasilPasienNama || 'Pasien'}</span>
                        <span className="text-xs" style={{ color: '#0f766e' }}>No. RM: {activePatient?.no_rm || hasilNoRm} | Ruangan: {namaRuangan}</span>
                    </div>

                    <div className="flex flex-column gap-2">
                        {rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).length > 0 && (
                            <div className="p-3 border-round-xl text-xs" style={{ background: '#f0fdfa', border: '1.5px solid #5eead4' }}>
                                <span className="font-bold block mb-1" style={{ color: '#0f766e' }}>
                                    <i className="pi pi-ticket mr-1" />
                                    Menerbitkan {rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).length} Nomor Antrean Layanan:
                                </span>
                                <span className="font-semibold" style={{ color: '#115e59' }}>{rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).map((l) => l.nama).join(', ')}</span>
                            </div>
                        )}

                        {rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).length > 0 && (
                            <div className="p-3 border-round-xl text-xs" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
                                <span className="font-bold block mb-1" style={{ color: '#b45309' }}>
                                    <i className="pi pi-shopping-bag mr-1" />
                                    Memasukkan {rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).length} Produk ke Draf Transaksi Kasir:
                                </span>
                                <span className="font-semibold" style={{ color: '#78350f' }}>{rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).map((p) => `${p.nama} (${p.qty || 1}x)`).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-700 m-0">
                        Apakah Anda yakin ingin menyimpan hasil penanganan &amp; menerbitkan nomor antrean/transaksi untuk pasien ini?
                    </p>
                </div>
            </Dialog>

            <DialogHasilTerbitAntrian
                visible={showHasilModal}
                onHide={() => setShowHasilModal(false)}
                pasienNama={hasilPasienNama}
                noRm={hasilNoRm}
                kodeKunjungan={hasilKodeKunjungan}
                antrianList={hasilAntrianList}
                transaksiDraft={hasilTransaksiDraft}
            />

            {/* DRAWER PANEL RIWAYAT PASIEN */}
            <DrawerRiwayatPasien
                visible={drawerRiwayatVisible}
                onHide={() => setDrawerRiwayatVisible(false)}
                noRm={activePatient?.no_rm || ''}
                namaPasien={activePatient?.nama_pasien || ''}
                excludeKodeKunjungan={activePatient?.kode_kunjungan || ''}
                toast={toast}
            />

            {/* OVERLAY PANEL PETUGAS PENDAMPING (DETAIL HELPER DROPDOWN) */}
            <OverlayPanel ref={helperOpRef} className="shadow-4 border-round-xl">
                {activeHelperData && (
                    <div style={{ maxWidth: '320px' }}>
                        <div className="font-bold text-xs text-900 mb-1 flex align-items-center gap-1">
                            <Users size={14} className="text-primary" />
                            <span>Tim Petugas Sesi ({activeHelperData.ruangan})</span>
                        </div>
                        <div className="text-[11px] text-500 mb-2">Shift: {activeHelperData.jam}</div>
                        <div className="text-xs p-2 bg-primary-50 border-round mb-2 border-1 border-primary-100">
                            <div className="font-semibold text-primary-900 text-[11px]">Penanggung Jawab (PJ):</div>
                            <div className="font-bold text-primary-700">{activeHelperData.pj}</div>
                        </div>
                        <div className="text-[11px] font-semibold text-700 mb-1">
                            Petugas Pendamping ({activeHelperData.helpers.length}):
                        </div>
                        <ul className="m-0 pl-3 text-xs text-600">
                            {activeHelperData.helpers.map((c: any, i: number) => {
                                const helperJam = c.jam_mulai && c.jam_selesai
                                    ? ` (${c.jam_mulai.slice(0, 5)} - ${c.jam_selesai.startsWith('24:00') ? '00:00' : c.jam_selesai.slice(0, 5)})`
                                    : '';
                                return (
                                    <li key={i} className="mb-1">
                                        <span className="font-medium text-900">{c.nama_karyawan || c.nama || c.nama_petugas}</span>
                                        {(c.jabatan || c.peran) && (
                                            <span className="text-500 text-[11px]"> — {c.jabatan || c.peran}</span>
                                        )}
                                        {helperJam && <span className="text-400 text-[10px]">{helperJam}</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </OverlayPanel>
        </>
    );
};
