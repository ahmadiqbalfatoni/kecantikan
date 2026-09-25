'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Dialog } from 'primereact/dialog';
import postData from '@/lib/axios/postData';
import { getTzUser } from '@/lib/tools/dateTools';
import { showError, showSuccess, showWarning, showInfo } from '@/lib/tools/generalTools';
import { DialogJadwalMingguanRuangan, RoomTabOption } from '../../booking/components/DialogJadwalMingguanRuangan';
import { DialogSemuaBookingRuangan } from './DialogSemuaBookingRuangan';
import {
  LayananCard,
  ServiceItem,
  RuanganGroup,
  getItemConsultType,
} from '@/app/(main)/pendaftaran-antrean/components/shared/LayananCard';
import { KarcisAntrianModal } from './dialogs/KarcisAntrianModal';
import { KarcisAntrianLayananModal } from './dialogs/KarcisAntrianLayananModal';
import {
  User,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Info,
  ChevronDown,
  Users,
  Ticket,
  Stethoscope,
} from 'lucide-react';

interface Pasien {
  id?: number;
  no_rm: string;
  nama: string;
  nik?: string;
  no_hp?: string;
  jenis_kelamin?: string;
  tanggal_lahir?: string;
  alamat?: string;
  provinsi?: string;
  kota_kabupaten?: string;
  kecamatan?: string;
  kelurahan_desa?: string;
  patokan?: string;
}

interface SlotItem {
  kode_jadwal: string;
  no_sip: string;
  nama_petugas: string;
  jabatan_petugas: string;
  is_penanggung_jawab?: boolean;
  has_pj?: boolean;
  petugas_pendamping?: Array<{
    kode_jadwal?: string;
    no_sip: string;
    nama_petugas: string;
    jabatan_petugas: string;
  }>;
  jumlah_pendamping?: number;
  kode_ruangan: string;
  nama_ruangan: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  kuota_total: number;
  kuota_terisi: number;
  sisa_kuota: number;
  is_available: boolean;
  is_past_today?: boolean;
  is_not_started_today?: boolean;
  is_ongoing_now?: boolean;
}

interface Props {
  toast: React.RefObject<Toast>;
  onSuccess?: () => void;
}

export const FormPendaftaranKunjungan: React.FC<Props> = ({ toast, onSuccess }) => {
  const searchParams = useSearchParams();
  const noRmParam = searchParams.get('no_rm') || searchParams.get('norm') || '';

  // 1. Pasien State
  const [pasienSearch, setPasienSearch] = useState('');
  const [pasienList, setPasienList] = useState<Pasien[]>([]);
  const [loadingPasien, setLoadingPasien] = useState(false);
  const [selectedPasien, setSelectedPasien] = useState<Pasien | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedNoRmRef = useRef<string>('');


  // 2. Tanggal & Ruangan State
  const [tanggalKunjungan, setTanggalKunjungan] = useState<Date>(new Date());
  const [ruangans, setRuangans] = useState<RuanganGroup[]>([]);
  const [loadingRuangan, setLoadingRuangan] = useState(true);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [selectedMap, setSelectedMap] = useState<{ [key: string]: ServiceItem }>({});
  const [activeRuangan, setActiveRuangan] = useState<string | null>(null);
  const [ownedPackages, setOwnedPackages] = useState<any[]>([]);
  const [globalConsultChoice, setGlobalConsultChoice] = useState<boolean>(true);

  // 3. Slot Jadwal State
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [consultSlots, setConsultSlots] = useState<SlotItem[]>([]);
  const [selectedConsultSlot, setSelectedConsultSlot] = useState<SlotItem | null>(null);
  const [dokterKonsulList, setDokterKonsulList] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);

  // 4. Modal Karcis Antrean State
  const [karcisVisible, setKarcisVisible] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [antrianLayananModalVisible, setAntrianLayananModalVisible] = useState(false);
  const [antrianLayananData, setAntrianLayananData] = useState<any>(null);

  // 5. Submit State
  const [submitting, setSubmitting] = useState(false);
  const [showWarningBookingDialog, setShowWarningBookingDialog] = useState(false);
  const [warningBookingData, setWarningBookingData] = useState<{
    kode_ruangan?: string;
    nama_ruangan?: string;
    estimasi_selesai?: string;
    batas_aman?: string;
    jam_booking?: string;
    nama_pasien_booking?: string;
    no_rm_booking?: string;
    kode_booking?: string;
    total_beban_menit?: number;
    durasi_walkin_menit?: number;
    sisa_antrean_menit?: number;
    buffer_menit?: number;
    antrean_berjalan_count?: number;
    total_booking_hari_ini?: number;
    is_lanjutan_konsultasi?: boolean;
    durasi_konsultasi_menit?: number;
    sisa_antrean_konsul_menit?: number;
    antrean_konsul_count?: number;
    durasi_tindakan_menit?: number;
  } | null>(null);

  // 5b. Dialog Semua Jadwal Booking Hari Ini
  const [selectedRuanganForBookings, setSelectedRuanganForBookings] = useState<RuanganGroup | null>(null);
  const [dialogAllBookingsVisible, setDialogAllBookingsVisible] = useState(false);

  // 6. Dialog Jadwal Mingguan Ruangan
  const [showJadwalRuanganDialog, setShowJadwalRuanganDialog] = useState(false);
  const [jadwalDialogRooms, setJadwalDialogRooms] = useState<RoomTabOption[]>([]);
  const [consultRoomInfo, setConsultRoomInfo] = useState<{ kode_ruangan: string; nama_ruangan: string } | null>(null);

  // 7. Popover Pendamping
  const companionOpRef = useRef<OverlayPanel>(null);
  const [activeCompanionData, setActiveCompanionData] = useState<{
    pj: string;
    jam: string;
    ruangan: string;
    companions: Array<{
      nama_petugas: string;
      jabatan_petugas?: string;
      no_sip?: string;
    }>;
  } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDateToYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const calculateAge = (birthDateStr?: string | null): number | null => {
    if (!birthDateStr) return null;
    try {
      const cleanStr = birthDateStr.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const birth = new Date(year, month, day);
        if (!isNaN(birth.getTime())) {
          const now = new Date();
          let age = now.getFullYear() - birth.getFullYear();
          const m = now.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
            age--;
          }
          return age >= 0 ? age : null;
        }
      }
      const birth = new Date(birthDateStr);
      if (isNaN(birth.getTime())) return null;
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch (_) {
      return null;
    }
  };

  const getFormattedAddress = (p?: Pasien | null) => {
    if (!p) return '-';
    const parts = [p.kelurahan_desa, p.kecamatan, p.kota_kabupaten, p.provinsi].filter(Boolean);
    let addr = parts.join(', ');
    if (!addr && p.alamat) addr = p.alamat;
    if (p.patokan) {
      addr = addr ? `${addr} (${p.patokan})` : p.patokan;
    }
    return addr || '-';
  };

  // Helper ringkasan pendamping
  const getCompanionSummary = (companions: Array<{ nama_petugas: string }>, total: number) => {
    const count = total || (companions ? companions.length : 0);
    if (count <= 0) return '';
    if (count === 1) return companions[0]?.nama_petugas || '1 petugas';
    if (count === 2) return `${companions[0]?.nama_petugas || ''}, ${companions[1]?.nama_petugas || ''}`;
    return `${companions[0]?.nama_petugas || ''}, ${companions[1]?.nama_petugas || ''}, +${count - 2} lainnya`;
  };

  // Load Ruangan & Layanan saat mount
  useEffect(() => {
    fetchRuanganOptions();
  }, []);

  const fetchRuanganOptions = async () => {
    setLoadingRuangan(true);
    try {
      const res = await postData('/master/pendaftaran-pasien-layanan-options');
      if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
        const rawRuangan = res.data?.data?.ruangan_layanan || res.data?.data?.kategori_layanan || [];
        setRuangans(rawRuangan);
        if (res.data?.data?.ruang_konsultasi) {
          setConsultRoomInfo(res.data.data.ruang_konsultasi);
        }
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat pilihan layanan');
      }
    } catch (error) {
      showError(toast, 'Terjadi kesalahan saat memuat daftar layanan & ruangan');
    } finally {
      setLoadingRuangan(false);
    }
  };

  // Search Pasien dengan debounce
  const handleSearchPasien = (query: string) => {
    setPasienSearch(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!query.trim()) {
      setPasienList([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setLoadingPasien(true);
      try {
        const res = await postData('/master/pendaftaran-pasien-cari', {
          keyword: query.trim(),
          page: 1,
          perPage: 6,
        });
        if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
          setPasienList(res.data?.data || []);
        } else {
          setPasienList([]);
        }
      } catch (err) {
        setPasienList([]);
      } finally {
        setLoadingPasien(false);
      }
    }, 300);
  };

  // Auto-select pasien jika ada parameter no_rm pada URL
  const loadPasienByNoRm = async (noRm: string) => {
    // JANGAN eksekusi jika URL ditujukan untuk Booking / Tab lain!
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isBooking =
        params.get('tab') === '1' ||
        params.get('tab') === 'booking' ||
        params.get('create') === 'true' ||
        params.get('create_booking') === 'true';
      if (isBooking) return;
    }

    const cleanNoRm = (noRm || '').trim();
    if (!cleanNoRm || lastLoadedNoRmRef.current.toLowerCase() === cleanNoRm.toLowerCase()) return;
    lastLoadedNoRmRef.current = cleanNoRm;

    setLoadingPasien(true);
    try {
      const res = await postData('/master/pendaftaran-pasien-cari', {
        no_rm: cleanNoRm,
        page: 1,
        perPage: 5,
      });
      if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
        const list: Pasien[] = res.data?.data || [];
        const matched = list.find((p) => (p.no_rm || '').toLowerCase() === cleanNoRm.toLowerCase()) || list[0];
        if (matched) {
          setSelectedPasien(matched);
          showSuccess(toast, `Pasien ${matched.nama} (${matched.no_rm}) berhasil dipilih untuk pendaftaran`);

          // Bersihkan URL query parameter agar tidak terus-menerus menempel saat berpindah tab atau refresh
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('no_rm');
            url.searchParams.delete('norm');
            window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
          }
        }
      }
    } catch (err) {
      // Fallback diam-diam ke tampilan pencarian biasa
    } finally {
      setLoadingPasien(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isBooking =
        params.get('tab') === '1' ||
        params.get('tab') === 'booking' ||
        params.get('create') === 'true' ||
        params.get('create_booking') === 'true';
      if (isBooking) return;
    }

    if (noRmParam && (!selectedPasien || selectedPasien.no_rm.toLowerCase() !== noRmParam.toLowerCase())) {
      loadPasienByNoRm(noRmParam);
    }

    // Cleanup saat unmount jika pengguna meninggalkan halaman pendaftaran tanpa menyelesaikan
    return () => {
      if (typeof window !== 'undefined' && window.location.search) {
        const url = new URL(window.location.href);
        const isBooking =
          url.searchParams.get('tab') === '1' ||
          url.searchParams.get('tab') === 'booking' ||
          url.searchParams.get('create') === 'true' ||
          url.searchParams.get('create_booking') === 'true';
        if (!isBooking && (url.searchParams.has('no_rm') || url.searchParams.has('norm'))) {
          url.searchParams.delete('no_rm');
          url.searchParams.delete('norm');
          window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
        }
      }
    };
  }, [noRmParam]);

  // Fetch Paket yang Dimiliki Pasien
  useEffect(() => {
    if (selectedPasien?.no_rm) {
      fetchOwnedPackages(selectedPasien.no_rm);
    } else {
      setOwnedPackages([]);
    }
  }, [selectedPasien?.no_rm]);

  const fetchOwnedPackages = async (noRm: string) => {
    try {
      const res = await postData('/master/pendaftaran-pasien-kepemilikan-paket', {
        no_rm: noRm,
        status: 'aktif',
      });
      if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
        setOwnedPackages(res?.data?.data || []);
      } else {
        setOwnedPackages([]);
      }
    } catch (err) {
      setOwnedPackages([]);
    }
  };

  const claimablePackages = useMemo(() => {
    return (ownedPackages || []).filter((pkg: any) => {
      if (pkg.status && pkg.status.toLowerCase() !== 'aktif') return false;
      return (pkg.details || []).some((det: any) => (det.sisa_sesi || 0) > 0);
    });
  }, [ownedPackages]);

  useEffect(() => {
    setActiveTabIndex(0);
  }, [claimablePackages.length]);

  // Toggle Layanan / Paket
  const handleToggleItem = (item: ServiceItem) => {
    const key = item.jenis === 'klaim_paket'
      ? `klaim_${item.kode_detail_kepemilikan_paket_layanan || item.kode_layanan}`
      : `${item.jenis}_${item.kode_layanan}`;

    const isCurrentlySelected = !!selectedMap[key];

    if (isCurrentlySelected) {
      const newMap = { ...selectedMap };
      delete newMap[key];
      setSelectedMap(newMap);
      const remainingItems = Object.values(newMap);
      if (remainingItems.length === 0) {
        setActiveRuangan(null);
      }
    } else {
      // Cek apakah item layanan reguler sudah dipilih via klaim paket
      if (item.jenis === 'layanan') {
        const isClaimed = Object.values(selectedMap).some(
          (it) => it.jenis === 'klaim_paket' && it.kode_layanan === item.kode_layanan
        );
        if (isClaimed) {
          showError(
            toast,
            `Layanan "${item.nama}" sudah Anda pilih melalui klaim paket aktif (Rp 0). Batalkan klaim paket terlebih dahulu jika ingin memilih layanan reguler.`
          );
          return;
        }
      }

      if (item.jenis === 'klaim_paket' && item.tanggal_expired) {
        const curDateStr = formatDateToYMD(tanggalKunjungan);
        if (curDateStr > item.tanggal_expired) {
          showError(toast, `Paket "${item.nama}" sudah kedaluwarsa pada ${item.tanggal_expired}`);
          return;
        }
      }

      if (activeRuangan !== null && activeRuangan !== item.kode_ruangan) {
        const currentSelectedRoom = Object.values(selectedMap)[0]?.nama_ruangan || activeRuangan;
        showError(
          toast,
          `Anda hanya dapat memilih layanan/paket dalam 1 ruangan yang sama per kunjungan. Saat ini ruangan: ${currentSelectedRoom}. Batalkan pilihan sebelumnya jika ingin berganti ruangan.`
        );
        return;
      }

      // Jika memilih klaim paket, otomatis batalkan layanan reguler berbayar dengan kode sama jika ada
      let newMap = { ...selectedMap };
      if (item.jenis === 'klaim_paket') {
        const regularKey = `layanan_${item.kode_layanan}`;
        if (newMap[regularKey]) {
          delete newMap[regularKey];
        }
      }

      newMap[key] = item;
      setSelectedMap(newMap);
      setActiveRuangan(item.kode_ruangan || null);
      setGlobalConsultChoice(true);
    }
  };

  const selectedList = Object.values(selectedMap);
  const totalHarga = selectedList.reduce((acc, curr) => acc + (curr.jenis === 'klaim_paket' ? 0 : (curr.harga_asal ?? curr.harga)), 0);
  const totalDurasi = selectedList.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0);

  const activeRoomName = useMemo(() => {
    if (!activeRuangan) return '';
    const r = ruangans.find((x) => x.kode_ruangan === activeRuangan);
    return r?.nama_ruangan || selectedList[0]?.nama_ruangan || `Ruangan ${activeRuangan}`;
  }, [activeRuangan, ruangans, selectedList]);

  // Cek Kebutuhan Konsultasi Dokter
  const hasWajibKonsul = useMemo(() => {
    return selectedList.some((item) => {
      const { isWajib } = getItemConsultType(item);
      return isWajib;
    });
  }, [selectedList]);

  const hasOpsionalKonsul = useMemo(() => {
    return selectedList.some((item) => {
      const { isOpsional } = getItemConsultType(item);
      return isOpsional;
    });
  }, [selectedList]);

  const effectiveButuhKonsul = useMemo(() => {
    if (hasWajibKonsul) return true;
    if (hasOpsionalKonsul) return globalConsultChoice;
    return false;
  }, [hasWajibKonsul, hasOpsionalKonsul, globalConsultChoice]);

  // Status Dokter Jaga di Ruang Konsultasi untuk Registrasi Walk-In Hari Ini
  const consultDoctorStatus = useMemo(() => {
    if (!hasOpsionalKonsul && !hasWajibKonsul) return null;
    if (!dokterKonsulList || dokterKonsulList.length === 0) {
      return {
        hasDoctorToday: false,
        isDoctorAvailableNow: false,
        latestEndStr: '',
        earliestStartStr: '',
        doctorNames: '',
        fullScheduleStr: '',
        detailedSchedules: '',
      };
    }
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let latestEndMin = 0;
    let earliestStartMin = 24 * 60;
    let hasAvailableNow = false;
    const docNames: string[] = [];
    const scheduleParts: string[] = [];

    for (const doc of dokterKonsulList) {
      const [sh, sm] = (doc.jam_mulai || '').slice(0, 5).split(':').map(Number);
      const [eh, em] = (doc.jam_selesai || '').slice(0, 5).split(':').map(Number);
      const startM = (isNaN(sh) ? 8 : sh) * 60 + (isNaN(sm) ? 0 : sm);
      const endM = (isNaN(eh) ? 16 : eh) * 60 + (isNaN(em) ? 0 : em);

      if (startM < earliestStartMin) earliestStartMin = startM;
      if (endM > latestEndMin) latestEndMin = endM;
      if (nowMin >= startM && nowMin < endM) {
        hasAvailableNow = true;
      }

      const docName = doc.nama_dokter || doc.nama_karyawan || doc.nama_petugas || 'Dokter Konsultasi';
      if (!docNames.includes(docName)) docNames.push(docName);

      const sStr = `${String(Math.floor(startM / 60)).padStart(2, '0')}:${String(startM % 60).padStart(2, '0')}`;
      const eStr = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
      scheduleParts.push(`${docName} (${sStr}-${eStr} WIB)`);
    }

    const latestEndStr = `${String(Math.floor(latestEndMin / 60)).padStart(2, '0')}:${String(latestEndMin % 60).padStart(2, '0')}`;
    const earliestStartStr = `${String(Math.floor(earliestStartMin / 60)).padStart(2, '0')}:${String(earliestStartMin % 60).padStart(2, '0')}`;

    return {
      hasDoctorToday: true,
      isDoctorAvailableNow: hasAvailableNow,
      latestEndStr,
      earliestStartStr,
      doctorNames: docNames.join(', '),
      fullScheduleStr: `${earliestStartStr} - ${latestEndStr} WIB`,
      detailedSchedules: scheduleParts.join('; '),
    };
  }, [hasOpsionalKonsul, hasWajibKonsul, dokterKonsulList]);

  // Otomatis alihkan alur jika dokter konsultasi tidak aktif saat opsi "Konsultasi Dokter Dulu" dipilih
  const prevConsultAlertKeyRef = useRef<string>('');
  useEffect(() => {
    if (
      hasOpsionalKonsul &&
      !hasWajibKonsul &&
      globalConsultChoice &&
      consultDoctorStatus &&
      !loadingSlots &&
      dokterKonsulList.length > 0 &&
      !consultDoctorStatus.isDoctorAvailableNow
    ) {
      setGlobalConsultChoice(false);
      const alertKey = `${consultDoctorStatus.hasDoctorToday}_${consultDoctorStatus.latestEndStr}`;
      if (prevConsultAlertKeyRef.current !== alertKey) {
        prevConsultAlertKeyRef.current = alertKey;
        showWarning(
          toast,
          consultDoctorStatus.hasDoctorToday
            ? `Alur kunjungan otomatis dialihkan ke "Langsung Tindakan" karena jam dinas dokter di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} telah selesai (pukul ${consultDoctorStatus.latestEndStr} WIB).`
            : `Alur kunjungan otomatis dialihkan ke "Langsung Tindakan" karena tidak ada jadwal dokter jaga di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} hari ini.`
        );
      }
    }
  }, [hasOpsionalKonsul, hasWajibKonsul, globalConsultChoice, consultDoctorStatus, loadingSlots, dokterKonsulList.length, consultRoomInfo?.nama_ruangan, toast]);

  // Status apakah konsultasi dokter tidak tersedia saat alur konsultasi aktif
  const isConsultDoctorUnavailable = Boolean(
    activeRuangan &&
    effectiveButuhKonsul &&
    !loadingSlots &&
    consultDoctorStatus &&
    !consultDoctorStatus.isDoctorAvailableNow
  );

  // Reset selectedSlot jika dokter konsultasi tidak tersedia
  useEffect(() => {
    if (isConsultDoctorUnavailable && selectedSlot) {
      setSelectedSlot(null);
    }
  }, [isConsultDoctorUnavailable, selectedSlot]);

  // Hitung estimasi jeda waktu tunggu antara jam sekarang (konsultasi awal) vs jam mulai sesi tindakan
  const sessionWaitGapInfo = useMemo(() => {
    if (!effectiveButuhKonsul || !selectedSlot) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = (selectedSlot.jam_mulai || '').slice(0, 5).split(':').map(Number);
    const slotStartMin = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);

    // Jika sesi tindakan baru dimulai lebih dari 30 menit dari sekarang
    const diffMinutes = slotStartMin - nowMin;
    if (diffMinutes > 30) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const waitStr = hours > 0 ? (mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`) : `${mins} menit`;
      return {
        hasGap: true,
        diffMinutes,
        waitStr,
        slotStartStr: selectedSlot.jam_mulai,
        nowStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      };
    }
    return null;
  }, [effectiveButuhKonsul, selectedSlot]);

  // Dialog Jadwal Mingguan Ruangan
  const handleOpenJadwalDialog = () => {
    const consultRoomCode = consultRoomInfo?.kode_ruangan || 'RNG-007';
    const consultRoomName = consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi Dokter';

    // Jika layanan terpilih memiliki alur konsultasi (opsional / wajib), sediakan kedua tab ruangan:
    // Tab 1: Ruang Konsultasi Dokter (agar pengguna bisa melihat seluruh jadwal dokter seminggu di Ruang Konsultasi)
    // Tab 2: Ruangan Treatment (misal: Ruang A)
    if (hasOpsionalKonsul || hasWajibKonsul) {
      const roomList: RoomTabOption[] = [
        {
          kodeRuangan: consultRoomCode,
          namaRuangan: consultRoomName,
          iconType: 'doctor',
        },
      ];
      if (activeRuangan && activeRuangan !== consultRoomCode) {
        roomList.push({
          kodeRuangan: activeRuangan,
          namaRuangan: activeRoomName || 'Ruangan Treatment',
          iconType: 'treatment',
        });
      }
      setJadwalDialogRooms(roomList);
    } else {
      if (!activeRuangan) return;
      setJadwalDialogRooms([
        {
          kodeRuangan: activeRuangan,
          namaRuangan: activeRoomName || 'Ruangan Treatment',
          iconType: 'treatment',
        },
      ]);
    }
    setShowJadwalRuanganDialog(true);
  };

  // Group slots per sesi
  const groupSlotsBySession = (rawSlots: SlotItem[]): SlotItem[] => {
    const sessionMap = new Map<string, SlotItem[]>();

    for (const slot of rawSlots) {
      const jamMulaiClean = (slot.jam_mulai || '').slice(0, 5);
      const jamSelesaiClean = (slot.jam_selesai || '').slice(0, 5);
      const key = `${slot.kode_ruangan || ''}_${(slot.hari || '').toLowerCase()}_${jamMulaiClean}_${jamSelesaiClean}`;

      if (!sessionMap.has(key)) {
        sessionMap.set(key, []);
      }
      sessionMap.get(key)!.push({
        ...slot,
        jam_mulai: jamMulaiClean,
        jam_selesai: jamSelesaiClean,
      });
    }

    const result: SlotItem[] = [];

    for (const items of sessionMap.values()) {
      const pjSlot = items.find((s) => s.is_penanggung_jawab) || items[0];
      const hasPJ = items.some((s) => s.is_penanggung_jawab);
      const pjNoSip = String(pjSlot.no_sip || '').trim().toLowerCase();
      const pjNama = String(pjSlot.nama_petugas || '').trim().toLowerCase();

      const seenCompanion = new Set<string>();
      if (pjNoSip) seenCompanion.add(pjNoSip);
      if (pjNama) seenCompanion.add(pjNama);

      const cleanCompanions: Array<{
        kode_jadwal?: string;
        no_sip: string;
        nama_petugas: string;
        jabatan_petugas: string;
      }> = [];

      const addCompanion = (c: {
        kode_jadwal?: string;
        no_sip: string;
        nama_petugas: string;
        jabatan_petugas?: string;
      }) => {
        const cNoSip = String(c.no_sip || '').trim().toLowerCase();
        const cNama = String(c.nama_petugas || '').trim().toLowerCase();
        if (c.kode_jadwal && c.kode_jadwal === pjSlot.kode_jadwal) return;
        if (pjNoSip && cNoSip === pjNoSip) return;
        if (pjNama && cNama === pjNama) return;

        const dedupeKey = cNoSip || cNama;
        if (dedupeKey && seenCompanion.has(dedupeKey)) return;
        if (dedupeKey) seenCompanion.add(dedupeKey);

        cleanCompanions.push({
          kode_jadwal: c.kode_jadwal,
          no_sip: c.no_sip,
          nama_petugas: c.nama_petugas,
          jabatan_petugas: c.jabatan_petugas || 'Terapis / Petugas',
        });
      };

      for (const item of items) {
        if (item.kode_jadwal !== pjSlot.kode_jadwal) {
          addCompanion({
            kode_jadwal: item.kode_jadwal,
            no_sip: item.no_sip,
            nama_petugas: item.nama_petugas,
            jabatan_petugas: item.jabatan_petugas,
          });
        }
        if (Array.isArray(item.petugas_pendamping)) {
          for (const c of item.petugas_pendamping) {
            addCompanion(c);
          }
        }
      }

      // Sinkronkan status ketepatan jam shift dengan waktu lokal perangkat user hari ini
      const isBookingToday = formatDateToYMD(tanggalKunjungan) === formatDateToYMD(new Date());
      let slotPast = Boolean(pjSlot.is_past_today);
      let slotNotStarted = Boolean(pjSlot.is_not_started_today);
      let slotOngoing = Boolean(pjSlot.is_ongoing_now);

      const jMulai = (pjSlot.jam_mulai || '').slice(0, 5);
      const jSelesai = (pjSlot.jam_selesai || '').slice(0, 5);

      if (isBookingToday && jMulai && jSelesai) {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = jMulai.split(':').map(Number);
        const [eh, em] = jSelesai.split(':').map(Number);
        const sMin = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
        const eMin = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);

        slotPast = eMin <= nowMins;
        slotNotStarted = nowMins < sMin;
        slotOngoing = nowMins >= sMin && nowMins < eMin;
      }

      const totalK = parseInt(String(pjSlot.kuota_total || 0), 10);
      const terisiK = parseInt(String(pjSlot.kuota_terisi || 0), 10);
      const sisaK = pjSlot.sisa_kuota !== undefined ? pjSlot.sisa_kuota : Math.max(0, totalK - terisiK);
      const isAvail = sisaK > 0 && !slotPast;

      result.push({
        ...pjSlot,
        has_pj: hasPJ,
        petugas_pendamping: cleanCompanions,
        jumlah_pendamping: cleanCompanions.length,
        sisa_kuota: sisaK,
        kuota_total: totalK,
        is_past_today: slotPast,
        is_not_started_today: slotNotStarted,
        is_ongoing_now: slotOngoing,
        is_available: isAvail,
      });
    }

    return result;
  };

  // Fetch Slot Jadwal saat ruangan & tanggal aktif
  useEffect(() => {
    if (!tanggalKunjungan || !activeRuangan) {
      setSlots([]);
      setDokterKonsulList([]);
      setSelectedSlot(null);
      return;
    }
    fetchSlots();
  }, [tanggalKunjungan, activeRuangan]);

  const fetchSlots = async () => {
    if (!activeRuangan) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setSelectedConsultSlot(null);
    try {
      const tglYmd = formatDateToYMD(tanggalKunjungan);
      const res = await postData('/transaksi/booking/slots', {
        tanggal_booking: tglYmd,
        kode_ruangan: activeRuangan,
        kode_layanan: selectedList[0]?.kode_layanan,
        jenis_layanan: selectedList[0]?.jenis,
        tz: getTzUser() || 'Asia/Jakarta',
      });

      if (res.data?.status === 200 || res.status === 200) {
        const d = res.data?.data;
        const rawSlots: SlotItem[] = d?.slots || [];
        const grouped = groupSlotsBySession(rawSlots);
        setSlots(grouped);

        const rawConsultSlots: SlotItem[] = d?.consult_slots || [];
        const groupedConsult = groupSlotsBySession(rawConsultSlots);
        setConsultSlots(groupedConsult);

        setDokterKonsulList(d?.dokter_konsul || []);
        if (d?.ruang_konsultasi) {
          setConsultRoomInfo(d.ruang_konsultasi);
        }

        const docs = d?.dokter_konsul || [];
        const isDocAvailNow = docs.some((doc: any) => doc.is_ongoing_now || (!doc.is_past_today && !doc.is_not_started_today));
        if (isDocAvailNow) {
          setGlobalConsultChoice(true);
        }

        // Auto-select consult slot yang sedang aktif / bertugas saat ini
        if (groupedConsult.length > 0) {
          const avail = groupedConsult.find((s) => s.is_available && !s.is_past_today && !s.is_not_started_today);
          setSelectedConsultSlot(avail || null);
        } else {
          setSelectedConsultSlot(null);
        }

        // Auto-select slot tindakan yang sedang aktif / bertugas saat ini
        if (grouped.length > 0) {
          const avail = grouped.find((s) => s.is_available && !s.is_past_today && !s.is_not_started_today);
          setSelectedSlot(avail || null);
        } else {
          setSelectedSlot(null);
        }
      } else {
        setSlots([]);
        setConsultSlots([]);
        setDokterKonsulList([]);
        setSelectedConsultSlot(null);
      }
    } catch (err) {
      setSlots([]);
      setConsultSlots([]);
      setDokterKonsulList([]);
      setSelectedConsultSlot(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  // SUBMIT PENDAFTARAN KUNJUNGAN (LANGSUNG TERBITKAN ANTREAN TANPA PILIH JAM / DP)
  const handleSubmitPendaftaran = async (isOverride: boolean = false) => {
    if (!selectedPasien) {
      showError(toast, 'Harap pilih pasien terlebih dahulu di Langkah 1');
      return;
    }
    if (selectedList.length === 0) {
      showError(toast, 'Harap pilih minimal satu layanan atau paket di Langkah 2');
      return;
    }
    if (!selectedSlot) {
      showError(toast, 'Harap pilih slot jadwal sesi petugas yang sedang aktif di Langkah 3');
      return;
    }
    if (selectedSlot.is_not_started_today) {
      showError(
        toast,
        `Sesi petugas di ${activeRoomName || 'Ruang Tindakan'} (${selectedSlot.nama_petugas}) baru dimulai pukul ${selectedSlot.jam_mulai} WIB. Pendaftaran walk-in langsung hanya dapat dilakukan saat sesi telah aktif.`
      );
      return;
    }
    if (selectedSlot.is_past_today) {
      showError(
        toast,
        `Sesi petugas di ${activeRoomName || 'Ruang Tindakan'} (${selectedSlot.nama_petugas}) telah berakhir pukul ${selectedSlot.jam_selesai} WIB.`
      );
      return;
    }

    if (effectiveButuhKonsul) {
      if (!selectedConsultSlot) {
        showError(toast, 'Harap pilih sesi dokter di Ruang Konsultasi yang sedang aktif');
        return;
      }
      if (selectedConsultSlot.is_not_started_today) {
        showError(
          toast,
          `Dokter di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} (${selectedConsultSlot.nama_petugas}) baru bertugas pukul ${selectedConsultSlot.jam_mulai} WIB.`
        );
        return;
      }
      if (selectedConsultSlot.is_past_today) {
        showError(
          toast,
          `Jam dinas dokter di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} telah selesai untuk hari ini.`
        );
        return;
      }
    }

    if (effectiveButuhKonsul && consultDoctorStatus && !consultDoctorStatus.isDoctorAvailableNow && !loadingSlots) {
      const roomKonsulName = consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi';
      showError(
        toast,
        consultDoctorStatus.hasDoctorToday
          ? `Tidak ada jadwal dokter aktif di ${roomKonsulName} saat ini (jam dinas dokter telah selesai pukul ${consultDoctorStatus.latestEndStr} WIB).`
          : `Tidak ada jadwal dokter jaga di ${roomKonsulName} untuk hari ini.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = selectedList.map((item) => {
        const { isWajib, isService } = getItemConsultType(item);

        let chooseConsult = false;
        if (isWajib) {
          chooseConsult = true;
        } else if (isService) {
          chooseConsult = false;
        } else {
          chooseConsult = globalConsultChoice;
        }

        return {
          jenis_layanan: item.jenis,
          kode_layanan: item.kode_layanan,
          kode_ruangan: item.kode_ruangan,
          nama_ruangan: item.nama_ruangan,
          butuh_konsul: chooseConsult,
          wajib_konsultasi: item.wajib_konsultasi || (isWajib ? 'wajib' : isService ? 'tidak' : 'opsional'),
          lewat_konsultasi: chooseConsult,
          kode_kepemilikan_paket_layanan: item.kode_kepemilikan_paket_layanan,
          kode_jadwal: selectedSlot.kode_jadwal,
        };
      });

      const payload = {
        no_rm: selectedPasien.no_rm,
        items: itemsPayload,
        kode_jadwal: selectedSlot.kode_jadwal,
        override_peringatan_booking: isOverride,
        tz: getTzUser() || 'Asia/Jakarta',
      };

      const res = await postData('/master/pendaftaran-pasien-ambil-antrian-layanan', payload);

      // Cek apakah terkena peringatan benturan booking (Two-Step Confirmation)
      if (res.data?.status === 'WARN_BOOKING_COLLISION' || res.data?.peringatan === true) {
        setWarningBookingData(res.data?.data_peringatan || {});
        setShowWarningBookingDialog(true);
        return;
      }

      if (['00', '0000', 200].includes(res.data?.status) || res.status === 200) {
        showSuccess(toast, res.data?.message || 'Pendaftaran kunjungan & antrean berhasil diterbitkan');
        setShowWarningBookingDialog(false);
        setWarningBookingData(null);
        const resultData = res.data?.data;

        if (resultData?.antrian_layanan && resultData.antrian_layanan.length > 0) {
          setAntrianLayananData(resultData);
          setAntrianLayananModalVisible(true);
        } else if (resultData) {
          setTicketData({
            no_rm: resultData.no_rm || selectedPasien.no_rm,
            nama: resultData.nama_pasien || selectedPasien.nama,
            kode_kunjungan: resultData.kode_kunjungan,
            nomor_antrian: resultData.nomor_antrian_awal,
            kode_antrian: resultData.kode_antrian_awal,
            tanggal_kunjungan: resultData.tanggal_kunjungan,
            jam_datang: resultData.jam_datang,
          });
          setKarcisVisible(true);
        }

        // Reset state pendaftaran untuk pasien berikutnya
        setSelectedPasien(null);
        setPasienSearch('');
        setSelectedMap({});
        setActiveRuangan(null);
        setSelectedSlot(null);

        if (onSuccess) onSuccess();
      } else {
        showError(toast, res.data?.message || 'Gagal memproses pendaftaran kunjungan');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Terjadi kesalahan sistem saat mendaftarkan kunjungan';
      showError(toast, msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="layout-pendaftaran-kunjungan">
      {/* ============================================================ */}
      {/* 1. CARD PILIH PASIEN (PERSIS SEPERTI GAMBAR) */}
      {/* ============================================================ */}
      <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
        <div className="flex align-items-center justify-content-between mb-3">
          <div className="flex align-items-center gap-2">
            <span
              className="flex align-items-center justify-content-center bg-primary text-white border-round-circle font-bold"
              style={{ width: 28, height: 28, fontSize: '13px' }}
            >
              1
            </span>
            <span className="font-bold text-lg text-900">Pilih Pasien</span>
          </div>
        </div>

        {selectedPasien ? (
          /* TAMPILAN PASIEN TERPILIH PERSIS SEPERTI SCREENSHOT */
          <div className="border-1 surface-border border-round-xl p-3 bg-white flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3">
            <div className="flex align-items-center gap-3">
              <div
                className="border-round-circle flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                }}
              >
                <User size={24} />
              </div>
              <div>
                <div className="flex align-items-center gap-2 mb-2">
                  <span className="font-bold text-lg text-900">{selectedPasien.nama}</span>
                  <Tag
                    value={selectedPasien.no_rm}
                    severity="info"
                    className="text-xs font-mono font-bold px-2 py-0.5 border-round-md"
                    style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
                  />
                </div>

                {/* BARIS 1: NIK · NO. HP · GENDER · UMUR */}
                <div className="text-xs text-500 flex flex-wrap align-items-center mb-1">
                  <span>
                    NIK: <span className="font-medium text-800 font-mono">{selectedPasien.nik || '-'}</span>
                  </span>
                  <span className="text-400 mx-2">·</span>
                  <span>
                    No. HP: <span className="font-medium text-800">{selectedPasien.no_hp || '-'}</span>
                  </span>
                  <span className="text-400 mx-2">·</span>
                  <span>
                    Gender:{' '}
                    <span className="font-medium text-800">
                      {selectedPasien.jenis_kelamin === 'L'
                        ? 'Laki-laki'
                        : selectedPasien.jenis_kelamin === 'P'
                        ? 'Perempuan'
                        : '-'}
                    </span>
                  </span>
                  {selectedPasien.tanggal_lahir && calculateAge(selectedPasien.tanggal_lahir) !== null && (
                    <>
                      <span className="text-400 mx-2">·</span>
                      <span>
                        Umur:{' '}
                        <span className="font-medium text-800">
                          {calculateAge(selectedPasien.tanggal_lahir)} tahun
                        </span>
                      </span>
                    </>
                  )}
                </div>

                {/* BARIS 2: ALAMAT LENGKAP */}
                <div className="text-xs text-500 flex align-items-center flex-wrap">
                  <span>
                    Alamat:{' '}
                    <span className="font-medium text-800">
                      {getFormattedAddress(selectedPasien)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              label="Ganti Pasien"
              icon="pi pi-refresh"
              className="p-button-text p-button-secondary p-button-sm text-xs font-semibold"
              onClick={() => {
                setSelectedPasien(null);
                setPasienSearch('');
                setSelectedMap({});
                setActiveRuangan(null);
                setSelectedSlot(null);
                lastLoadedNoRmRef.current = '';
                if (typeof window !== 'undefined' && window.location.search) {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('no_rm');
                  url.searchParams.delete('norm');
                  window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
                }
              }}
            />
          </div>
        ) : (
          /* FORM CARI PASIEN (JIKA BELUM MEMILIH) */
          <div>
            <IconField iconPosition="left" className="w-full">
              <InputIcon className="pi pi-search" />
              <InputText
                value={pasienSearch}
                onChange={(e) => handleSearchPasien(e.target.value)}
                placeholder="Cari Pasien (Ketik Nama, No. RM, No. HP, atau NIK)..."
                className="w-full text-sm border-round-lg"
              />
            </IconField>

            {loadingPasien && (
              <div className="text-xs text-500 mt-2 flex align-items-center gap-2">
                <ProgressSpinner style={{ width: '16px', height: '16px' }} strokeWidth="4" />
                <span>Mencari data pasien...</span>
              </div>
            )}

            {pasienList.length > 0 && !selectedPasien && (
              <div className="border-1 surface-border border-round-lg mt-2 overflow-hidden shadow-1">
                <DataTable
                  value={pasienList}
                  size="small"
                  className="text-sm"
                  rowClassName={() => 'cursor-pointer hover:surface-100 transition-colors'}
                  onRowClick={(e) => {
                    setSelectedPasien(e.data as Pasien);
                    setPasienList([]);
                  }}
                >
                  <Column
                    field="no_rm"
                    header="No. RM"
                    body={(r: Pasien) => <span className="font-mono font-bold text-primary">{r.no_rm}</span>}
                    style={{ width: '110px' }}
                  />
                  <Column
                    field="nama"
                    header="Nama Pasien"
                    body={(r: Pasien) => <span className="font-semibold text-900">{r.nama}</span>}
                    style={{ minWidth: '150px' }}
                  />
                  <Column
                    field="nik"
                    header="NIK"
                    body={(r: Pasien) => <span className="font-mono text-700 text-xs">{r.nik || '-'}</span>}
                    style={{ width: '140px' }}
                  />
                  <Column
                    header="L/P"
                    align="center"
                    style={{ width: '100px' }}
                    body={(r: Pasien) => {
                      if (!r.jenis_kelamin) return <span className="text-400 text-xs">-</span>;
                      const isMale = r.jenis_kelamin === 'L';
                      return (
                        <Tag
                          value={isMale ? 'Laki-Laki' : 'Perempuan'}
                          severity={isMale ? 'info' : 'success'}
                          className="text-xs px-2 py-0.5"
                        />
                      );
                    }}
                  />
                  <Column
                    field="no_hp"
                    header="No. HP"
                    body={(r: Pasien) => <span className="text-700 font-mono text-xs">{r.no_hp || '-'}</span>}
                    style={{ width: '130px' }}
                  />
                  <Column
                    header="Alamat / Wilayah"
                    style={{ minWidth: '180px' }}
                    body={(r: Pasien) => {
                      return <span className="text-600 text-xs">{getFormattedAddress(r)}</span>;
                    }}
                  />
                  <Column
                    header="Aksi"
                    align="center"
                    style={{ width: '85px' }}
                    body={(r: Pasien) => (
                      <Button
                        label="Pilih"
                        icon="pi pi-check"
                        size="small"
                        severity="success"
                        className="py-1 px-2.5 text-xs font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPasien(r);
                          setPasienList([]);
                        }}
                      />
                    )}
                  />
                </DataTable>
              </div>
            )}

            {pasienSearch && !loadingPasien && pasienList.length === 0 && (
              <div className="text-xs text-500 mt-2 p-3 surface-100 border-round-lg flex align-items-center justify-content-between">
                <span>
                  Pasien tidak ditemukan dengan kata kunci &ldquo;{pasienSearch}&rdquo;. Pastikan data pasien telah didaftarkan melalui menu <strong className="text-primary">Pasien Baru</strong>.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. CARD PILIH LAYANAN & PAKET TREATMENT (PERSIS SEPERTI GAMBAR) */}
      {/* ============================================================ */}
      <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
        <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2 mb-3">
          <div>
            <div className="flex align-items-center gap-2">
              <span
                className="flex align-items-center justify-content-center bg-primary text-white border-round-circle font-bold"
                style={{ width: 28, height: 28, fontSize: '13px' }}
              >
                2
              </span>
              <span className="font-bold text-lg text-900">Pilih Layanan & Paket Treatment</span>
            </div>
            <p className="text-xs text-500 m-0 mt-1 pl-5">
              Pilih satu atau beberapa layanan/paket dalam ruangan yang sama untuk menentukan slot jadwal petugas.
            </p>
          </div>

          {/* Tombol Lihat Semua Jadwal Booking untuk Ruangan yang Sedang Aktif */}
          {(() => {
            const activeRoomIndex = claimablePackages.length > 0 ? activeTabIndex - 1 : activeTabIndex;
            const currentActiveRuang = activeRoomIndex >= 0 ? ruangans[activeRoomIndex] : null;
            if (!currentActiveRuang) return null;
            const bookingCount = currentActiveRuang.daftar_booking_hari_ini?.length || currentActiveRuang.total_booking_hari_ini || 0;
            if (bookingCount === 0) return null;

            return (
              <Button
                type="button"
                label={`Lihat Semua Jadwal Booking (${bookingCount})`}
                icon="pi pi-calendar"
                size="small"
                severity="warning"
                className="text-xs p-button-sm border-round-lg font-semibold shadow-1 self-start sm:self-center"
                onClick={() => {
                  setSelectedRuanganForBookings(currentActiveRuang);
                  setDialogAllBookingsVisible(true);
                }}
              />
            );
          })()}
        </div>

        {loadingRuangan ? (
          <div className="flex flex-column align-items-center justify-content-center p-5">
            <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
            <span className="text-500 text-sm mt-2">Memuat opsi ruangan &amp; layanan...</span>
          </div>
        ) : (
          <TabView
            className="p-tabview-custom"
            activeIndex={activeTabIndex}
            onTabChange={(e) => setActiveTabIndex(e.index)}
          >
            {(() => {
              const panels: React.ReactNode[] = [];

              {/* TAB KHUSUS: PAKET YANG SUDAH DIMILIKI PASIEN */}
              if (claimablePackages.length > 0) {
                panels.push(
                  <TabPanel
                    key="owned_packages_tab"
                    header={`🎁 Paket Dimiliki Pasien (${claimablePackages.length})`}
                    leftIcon="pi pi-gift mr-2 text-amber-600 font-bold"
                  >
                    <div className="p-3 bg-amber-50 border-round-lg border-1 border-amber-200 mb-3 flex align-items-center gap-2">
                      <i className="pi pi-info-circle text-amber-600 text-lg" />
                      <span className="text-sm text-amber-900 font-semibold">
                        Pasien memiliki paket aktif! Pilih sesi treatment di bawah ini untuk mengklaim sesi lanjutan (Rp 0).
                      </span>
                    </div>

                    <div className="grid">
                      {claimablePackages.map((pkg: any) => {
                        return (pkg.details || [])
                          .filter((det: any) => (det.sisa_sesi || 0) > 0)
                          .map((det: any) => {
                            const claimItem: ServiceItem = {
                              jenis: 'klaim_paket',
                              kode_layanan: det.kode_layanan,
                              kode_kategori: 'KLAIM PAKET',
                              nama_kategori: `Klaim Paket`,
                              nama: `${det.nama_layanan || det.kode_layanan}`,
                              harga: 0,
                              harga_asal: 0,
                              durasi_menit: det.durasi_menit || 45,
                              total_sesi: det.sesi_total,
                              sisa_sesi: det.sisa_sesi,
                              sesi_terbooking: det.sesi_terbooking || 0,
                              sesi_tersedia: det.sesi_tersedia ?? det.sisa_sesi,
                              tanggal_expired: pkg.tanggal_expired,
                              kode_ruangan: det.kode_ruangan || pkg.kode_ruangan_paket || 'RNG-002',
                              nama_ruangan: det.nama_ruangan || pkg.nama_ruangan_paket || 'Ruangan Treatment',
                              tipe: pkg.tipe_paket || 'BEAUTY TREATMENT',
                              tipe_paket: pkg.tipe_paket || 'BEAUTY TREATMENT',
                              wajib_konsultasi: pkg.tipe_paket === 'MEDICAL TREATMENT' ? 'wajib' : pkg.tipe_paket === 'SERVICE TREATMENT' ? 'tidak' : 'opsional',
                              kode_kepemilikan_paket_layanan: pkg.kode_kepemilikan_paket_layanan,
                              kode_detail_kepemilikan_paket_layanan: det.kode_detail_kepemilikan_paket_layanan,
                              nama_paket_asal: pkg.nama_paket,
                            };

                            const itemKey = `klaim_${det.kode_detail_kepemilikan_paket_layanan || det.kode_layanan}`;
                            const isRuangDisabled = activeRuangan !== null && activeRuangan !== claimItem.kode_ruangan;

                            return (
                              <LayananCard
                                key={itemKey}
                                item={claimItem}
                                isSelected={!!selectedMap[itemKey]}
                                isDisabled={isRuangDisabled}
                                onToggle={handleToggleItem}
                                formatPrice={formatCurrency}
                              />
                            );
                          });
                      })}
                    </div>
                  </TabPanel>
                );
              }

              {/* TAB RUANGAN MASTER DATA */}
              ruangans.forEach((ruang) => {
                const isRuangActive = activeRuangan === ruang.kode_ruangan;
                const isRuangDisabled = activeRuangan !== null && activeRuangan !== ruang.kode_ruangan;
                const ruangSelectedCount = (ruang.items || []).filter(
                  (item) => !!selectedMap[`${item.jenis}_${item.kode_layanan}`]
                ).length;
                const roomTitle = ruang.nama_ruangan || `Ruangan ${ruang.kode_ruangan}`;

                const tabHeader = (
                  <div className="flex align-items-center gap-2">
                    <i className={`pi ${isRuangActive ? 'pi-check-circle text-primary font-bold' : 'pi-building text-600'}`} />
                    <span className="font-medium">{roomTitle}</span>
                    {ruangSelectedCount > 0 && (
                      <Tag value={ruangSelectedCount} severity="info" className="text-xs px-2 py-0" />
                    )}
                  </div>
                );

                panels.push(
                  <TabPanel
                    key={ruang.kode_ruangan}
                    header={tabHeader}
                  >

                    {isRuangDisabled && (
                      <div className="flex align-items-center gap-2 p-3 mb-3 bg-orange-50 border-round-lg border-1 border-orange-200">
                        <i className="pi pi-info-circle text-orange-500" />
                        <span className="text-sm text-orange-700">
                          Ruangan ini tidak bisa dipilih karena Anda sudah memilih layanan dari ruangan <strong>{activeRoomName}</strong>.
                          Batalkan pilihan sebelumnya terlebih dahulu jika ingin berpindah ruangan.
                        </span>
                      </div>
                    )}

                    {!ruang.items || ruang.items.length === 0 ? (
                      <div className="flex flex-column align-items-center justify-content-center p-5 surface-card border-round-xl border-1 surface-border my-3 text-center">
                        <i className="pi pi-inbox text-400 text-4xl mb-2" />
                        <span className="text-700 font-bold block text-base">{roomTitle}</span>
                        <span className="text-500 text-sm mt-1">Belum ada layanan atau paket yang tersedia di ruangan ini.</span>
                      </div>
                    ) : (
                      <div className="grid">
                        {ruang.items.map((item) => {
                          const itemKey = `${item.jenis}_${item.kode_layanan}`;
                          const isClaimedElsewhere = item.jenis === 'layanan' && Object.values(selectedMap).some(
                            (it) => it.jenis === 'klaim_paket' && it.kode_layanan === item.kode_layanan
                          );
                          return (
                            <LayananCard
                              key={itemKey}
                              item={item}
                              isSelected={!!selectedMap[itemKey]}
                              isDisabled={isRuangDisabled || isClaimedElsewhere}
                              isClaimedElsewhere={isClaimedElsewhere}
                              onToggle={handleToggleItem}
                              formatPrice={formatCurrency}
                            />
                          );
                        })}
                      </div>
                    )}
                  </TabPanel>
                );
              });

              return panels;
            })()}
          </TabView>
        )}

        {/* PILIHAN ALUR KUNJUNGAN PASIEN (PERSIS SEPERTI GAMBAR) */}
        {hasOpsionalKonsul && !hasWajibKonsul && (
          <div className="mt-4 p-3 border-round-xl bg-gray-50 border-1 surface-border">
            <div className="flex align-items-center gap-2 mb-2">
              <i className="pi pi-question-circle text-primary text-base" />
              <span className="font-bold text-sm text-900">Pilihan Alur Kunjungan Pasien</span>
              <Tag value="Opsional Konsul" severity="info" className="text-xs font-semibold" />
            </div>
            <p className="text-xs text-600 m-0 mb-3">
              Tindakan yang dipilih menyertakan opsi konsultasi dokter pra-tindakan. Tentukan alur kunjungan saat pasien tiba / check-in di klinik:
            </p>
            <div className="grid">
              {/* Opsi 1: Konsultasi Dokter Dulu */}
              <div className="col-12 sm:col-6">
                {(() => {
                  const isConsultDisabled = Boolean(consultDoctorStatus && !consultDoctorStatus.isDoctorAvailableNow);
                  return (
                    <div
                      className={`p-3 border-round-xl border-2 transition-all transition-duration-200 flex align-items-center gap-3 h-full ${
                        isConsultDisabled
                          ? 'opacity-60 cursor-not-allowed surface-100 border-300'
                          : 'cursor-pointer'
                      }`}
                      style={{
                        borderColor: isConsultDisabled ? '#cbd5e1' : globalConsultChoice ? '#6366f1' : '#e2e8f0',
                        background: isConsultDisabled
                          ? '#f8fafc'
                          : globalConsultChoice
                          ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)'
                          : 'var(--surface-card)',
                        userSelect: 'none',
                      }}
                      onClick={() => {
                        if (isConsultDisabled) {
                          showWarning(
                            toast,
                            consultDoctorStatus?.hasDoctorToday
                              ? `Opsi "Konsultasi Dokter Dulu" tidak dapat dipilih karena jam dinas dokter di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} telah selesai (pukul ${consultDoctorStatus?.latestEndStr} WIB).`
                              : `Opsi "Konsultasi Dokter Dulu" tidak dapat dipilih karena tidak ada jadwal dokter jaga di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} hari ini.`
                          );
                          return;
                        }
                        setGlobalConsultChoice(true);
                      }}
                    >
                      <div
                        className="flex align-items-center justify-content-center border-round-lg text-white flex-shrink-0"
                        style={{
                          width: '36px',
                          height: '36px',
                          background: isConsultDisabled
                            ? '#94a3b8'
                            : globalConsultChoice
                            ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                            : '#cbd5e1',
                        }}
                      >
                        <i className="pi pi-user-edit text-base" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex align-items-center gap-2">
                          <div
                            className="font-bold text-xs"
                            style={{
                              color: isConsultDisabled ? '#64748b' : globalConsultChoice ? '#4338ca' : '#475569',
                            }}
                          >
                            Konsultasi Dokter Dulu
                          </div>
                          {isConsultDisabled && (
                            <Tag value="Tidak Tersedia" severity="danger" className="text-[10px] font-bold px-1.5 py-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-500 mt-0.5">
                          {isConsultDisabled ? (
                            <span className="text-red-600 font-medium">
                              Tidak tersedia — dokter konsultasi sedang tidak bertugas ({consultDoctorStatus?.hasDoctorToday ? `jam dinas telah berakhir pukul ${consultDoctorStatus?.latestEndStr} WIB` : 'tidak ada jadwal hari ini'}).
                            </span>
                          ) : (
                            <span>Pasien antre di Ruang Konsultasi Dokter saat check-in sebelum menuju ruang treatment.</span>
                          )}
                        </div>
                      </div>
                      {globalConsultChoice && !isConsultDisabled && (
                        <i className="pi pi-check-circle text-indigo-600 text-lg flex-shrink-0" />
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Opsi 2: Langsung Tindakan */}
              <div className="col-12 sm:col-6">
                <div
                  className="p-3 border-round-xl border-2 cursor-pointer transition-all transition-duration-200 flex align-items-center gap-3 h-full"
                  style={{
                    borderColor: !globalConsultChoice ? '#10b981' : '#e2e8f0',
                    background: !globalConsultChoice ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'var(--surface-card)',
                  }}
                  onClick={() => setGlobalConsultChoice(false)}
                >
                  <div
                    className="flex align-items-center justify-content-center border-round-lg text-white flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      background: !globalConsultChoice ? 'linear-gradient(135deg, #10b981, #059669)' : '#cbd5e1',
                    }}
                  >
                    <i className="pi pi-bolt text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs" style={{ color: !globalConsultChoice ? '#065f46' : '#475569' }}>
                      Langsung Tindakan
                    </div>
                    <div className="text-[11px] text-500 mt-0.5">
                      Pasien langsung dilayani di ruang tindakan tanpa antre konsultasi dokter.
                    </div>
                  </div>
                  {!globalConsultChoice && <i className="pi pi-check-circle text-green-600 text-lg flex-shrink-0" />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. CARD PILIH SLOT JADWAL PETUGAS (PERSIS SEPERTI GAMBAR, TANPA PILIH JAM) */}
      {/* ============================================================ */}
      <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
        <div className="flex align-items-center justify-content-between mb-3">
          <div className="flex align-items-center gap-2">
            <span
              className="flex align-items-center justify-content-center bg-primary text-white border-round-circle font-bold"
              style={{ width: 28, height: 28, fontSize: '13px' }}
            >
              3
            </span>
            <span className="font-bold text-lg text-900">Pilih Slot Jadwal Petugas</span>
          </div>

          {activeRuangan && (
            <div className="flex align-items-center gap-2">
              <Button
                type="button"
                label={
                  hasOpsionalKonsul || hasWajibKonsul
                    ? 'Lihat Jadwal Ruangan & Dokter'
                    : `Jadwal ${activeRoomName || 'Ruangan'}`
                }
                icon="pi pi-calendar"
                className="p-button-outlined p-button-secondary p-button-sm text-xs py-1 px-2.5 font-semibold"
                onClick={handleOpenJadwalDialog}
                tooltip={
                  hasOpsionalKonsul || hasWajibKonsul
                    ? `Lihat jadwal dokter Ruang Konsultasi & ${activeRoomName || 'Ruang Tindakan'}`
                    : `Lihat seluruh jadwal mingguan ${activeRoomName || 'Ruang Tindakan'}`
                }
                tooltipOptions={{ position: 'bottom' }}
              />
              <Button
                icon="pi pi-refresh"
                className="p-button-text p-button-rounded p-button-sm"
                onClick={fetchSlots}
                tooltip="Refresh Ketersediaan Slot"
              />
            </div>
          )}
        </div>

        {/* Informasi & Peringatan Dokter Konsultasi Tidak Tersedia */}
        {activeRuangan && effectiveButuhKonsul && !loadingSlots && consultDoctorStatus && !consultDoctorStatus.isDoctorAvailableNow && (
          <div className="flex align-items-start gap-3 p-3 mb-3 bg-amber-50 border-round-xl border-1 border-amber-300">
            <div className="flex align-items-center justify-content-center bg-amber-100 text-amber-800 border-round-lg p-2 flex-shrink-0 mt-0.5">
              <i className="pi pi-exclamation-triangle text-base" />
            </div>
            <div className="flex-1 text-xs text-amber-950 leading-normal">
              <div className="font-bold mb-0.5 text-amber-900">
                Tidak Ada Jadwal Dokter Aktif di {consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'}:
              </div>
              {consultDoctorStatus?.hasDoctorToday ? (
                <>
                  Jam dinas dokter di {consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} telah selesai untuk hari ini (pukul <strong>{consultDoctorStatus.latestEndStr} WIB</strong>).
                  {hasWajibKonsul ? (
                    <div className="mt-1 font-semibold text-red-700">
                      Karena tindakan ini adalah Medical Treatment (Wajib Konsul), pendaftaran walk-in tidak dapat diproses jika tidak ada dokter aktif di {consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'}. Harap jadwalkan via menu Booking.
                    </div>
                  ) : (
                    <span className="ml-1">Silakan alihkan ke alur <strong>&quot;Langsung Tindakan&quot;</strong> atau buat reservasi Booking.</span>
                  )}
                </>
              ) : (
                <>
                  Tidak ada jadwal dokter jaga di {consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} hari ini.
                  {hasWajibKonsul ? (
                    <div className="mt-1 font-semibold text-red-700">
                      Karena tindakan ini adalah Medical Treatment (Wajib Konsul), pendaftaran walk-in tidak dapat diproses jika tidak ada dokter jaga di {consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'}. Harap jadwalkan via menu Booking.
                    </div>
                  ) : (
                    <span className="ml-1">Silakan alihkan ke alur <strong>&quot;Langsung Tindakan&quot;</strong> atau buat reservasi Booking.</span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {!activeRuangan ? (
          <div className="text-center py-4 text-500 border-1 border-dashed surface-border border-round">
            <AlertCircle size={32} className="mx-auto mb-2 text-400" />
            <div>Pilih minimal satu layanan/paket di Langkah 2 terlebih dahulu untuk memuat slot jadwal yang tersedia.</div>
          </div>
        ) : loadingSlots ? (
          <div className="text-center py-4">
            <i className="pi pi-spin pi-spinner text-primary text-3xl mb-2"></i>
            <div className="text-sm text-500">Mengecek ketersediaan jadwal petugas dan kuota ruangan...</div>
          </div>
        ) : isConsultDoctorUnavailable || slots.length === 0 ? (
          <div className="text-center py-4 text-500 border-1 border-dashed surface-border border-round">
            <AlertCircle size={32} className="mx-auto mb-2 text-amber-500" />
            <div className="font-semibold text-900 mb-1">Tidak Ada Jadwal Petugas Tersedia</div>
            <div className="text-sm text-600">
              Tidak ditemukan jadwal aktif untuk ruangan <strong>{isConsultDoctorUnavailable ? (consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi') : activeRoomName}</strong> pada hari{' '}
              <span className="font-bold">
                {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][tanggalKunjungan.getDay()]}
              </span>
              . Silakan pilih tanggal lain atau hubungi administrator.
            </div>
          </div>
        ) : (
          <div>
            <div className="text-xs text-600 mb-3 pt-0.5 flex align-items-center" style={{ gap: '6px' }}>
              <Clock size={14} className="text-500 flex-shrink-0" />
              <span>Pilih salah satu sesi jadwal petugas di bawah ini. Setiap sesi diwakili oleh Petugas Penanggung Jawab (PJ).</span>
            </div>

            {/* GRID SLOT PETUGAS (RUANG KONSULTASI + RUANG TINDAKAN) */}
            <div className="grid">
              {/* KARTU RUANG KONSULTASI (JIKA ALUR KONSULTASI AKTIF) */}
              {effectiveButuhKonsul &&
                consultSlots.map((cSlot) => {
                  const isSelected = selectedConsultSlot?.kode_jadwal === cSlot.kode_jadwal;
                  const isQuotaFull = (cSlot.sisa_kuota ?? 0) <= 0;
                  const isShiftPast = Boolean(cSlot.is_past_today);
                  const isNotStarted = Boolean(cSlot.is_not_started_today);
                  const isUnavailable = isQuotaFull || isShiftPast || isNotStarted || !cSlot.is_available;
                  const companions = cSlot.petugas_pendamping || [];
                  const totalCompanions = cSlot.jumlah_pendamping || companions.length;
                  const hasCompanions = totalCompanions > 0;
                  const companionSummary = getCompanionSummary(companions, totalCompanions);
                  const fullCompanionNames = companions.map((c) => c.nama_petugas).join(', ');

                  return (
                    <div key={`consult_${cSlot.kode_jadwal}`} className="col-12 sm:col-6 flex">
                      <div
                        onClick={() => {
                          if (!isUnavailable) setSelectedConsultSlot(cSlot);
                        }}
                        className={`w-full flex flex-column justify-content-between border-round-xl p-3 border-2 transition-all transition-duration-200 ${
                          isUnavailable
                            ? 'surface-100 border-300 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary surface-50 shadow-2 cursor-pointer'
                            : 'surface-card border-200 hover:border-primary-300 hover:shadow-1 cursor-pointer'
                        }`}
                      >
                        <div>
                          {/* Jam Sesi & Status Badge */}
                          <div className="flex align-items-center justify-content-between mb-2">
                            <div className="flex align-items-center" style={{ gap: '6px' }}>
                              <Clock size={15} className={`${isSelected ? 'text-primary' : 'text-500'} flex-shrink-0`} />
                              <span className="font-bold text-sm text-900">
                                {cSlot.jam_mulai} - {cSlot.jam_selesai} WIB
                              </span>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                            ) : isQuotaFull ? (
                              <Tag
                                value="PENUH"
                                severity="danger"
                                className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                              />
                            ) : isShiftPast ? (
                              <Tag
                                value="SUDAH BERAKHIR"
                                severity="warning"
                                className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                                title="Jam dinas dokter telah berakhir untuk hari ini"
                              />
                            ) : isNotStarted ? (
                              <Tag
                                value="BELUM MULAI"
                                severity="warning"
                                className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                                title={`Sesi praktek dokter baru dimulai pukul ${cSlot.jam_mulai} WIB`}
                              />
                            ) : !cSlot.is_available ? (
                              <Tag
                                value="TIDAK TERSEDIA"
                                severity="danger"
                                className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                              />
                            ) : (
                              <Tag
                                value="TERSEDIA"
                                severity="success"
                                className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                              />
                            )}
                          </div>

                          {/* Petugas PJ */}
                          <div className="flex align-items-center justify-content-between gap-2 mb-2">
                            <div className="flex align-items-center min-w-0 flex-1" style={{ gap: '6px' }}>
                              <User size={14} className="text-primary flex-shrink-0" />
                              <span className="font-bold text-sm text-900 text-overflow-ellipsis overflow-hidden white-space-nowrap">
                                {cSlot.nama_petugas}
                              </span>
                            </div>
                            <Tag
                              value="PJ"
                              severity="warning"
                              className="text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0"
                            />
                          </div>

                          {/* Petugas Pendamping */}
                          {hasCompanions && (
                            <div className="flex align-items-center mb-2" style={{ minHeight: '26px' }}>
                              <div
                                className="inline-flex align-items-center gap-1.5 text-[11px] min-w-0 cursor-pointer overflow-hidden text-emerald-800 hover:text-emerald-900 transition-colors"
                                title={`Daftar Pendamping: ${fullCompanionNames}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCompanionData({
                                    pj: cSlot.nama_petugas,
                                    jam: `${cSlot.jam_mulai} - ${cSlot.jam_selesai} WIB`,
                                    ruangan: cSlot.nama_ruangan || consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi',
                                    companions,
                                  });
                                  companionOpRef.current?.toggle(e);
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
                          <div className="flex align-items-center text-xs text-500 mb-2" style={{ gap: '6px' }}>
                            <MapPin size={13} className="text-400 flex-shrink-0" />
                            <span className="text-overflow-ellipsis overflow-hidden white-space-nowrap">
                              {cSlot.nama_ruangan || consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'}
                            </span>
                          </div>
                        </div>

                        {/* Sisa Kuota */}
                        <div className="border-top-1 surface-border pt-2 mt-2">
                          <div className="flex align-items-center justify-content-between text-xs text-500">
                            <span>Sisa Kuota:</span>
                            <span className={`font-bold ${isQuotaFull ? 'text-red-500' : isShiftPast || isNotStarted ? 'text-amber-700' : 'text-green-700'}`}>
                              {cSlot.sisa_kuota} dari {cSlot.kuota_total}
                            </span>
                          </div>
                          {isShiftPast && (
                            <div className="text-[11px] text-amber-700 mt-1 flex align-items-center gap-1">
                              <Clock size={11} className="flex-shrink-0" />
                              <span>Jam dinas dokter telah berakhir hari ini</span>
                            </div>
                          )}
                          {isNotStarted && (
                            <div className="text-[11px] text-amber-700 mt-1 flex align-items-center gap-1">
                              <Clock size={11} className="flex-shrink-0" />
                              <span>Sesi baru dimulai pukul {cSlot.jam_mulai} WIB</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* KARTU RUANG TINDAKAN */}
              {slots.map((slot) => {
                const isSelected = selectedSlot?.kode_jadwal === slot.kode_jadwal;
                const isQuotaFull = (slot.sisa_kuota ?? 0) <= 0;
                const isShiftPast = Boolean(slot.is_past_today);
                const isNotStarted = Boolean(slot.is_not_started_today);
                const isUnavailable = isQuotaFull || isShiftPast || isNotStarted || !slot.is_available;
                const companions = slot.petugas_pendamping || [];
                const totalCompanions = slot.jumlah_pendamping || companions.length;
                const hasCompanions = totalCompanions > 0;
                const companionSummary = getCompanionSummary(companions, totalCompanions);
                const fullCompanionNames = companions.map((c) => c.nama_petugas).join(', ');

                return (
                  <div key={`tindakan_${slot.kode_jadwal}`} className="col-12 sm:col-6 flex">
                    <div
                      onClick={() => {
                        if (!isUnavailable) setSelectedSlot(slot);
                      }}
                      className={`w-full flex flex-column justify-content-between border-round-xl p-3 border-2 transition-all transition-duration-200 ${
                        isUnavailable
                          ? 'surface-100 border-300 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-primary surface-50 shadow-2 cursor-pointer'
                          : 'surface-card border-200 hover:border-primary-300 hover:shadow-1 cursor-pointer'
                      }`}
                    >
                      <div>
                        {/* Jam Sesi & Status Badge */}
                        <div className="flex align-items-center justify-content-between mb-2">
                          <div className="flex align-items-center" style={{ gap: '6px' }}>
                            <Clock size={15} className={`${isSelected ? 'text-primary' : 'text-500'} flex-shrink-0`} />
                            <span className="font-bold text-sm text-900">
                              {slot.jam_mulai} - {slot.jam_selesai} WIB
                            </span>
                          </div>
                          {isSelected ? (
                            <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                          ) : isQuotaFull ? (
                            <Tag
                              value="PENUH"
                              severity="danger"
                              className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                            />
                          ) : isShiftPast ? (
                            <Tag
                              value="SUDAH BERAKHIR"
                              severity="warning"
                              className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                              title="Jam dinas sesi ini telah berakhir untuk hari ini"
                            />
                          ) : isNotStarted ? (
                            <Tag
                              value="BELUM MULAI"
                              severity="warning"
                              className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                              title={`Sesi praktek baru dimulai pukul ${slot.jam_mulai} WIB`}
                            />
                          ) : !slot.is_available ? (
                            <Tag
                              value="TIDAK TERSEDIA"
                              severity="danger"
                              className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                            />
                          ) : (
                            <Tag
                              value="TERSEDIA"
                              severity="success"
                              className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                            />
                          )}
                        </div>

                        {/* Petugas PJ */}
                        <div className="flex align-items-center justify-content-between gap-2 mb-2">
                          <div className="flex align-items-center min-w-0 flex-1" style={{ gap: '6px' }}>
                            <User size={14} className="text-primary flex-shrink-0" />
                            <span className="font-bold text-sm text-900 text-overflow-ellipsis overflow-hidden white-space-nowrap">
                              {slot.nama_petugas}
                            </span>
                          </div>
                          <Tag
                            value="PJ"
                            severity="warning"
                            className="text-[10px] font-bold px-1.5 py-0.5 flex-shrink-0"
                          />
                        </div>

                        {/* Petugas Pendamping */}
                        {hasCompanions && (
                          <div className="flex align-items-center mb-2" style={{ minHeight: '26px' }}>
                            <div
                              className="inline-flex align-items-center gap-1.5 text-[11px] min-w-0 cursor-pointer overflow-hidden text-emerald-800 hover:text-emerald-900 transition-colors"
                              title={`Daftar Pendamping: ${fullCompanionNames}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCompanionData({
                                  pj: slot.nama_petugas,
                                  jam: `${slot.jam_mulai} - ${slot.jam_selesai} WIB`,
                                  ruangan: slot.nama_ruangan || activeRoomName,
                                  companions,
                                });
                                companionOpRef.current?.toggle(e);
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
                        <div className="flex align-items-center text-xs text-500 mb-2" style={{ gap: '6px' }}>
                          <MapPin size={13} className="text-400 flex-shrink-0" />
                          <span className="text-overflow-ellipsis overflow-hidden white-space-nowrap">{slot.nama_ruangan || activeRoomName}</span>
                        </div>
                      </div>

                      {/* Sisa Kuota */}
                      <div className="border-top-1 surface-border pt-2 mt-2">
                        <div className="flex align-items-center justify-content-between text-xs text-500">
                          <span>Sisa Kuota:</span>
                          <span className={`font-bold ${isQuotaFull ? 'text-red-500' : isShiftPast || isNotStarted ? 'text-amber-700' : 'text-green-700'}`}>
                            {slot.sisa_kuota} dari {slot.kuota_total}
                          </span>
                        </div>
                        {isShiftPast && (
                          <div className="text-[11px] text-amber-700 mt-1 flex align-items-center gap-1">
                            <Clock size={11} className="flex-shrink-0" />
                            <span>Jam dinas sesi ini telah berakhir hari ini</span>
                          </div>
                        )}
                        {isNotStarted && (
                          <div className="text-[11px] text-amber-700 mt-1 flex align-items-center gap-1">
                            <Clock size={11} className="flex-shrink-0" />
                            <span>Sesi baru dimulai pukul {slot.jam_mulai} WIB</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. CARD RINGKASAN & AKSI DAFTARKAN KUNJUNGAN */}
      {/* ============================================================ */}
      <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-4">
        <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3">
          <div>
            <div className="font-bold text-base text-900 mb-1.5">Ringkasan Pendaftaran Kunjungan</div>
            <div className="text-xs text-600 flex flex-wrap align-items-center" style={{ gap: '6px 12px' }}>
              <span className="inline-flex align-items-center gap-1">
                <span className="text-500">Pasien:</span>
                <strong className="text-900">{selectedPasien?.nama || '(Belum dipilih)'}</strong>
              </span>
              <span className="text-300 select-none">•</span>
              <span className="inline-flex align-items-center gap-1">
                <span className="text-500">Ruangan:</span>
                <strong className="text-900">{activeRoomName || '-'}</strong>
              </span>
              <span className="text-300 select-none">•</span>
              <span className="inline-flex align-items-center gap-1">
                <span className="text-500">Layanan:</span>
                <strong className="text-900">{selectedList.length} item</strong>
                <span className="text-500">({totalDurasi} Menit)</span>
              </span>
              <span className="text-300 select-none">•</span>
              <span className="inline-flex align-items-center gap-1">
                <span className="text-500">Petugas:</span>
                <strong className="text-900">{selectedSlot?.nama_petugas || '-'}</strong>
              </span>
              <span className="text-300 select-none">•</span>
              <span className="inline-flex align-items-center gap-1">
                <span className="text-500">Total:</span>
                <strong className="text-emerald-700 font-bold">{formatCurrency(totalHarga)}</strong>
              </span>
            </div>
          </div>

          {(() => {
            const isSelectedSlotUnavailable = !selectedSlot || Boolean(selectedSlot.is_not_started_today) || Boolean(selectedSlot.is_past_today) || (selectedSlot.sisa_kuota ?? 0) <= 0 || !selectedSlot.is_available;
            const isSelectedConsultSlotUnavailable = effectiveButuhKonsul && (!selectedConsultSlot || Boolean(selectedConsultSlot.is_not_started_today) || Boolean(selectedConsultSlot.is_past_today) || (selectedConsultSlot.sisa_kuota ?? 0) <= 0 || !selectedConsultSlot.is_available);
            const isSubmitDisabled = !selectedPasien || selectedList.length === 0 || isSelectedSlotUnavailable || isSelectedConsultSlotUnavailable || submitting || isConsultDoctorUnavailable;

            return (
              <Button
                label="Daftarkan Kunjungan & Ambil Antrean"
                icon="pi pi-ticket"
                severity="success"
                className="border-round-lg font-bold px-4 py-2.5 shadow-2"
                disabled={isSubmitDisabled}
                loading={submitting}
                onClick={() => handleSubmitPendaftaran(false)}
                tooltip={
                  isConsultDoctorUnavailable
                    ? consultDoctorStatus?.hasDoctorToday
                      ? `Tidak dapat mendaftar: Jam dinas dokter di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} telah selesai (pukul ${consultDoctorStatus?.latestEndStr} WIB). Alihkan ke Langsung Tindakan atau Booking.`
                      : `Tidak dapat mendaftar: Tidak ada jadwal dokter jaga di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} hari ini. Alihkan ke Langsung Tindakan atau Booking.`
                    : isSelectedSlotUnavailable
                    ? !selectedSlot
                      ? `Harap pilih slot jadwal petugas di Langkah 3 yang sedang aktif.`
                      : selectedSlot?.is_not_started_today
                      ? `Tidak dapat mendaftar: Sesi di ${activeRoomName} (${selectedSlot.nama_petugas}) baru dimulai pukul ${selectedSlot.jam_mulai} WIB.`
                      : selectedSlot?.is_past_today
                      ? `Tidak dapat mendaftar: Sesi di ${activeRoomName} (${selectedSlot.nama_petugas}) telah berakhir pukul ${selectedSlot.jam_selesai} WIB.`
                      : `Tidak dapat mendaftar: Slot jadwal di ${activeRoomName} tidak tersedia.`
                    : isSelectedConsultSlotUnavailable
                    ? !selectedConsultSlot
                      ? `Harap pilih sesi dokter di Ruang Konsultasi yang sedang aktif.`
                      : selectedConsultSlot?.is_not_started_today
                      ? `Tidak dapat mendaftar: Sesi di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} baru dimulai pukul ${selectedConsultSlot.jam_mulai} WIB.`
                      : `Tidak dapat mendaftar: Sesi dokter di ${consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi'} telah selesai hari ini.`
                    : undefined
                }
                tooltipOptions={{ position: 'top' }}
              />
            );
          })()}
        </div>
      </div>

      {/* MODAL KARCIS ANTREAN AWAL */}
      <KarcisAntrianModal
        visible={karcisVisible}
        onHide={() => setKarcisVisible(false)}
        data={ticketData}
      />

      {/* MODAL KARCIS ANTREAN LAYANAN */}
      <KarcisAntrianLayananModal
        visible={antrianLayananModalVisible}
        onHide={() => setAntrianLayananModalVisible(false)}
        data={antrianLayananData}
      />

      {/* DIALOG JADWAL MINGGUAN RUANGAN */}
      <DialogJadwalMingguanRuangan
        visible={showJadwalRuanganDialog}
        onHide={() => setShowJadwalRuanganDialog(false)}
        rooms={jadwalDialogRooms}
      />

      {/* DIALOG PERINGATAN BENTURAN JADWAL BOOKING (TWO-STEP CONFIRMATION) */}
      <Dialog
        visible={showWarningBookingDialog}
        onHide={() => setShowWarningBookingDialog(false)}
        style={{ width: '90vw', maxWidth: '560px' }}
        modal
        closable={!submitting}
        header={
          <div className="flex align-items-center gap-2">
            <div
              className="flex align-items-center justify-content-center bg-amber-100 text-amber-600 border-round-lg p-2 flex-shrink-0"
              style={{ width: 40, height: 40 }}
            >
              <i className="pi pi-exclamation-triangle text-2xl" />
            </div>
            <div>
              <span className="font-bold text-base text-900 block">Peringatan Benturan Jadwal Booking</span>
              <span className="text-xs text-500">Estimasi antrean berpotensi melewati jadwal reservasi</span>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-content-end gap-2 pt-2">
            <Button
              label="Batalkan"
              icon="pi pi-times"
              severity="secondary"
              outlined
              disabled={submitting}
              onClick={() => setShowWarningBookingDialog(false)}
            />
            <Button
              label="Tetap Lanjutkan (Override)"
              icon="pi pi-check"
              severity="warning"
              loading={submitting}
              onClick={async () => {
                await handleSubmitPendaftaran(true);
              }}
            />
          </div>
        }
      >
        {warningBookingData && (
          <div className="flex flex-column gap-3 py-2">
            <div className="p-3 bg-amber-50 border-round-xl border-1 border-amber-200">
              <div className="flex align-items-center justify-content-between">
                <div>
                  <div className="text-xs font-semibold text-amber-800 mb-1">Ruangan Tujuan:</div>
                  <div className="text-base font-bold text-amber-900">{warningBookingData.nama_ruangan}</div>
                </div>
                {warningBookingData.total_booking_hari_ini && warningBookingData.total_booking_hari_ini > 1 && (
                  <Tag
                    value={`Total ${warningBookingData.total_booking_hari_ini} Booking Hari Ini`}
                    severity="warning"
                    className="text-xs font-semibold"
                  />
                )}
              </div>
            </div>

            <div className="grid">
              <div className="col-6">
                <div className="p-3 bg-red-50 border-round-xl border-1 border-red-200 h-full">
                  <span className="text-xs text-red-700 block mb-1">
                    <i className="pi pi-calendar-times mr-1" />
                    Jadwal Pasien Booking:
                  </span>
                  <div className="text-xl font-extrabold text-red-700">
                    Pukul {warningBookingData.jam_booking} WIB
                  </div>
                  <div className="text-xs font-semibold text-red-900 mt-1">
                    {warningBookingData.nama_pasien_booking}
                  </div>
                  <div className="text-[11px] text-red-600">
                    Kode: {warningBookingData.kode_booking}
                  </div>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 bg-blue-50 border-round-xl border-1 border-blue-200 h-full">
                  <span className="text-xs text-blue-700 block mb-1">
                    <i className="pi pi-clock mr-1" />
                    Estimasi Selesai Antrean:
                  </span>
                  <div className="text-xl font-extrabold text-blue-800">
                    ± {warningBookingData.estimasi_selesai} WIB
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    Batas Aman (+{warningBookingData.buffer_menit}m):
                  </div>
                  <div className="text-xs font-bold text-blue-900">
                    ± {warningBookingData.batas_aman} WIB
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 surface-50 border-round-xl border-1 surface-border">
              <span className="text-xs font-bold text-700 block mb-2">Rincian Beban Antrean:</span>
              {warningBookingData.is_lanjutan_konsultasi ? (
                <>
                  {(warningBookingData.sisa_antrean_konsul_menit || 0) > 0 && (
                    <div className="flex justify-content-between text-xs text-600 mb-1">
                      <span>Sisa antrean di Ruang Konsultasi ({warningBookingData.antrean_konsul_count || 0} pasien):</span>
                      <span className="font-semibold text-900">{warningBookingData.sisa_antrean_konsul_menit} menit</span>
                    </div>
                  )}
                  <div className="flex justify-content-between text-xs text-600 mb-1">
                    <span>1. Estimasi sesi konsultasi dokter:</span>
                    <span className="font-semibold text-900">{warningBookingData.durasi_konsultasi_menit || 10} menit</span>
                  </div>
                  <div className="flex justify-content-between text-xs text-600 mb-1">
                    <span>2. Sisa antrean berjalan di {warningBookingData.nama_ruangan} ({warningBookingData.antrean_berjalan_count || 0} pasien):</span>
                    <span className="font-semibold text-900">{warningBookingData.sisa_antrean_menit || 0} menit</span>
                  </div>
                  <div className="flex justify-content-between text-xs text-600 mb-1">
                    <span>3. Durasi tindakan layanan ({warningBookingData.nama_ruangan}):</span>
                    <span className="font-semibold text-900">{warningBookingData.durasi_tindakan_menit || warningBookingData.durasi_walkin_menit || 30} menit</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-content-between text-xs text-600 mb-1">
                    <span>Sisa antrean berjalan ({warningBookingData.antrean_berjalan_count || 0} pasien):</span>
                    <span className="font-semibold text-900">{warningBookingData.sisa_antrean_menit || 0} menit</span>
                  </div>
                  <div className="flex justify-content-between text-xs text-600 mb-1">
                    <span>Durasi tindakan layanan pasien baru:</span>
                    <span className="font-semibold text-900">{warningBookingData.durasi_walkin_menit || 0} menit</span>
                  </div>
                </>
              )}
              <div className="flex justify-content-between text-xs text-600 mb-1">
                <span>Buffer proteksi booking:</span>
                <span className="font-semibold text-900">+{warningBookingData.buffer_menit || 15} menit</span>
              </div>
              <div className="border-top-1 surface-border pt-1 mt-1 flex justify-content-between text-xs font-bold text-900">
                <span>Total estimasi waktu:</span>
                <span className="text-amber-700">{(warningBookingData.total_beban_menit || 0) + (warningBookingData.buffer_menit || 15)} menit</span>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border-round-xl border-1 border-yellow-300 text-xs text-yellow-900 line-height-3">
              <i className="pi pi-info-circle mr-1 font-bold text-yellow-700" />
              <strong>Catatan:</strong> Jika Anda memilih <strong>Tetap Lanjutkan (Override)</strong>, nomor antrean tetap akan diterbitkan dan sistem akan mencatat jejak audit override peringatan booking.
            </div>
          </div>
        )}
      </Dialog>

      {/* OVERLAY PANEL PENDAMPING */}
      <OverlayPanel ref={companionOpRef} className="shadow-4 border-round-xl">
        {activeCompanionData && (
          <div style={{ maxWidth: '320px' }}>
            <div className="font-bold text-xs text-900 mb-1 flex align-items-center gap-1">
              <Users size={14} className="text-primary" />
              <span>Tim Petugas Sesi ({activeCompanionData.ruangan})</span>
            </div>
            <div className="text-[11px] text-500 mb-2">Shift: {activeCompanionData.jam}</div>
            <div className="text-xs p-2 bg-primary-50 border-round mb-2">
              <div className="font-semibold text-primary-900 text-[11px]">Penanggung Jawab (PJ):</div>
              <div className="font-bold text-primary-700">{activeCompanionData.pj}</div>
            </div>
            <div className="text-[11px] font-semibold text-700 mb-1">
              Petugas Pendamping ({activeCompanionData.companions.length}):
            </div>
            <ul className="m-0 pl-3 text-xs text-600">
              {activeCompanionData.companions.map((c, i) => (
                <li key={i} className="mb-0.5">
                  <span className="font-medium text-900">{c.nama_petugas}</span>
                  {c.jabatan_petugas && <span className="text-500 text-[11px]"> — {c.jabatan_petugas}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </OverlayPanel>

      {/* Dialog Semua Jadwal Booking Hari Ini */}
      <DialogSemuaBookingRuangan
        visible={dialogAllBookingsVisible}
        onHide={() => setDialogAllBookingsVisible(false)}
        ruangan={selectedRuanganForBookings}
        todayDateStr={formatDateToYMD(tanggalKunjungan)}
      />

    </div>
  );
};
