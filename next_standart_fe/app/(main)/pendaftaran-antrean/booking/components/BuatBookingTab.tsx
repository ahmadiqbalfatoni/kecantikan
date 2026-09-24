'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { TabView, TabPanel } from 'primereact/tabview';
import { SelectButton } from 'primereact/selectbutton';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Divider } from 'primereact/divider';
import { Tooltip } from 'primereact/tooltip';
import { OverlayPanel } from 'primereact/overlaypanel';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { DialogDetailBooking } from './DialogDetailBooking';
import { DialogJadwalMingguanRuangan, RoomTabOption } from './DialogJadwalMingguanRuangan';
import {
  LayananCard,
  ServiceItem,
  RuanganGroup,
  getItemConsultType,
} from '@/app/(main)/pendaftaran-antrean/components/shared/LayananCard';
import {
  User,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  RotateCcw,
  Trash2,
  Info,
  ChevronDown,
  Users,
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
  jam_booking_default: string;
  kuota_total: number;
  kuota_terisi: number;
  sisa_kuota: number;
  is_available: boolean;
  is_past_today?: boolean;
  booked_times?: string[];
  booked_intervals?: Array<{
    kode_booking?: string;
    jam_mulai: string;
    durasi_menit: number;
    jam_selesai: string;
    start_minutes?: number;
    end_minutes?: number;
  }>;
}

interface Props {
  toast: React.RefObject<Toast>;
  onSuccessCreated?: () => void;
  initialPasien?: Pasien | null;
  initialNoRm?: string;
}

export const BuatBookingTab: React.FC<Props> = ({ toast, onSuccessCreated, initialPasien, initialNoRm }) => {
  // 1. Pasien State
  const [pasienSearch, setPasienSearch] = useState('');
  const [pasienList, setPasienList] = useState<Pasien[]>([]);
  const [loadingPasien, setLoadingPasien] = useState(false);
  const [selectedPasien, setSelectedPasien] = useState<Pasien | null>(initialPasien || null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedNoRmRef = useRef<string>('');

  // Auto-select pasien dari prop atau URL query param
  useEffect(() => {
    if (initialPasien) {
      if (lastLoadedNoRmRef.current.toLowerCase() === (initialPasien.no_rm || '').toLowerCase()) {
        return;
      }
      lastLoadedNoRmRef.current = initialPasien.no_rm || '';
      setSelectedPasien(initialPasien);
      showSuccess(toast, `Pasien ${initialPasien.nama} (${initialPasien.no_rm}) berhasil dipilih untuk booking`);
      return;
    }

    const checkNoRmParam = async () => {
      let targetNoRm = (initialNoRm || '').trim();
      if (!targetNoRm && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        targetNoRm = (params.get('no_rm') || params.get('norm') || '').trim();
      }

      if (!targetNoRm) return;
      if (lastLoadedNoRmRef.current.toLowerCase() === targetNoRm.toLowerCase()) return;
      lastLoadedNoRmRef.current = targetNoRm;

      setLoadingPasien(true);
      try {
        const res = await postData('/master/pendaftaran-pasien-cari', {
          no_rm: targetNoRm,
          page: 1,
          perPage: 5,
        });
        const list: Pasien[] = res.data?.data || [];
        const found = list.find(
          (p: Pasien) => (p.no_rm || '').toLowerCase() === targetNoRm.toLowerCase()
        ) || list[0];

        if (found) {
          setSelectedPasien(found);
          showSuccess(toast, `Pasien ${found.nama} (${found.no_rm}) berhasil dipilih untuk booking`);

          // Bersihkan URL query parameter agar tidak terus menempel
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('no_rm');
            url.searchParams.delete('norm');
            url.searchParams.delete('create');
            url.searchParams.delete('create_booking');
            window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
          }
        }
      } catch (err) {
        console.error('Error auto loading patient for booking:', err);
      } finally {
        setLoadingPasien(false);
      }
    };

    checkNoRmParam();
  }, [initialPasien, initialNoRm]);

  // 2. Tanggal & Layanan State (Pola Tab Ruangan & Multi-Select Card)
  const [tanggalBooking, setTanggalBooking] = useState<Date>(new Date());

  // Cek apakah tanggal booking yang dipilih adalah hari ini
  const isBookingToday = useMemo(() => {
    if (!tanggalBooking) return false;
    const today = new Date();
    return (
      tanggalBooking.getFullYear() === today.getFullYear() &&
      tanggalBooking.getMonth() === today.getMonth() &&
      tanggalBooking.getDate() === today.getDate()
    );
  }, [tanggalBooking]);

  const [ruangans, setRuangans] = useState<RuanganGroup[]>([]);
  const [loadingRuangan, setLoadingRuangan] = useState(true);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [selectedMap, setSelectedMap] = useState<{ [key: string]: ServiceItem }>({});
  const [activeRuangan, setActiveRuangan] = useState<string | null>(null);
  const [ownedPackages, setOwnedPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);

  // 3. Slot Jadwal State
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [dokterKonsulList, setDokterKonsulList] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [jamBooking, setJamBooking] = useState<string>('');
  const [isManualTime, setIsManualTime] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [manualTimeError, setManualTimeError] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');
  const [suggestedSlot, setSuggestedSlot] = useState<{ time: string; endEst: string } | null>(null);

  // 4. DP & Catatan State
  const [dpPercentage, setDpPercentage] = useState<number>(20);
  const [dpNominal, setDpNominal] = useState<number>(0);
  const [metodePembayaranDp, setMetodePembayaranDp] = useState<'cash' | 'transfer' | 'qris'>('cash');
  const [konfirmasiDpDiterima, setKonfirmasiDpDiterima] = useState<boolean>(false);
  const [alasanBebasDp, setAlasanBebasDp] = useState<string>('');
  const [sumber, setSumber] = useState<'staff' | 'whatsapp'>('staff');
  const [catatanPasien, setCatatanPasien] = useState('');
  const [globalConsultChoice, setGlobalConsultChoice] = useState<boolean>(true);

  const METODE_DP_OPTIONS = [
    { label: 'Cash / Tunai', value: 'cash' },
    { label: 'Transfer Bank', value: 'transfer' },
    { label: 'QRIS', value: 'qris' },
  ];

  const ALASAN_BEBAS_DP_OPTIONS = [
    { label: 'Klaim Paket (Kepemilikan Aktif)', value: 'Klaim Paket (Kepemilikan Aktif)' },
    { label: 'Pasien VIP / Prioritas', value: 'Pasien VIP / Prioritas' },
    { label: 'Instruksi Dokter / Manajemen', value: 'Instruksi Dokter / Manajemen' },
    { label: 'Kebijakan Promosi / Bebas DP', value: 'Kebijakan Promosi / Bebas DP' },
    { label: 'Lainnya (Sesuai Kebijakan Klinik)', value: 'Lainnya (Sesuai Kebijakan Klinik)' },
  ];

  // 5. Submit & Modal State
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 6. Dialog Jadwal Mingguan Ruangan State
  const [showJadwalRuanganDialog, setShowJadwalRuanganDialog] = useState(false);
  const [jadwalDialogRooms, setJadwalDialogRooms] = useState<RoomTabOption[]>([]);
  const [consultRoomInfo, setConsultRoomInfo] = useState<{ kode_ruangan: string; nama_ruangan: string } | null>(null);

  // 7. Popover & Tooltip Pendamping State & Ref
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

  // Helper ringkasan pendamping: 1 nama, 2 nama, atau 2 nama + sisa lainnya
  const getCompanionSummary = (companions: Array<{ nama_petugas: string }>, total: number) => {
    const count = total || (companions ? companions.length : 0);
    if (count <= 0) return '';
    if (count === 1) {
      return companions[0]?.nama_petugas || '1 petugas';
    }
    if (count === 2) {
      const n1 = companions[0]?.nama_petugas || '';
      const n2 = companions[1]?.nama_petugas || '';
      return `${n1}, ${n2}`;
    }
    const n1 = companions[0]?.nama_petugas || '';
    const n2 = companions[1]?.nama_petugas || '';
    const sisa = count - 2;
    return `${n1}, ${n2}, +${sisa} lainnya`;
  };

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

  // 1. Fetch Ruangan & Pilihan Layanan/Paket saat component mount
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
      console.error('Error fetching ruangan & layanan options:', error);
      showError(toast, 'Terjadi kesalahan saat memuat daftar layanan & ruangan');
    } finally {
      setLoadingRuangan(false);
    }
  };

  // 2. Search Pasien saat user mengetik
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
          perPage: 5,
        });
        setPasienList(res.data?.data || []);
      } catch (err) {
        console.error('Error search pasien:', err);
      } finally {
        setLoadingPasien(false);
      }
    }, 400);
  };

  // 2b. Fetch Kepemilikan Paket Pasien saat Pasien Dipilih
  useEffect(() => {
    if (selectedPasien?.no_rm) {
      fetchOwnedPackages(selectedPasien.no_rm);
    } else {
      setOwnedPackages([]);
    }
  }, [selectedPasien?.no_rm]);

  const fetchOwnedPackages = async (noRm: string) => {
    setLoadingPackages(true);
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
      console.error('Error fetching patient owned packages:', err);
      setOwnedPackages([]);
    } finally {
      setLoadingPackages(false);
    }
  };

  const claimablePackages = useMemo(() => {
    return (ownedPackages || []).filter((pkg: any) => {
      if (pkg.status && pkg.status.toLowerCase() !== 'aktif') return false;
      return (pkg.details || []).some((det: any) => (det.sisa_sesi || 0) > 0);
    });
  }, [ownedPackages]);

  // Reset activeTabIndex jika jumlah tab paket berubah agar tab yang dipilih selalu valid
  useEffect(() => {
    setActiveTabIndex(0);
  }, [claimablePackages.length]);

  // Handler Perubahan Tanggal Booking dengan Validasi Expired Paket
  const handleDateChange = (newDate: Date | null) => {
    if (!newDate) return;
    const newDateStr = formatDateToYMD(newDate);

    // Cek apakah ada klaim paket terpilih yang expired sebelum tanggal ini
    const expiredClaimItem = selectedList.find(
      (it) => it.jenis === 'klaim_paket' && it.tanggal_expired && newDateStr > it.tanggal_expired
    );

    if (expiredClaimItem) {
      showError(
        toast,
        `Sesi paket "${expiredClaimItem.nama}" kedaluwarsa pada ${expiredClaimItem.tanggal_expired}. Anda tidak dapat memilih tanggal booking (${newDateStr}) setelah tanggal kedaluwarsa paket.`
      );
      return;
    }

    setTanggalBooking(newDate);
  };

  // 3. Multi-Select Toggle Layanan/Paket
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

      // Validasi tanggal expired jika klaim_paket
      if (item.jenis === 'klaim_paket' && item.tanggal_expired) {
        const curDateStr = formatDateToYMD(tanggalBooking);
        if (curDateStr > item.tanggal_expired) {
          showError(
            toast,
            `Paket ini kedaluwarsa pada ${item.tanggal_expired}. Tanggal booking saat ini (${curDateStr}) melewati batas kedaluwarsa paket. Silakan ubah tanggal booking terlebih dahulu.`
          );
          return;
        }
      }

      if (activeRuangan !== null && activeRuangan !== item.kode_ruangan) {
        const currentRoomName =
          ruangans.find((r) => r.kode_ruangan === activeRuangan)?.nama_ruangan ||
          Object.values(selectedMap)[0]?.nama_ruangan ||
          activeRuangan;

        showError(
          toast,
          `Anda hanya dapat memilih layanan/paket dalam 1 ruangan yang sama per booking. Ruangan yang saat ini dipilih: "${currentRoomName}". Batalkan pilihan sebelumnya jika ingin berganti ruangan.`
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
    }
  };

  const selectedList = Object.values(selectedMap);
  const totalHarga = selectedList.reduce(
    (acc, curr) => acc + (curr.jenis === 'klaim_paket' ? 0 : (curr.harga_asal ?? curr.harga)),
    0
  );
  const totalDurasi = selectedList.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0);

  const hasOnlyKlaim = selectedList.length > 0 && selectedList.every((it) => it.jenis === 'klaim_paket');
  const hasKlaim = selectedList.some((it) => it.jenis === 'klaim_paket');

  // Evaluasi Aturan Konsultasi Seluruh Booking (Konsisten 100% dengan LayananCard)
  const hasWajibKonsul = selectedList.some((it) => getItemConsultType(it).isWajib);
  const hasOpsionalKonsul = !hasWajibKonsul && selectedList.some((it) => getItemConsultType(it).isOpsional);

  const effectiveButuhKonsul = hasWajibKonsul ? true : hasOpsionalKonsul ? globalConsultChoice : false;

  const activeRoomObj = ruangans.find((r) => r.kode_ruangan === activeRuangan);
  const activeRoomName = activeRoomObj?.nama_ruangan || selectedList[0]?.nama_ruangan || '';

  const handleOpenJadwalDialog = () => {
    const consultRoomCode = consultRoomInfo?.kode_ruangan || 'RNG-007';
    const consultRoomName = consultRoomInfo?.nama_ruangan || 'Ruang Konsultasi Dokter';

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

  // 4. Update DP saat total harga berubah
  useEffect(() => {
    if (hasOnlyKlaim) {
      setDpNominal(0);
      setDpPercentage(0);
      setAlasanBebasDp('Klaim Paket (Kepemilikan Aktif)');
      setKonfirmasiDpDiterima(false);
    } else {
      const calculated = Math.round((totalHarga * dpPercentage) / 100);
      setDpNominal(calculated);
      if (calculated > 0) {
        setAlasanBebasDp('');
      }
    }
  }, [totalHarga, dpPercentage, hasOnlyKlaim]);

  const handlePercentageChange = (percent: number) => {
    if (hasOnlyKlaim) return;
    setDpPercentage(percent);
    const calculated = Math.round((totalHarga * percent) / 100);
    setDpNominal(calculated);
    if (calculated > 0) {
      setAlasanBebasDp('');
    }
  };

  const isDpValid = hasOnlyKlaim
    ? true
    : dpNominal > 0
    ? !!metodePembayaranDp && konfirmasiDpDiterima
    : !!alasanBebasDp;

  // Helper konversi jam "HH:mm" <-> menit dari tengah malam
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const minutesToTime = (totalMin: number): string => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getEstimatedEndTime = (timeStr: string, duration: number) => {
    const min = timeToMinutes(timeStr) + duration;
    return minutesToTime(min);
  };

  // Jendela Jam Dokter Konsultasi Aktif
  const consultWindow = useMemo(() => {
    if (!effectiveButuhKonsul || !dokterKonsulList || dokterKonsulList.length === 0) {
      return null;
    }
    const startMins = dokterKonsulList.map((d: any) => timeToMinutes((d.jam_mulai || '').slice(0, 5)));
    const endMins = dokterKonsulList.map((d: any) => timeToMinutes((d.jam_selesai || '').slice(0, 5)));
    const docStartMin = Math.min(...startMins);
    const docEndMin = Math.max(...endMins);
    const docCount = dokterKonsulList.length;
    const firstDocName = dokterKonsulList[0]?.nama_dokter || 'Dokter';
    const dokterNames = dokterKonsulList.map((d: any) => d.nama_dokter).filter(Boolean).join(', ');
    const dokterSummary = docCount > 1 ? `${firstDocName} dan tim` : firstDocName;

    return {
      docStartMin,
      docEndMin,
      docStartStr: minutesToTime(docStartMin),
      docEndStr: minutesToTime(docEndMin),
      dokterNames,
      dokterSummary,
    };
  }, [effectiveButuhKonsul, dokterKonsulList]);

  // Irisan Shift Terapis & Dokter Konsultasi
  const slotOverlap = useMemo(() => {
    // Ambil shift dari selectedSlot, atau fallback ke slot pertama yang tersedia di ruangan tersebut
    const targetSlot = selectedSlot || (slots.length > 0 ? slots[0] : null);
    if (!targetSlot) return null;

    const startMin = timeToMinutes(targetSlot.jam_mulai);
    const endMin = timeToMinutes(targetSlot.jam_selesai);

    if (!consultWindow) {
      return {
        overlapStartMin: startMin,
        overlapEndMin: endMin,
        overlapStartStr: targetSlot.jam_mulai,
        overlapEndStr: targetSlot.jam_selesai,
        hasOverlap: true,
        petugasName: targetSlot.nama_petugas,
        shiftMulai: targetSlot.jam_mulai,
        shiftSelesai: targetSlot.jam_selesai,
      };
    }

    const overlapStartMin = Math.max(startMin, consultWindow.docStartMin);
    const overlapEndMin = Math.min(endMin, consultWindow.docEndMin);
    const hasOverlap = overlapStartMin < overlapEndMin;

    return {
      overlapStartMin,
      overlapEndMin,
      overlapStartStr: minutesToTime(overlapStartMin),
      overlapEndStr: minutesToTime(overlapEndMin),
      hasOverlap,
      petugasName: targetSlot.nama_petugas,
      shiftMulai: targetSlot.jam_mulai,
      shiftSelesai: targetSlot.jam_selesai,
    };
  }, [selectedSlot, slots, consultWindow]);

  // Otomatis pilih "Langsung Tindakan" jika dokter di Ruang Konsultasi tidak bertugas pada tanggal booking
  useEffect(() => {
    if (!loadingSlots && dokterKonsulList.length === 0 && globalConsultChoice && !hasWajibKonsul) {
      setGlobalConsultChoice(false);
    }
  }, [loadingSlots, dokterKonsulList, hasWajibKonsul, globalConsultChoice]);

  // Generate daftar opsi slot jam berdasarkan shift, durasi tindakan, bentrok janji temu lain, dan irisan dokter
  const timeSlots = useMemo(() => {
    if (!selectedSlot) return [];
    const startMin = timeToMinutes(selectedSlot.jam_mulai);
    const endMin = timeToMinutes(selectedSlot.jam_selesai);
    const durasi = totalDurasi || 30;

    // Hitung waktu saat ini jika booking untuk hari ini
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Buffer waktu persiapan minimal sebelum jam tindakan (dalam menit)
    // TODO: Diskusikan dengan manajemen operasional klinik jika membutuhkan buffer persiapan booking (misal 30-60 menit sebelum tindakan)
    const BOOKING_LEAD_TIME_BUFFER_MINUTES = 0;

    // Ambil daftar booking yang sudah ada di sesi ini (lengkap dengan durasi)
    const existingIntervals: { start: number; end: number; startStr: string; endStr: string }[] = [];

    if (Array.isArray(selectedSlot.booked_intervals) && selectedSlot.booked_intervals.length > 0) {
      for (const inv of selectedSlot.booked_intervals) {
        const sStr = (inv.jam_mulai || '').slice(0, 5);
        const sMin = inv.start_minutes ?? timeToMinutes(sStr);
        const dMin = inv.durasi_menit || 30;
        const eMin = inv.end_minutes ?? (sMin + dMin);
        const eStr = inv.jam_selesai ? inv.jam_selesai.slice(0, 5) : minutesToTime(eMin);
        existingIntervals.push({
          start: sMin,
          end: eMin,
          startStr: sStr,
          endStr: eStr,
        });
      }
    } else if (Array.isArray(selectedSlot.booked_times)) {
      for (const t of selectedSlot.booked_times) {
        const sStr = t.slice(0, 5);
        const sMin = timeToMinutes(sStr);
        const dMin = 30;
        existingIntervals.push({
          start: sMin,
          end: sMin + dMin,
          startStr: sStr,
          endStr: minutesToTime(sMin + dMin),
        });
      }
    }

    const result: {
      time: string;
      exceedsShift: boolean;
      isBooked: boolean;
      isDirectHit: boolean;
      conflictReason?: string;
      isOutsideDoctor: boolean;
      doctorDisabledReason?: string;
      isPast: boolean;
      endEst: string;
    }[] = [];

    const step = durasi > 0 ? durasi : 30;

    for (let m = startMin; m < endMin; m += step) {
      const time = minutesToTime(m);
      const candStartMin = m;
      const candEndMin = m + durasi;
      const endEst = minutesToTime(candEndMin);
      const exceedsShift = candEndMin > endMin;

      // Slot yang melebihi batas akhir shift TIDAK ditampilkan sesuai instruksi user
      if (exceedsShift) {
        break;
      }

      // Validasi waktu saat ini: jika booking hari ini, nonaktifkan slot yang jam mulai-nya sudah lewat
      const isPast = isBookingToday && (candStartMin < nowMinutes + BOOKING_LEAD_TIME_BUFFER_MINUTES);

      // Cek apakah rentang kandidat [candStartMin, candEndMin) bertabrakan dengan janji temu lain yang sudah ada
      let isBooked = false;
      let isDirectHit = false;
      let conflictReason = '';

      for (const ex of existingIntervals) {
        // Dua interval [candStartMin, candEndMin) dan [ex.start, ex.end) saling bertabrakan jika:
        // candStartMin < ex.end && ex.start < candEndMin
        if (candStartMin < ex.end && ex.start < candEndMin) {
          isBooked = true;
          if (candStartMin === ex.start) {
            isDirectHit = true;
            conflictReason = `sudah dipesan oleh pasien lain (${ex.startStr} - ${ex.endStr} WIB)`;
          } else {
            conflictReason = `bertabrakan dengan janji temu pasien lain (${ex.startStr} - ${ex.endStr} WIB)`;
          }
          break;
        }
      }

      let isOutsideDoctor = false;
      let doctorDisabledReason = '';

      if (consultWindow) {
        if (m < consultWindow.docStartMin) {
          isOutsideDoctor = true;
          doctorDisabledReason = `Dokter belum jaga (mulai ${consultWindow.docStartStr})`;
        } else if (m >= consultWindow.docEndMin) {
          isOutsideDoctor = true;
          doctorDisabledReason = `Dokter sudah selesai (${consultWindow.docEndStr})`;
        }
      }

      result.push({
        time,
        exceedsShift,
        isBooked,
        isDirectHit,
        conflictReason,
        isOutsideDoctor,
        doctorDisabledReason,
        isPast,
        endEst,
      });
    }

    return result;
  }, [selectedSlot, totalDurasi, consultWindow, isBookingToday]);

  // Reset jamBooking jika durasi tindakan berubah di Step 2 atau slot menjadi tidak valid
  useEffect(() => {
    if (jamBooking && timeSlots.length > 0) {
      const isStillInSlots = timeSlots.some(
        (s) => s.time === jamBooking && !s.isBooked && !s.isOutsideDoctor && !s.isPast
      );
      if (!isStillInSlots) {
        setJamBooking('');
        setManualTimeInput('');
        setManualTimeError('');
        setManualSuccessMsg('');
        setSuggestedSlot(null);
      }
    }
  }, [totalDurasi, timeSlots]);

  // Terapkan dan validasi input manual jam sesuai interval grid & kuota
  const handleApplyManualTime = (customVal?: string) => {
    const val = (customVal !== undefined ? customVal : manualTimeInput).trim();
    setManualTimeError('');
    setManualSuccessMsg('');
    setSuggestedSlot(null);

    if (!val) {
      setManualTimeError('Jam janji temu tidak boleh kosong.');
      return;
    }
    if (!selectedSlot) return;

    const startMin = timeToMinutes(selectedSlot.jam_mulai);
    const endMin = timeToMinutes(selectedSlot.jam_selesai);
    const inputMin = timeToMinutes(val);
    const durasi = totalDurasi || 30;

    // 1. Batasi rentang input manual sesuai jam operasional sesi
    if (inputMin < startMin || inputMin >= endMin) {
      setManualTimeError(
        `Jam ${val} WIB berada di luar jam operasional sesi ini (${selectedSlot.jam_mulai} - ${selectedSlot.jam_selesai} WIB).`
      );
      return;
    }

    // 1b. Validasi waktu saat ini untuk booking hari ini
    if (isBookingToday) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (inputMin < nowMinutes) {
        setManualTimeError(
          `Jam ${val} WIB sudah melewati waktu saat ini (${nowStr} WIB) untuk booking hari ini.`
        );
        return;
      }
    }

    if (inputMin + durasi > endMin) {
      const endEstStr = minutesToTime(inputMin + durasi);
      setManualTimeError(
        `Waktu tindakan selesai (${endEstStr} WIB) melebihi batas shift (${selectedSlot.jam_selesai} WIB). Total durasi: ${durasi} menit.`
      );
      return;
    }

    // 2. Bulatkan ke interval durasi tindakan terdekat sesuai pola grid sesi
    const step = durasi > 0 ? durasi : 30;
    const diff = inputMin - startMin;
    const roundedDiff = Math.round(diff / step) * step;
    const roundedMin = startMin + roundedDiff;
    const roundedTime = minutesToTime(roundedMin);

    // Cari slot pada timeSlots yang sesuai
    let targetSlot = timeSlots.find((s) => s.time === roundedTime);
    if (!targetSlot && timeSlots.length > 0) {
      // Fallback ke slot di timeSlots dengan selisih waktu terdekat
      targetSlot = timeSlots.reduce((prev, curr) =>
        Math.abs(timeToMinutes(curr.time) - inputMin) < Math.abs(timeToMinutes(prev.time) - inputMin) ? curr : prev
      );
    }

    if (!targetSlot) {
      setManualTimeError('Tidak ada slot waktu yang tersedia pada sesi ini.');
      return;
    }

    // 3. Cek ketersediaan kuota / slot persis seperti grid
    const isAvailable = !targetSlot.isBooked && !targetSlot.exceedsShift && !targetSlot.isOutsideDoctor && !targetSlot.isPast;

    if (isAvailable) {
      // Input manual valid & tersedia -> Sinkronkan state ke grid
      setJamBooking(targetSlot.time);
      setManualTimeInput(targetSlot.time);
      if (val !== targetSlot.time) {
        setManualSuccessMsg(
          `Jam yang dipilih (${val}) disesuaikan ke slot terdekat: ${targetSlot.time} - ${targetSlot.endEst} WIB`
        );
      } else {
        setManualSuccessMsg(
          `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB berhasil dipilih.`
        );
      }
      setManualTimeError('');
      setSuggestedSlot(null);
    } else {
      // Slot hasil pembulatan tidak tersedia (penuh / bentrok / luar jam dokter / melebihi shift / sudah lewat)
      let reasonMsg = '';
      if (targetSlot.isPast) {
        reasonMsg = `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB sudah melewati waktu saat ini.`;
      } else if (targetSlot.isBooked) {
        reasonMsg = targetSlot.conflictReason
          ? `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB ${targetSlot.conflictReason}.`
          : `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB sudah penuh.`;
      } else if (targetSlot.isOutsideDoctor) {
        reasonMsg = `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB tidak tersedia (${targetSlot.doctorDisabledReason || 'di luar jam jaga dokter'}).`;
      } else if (targetSlot.exceedsShift) {
        reasonMsg = `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB melebihi batas shift (${selectedSlot.jam_selesai} WIB).`;
      } else {
        reasonMsg = `Slot ${targetSlot.time} - ${targetSlot.endEst} WIB tidak tersedia.`;
      }

      // Cari slot terdekat yang MASIH TERSEDIA
      const availableSlots = timeSlots.filter(
        (st) => !st.isBooked && !st.exceedsShift && !st.isOutsideDoctor && !st.isPast
      );

      if (availableSlots.length > 0) {
        const sortedSlots = [...availableSlots].sort(
          (a, b) => Math.abs(timeToMinutes(a.time) - inputMin) - Math.abs(timeToMinutes(b.time) - inputMin)
        );
        const nearest = sortedSlots[0];
        setSuggestedSlot({ time: nearest.time, endEst: nearest.endEst });
        setManualTimeError(
          `${reasonMsg} Slot terdekat yang tersedia: ${nearest.time} - ${nearest.endEst} WIB`
        );
      } else {
        setSuggestedSlot(null);
        setManualTimeError(
          `${reasonMsg} Tidak ada slot lain yang tersedia pada shift ini.`
        );
      }
    }
  };

  const handleManualTimeChange = (val: string) => {
    setManualTimeInput(val);
    setManualTimeError('');
    setManualSuccessMsg('');
    setSuggestedSlot(null);
  };

  // 5. Fetch Slot Jadwal saat ruangan aktif dan tanggal terpilih
  useEffect(() => {
    if (!tanggalBooking || !activeRuangan) {
      setSlots([]);
      setDokterKonsulList([]);
      setSelectedSlot(null);
      setJamBooking('');
      setIsManualTime(false);
      setManualTimeInput('');
      setManualTimeError('');
      setManualSuccessMsg('');
      setSuggestedSlot(null);
      return;
    }
    fetchSlots();
  }, [tanggalBooking, activeRuangan]);

  // Helper untuk memastikan slot jadwal dikelompokkan per SESI: (kode_ruangan + hari + jam_mulai + jam_selesai)
  // Hanya 1 card yang ditampilkan per sesi, diwakili oleh PJ (atau karyawan pertama jika belum ada PJ)
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
      // Cari slot yang merupakan PJ; jika tidak ada, gunakan slot pertama
      const pjSlot = items.find((s) => s.is_penanggung_jawab) || items[0];
      const hasPJ = items.some((s) => s.is_penanggung_jawab);

      const pjNoSip = String(pjSlot.no_sip || '').trim().toLowerCase();
      const pjNama = String(pjSlot.nama_petugas || '').trim().toLowerCase();

      // Kumpulkan semua pendamping dari seluruh item di sesi ini (KECUALIKAN PJ & DEDUPLIKASI)
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

      // Kumpulkan booked_times dan booked_intervals dari seluruh jadwal di sesi ini
      const mergedBookedTimes = new Set<string>();
      const mergedBookedIntervals: Array<{
        kode_booking?: string;
        jam_mulai: string;
        durasi_menit: number;
        jam_selesai: string;
        start_minutes?: number;
        end_minutes?: number;
      }> = [];
      const seenBookingCodes = new Set<string>();

      for (const item of items) {
        if (Array.isArray(item.booked_times)) {
          item.booked_times.forEach((t) => mergedBookedTimes.add(t));
        }
        if (Array.isArray(item.booked_intervals)) {
          for (const inv of item.booked_intervals) {
            const key = inv.kode_booking || `${inv.jam_mulai}_${inv.durasi_menit}`;
            if (!seenBookingCodes.has(key)) {
              seenBookingCodes.add(key);
              mergedBookedIntervals.push(inv);
            }
          }
        }
      }

      result.push({
        ...pjSlot,
        has_pj: hasPJ,
        petugas_pendamping: cleanCompanions,
        jumlah_pendamping: cleanCompanions.length,
        booked_times: Array.from(mergedBookedTimes),
        booked_intervals: mergedBookedIntervals,
      });
    }

    return result;
  };

  const fetchSlots = async () => {
    if (!activeRuangan) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setJamBooking('');
    setIsManualTime(false);
    setManualTimeInput('');
    setManualTimeError('');
    try {
      const tglYmd = formatDateToYMD(tanggalBooking);
      const res = await postData('/transaksi/booking/slots', {
        tanggal_booking: tglYmd,
        kode_ruangan: activeRuangan,
        kode_layanan: selectedList[0]?.kode_layanan,
        jenis_layanan: selectedList[0]?.jenis,
      });

      if (res.data?.status === 200 || res.status === 200) {
        const d = res.data?.data;
        const rawSlots: SlotItem[] = d?.slots || [];
        setSlots(groupSlotsBySession(rawSlots));
        setDokterKonsulList(d?.dokter_konsul || []);
      } else {
        setSlots([]);
        setDokterKonsulList([]);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setSlots([]);
      setDokterKonsulList([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // 6. Submit Booking
  const handleSubmitBooking = async () => {
    if (!selectedPasien) {
      showError(toast, 'Harap pilih pasien terlebih dahulu di Langkah 1');
      return;
    }
    if (selectedList.length === 0) {
      showError(toast, 'Harap pilih minimal satu layanan atau paket di Langkah 2');
      return;
    }
    if (effectiveButuhKonsul && dokterKonsulList.length === 0 && !loadingSlots) {
      const hariName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][tanggalBooking.getDay()];
      showError(
        toast,
        `Tidak ada dokter jaga di Ruang Konsultasi pada hari ${hariName}. Silakan pilih alur "Langsung Tindakan" atau ubah tanggal booking ke hari praktek dokter.`
      );
      return;
    }
    if (!selectedSlot) {
      showError(toast, 'Harap pilih salah satu slot jadwal petugas yang tersedia di Langkah 3');
      return;
    }
    if (!jamBooking) {
      showError(toast, 'Harap pilih jam janji temu spesifik untuk pasien');
      return;
    }

    if (isBookingToday) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const inputMin = timeToMinutes(jamBooking);
      if (inputMin < nowMin) {
        showError(
          toast,
          `Jam janji temu ${jamBooking} WIB sudah melewati waktu saat ini untuk booking hari ini. Harap pilih slot jam yang masih tersedia.`
        );
        return;
      }

      if (effectiveButuhKonsul && consultWindow && consultWindow.docEndMin <= nowMin) {
        showError(
          toast,
          `Dokter jaga di Ruang Konsultasi telah selesai bertugas hari ini (pukul ${consultWindow.docEndStr} WIB). Silakan alihkan ke alur 'Langsung Tindakan' atau buat reservasi Booking untuk hari berikutnya.`
        );
        return;
      }
    }

    if (effectiveButuhKonsul && consultWindow && selectedSlot) {
      if (slotOverlap && !slotOverlap.hasOverlap) {
        showError(
          toast,
          `Tidak ada irisan jam kerja antara dokter konsultasi (${consultWindow.docStartStr} - ${consultWindow.docEndStr} WIB) dan petugas treatment (${selectedSlot.jam_mulai} - ${selectedSlot.jam_selesai} WIB). Harap ganti tanggal atau pilih alur 'Langsung Tindakan'.`
        );
        return;
      }
      const inputMin = timeToMinutes(jamBooking);
      if (inputMin < consultWindow.docStartMin || inputMin >= consultWindow.docEndMin) {
        showError(
          toast,
          `Jam janji temu ${jamBooking} WIB tidak valid untuk alur konsultasi dokter. Dokter jaga (${consultWindow.dokterNames}) bertugas pukul ${consultWindow.docStartStr} - ${consultWindow.docEndStr} WIB.`
        );
        return;
      }
    }

    // Validasi DP baru
    if (dpNominal > 0) {
      if (!metodePembayaranDp) {
        showError(toast, 'Harap pilih metode pembayaran DP (Cash / Transfer / QRIS)!');
        return;
      }
      if (!konfirmasiDpDiterima) {
        showError(toast, 'Harap centang konfirmasi bahwa pembayaran DP telah diterima dari pasien!');
        return;
      }
    } else {
      if (!hasOnlyKlaim && !alasanBebasDp) {
        showError(toast, 'Harap pilih alasan bebas DP (Rp 0)!');
        return;
      }
    }

    setLoadingSubmit(true);
    try {
      const payload = {
        no_rm: selectedPasien.no_rm,
        kode_ruangan: activeRuangan,
        kode_jadwal: selectedSlot.kode_jadwal,
        tanggal_booking: formatDateToYMD(tanggalBooking),
        jam_booking: jamBooking,
        catatan_pasien: catatanPasien.trim() || undefined,
        dp_nominal: dpNominal,
        metode_pembayaran_dp: dpNominal > 0 ? metodePembayaranDp : undefined,
        konfirmasi_dp_diterima: dpNominal > 0 ? konfirmasiDpDiterima : undefined,
        alasan_bebas_dp: dpNominal === 0 ? (hasOnlyKlaim ? 'Klaim Paket (Kepemilikan Aktif)' : alasanBebasDp) : undefined,
        sumber: sumber,
        butuh_konsul: effectiveButuhKonsul,
        items: selectedList.map((it) => ({
          jenis_layanan: it.jenis,
          kode_layanan: it.kode_layanan,
          nama_layanan: it.nama,
          harga: it.jenis === 'klaim_paket' ? 0 : (it.harga_asal ?? it.harga),
          durasi_menit: it.durasi_menit,
          kode_kepemilikan_paket_layanan: it.kode_kepemilikan_paket_layanan,
          kode_detail_kepemilikan_paket_layanan: it.kode_detail_kepemilikan_paket_layanan,
          butuh_konsul: effectiveButuhKonsul,
        })),
      };

      const res = await postData('/transaksi/booking/create', payload);

      if (
        res.data?.status === 201 ||
        res.data?.status === 200 ||
        res.status === 201 ||
        res.status === 200
      ) {
        const created = res.data?.data;
        showSuccess(toast, res.data?.message || 'Booking berhasil dibuat!');
        setCreatedBookingData({
          ...created,
          jam_booking: jamBooking,
          nama_pasien: selectedPasien.nama,
          nama_layanan:
            selectedList.length === 1
              ? selectedList[0].nama
              : `${selectedList[0].nama} (+${selectedList.length - 1} layanan)`,
          nama_ruangan: selectedSlot.nama_ruangan,
          nama_petugas: selectedSlot.nama_petugas,
          butuh_konsul: effectiveButuhKonsul,
          items: selectedList,
          metode_pembayaran_dp: dpNominal > 0 ? metodePembayaranDp : null,
          alasan_bebas_dp: dpNominal === 0 ? (hasOnlyKlaim ? 'Klaim Paket (Kepemilikan Aktif)' : alasanBebasDp) : null,
        });
        setShowDetailDialog(true);

        // Reset form
        handleResetForm();
      } else {
        showError(toast, res.data?.message || 'Gagal membuat booking');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan booking';
      showError(toast, msg);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleResetForm = () => {
    lastLoadedNoRmRef.current = '';
    setSelectedPasien(null);
    setPasienSearch('');
    setPasienList([]);
    setSelectedMap({});
    setActiveRuangan(null);
    setSelectedSlot(null);
    setJamBooking('');
    setIsManualTime(false);
    setManualTimeInput('');
    setManualTimeError('');
    setManualSuccessMsg('');
    setSuggestedSlot(null);
    setCatatanPasien('');
    setSlots([]);
    setTanggalBooking(new Date());
    setOwnedPackages([]);
    setGlobalConsultChoice(true);
    setActiveTabIndex(0);
    setMetodePembayaranDp('cash');
    setKonfirmasiDpDiterima(false);
    setAlasanBebasDp('');
  };

  return (
    <div className="p-1 sm:p-2">

      {/* Dialog Detail / Bukti Booking Setelah Berhasil */}
      <DialogDetailBooking
        visible={showDetailDialog}
        booking={createdBookingData}
        onHide={() => setShowDetailDialog(false)}
      />

      <div className="grid">
        {/* KOLOM KIRI: FORM STEP */}
        <div className="col-12 lg:col-8">
          {/* STEP 1: PILIH PASIEN */}
          <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
            <div className="flex justify-content-between align-items-center mb-3">
              <div className="flex align-items-center gap-2">
                <span
                  className="flex align-items-center justify-content-center bg-primary text-white border-round-circle font-bold"
                  style={{ width: 28, height: 28 }}
                >
                  1
                </span>
                <span className="font-bold text-lg text-900">Pilih Pasien</span>
              </div>
            </div>

            {selectedPasien ? (
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

                    {/* BARIS 1: NIK · NO. HP · GENDER */}
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
                  label="Ganti Pasien"
                  icon="pi pi-refresh"
                  className="p-button-text p-button-secondary p-button-sm text-xs font-semibold"
                  onClick={() => {
                    lastLoadedNoRmRef.current = '';
                    setSelectedPasien(null);
                    setPasienSearch('');
                    setPasienList([]);
                  }}
                />
              </div>
            ) : (
              <div>
                <span className="block w-full p-input-icon-left mb-2">
                  <IconField iconPosition="left">
                    <InputIcon className="pi pi-search" />
                    <InputText
                      value={pasienSearch}
                      onChange={(e) => handleSearchPasien(e.target.value)}
                      placeholder="Cari Pasien (Ketik Nama, No. RM, No. HP, atau NIK)..."
                      className="w-full text-sm border-round-lg"
                    />
                  </IconField>
                </span>

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
                        body={(rowData: Pasien) => (
                          <span className="font-mono font-bold text-primary">
                            {rowData.no_rm}
                          </span>
                        )}
                        style={{ width: '110px' }}
                      />
                      <Column
                        field="nama"
                        header="Nama Pasien"
                        body={(rowData: Pasien) => (
                          <span className="font-semibold text-900">
                            {rowData.nama}
                          </span>
                        )}
                        style={{ minWidth: '150px' }}
                      />
                      <Column
                        field="nik"
                        header="NIK"
                        body={(rowData: Pasien) => (
                          <span className="font-mono text-700 text-xs">
                            {rowData.nik || '-'}
                          </span>
                        )}
                        style={{ width: '140px' }}
                      />
                      <Column
                        header="L/P"
                        align="center"
                        style={{ width: '100px' }}
                        body={(rowData: Pasien) => {
                          if (!rowData.jenis_kelamin) return <span className="text-400 text-xs">-</span>;
                          const isMale = rowData.jenis_kelamin === 'L';
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
                        style={{ width: '130px' }}
                        body={(rowData: Pasien) => (
                          <span className="text-700 font-mono text-xs">
                            {rowData.no_hp || '-'}
                          </span>
                        )}
                      />
                      <Column
                        header="Alamat / Wilayah"
                        style={{ minWidth: '180px' }}
                        body={(rowData: Pasien) => {
                          return <span className="text-600 text-xs">{getFormattedAddress(rowData)}</span>;
                        }}
                      />
                      <Column
                        header="Aksi"
                        align="center"
                        style={{ width: '85px' }}
                        body={(rowData: Pasien) => (
                          <div className="flex align-items-center justify-content-center">
                            <Button
                              label="Pilih"
                              icon="pi pi-check"
                              size="small"
                              severity="success"
                              className="py-1 px-2.5 text-xs font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPasien(rowData);
                                setPasienList([]);
                              }}
                            />
                          </div>
                        )}
                      />
                    </DataTable>
                  </div>
                )}

                {pasienSearch && !loadingPasien && pasienList.length === 0 && (
                  <div className="text-xs text-500 mt-2 p-2 surface-100 border-round">
                    <span>Pasien tidak ditemukan dengan kata kunci &ldquo;{pasienSearch}&rdquo;. Pastikan pasien sudah terdaftar di menu Pasien Baru.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: PILIH LAYANAN & PAKET TREATMENT (TAB RUANGAN & MULTI-SELECT KARTU PERSIS PENDAFTARAN PASIEN) */}
          <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
            <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2 mb-3">
              <div>
                <div className="flex align-items-center gap-2">
                  <span
                    className="flex align-items-center justify-content-center bg-primary text-white border-round-circle font-bold"
                    style={{ width: 28, height: 28 }}
                  >
                    2
                  </span>
                  <span className="font-bold text-lg text-900">Pilih Layanan & Paket Treatment</span>
                </div>
                <p className="text-xs text-500 m-0 mt-1 pl-5">
                  Pilih satu atau beberapa layanan/paket dalam ruangan yang sama untuk menentukan slot jadwal petugas.
                </p>
              </div>

              {/* Tanggal Booking (Kontainer Terpadu & Selaras Hijau/Emerald) */}
              <div className="flex align-items-center surface-50 border-1 surface-border border-round-xl px-2 py-1 shadow-1 gap-2 align-self-start sm:align-self-center">
                <div className="flex align-items-center gap-2 pl-1">
                  <i className="pi pi-calendar text-primary text-sm" />
                  <span className="text-xs font-bold text-700 white-space-nowrap">Tanggal:</span>
                </div>
                <Calendar
                  value={tanggalBooking}
                  onChange={(e) => handleDateChange(e.value as Date)}
                  dateFormat="yy-mm-dd"
                  minDate={new Date()}
                  showIcon
                  className="p-inputtext-sm font-semibold"
                  style={{ width: '135px' }}
                />
                <span className="text-xs font-bold px-2 py-1 border-round-lg bg-green-100 text-green-800 border-1 border-green-200 flex align-items-center gap-1">
                  <i className="pi pi-clock text-[10px] text-green-700" />
                  {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][tanggalBooking.getDay()]}
                </span>
              </div>
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
                            Pasien memiliki paket aktif! Pilih sesi treatment di bawah ini untuk mereservasi sesi lanjutan tanpa biaya DP / biaya tambahan (Rp 0).
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
                                  wajib_konsultasi: (pkg.tipe_paket === 'MEDICAL TREATMENT' ? 'wajib' : pkg.tipe_paket === 'SERVICE TREATMENT' ? 'tidak' : 'opsional'),
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
                                    gridClassName="col-12 sm:col-6 md:col-4 lg:col-3 xl:col-3 p-2"
                                  />
                                );
                              });
                          })}
                        </div>
                      </TabPanel>
                    );
                  }

                  ruangans.forEach((ruang) => {
                    const isRuangActive = activeRuangan === ruang.kode_ruangan;
                    const isRuangDisabled = activeRuangan !== null && activeRuangan !== ruang.kode_ruangan;
                    const ruangSelectedCount = (ruang.items || []).filter(
                      (item) => !!selectedMap[`${item.jenis}_${item.kode_layanan}`]
                    ).length;
                    const roomTitle = ruang.nama_ruangan || `Ruangan ${ruang.kode_ruangan}`;
                    const countSuffix = ruangSelectedCount > 0 ? ` (${ruangSelectedCount})` : '';

                    panels.push(
                      <TabPanel
                        key={ruang.kode_ruangan}
                        header={`${roomTitle}${countSuffix}`}
                        leftIcon={`pi ${isRuangActive ? 'pi-check-circle' : 'pi-building'} mr-2`}
                      >
                        {isRuangDisabled && (
                          <div className="flex align-items-center gap-2 p-3 mb-3 bg-orange-50 border-round-lg border-1 border-orange-200">
                            <i className="pi pi-info-circle text-orange-500" />
                            <span className="text-sm text-orange-700">
                              Ruangan ini tidak bisa dipilih karena Anda sudah memilih layanan/paket dari ruangan <strong>{activeRoomName}</strong>.
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
                                  gridClassName="col-12 sm:col-6 md:col-4 lg:col-3 xl:col-3 p-2"
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

            {/* BLOK PILIHAN ALUR KONSULTASI DOKTER PRA-TINDAKAN (BERLAKU UNTUK SELURUH BOOKING) */}
            {selectedList.length > 0 && (
              <>
                {hasWajibKonsul && (
                  <div className="p-3 bg-red-50 border-1 border-red-200 border-round-xl mt-3 flex align-items-center gap-3">
                    <div className="flex align-items-center justify-content-center bg-red-100 text-red-700 border-round-lg p-2 flex-shrink-0">
                      <i className="pi pi-user-edit text-lg" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-red-900 mb-0.5">Wajib Konsultasi Dokter Terlebih Dahulu</div>
                      <div className="text-xs text-red-700">
                        Salah satu tindakan yang Anda pilih berstatus tindakan medis (Medical Treatment). Pasien otomatis diarahkan ke Ruang Konsultasi Dokter saat check-in di klinik sebelum tindakan.
                      </div>
                    </div>
                    <Tag value="Wajib Konsul" severity="danger" className="text-xs font-bold" />
                  </div>
                )}

                {hasOpsionalKonsul && (
                  <div className="p-3 surface-50 border-1 surface-border border-round-xl mt-3">
                    <div className="flex align-items-center justify-content-between mb-2">
                      <div className="flex align-items-center gap-2">
                        <i className="pi pi-question-circle text-indigo-500 font-bold" />
                        <span className="font-bold text-sm text-900">Pilihan Alur Kunjungan Pasien</span>
                      </div>
                      <Tag value="Opsional Konsul" severity="info" className="text-xs font-semibold" />
                    </div>
                    <p className="text-xs text-600 m-0 mb-3">
                      Tindakan yang dipilih menyertakan opsi konsultasi dokter pra-tindakan. Tentukan alur kunjungan saat pasien tiba / check-in di klinik:
                    </p>
                    <div className="grid">
                      {/* Opsi 1: Konsultasi Dokter Dulu */}
                      {(() => {
                        const isNoDoctorOnDate = !loadingSlots && dokterKonsulList.length === 0;
                        return (
                          <div className="col-12 sm:col-6">
                            <div
                              className="p-3 border-round-xl border-2 cursor-pointer transition-all transition-duration-200 flex align-items-center gap-3 h-full"
                              style={{
                                borderColor: globalConsultChoice ? '#6366f1' : '#e2e8f0',
                                background: globalConsultChoice
                                  ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)'
                                  : 'var(--surface-card)',
                                userSelect: 'none',
                              }}
                              onClick={() => setGlobalConsultChoice(true)}
                            >
                              <div
                                className="flex align-items-center justify-content-center border-round-lg text-white flex-shrink-0"
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  background: globalConsultChoice
                                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                    : '#cbd5e1',
                                }}
                              >
                                <i className="pi pi-user-edit text-base" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex align-items-center gap-2 flex-wrap">
                                  <span
                                    className="font-bold text-xs"
                                    style={{
                                      color: globalConsultChoice ? '#4338ca' : '#475569',
                                    }}
                                  >
                                    Konsultasi Dokter Dulu
                                  </span>
                                  {isNoDoctorOnDate && (
                                    <Tag
                                      value="Tidak Ada Dokter"
                                      severity="danger"
                                      className="text-[10px] py-0 px-1 font-semibold"
                                    />
                                  )}
                                </div>
                                <div className="text-[11px] text-500 mt-0.5">
                                  {isNoDoctorOnDate ? (
                                    <span>Tidak ada jadwal dokter jaga di Ruang Konsultasi pada tanggal ini.</span>
                                  ) : (
                                    <span>Pasien antre di Ruang Konsultasi Dokter saat check-in sebelum menuju ruang treatment.</span>
                                  )}
                                </div>
                              </div>
                              {globalConsultChoice && (
                                <i className="pi pi-check-circle text-indigo-600 text-lg flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })()}

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
                              width: '36px', height: '36px',
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
              </>
            )}
          </div>

          {/* STEP 3: SLOT JADWAL & KUOTA */}
          <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
            <div className="flex align-items-center justify-content-between mb-3">
              <div className="flex align-items-center gap-2">
                <span
                  className="flex align-items-center justify-content-center bg-primary text-white border-round-circle font-bold"
                  style={{ width: 28, height: 28 }}
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

            {/* Informasi & Peringatan Alur Konsultasi Dokter (Muncul jika Alur Konsultasi Dokter Aktif) */}
            {activeRuangan && effectiveButuhKonsul && (
              <>
                {!loadingSlots && dokterKonsulList.length === 0 ? (
                  <div className="flex align-items-start gap-3 p-3 mb-3 bg-amber-50 border-round-xl border-1 border-amber-300">
                    <div className="flex align-items-center justify-content-center bg-amber-100 text-amber-800 border-round-lg p-2 flex-shrink-0 mt-0.5">
                      <i className="pi pi-exclamation-triangle text-base" />
                    </div>
                    <div className="flex-1 text-xs text-amber-950 leading-normal">
                      <div className="font-bold mb-0.5 text-amber-900">
                        Tidak Ada Dokter Jaga di Ruang Konsultasi pada Hari {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][tanggalBooking.getDay()]}:
                      </div>
                      Anda memilih alur <strong>Konsultasi Dokter Dulu</strong>, namun tidak ada dokter yang bertugas di Ruang Konsultasi pada tanggal ini.
                      {hasWajibKonsul ? (
                        <div className="mt-1 font-semibold text-red-700">
                          Karena tindakan ini berstatus Medical Treatment (Wajib Konsul), silakan ubah tanggal booking ke hari praktek dokter jaga (Senin, Selasa, Rabu, atau Sabtu). Klik tombol <strong>Jadwal Dokter Konsultasi</strong> di kanan atas untuk melihat jadwal lengkap.
                        </div>
                      ) : (
                        <div className="mt-1">
                          Silakan ubah tanggal booking ke hari praktek dokter jaga (lihat tombol <strong>Jadwal Dokter Konsultasi</strong> di kanan atas), atau ubah pilihan alur di Langkah 2 menjadi <strong>&quot;Langsung Tindakan&quot;</strong> jika ingin tetap di tanggal ini.
                        </div>
                      )}
                    </div>
                  </div>
                ) : slotOverlap && !slotOverlap.hasOverlap ? (
                  /* Edge Case: Nol Irisan Shift antara Dokter dan Terapis */
                  <div className="flex align-items-start gap-3 p-3 mb-3 bg-amber-50 border-round-xl border-1 border-amber-300">
                    <div className="flex align-items-center justify-content-center bg-amber-100 text-amber-800 border-round-lg p-2 flex-shrink-0 mt-0.5">
                      <i className="pi pi-exclamation-triangle text-base" />
                    </div>
                    <div className="flex-1 text-xs text-amber-950 leading-normal">
                      <div className="font-bold mb-0.5 text-amber-900">
                        Tidak Ada Irisan Jam Kerja Antara Dokter & Terapis:
                      </div>
                      Petugas treatment ({selectedSlot?.nama_petugas || slotOverlap.petugasName || 'Terapis'}) bertugas pukul <strong>{selectedSlot?.jam_mulai || slotOverlap.shiftMulai}–{selectedSlot?.jam_selesai || slotOverlap.shiftSelesai} WIB</strong>, sedangkan dokter jaga Ruang Konsultasi ({consultWindow?.dokterNames}) bertugas pukul <strong>{consultWindow?.docStartStr}–{consultWindow?.docEndStr} WIB</strong>.
                      <div className="mt-1 text-amber-900 font-semibold">
                        Karena tidak ada jam kerja yang beririsan untuk konsultasi pra-tindakan, silakan <strong>ubah tanggal booking</strong> ke hari lain atau ubah alur di Langkah 2 menjadi <strong>&quot;Langsung Tindakan&quot;</strong> jika diizinkan.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex align-items-center gap-3 p-3 mb-4 bg-indigo-50 border-round-xl border-1 border-indigo-200 text-xs text-indigo-950">
                    <div className="flex align-items-center justify-content-center bg-indigo-100 text-indigo-700 border-round-lg p-2 flex-shrink-0">
                      <i className="pi pi-info-circle text-base" />
                    </div>
                    <div className="flex-1" style={{ lineHeight: 1.55 }}>
                      {slotOverlap && consultWindow ? (
                        <>
                          <div>
                            Konsultasi Dokter Dulu dipilih. Jam treatment dibatasi ke{' '}
                            <strong className="text-indigo-900 font-bold">
                              {slotOverlap.overlapStartStr}–{slotOverlap.overlapEndStr} WIB
                            </strong>{' '}
                            mengikuti jam praktik {consultWindow.dokterNames} ({consultWindow.docStartStr}–{consultWindow.docEndStr} WIB).
                          </div>
                          <div className="mt-1.5 text-indigo-900" style={{ lineHeight: 1.55 }}>
                            Slot di bawah adalah jadwal terapis — jadwal dokter dicek otomatis saat check-in. Lihat jadwal dokter di hari lain lewat tombol di kanan atas.
                          </div>
                        </>
                      ) : consultWindow ? (
                        <>
                          <div>
                            Konsultasi Dokter Dulu dipilih. Jadwal treatment menyesuaikan jam praktik {consultWindow.dokterNames} ({consultWindow.docStartStr}–{consultWindow.docEndStr} WIB).
                          </div>
                          <div className="mt-1.5 text-indigo-900" style={{ lineHeight: 1.55 }}>
                            Slot di bawah adalah jadwal terapis — jadwal dokter dicek otomatis saat check-in. Lihat jadwal dokter di hari lain lewat tombol di kanan atas.
                          </div>
                        </>
                      ) : (
                        <div>
                          Konsultasi Dokter Dulu dipilih. Slot di bawah adalah jadwal terapis — jadwal dokter dicek otomatis saat check-in di hari-H. Lihat jadwal dokter di hari lain lewat tombol di kanan atas.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {!activeRuangan ? (
              <div className="text-center py-4 text-500 border-1 border-dashed surface-border border-round">
                <AlertCircle size={32} className="mx-auto mb-2 text-400" />
                <div>Pilih minimal satu layanan/paket di Langkah 2 terlebih dahulu untuk memuat slot jadwal yang tersedia.</div>
              </div>
            ) : loadingSlots ? (
              <div className="text-center py-4">
                <i className="pi pi-spin pi-spinner text-primary text-3xl mb-2"></i>
                <div className="text-sm text-500">Mengecek ketersediaan jadwal dokter dan kuota ruangan...</div>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-4 text-500 border-1 border-dashed surface-border border-round">
                <AlertCircle size={32} className="mx-auto mb-2 text-amber-500" />
                <div className="font-semibold text-900 mb-1">Tidak Ada Jadwal Dokter / Terapis Tersedia</div>
                <div className="text-sm text-600">
                  Tidak ditemukan jadwal aktif untuk ruangan <strong>{activeRoomName}</strong> pada hari{' '}
                  <span className="font-bold">
                    {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][tanggalBooking.getDay()]}
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
                <div className="grid">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.kode_jadwal === slot.kode_jadwal;
                    const isQuotaFull = (slot.sisa_kuota ?? 0) <= 0;
                    const isShiftPast = Boolean(slot.is_past_today);
                    const isUnavailable = isQuotaFull || isShiftPast || !slot.is_available;
                    const companions = slot.petugas_pendamping || [];
                    const totalCompanions = slot.jumlah_pendamping || companions.length;
                    const hasCompanions = totalCompanions > 0;
                    const companionSummary = getCompanionSummary(companions, totalCompanions);
                    const fullCompanionNames = companions.map((c) => c.nama_petugas).join(', ');

                    return (
                      <div key={slot.kode_jadwal} className="col-12 sm:col-6 flex">
                        <div
                          onClick={() => {
                            if (!isUnavailable) {
                              setSelectedSlot(slot);
                              setJamBooking('');
                              setIsManualTime(false);
                              setManualTimeInput('');
                              setManualTimeError('');
                              setManualSuccessMsg('');
                              setSuggestedSlot(null);
                            }
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
                            {/* Header: Jam & Status */}
                            <div className="flex justify-content-between align-items-center mb-2">
                              <div className="flex align-items-center" style={{ gap: '6px' }}>
                                <Clock size={15} className={`${isSelected ? 'text-primary' : 'text-500'} flex-shrink-0`} />
                                <span className="font-bold text-900 text-sm">
                                  {slot.jam_mulai} - {slot.jam_selesai} WIB
                                </span>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                              ) : isQuotaFull ? (
                                <Tag value="PENUH" severity="danger" className="text-xs px-2 py-0.5 font-bold flex-shrink-0" />
                              ) : isShiftPast ? (
                                <Tag
                                  value="SUDAH BERAKHIR"
                                  severity="warning"
                                  className="text-xs px-2 py-0.5 font-bold flex-shrink-0"
                                  title="Jam dinas sesi ini telah berakhir hari ini"
                                />
                              ) : !slot.is_available ? (
                                <Tag value="TIDAK TERSEDIA" severity="danger" className="text-xs px-2 py-0.5 font-bold flex-shrink-0" />
                              ) : (
                                <Tag value="TERSEDIA" severity="success" className="text-xs px-2 py-0.5 font-bold flex-shrink-0" />
                              )}
                            </div>

                            {/* Info Petugas Utama (PJ) */}
                            <div className="flex align-items-center justify-content-between gap-2 mb-2">
                              <div className="flex align-items-center min-w-0 flex-1" style={{ gap: '6px' }}>
                                <User size={14} className="text-primary flex-shrink-0" />
                                <span
                                  className="text-sm font-bold text-900 text-overflow-ellipsis overflow-hidden white-space-nowrap"
                                  title={slot.nama_petugas}
                                >
                                  {slot.has_pj !== false ? slot.nama_petugas : (slot.nama_petugas || 'Petugas belum ditentukan')}
                                </span>
                              </div>
                              {slot.is_penanggung_jawab ? (
                                <Tag value="PJ" severity="warning" className="text-[10px] font-bold py-0.5 px-1.5 flex-shrink-0" />
                              ) : slot.has_pj === false ? (
                                <Tag value="Belum Ada PJ" severity="secondary" className="text-[10px] py-0.5 px-1.5 flex-shrink-0" />
                              ) : null}
                            </div>

                            {/* Info Petugas Pendamping — Rapi, Elegan & Jelas */}
                            <div className="flex align-items-center mb-2" style={{ minHeight: '26px' }}>
                              {hasCompanions ? (
                                <div
                                  className="companion-tooltip-target inline-flex align-items-center gap-1.5 text-[11px] min-w-0 cursor-pointer overflow-hidden text-emerald-800 hover:text-emerald-900 transition-colors"
                                  data-pr-tooltip={`Daftar Pendamping: ${fullCompanionNames}`}
                                  data-pr-position="top"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCompanionData({
                                      pj: slot.nama_petugas,
                                      jam: `${slot.jam_mulai} - ${slot.jam_selesai} WIB`,
                                      ruangan: slot.nama_ruangan,
                                      companions: companions,
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
                              ) : (
                                <span className="text-xs text-400 italic">Tanpa petugas pendamping</span>
                              )}
                            </div>

                            {/* Lokasi Ruangan */}
                            <div className="text-xs text-500 mb-2 flex align-items-center" style={{ gap: '6px' }}>
                              <MapPin size={13} className="text-400 flex-shrink-0" />
                              <span className="text-overflow-ellipsis overflow-hidden white-space-nowrap">{slot.nama_ruangan}</span>
                            </div>
                          </div>

                          {/* Progress Kuota Sesi (Milik PJ) */}
                          <div className="mt-2 pt-2 border-top-1 surface-border">
                            <div className="flex justify-content-between text-xs mb-1">
                              <span className="text-600">Sisa Kuota:</span>
                              <span className={`font-bold ${isQuotaFull ? 'text-red-500' : isShiftPast ? 'text-amber-700' : 'text-green-600'}`}>
                                {slot.sisa_kuota} dari {slot.kuota_total}
                              </span>
                            </div>
                            <ProgressBar
                              value={Math.round((slot.kuota_terisi / (slot.kuota_total || 1)) * 100)}
                              showValue={false}
                              style={{ height: '6px' }}
                              color={isQuotaFull ? '#ef4444' : isShiftPast ? '#d97706' : '#10b981'}
                            />
                            {isShiftPast && (
                              <div className="text-[11px] text-amber-700 mt-1 flex align-items-center gap-1">
                                <Clock size={11} className="flex-shrink-0" />
                                <span>Jam dinas sesi ini telah berakhir hari ini</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-komponen: Pilihan Jam Janji Temu Spesifik */}
                {selectedSlot && (
                  <div className="mt-4 pt-3 border-top-1 surface-border">
                    <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-2 mb-3">
                      <div>
                        <div className="flex align-items-center gap-2">
                          <Clock size={18} className="text-primary" />
                          <span className="font-bold text-base text-900">
                            Pilih Jam Janji Temu Spesifik
                          </span>
                          {jamBooking && (
                            <Tag value={`${jamBooking} WIB`} severity="success" className="font-bold px-2 py-1" />
                          )}
                        </div>
                        <div className="text-xs text-600 mt-1">
                          Shift: <strong>{selectedSlot.jam_mulai} - {selectedSlot.jam_selesai} WIB</strong> ({selectedSlot.nama_petugas}
                          {selectedSlot.jumlah_pendamping ? ` + ${selectedSlot.jumlah_pendamping} pendamping` : ''}) · Total durasi tindakan:{' '}
                          <strong>{totalDurasi || 30} menit</strong>
                        </div>
                      </div>

                      {/* Switcher / Toggle Box Manual */}
                      <Button
                        type="button"
                        label={isManualTime ? 'Tutup Input Manual' : 'Input Jam Khusus (Manual)'}
                        icon={isManualTime ? 'pi pi-times' : 'pi pi-pencil'}
                        className="p-button-outlined p-button-secondary p-button-sm text-xs"
                        onClick={() => {
                          const nextManual = !isManualTime;
                          setIsManualTime(nextManual);
                          if (nextManual) {
                            setManualTimeInput(jamBooking || selectedSlot.jam_mulai);
                            setManualTimeError('');
                            setManualSuccessMsg('');
                            setSuggestedSlot(null);
                          }
                        }}
                      />
                    </div>

                    {/* Grid Pilihan Jam (Jarak antar pilihan mengikuti durasi tindakan) */}
                    <div>
                      <div className="text-xs text-500 mb-2">
                        Pilih jam kedatangan yang tersedia (jarak antar pilihan jam mengikuti durasi tindakan: <strong>{totalDurasi || 30} menit</strong>):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {timeSlots.map((st) => {
                          const isSelected = jamBooking === st.time;
                          const isDisabled = st.exceedsShift || st.isBooked || st.isOutsideDoctor || st.isPast;

                          return (
                            <button
                              key={st.time}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                setJamBooking(st.time);
                                setManualTimeInput(st.time);
                                setManualTimeError('');
                                setManualSuccessMsg('');
                                setSuggestedSlot(null);
                              }}
                              title={
                                st.isPast
                                  ? `Slot jam ${st.time} WIB sudah melewati waktu saat ini`
                                  : st.isOutsideDoctor
                                  ? st.doctorDisabledReason
                                  : st.exceedsShift
                                  ? `Estimasi selesai (${st.endEst} WIB) melebihi batas shift (${selectedSlot.jam_selesai} WIB)`
                                  : st.isBooked
                                  ? (st.conflictReason ? `Slot tidak dapat dipilih: ${st.conflictReason}` : 'Slot jam ini sudah dibooking pasien lain')
                                  : `Pilih jam ${st.time} WIB (selesai ${st.endEst} WIB)`
                              }
                              className={`p-2 border-round-lg text-center transition-all transition-duration-150 flex flex-column align-items-center justify-content-center ${
                                isSelected
                                  ? 'bg-primary text-white border-primary shadow-2 ring-2 ring-primary-300 cursor-pointer font-bold'
                                  : isDisabled
                                  ? 'surface-100 text-400 border-200 cursor-not-allowed opacity-50'
                                  : 'surface-card text-800 border-1 border-300 hover:border-primary-400 hover:surface-50 cursor-pointer shadow-1'
                              }`}
                              style={{ minWidth: '84px', borderStyle: 'solid' }}
                            >
                              <span className="text-sm font-bold">{st.time}</span>
                              {st.isPast ? (
                                <span className="text-[10px] text-400 font-semibold uppercase mt-0.5">
                                  Lewat
                                </span>
                              ) : st.isBooked ? (
                                <span className="text-[10px] text-red-500 font-semibold uppercase mt-0.5">
                                  {st.isDirectHit ? 'Terisi' : 'Bentrok'}
                                </span>
                              ) : !isDisabled ? (
                                <span className={`text-[10px] ${isSelected ? 'text-white' : 'text-500'} mt-0.5`}>
                                  s/d {st.endEst}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Daftar Keterangan / Catatan Ketersediaan Jam */}
                      {(() => {
                        const hasPastSlots = isBookingToday && timeSlots.some((s) => s.isPast);
                        const hasBookedSlots = timeSlots.some((s) => s.isBooked);
                        const hasDoctorCutoff = timeSlots.some((s) => s.isOutsideDoctor);

                        return (
                          <div className="mt-2.5 pt-2 border-top-1 surface-border flex flex-column gap-1.5 text-[11px]">
                            {/* Peringatan penting: Hanya Terisi / Bentrok yang berwarna merah */}
                            {hasBookedSlots && (
                              <div className="flex align-items-start gap-1.5 text-red-500 font-medium">
                                <Info size={13} className="flex-shrink-0 mt-0.5 text-red-400" />
                                <span>
                                  Slot bertanda <strong>Terisi / Bentrok</strong> dinonaktifkan karena telah dipesan pasien lain.
                                </span>
                              </div>
                            )}

                            {/* Info kondisional: Hanya tampil untuk hari ini jika ada slot yang sudah lewat waktu */}
                            {hasPastSlots && (
                              <div className="flex align-items-start gap-1.5 text-500">
                                <Info size={13} className="flex-shrink-0 mt-0.5 text-400" />
                                <span>
                                  Slot yang telah melewati waktu saat ini otomatis dinonaktifkan untuk booking hari ini.
                                </span>
                              </div>
                            )}

                            {/* Info kondisional: Hanya tampil jika ada irisan jam di luar dokter jaga */}
                            {hasDoctorCutoff && (
                              <div className="flex align-items-start gap-1.5 text-500">
                                <Info size={13} className="flex-shrink-0 mt-0.5 text-400" />
                                <span>
                                  Slot sebelum pukul <strong>{consultWindow?.docStartStr} WIB</strong> tidak aktif (menyesuaikan jam mulai dokter jaga).
                                </span>
                              </div>
                            )}

                            {/* Info umum batas shift: Muted grey netral */}
                            {selectedSlot && (
                              <div className="flex align-items-start gap-1.5 text-500">
                                <Info size={13} className="flex-shrink-0 mt-0.5 text-400" />
                                <span>
                                  Slot melebihi batas akhir shift (pukul <strong>{selectedSlot.jam_selesai} WIB</strong>) otomatis tidak ditampilkan.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Kotak Input Jam Khusus (Manual) */}
                    {isManualTime && (
                      <div className="surface-50 border-1 surface-border border-round-lg p-3 mt-3">
                        <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center gap-1 mb-2">
                          <div className="font-semibold text-sm text-900">
                            Input Jam Khusus (Manual):
                          </div>
                          <span className="text-xs text-500">
                            *Akan dibulatkan ke interval durasi tindakan ({totalDurasi || 30} menit)
                          </span>
                        </div>
                        <div className="flex flex-wrap align-items-center gap-3">
                          <div className="flex align-items-center gap-2">
                            <input
                              type="time"
                              value={manualTimeInput}
                              min={selectedSlot.jam_mulai}
                              max={selectedSlot.jam_selesai}
                              onChange={(e) => handleManualTimeChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleApplyManualTime();
                                }
                              }}
                              className="p-inputtext p-component p-inputtext-sm font-bold text-base"
                              style={{ padding: '6px 12px' }}
                            />
                            <span className="text-sm font-semibold text-700">WIB</span>
                          </div>

                          <Button
                            type="button"
                            label="Terapkan Jam Ini"
                            icon="pi pi-check"
                            className="p-button-primary p-button-sm"
                            disabled={!manualTimeInput}
                            onClick={() => handleApplyManualTime()}
                          />
                        </div>

                        {/* Tampilan Error & Saran Slot Terdekat */}
                        {manualTimeError && (
                          <div className="mt-2.5 p-2.5 border-round surface-0 border-1 border-red-200">
                            <div className="text-xs text-red-600 font-semibold flex align-items-start gap-1.5">
                              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                              <span>{manualTimeError}</span>
                            </div>
                            {suggestedSlot && (
                              <div className="mt-2 pl-4">
                                <Button
                                  type="button"
                                  label={`Pilih Slot Terdekat (${suggestedSlot.time} - ${suggestedSlot.endEst} WIB)`}
                                  icon="pi pi-arrow-right"
                                  className="p-button-sm p-button-outlined p-button-danger text-xs font-semibold py-1 px-2.5"
                                  onClick={() => {
                                    setJamBooking(suggestedSlot.time);
                                    setManualTimeInput(suggestedSlot.time);
                                    setManualSuccessMsg(
                                      `Slot terdekat ${suggestedSlot.time} - ${suggestedSlot.endEst} WIB berhasil dipilih.`
                                    );
                                    setManualTimeError('');
                                    setSuggestedSlot(null);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tampilan Sukses / Info Penyesuaian ke Slot Terdekat */}
                        {manualSuccessMsg && (
                          <div className="text-xs text-green-700 font-semibold mt-2.5 p-2.5 border-round surface-0 border-1 border-green-200 flex align-items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
                            <span>{manualSuccessMsg}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: RINCIAN RESERVASI & PEMBAYARAN DP */}
        <div className="col-12 lg:col-4">
          <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 sticky" style={{ top: '0.5rem' }}>
            <div className="flex align-items-center justify-content-between mb-3">
              <div className="flex align-items-center gap-2">
                <CreditCard size={22} className="text-primary" />
                <span className="font-bold text-lg text-900">Rincian Reservasi & DP</span>
              </div>
              {selectedList.length > 0 && (
                <Tag value={`${selectedList.length} Item`} severity="info" className="text-xs font-bold" />
              )}
            </div>

            <div className="surface-50 border-round p-3 mb-3 text-sm flex flex-column gap-2">
              <div className="flex justify-content-between">
                <span className="text-600">Pasien:</span>
                <span className="font-semibold text-900 text-right">
                  {selectedPasien ? selectedPasien.nama : <span className="text-400 italic">Belum dipilih</span>}
                </span>
              </div>

              <div className="flex justify-content-between">
                <span className="text-600">Ruangan Tujuan:</span>
                <span className="font-semibold text-primary text-right">
                  {activeRoomName || <span className="text-400 italic">Belum dipilih</span>}
                </span>
              </div>

              <div className="flex justify-content-between">
                <span className="text-600">Tanggal:</span>
                <span className="font-semibold text-900 text-right">
                  {formatDateToYMD(tanggalBooking)}
                </span>
              </div>

              <div className="flex justify-content-between">
                <span className="text-600">Jadwal:</span>
                <span className="font-semibold text-right">
                  {!selectedSlot ? (
                    <span className="text-400 italic">Belum dipilih</span>
                  ) : !jamBooking ? (
                    <span className="text-orange-600">
                      {selectedSlot.nama_petugas}{' '}
                      {selectedSlot.jumlah_pendamping ? (
                        <span className="text-xs text-500 font-normal">
                          (+{selectedSlot.jumlah_pendamping} pendamping){' '}
                        </span>
                      ) : null}
                      <span className="text-xs font-normal underline block">(Pilih jam janji temu...)</span>
                    </span>
                  ) : (
                    <span className="text-900">
                      {selectedSlot.nama_petugas}{' '}
                      {selectedSlot.jumlah_pendamping ? (
                        <span className="text-xs text-500 font-normal">
                          (+{selectedSlot.jumlah_pendamping} pendamping){' '}
                        </span>
                      ) : null}
                      <strong className="text-primary">({jamBooking} WIB)</strong>
                    </span>
                  )}
                </span>
              </div>

              {selectedList.length > 0 && (
                <div className="flex justify-content-between align-items-center">
                  <span className="text-600">Alur Kunjungan:</span>
                  <span className="font-semibold text-right">
                    {hasWajibKonsul ? (
                      <Tag value="Wajib Konsul Dokter" severity="danger" className="text-[10px] font-bold" />
                    ) : hasOpsionalKonsul ? (
                      globalConsultChoice ? (
                        <Tag value="Konsultasi Dulu" severity="info" className="text-[10px] font-bold" />
                      ) : (
                        <Tag value="Langsung Tindakan" severity="success" className="text-[10px] font-bold" />
                      )
                    ) : (
                      <Tag value="Langsung Tindakan" severity="secondary" className="text-[10px] font-bold" />
                    )}
                  </span>
                </div>
              )}

              <Divider className="my-1" />

              {/* DAFTAR LAYANAN YANG DIPILIH */}
              <div>
                <div className="text-xs font-semibold text-600 mb-1">Item Layanan / Paket:</div>
                {selectedList.length === 0 ? (
                  <div className="text-xs text-400 italic py-1">Belum ada layanan dipilih</div>
                ) : (
                  <div className="flex flex-column gap-1 max-h-12rem overflow-y-auto pr-1">
                    {selectedList.map((item) => {
                      const itemKey = item.jenis === 'klaim_paket'
                        ? `klaim_${item.kode_detail_kepemilikan_paket_layanan || item.kode_layanan}`
                        : `${item.jenis}_${item.kode_layanan}`;
                      return (
                        <div
                          key={itemKey}
                          className="flex justify-content-between align-items-start text-xs py-1 border-bottom-1 surface-border"
                        >
                          <div className="pr-2">
                            <div className="font-medium text-800">{item.nama}</div>
                            <div className="text-500 text-[11px]">
                              {item.durasi_menit ? `${item.durasi_menit} mnt · ` : ''}
                              {item.jenis === 'klaim_paket' ? (
                                <span className="text-amber-700 font-semibold">Klaim Sesi Paket</span>
                              ) : (
                                item.nama_kategori || item.jenis
                              )}
                            </div>
                          </div>
                          <div className="font-semibold text-900 white-space-nowrap">
                            {item.jenis === 'klaim_paket' ? (
                              <span className="text-amber-700 font-bold">Rp 0 (Klaim)</span>
                            ) : (
                              formatCurrency(item.harga_asal ?? item.harga)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Divider className="my-1" />

              <div className="flex justify-content-between align-items-center">
                <span className="font-bold text-900">Total Biaya:</span>
                <span className="font-bold text-primary text-base">{formatCurrency(totalHarga)}</span>
              </div>
            </div>

            {/* Input Kalkulasi DP */}
            <div className="mb-3">
              <label className="font-medium text-sm block mb-1">
                Uang Muka / DP <span className="text-red-500">*</span>
              </label>
              {hasOnlyKlaim ? (
                <div className="p-3 bg-green-50 border-1 border-green-200 border-round-lg text-xs text-green-900 flex align-items-center gap-2">
                  <i className="pi pi-check-circle text-green-600 text-base flex-shrink-0" />
                  <div>
                    <strong className="block">Bebas DP (Rp 0)</strong>
                    <span>Seluruh item merupakan klaim paket aktif.</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid formgrid p-fluid">
                    <div className="col-5">
                      <div className="p-inputgroup">
                        <InputNumber
                          value={dpPercentage}
                          onValueChange={(e) => handlePercentageChange(e.value || 0)}
                          min={0}
                          max={100}
                          className="w-full"
                        />
                        <span className="p-inputgroup-addon text-xs">%</span>
                      </div>
                    </div>
                    <div className="col-7">
                      <InputNumber
                        value={dpNominal}
                        onValueChange={(e) => {
                          const val = e.value || 0;
                          setDpNominal(val);
                          if (totalHarga > 0) {
                            setDpPercentage(Math.round((val / totalHarga) * 100));
                          }
                          if (val === 0 && !alasanBebasDp) {
                            setAlasanBebasDp('Pasien VIP / Prioritas');
                          }
                        }}
                        mode="currency"
                        currency="IDR"
                        locale="id-ID"
                        className="w-full font-bold"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-500 mt-1 mb-2">
                    Default 20%. Nominal DP dapat disesuaikan manual atau 0% untuk Bebas DP.
                  </div>

                  {dpNominal > 0 ? (
                    <div className="p-3 surface-50 border-1 border-200 border-round-lg flex flex-column gap-2.5 mt-2">
                      <div>
                        <label className="font-semibold text-xs text-700 block mb-1">
                          Metode Pembayaran DP <span className="text-red-500">*</span>
                        </label>
                        <SelectButton
                          value={metodePembayaranDp}
                          options={METODE_DP_OPTIONS}
                          onChange={(e) => e.value && setMetodePembayaranDp(e.value)}
                          className="w-full selectbutton-sm"
                        />
                      </div>

                      <div className="field-checkbox mt-1 mb-0 align-items-start gap-2 p-2.5 bg-blue-50 border-1 border-blue-200 border-round">
                        <Checkbox
                          inputId="konfirmasi_dp"
                          checked={konfirmasiDpDiterima}
                          onChange={(e) => setKonfirmasiDpDiterima(!!e.checked)}
                          className="mt-0.5"
                        />
                        <label htmlFor="konfirmasi_dp" className="text-xs text-blue-900 cursor-pointer line-height-2">
                          <strong>Konfirmasi:</strong> Uang muka (DP) sebesar{' '}
                          <span className="font-bold text-primary">{formatCurrency(dpNominal)}</span> sudah diterima dari pasien melalui kasir/staff.
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border-1 border-yellow-200 border-round-lg flex flex-column gap-2 mt-2">
                      <div className="flex align-items-center gap-2 text-xs text-yellow-900 font-semibold">
                        <AlertCircle size={15} className="text-yellow-700 flex-shrink-0" />
                        <span>Alasan Bebas DP (Wajib Dipilih) <span className="text-red-500">*</span></span>
                      </div>
                      <Dropdown
                        value={alasanBebasDp}
                        options={ALASAN_BEBAS_DP_OPTIONS}
                        onChange={(e) => setAlasanBebasDp(e.value)}
                        placeholder="-- Pilih Alasan Bebas DP --"
                        className="w-full text-xs"
                      />
                      <span className="text-xs text-yellow-800 line-height-2">
                        Pembebasan DP memerlukan alasan sah untuk mencegah pemesanan fiktif atau penahanan slot tanpa komitmen.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sumber Reservasi */}
            <div className="mb-3">
              <label className="font-medium text-sm block mb-1">Sumber Reservasi</label>
              <SelectButton
                value={sumber}
                options={[
                  { label: 'Staff / Meja', value: 'staff' },
                  { label: 'WhatsApp', value: 'whatsapp' },
                ]}
                onChange={(e) => e.value && setSumber(e.value)}
                className="w-full"
              />
            </div>

            {/* Catatan Pasien */}
            <div className="mb-3">
              <label className="font-medium text-sm block mb-1">Catatan Pasien (Opsional)</label>
              <InputTextarea
                value={catatanPasien}
                onChange={(e) => setCatatanPasien(e.target.value)}
                rows={2}
                placeholder="Keluhan awal, permintaan khusus, dll..."
                className="w-full"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-column gap-2">
              <Button
                label="Simpan & Konfirmasi Booking"
                icon="pi pi-check"
                className="p-button-primary w-full py-3 font-bold"
                onClick={handleSubmitBooking}
                loading={loadingSubmit}
                disabled={!selectedPasien || selectedList.length === 0 || !selectedSlot || !jamBooking || !isDpValid}
              />
              {!isDpValid && selectedPasien && selectedList.length > 0 && selectedSlot && jamBooking && (
                <div className="text-xs text-red-600 bg-red-50 border-1 border-red-200 border-round p-2">
                  <i className="pi pi-info-circle mr-1 text-xs" />
                  {dpNominal > 0
                    ? 'Pilih metode pembayaran DP dan centang konfirmasi DP untuk mengaktifkan tombol simpan.'
                    : 'Pilih alasan bebas DP untuk mengaktifkan tombol simpan.'}
                </div>
              )}
              <Button
                label="Reset Form"
                icon={<RotateCcw size={16} className="mr-1" />}
                className="p-button-outlined p-button-secondary w-full"
                onClick={handleResetForm}
                disabled={loadingSubmit}
              />
            </div>

            {/* Panel Ringkasan & Kebijakan Booking */}
            <div className="mt-3 p-3 surface-50 border-1 border-200 border-round-lg">
              <div className="flex align-items-center gap-2 mb-2">
                <Info size={15} className="text-primary flex-shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wider text-700">
                  Ringkasan & Kebijakan Booking
                </span>
              </div>
              <ul className="m-0 pl-3 text-xs text-600 line-height-3 flex flex-column gap-2" style={{ paddingLeft: '1.1rem' }}>
                <li>
                  <strong className="text-700">Kebijakan DP:</strong> Uang muka yang telah dibayar otomatis dipotongkan ke tagihan saat pasien <em>check-in</em> di klinik. Bila pasien tidak hadir, DP dinyatakan <em>hangus</em>.
                </li>
                <li>
                  <strong className="text-700">Toleransi Keterlambatan:</strong> Maksimal <strong>30 menit</strong> dari jam booking sebelum status otomatis ditandai <em>tidak hadir</em>.
                </li>
                <li>
                  <strong className="text-700">Alokasi Jadwal:</strong> Slot & jam yang dipilih akan terkunci secara khusus untuk pasien ini saat booking disimpan.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>



      {/* Dialog Detail / Bukti Booking */}
      <DialogDetailBooking
        visible={showDetailDialog}
        booking={createdBookingData}
        onHide={() => {
          setShowDetailDialog(false);
          if (onSuccessCreated) {
            onSuccessCreated();
          }
        }}
      />

      {/* Dialog Jadwal Mingguan Ruangan (Konsultasi Dokter & Ruangan Treatment Lain) */}
      <DialogJadwalMingguanRuangan
        visible={showJadwalRuanganDialog}
        onHide={() => setShowJadwalRuanganDialog(false)}
        rooms={jadwalDialogRooms}
        tanggalTerpilih={tanggalBooking}
      />

      {/* Tooltip & Popover Petugas Pendamping */}
      <Tooltip target=".companion-tooltip-target" position="top" />

      <OverlayPanel ref={companionOpRef} className="shadow-4 border-round-xl p-0" style={{ maxWidth: '340px' }}>
        {activeCompanionData && (
          <div className="p-3">
            <div className="font-bold text-sm text-900 mb-1 flex align-items-center gap-1.5">
              <Users size={16} className="text-primary" />
              <span>Daftar Petugas Pendamping</span>
            </div>
            <div className="text-xs text-500 mb-2.5 pb-2 border-bottom-1 surface-border line-height-2">
              PJ: <span className="font-semibold text-800">{activeCompanionData.pj}</span>
              <br />
              <span className="text-[11px] text-400">{activeCompanionData.jam} · {activeCompanionData.ruangan}</span>
            </div>
            <div className="flex flex-column gap-2 max-h-12rem overflow-y-auto pr-1">
              {activeCompanionData.companions.map((c, idx) => (
                <div key={idx} className="flex align-items-center gap-2 p-2 border-round surface-50 text-xs">
                  <span className="w-1.5rem h-1.5rem border-round-circle bg-primary-100 text-primary-700 flex align-items-center justify-content-center font-bold text-xs flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-800 text-overflow-ellipsis overflow-hidden white-space-nowrap">
                      {c.nama_petugas}
                    </div>
                    {c.jabatan_petugas && (
                      <div className="text-[10px] text-500 text-overflow-ellipsis overflow-hidden white-space-nowrap">
                        {c.jabatan_petugas}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </OverlayPanel>
    </div>
  );
};
