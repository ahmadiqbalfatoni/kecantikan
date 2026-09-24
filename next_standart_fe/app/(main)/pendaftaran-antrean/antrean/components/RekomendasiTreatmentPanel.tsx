'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { OverlayPanel } from 'primereact/overlaypanel';
import postData from '@/lib/axios/postData';
import { showError, showWarning } from '@/lib/tools/generalTools';

export interface RekomendasiItem {
  jenis: 'layanan' | 'paket_layanan' | 'produk' | 'paket_produk';
  tipe: string;
  kode: string;
  nama: string;
  foto?: string | null;
  wajib_konsultasi?: 'tidak' | 'opsional' | 'wajib' | string;
  durasi_menit?: number;
  harga: number;
  harga_asal?: number;
  harga_promo?: number;
  is_promo?: boolean;
  kode_promo?: string;
  nama_promo?: string;
  jenis_diskon?: 'persen' | 'nominal';
  nilai_diskon?: number;
  qty?: number;
  satuan?: string;
  kode_ruangan?: string;
  nama_ruangan?: string;
  kode_kategori?: string;
  nama_kategori?: string;
  masa_berlaku_hari?: number;
  total_sesi?: number;
  is_locked?: boolean;
  is_pendaftaran?: boolean;
  is_petugas_available?: boolean;
  is_not_started_today?: boolean;
  is_past_today?: boolean;
  status_jadwal?: string;
  shift?: string | null;
  earliest_start?: string | null;
  alasan_tidak_tersedia?: string | null;
  has_dokter?: boolean;
  dokter_nama?: string | null;
  petugas_jaga_count?: number;
  petugas_pj_nama?: string | null;
  petugas_jaga_names?: string[];
}

interface RekomendasiTreatmentPanelProps {
  toast: React.RefObject<Toast>;
  selectedItems: RekomendasiItem[];
  onChangeSelectedItems: (items: RekomendasiItem[]) => void;
  disabled?: boolean;
  kodeCabang?: string | null;
}

export const getItemConsultType = (item: {
  wajib_konsultasi?: string;
  tipe?: string;
  tipe_paket?: string;
  jenis?: string;
}) => {
  const wk = (item.wajib_konsultasi || '').toString().trim().toLowerCase();
  if (wk === 'wajib') {
    return { isWajib: true, isService: false, isOpsional: false };
  }
  if (wk === 'tidak') {
    return { isWajib: false, isService: true, isOpsional: false };
  }
  if (wk === 'opsional') {
    return { isWajib: false, isService: false, isOpsional: true };
  }

  const effectiveTipe = (
    item.tipe_paket || item.tipe || ''
  ).toString().trim().toUpperCase();

  const isWajib = effectiveTipe === 'MEDICAL TREATMENT';
  const isService = effectiveTipe === 'SERVICE TREATMENT';
  const isOpsional = !isWajib && !isService;
  return { isWajib, isService, isOpsional };
};

export const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

export const RekomendasiTreatmentPanel: React.FC<RekomendasiTreatmentPanelProps> = ({
  toast,
  selectedItems,
  onChangeSelectedItems,
  disabled = false,
  kodeCabang,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTabKey, setActiveTabKey] = useState<string>('');

  const [options, setOptions] = useState<{
    ruangan: Array<{
      kode: string;
      nama: string;
      has_petugas?: boolean;
      has_petugas_hari_ini?: boolean;
      is_not_started_today?: boolean;
      is_past_today?: boolean;
      status_jadwal?: string;
      alasan?: string | null;
      has_dokter?: boolean;
      dokter_nama?: string | null;
      dokter_names?: string[];
      dokter_count?: number;
      petugas_count?: number;
      petugas_pj?: string | null;
      petugas_pj_jabatan?: string | null;
      petugas_jaga_names?: string[];
      shift?: string | null;
      earliest_start?: string | null;
      companions?: Array<{
        nama_petugas: string;
        jabatan_petugas?: string | null;
        jam_mulai?: string | null;
        jam_selesai?: string | null;
      }>;
    }>;
    layanan: RekomendasiItem[];
    paket_layanan: RekomendasiItem[];
    produk: RekomendasiItem[];
    paket_produk: RekomendasiItem[];
  }>({
    ruangan: [],
    layanan: [],
    paket_layanan: [],
    produk: [],
    paket_produk: [],
  });

  const companionOpRef = useRef<OverlayPanel>(null);

  useEffect(() => {
    fetchOptions();
  }, [kodeCabang]);

  const lastNavigatedKeyRef = useRef<string>('');

  useEffect(() => {
    if (selectedItems && selectedItems.length > 0) {
      const targetItem = selectedItems.find((s) => s.is_locked || s.is_pendaftaran);
      if (targetItem) {
        const itemKey = `${targetItem.jenis}_${targetItem.kode}`;
        if (lastNavigatedKeyRef.current !== itemKey) {
          lastNavigatedKeyRef.current = itemKey;
          const j = (targetItem.jenis || '').toLowerCase();
          if (j.includes('produk')) {
            setActiveTabKey('TAB_PRODUK');
          } else if (targetItem.kode_ruangan) {
            setActiveTabKey(targetItem.kode_ruangan);
          }
        }
      }
    } else {
      lastNavigatedKeyRef.current = '';
    }
  }, [selectedItems]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      const branch =
        kodeCabang || (typeof window !== 'undefined' ? localStorage.getItem('selected_branch') : null) || 'CBG-001';
      if (branch && branch !== 'ALL') {
        payload.kode_cabang = branch;
      }

      const res = await postData('/master/ruangan-rekomendasi-options', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        const isNotKonsul = (item: RekomendasiItem) => {
          const roomName = (item.nama_ruangan || '').toLowerCase();
          const roomCode = item.kode_ruangan || '';
          return (
            !roomName.includes('konsultasi') &&
            !['RNG-007', 'RNG-010', 'RNG-011', 'RNG-012'].includes(roomCode) &&
            !roomName.includes('ruangan 1') &&
            !roomName.includes('ruangan 2')
          );
        };

        setOptions({
          ruangan: res.data.data.ruangan || [],
          layanan: (res.data.data.layanan || []).filter(isNotKonsul),
          paket_layanan: (res.data.data.paket_layanan || []).filter(isNotKonsul),
          produk: res.data.data.produk || [],
          paket_produk: res.data.data.paket_produk || [],
        });
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat opsi rekomendasi');
      }
    } catch {
      showError(toast, 'Gagal terhubung ke server untuk opsi rekomendasi');
    } finally {
      setLoading(false);
    }
  };

  const activeTreatmentRoom = useMemo(() => {
    const activeItem = selectedItems.find((s) => ['layanan', 'paket_layanan'].includes(s.jenis));
    if (!activeItem) return null;
    return {
      kode_ruangan: activeItem.kode_ruangan || 'UNASSIGNED',
      nama_ruangan: activeItem.nama_ruangan || activeItem.kode_ruangan || 'Ruang Treatment',
    };
  }, [selectedItems]);

  const roomList = useMemo(() => {
    const roomsMap = new Map<
      string,
      {
        kode: string;
        nama: string;
        has_petugas: boolean;
        has_petugas_hari_ini?: boolean;
        is_not_started_today?: boolean;
        is_past_today?: boolean;
        status_jadwal?: string;
        alasan?: string | null;
        has_dokter: boolean;
        dokter_nama: string | null;
        dokter_count: number;
        petugas_count: number;
        petugas_pj?: string | null;
        petugas_pj_jabatan?: string | null;
        petugas_jaga_names: string[];
        shift?: string | null;
        earliest_start?: string | null;
        companions?: Array<{
          nama_petugas: string;
          jabatan_petugas?: string | null;
          jam_mulai?: string | null;
          jam_selesai?: string | null;
        }>;
      }
    >();

    (options.ruangan || []).forEach((r) => {
      const k = r.kode || (r as any).kode_ruangan || 'UNASSIGNED';
      const n = r.nama || (r as any).nama_ruangan || k;
      const isKonsul =
        (n || '').toLowerCase().includes('konsultasi') ||
        (n || '').toLowerCase().includes('ruangan 1') ||
        (n || '').toLowerCase().includes('ruangan 2') ||
        ['RNG-007', 'RNG-010', 'RNG-011', 'RNG-012'].includes(k);

      if (!isKonsul && !roomsMap.has(k)) {
        roomsMap.set(k, {
          kode: k,
          nama: n,
          has_petugas: Boolean(r.has_petugas),
          has_petugas_hari_ini: Boolean(r.has_petugas_hari_ini ?? r.has_petugas),
          is_not_started_today: Boolean(r.is_not_started_today),
          is_past_today: Boolean(r.is_past_today),
          status_jadwal: r.status_jadwal || (r.has_petugas ? 'aktif' : 'tidak_ada_jadwal'),
          alasan: r.alasan || null,
          has_dokter: Boolean(r.has_dokter),
          dokter_nama: r.dokter_nama || null,
          dokter_count: r.dokter_count || 0,
          petugas_count: r.petugas_count || 0,
          petugas_pj: r.petugas_pj || null,
          petugas_pj_jabatan: r.petugas_pj_jabatan || null,
          petugas_jaga_names: r.petugas_jaga_names || [],
          shift: r.shift || null,
          earliest_start: r.earliest_start || null,
          companions: r.companions || [],
        });
      }
    });

    [...options.layanan, ...options.paket_layanan].forEach((item) => {
      const k = item.kode_ruangan || 'UNASSIGNED';
      const n = item.nama_ruangan || item.kode_ruangan || 'Ruangan Lainnya';
      const isKonsul =
        (n || '').toLowerCase().includes('konsultasi') ||
        (n || '').toLowerCase().includes('ruangan 1') ||
        (n || '').toLowerCase().includes('ruangan 2') ||
        ['RNG-007', 'RNG-010', 'RNG-011', 'RNG-012'].includes(k);
      if (!isKonsul && !roomsMap.has(k)) {
        roomsMap.set(k, {
          kode: k,
          nama: n,
          has_petugas: item.is_petugas_available !== false,
          has_petugas_hari_ini: item.is_petugas_available !== false || Boolean(item.is_not_started_today) || Boolean(item.is_past_today),
          is_not_started_today: Boolean(item.is_not_started_today),
          is_past_today: Boolean(item.is_past_today),
          status_jadwal: item.status_jadwal || (item.is_petugas_available !== false ? 'aktif' : 'tidak_ada_jadwal'),
          alasan: item.alasan_tidak_tersedia || null,
          has_dokter: Boolean(item.has_dokter),
          dokter_nama: item.dokter_nama || null,
          dokter_count: item.has_dokter ? 1 : 0,
          petugas_count: item.petugas_jaga_count || 0,
          petugas_pj: item.petugas_pj_nama || null,
          petugas_pj_jabatan: null,
          petugas_jaga_names: item.petugas_jaga_names || [],
          shift: item.shift || null,
          earliest_start: item.earliest_start || null,
          companions: [],
        });
      }
    });

    return Array.from(roomsMap.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [options.ruangan, options.layanan, options.paket_layanan]);

  const cleanSelectedItems = useMemo(() => {
    const map = new Map<string, RekomendasiItem>();
    (selectedItems || []).forEach((item) => {
      const normJenis = (item.jenis || '').includes('paket') ? 'paket_layanan' : item.jenis;
      const key = `${normJenis}_${item.kode}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [selectedItems]);

  // Tab Definitions (Ruangan 1..N + Tab Produk)
  const allTabs = useMemo(() => {
    const tabs: Array<{
      key: string;
      label: string;
      icon: string;
      isProduct?: boolean;
      selectedCount: number;
      isNotStarted?: boolean;
      isPast?: boolean;
      hasPetugas?: boolean;
    }> = [];

    roomList.forEach((r) => {
      const countInRoom = cleanSelectedItems.filter(
        (s) => ['layanan', 'paket_layanan'].includes(s.jenis) && (s.kode_ruangan || 'UNASSIGNED') === r.kode
      ).length;

      tabs.push({
        key: r.kode,
        label: r.nama,
        icon: countInRoom > 0 ? 'pi-check-circle' : 'pi-building',
        isProduct: false,
        selectedCount: countInRoom,
        isNotStarted: Boolean(r.is_not_started_today),
        isPast: Boolean(r.is_past_today),
        hasPetugas: Boolean(r.has_petugas),
      });
    });

    const productCount = cleanSelectedItems.filter((s) => ['produk', 'paket_produk'].includes(s.jenis)).length;
    tabs.push({
      key: 'TAB_PRODUK',
      label: 'Produk',
      icon: 'pi-shopping-bag',
      isProduct: true,
      selectedCount: productCount,
      isNotStarted: false,
      isPast: false,
      hasPetugas: true,
    });

    return tabs;
  }, [roomList, cleanSelectedItems]);

  useEffect(() => {
    if (allTabs.length > 0 && (!activeTabKey || !allTabs.some((t) => t.key === activeTabKey))) {
      setActiveTabKey(allTabs[0].key);
    }
  }, [allTabs, activeTabKey]);

  const isProductTab = activeTabKey === 'TAB_PRODUK';
  const isRuangDisabled =
    !isProductTab && activeTreatmentRoom !== null && activeTreatmentRoom.kode_ruangan !== activeTabKey;

  const currentRoomObj = useMemo(
    () => roomList.find((r) => r.kode === activeTabKey) || null,
    [roomList, activeTabKey]
  );

  const displayItems = useMemo(() => {
    if (isProductTab) {
      return [...options.produk, ...options.paket_produk];
    }
    return [...options.layanan, ...options.paket_layanan].filter(
      (item) => (item.kode_ruangan || 'UNASSIGNED') === activeTabKey
    );
  }, [isProductTab, activeTabKey, options]);

  const isItemSelected = (item: RekomendasiItem) =>
    selectedItems.some((s) => s.jenis === item.jenis && s.kode === item.kode);

  const handleToggleSelect = (item: RekomendasiItem) => {
    if (disabled) return;
    const isService = ['layanan', 'paket_layanan'].includes(item.jenis);
    const existing = selectedItems.find((s) => s.jenis === item.jenis && s.kode === item.kode);

    if (existing) {
      if (existing.is_locked || existing.is_pendaftaran) {
        showError(toast, `Item "${existing.nama}" dipilih saat pendaftaran dan tidak dapat diubah/dihapus.`);
        return;
      }
      onChangeSelectedItems(selectedItems.filter((s) => !(s.jenis === item.jenis && s.kode === item.kode)));
      return;
    }

    if (isService) {
      if (item.is_not_started_today) {
        showWarning(
          toast,
          `Shift di ${item.nama_ruangan || 'ruangan ini'} baru dimulai pukul ${item.earliest_start || (item.shift ? item.shift.split('-')[0].trim() : '13:00')} WIB.`
        );
        return;
      }

      if (item.is_past_today) {
        showWarning(
          toast,
          `Shift di ${item.nama_ruangan || 'ruangan ini'} telah selesai untuk hari ini.`
        );
        return;
      }

      if (item.is_petugas_available === false) {
        showWarning(
          toast,
          `Ruangan ${item.nama_ruangan || 'tujuan'} tidak memiliki dokter/petugas yang bertugas saat ini.`
        );
        return;
      }

      const itemRoomCode = item.kode_ruangan || 'UNASSIGNED';
      if (activeTreatmentRoom !== null && activeTreatmentRoom.kode_ruangan !== itemRoomCode) {
        showError(
          toast,
          `Tidak bisa memilih layanan dari ruangan berbeda! Aktif: "${activeTreatmentRoom.nama_ruangan}". Batalkan pilihan sebelumnya terlebih dahulu.`
        );
        return;
      }
    }

    onChangeSelectedItems([...selectedItems, { ...item, qty: item.jenis.includes('produk') ? 1 : undefined }]);
  };

  const handleQtyChange = (item: RekomendasiItem, newQty: number) => {
    if (disabled) return;
    const validQty = Math.max(1, newQty || 1);
    onChangeSelectedItems(
      selectedItems.map((s) => (s.jenis === item.jenis && s.kode === item.kode ? { ...s, qty: validQty } : s))
    );
  };

  const totalHargaSelected = cleanSelectedItems.reduce((sum, i) => sum + (i.harga || 0) * (i.qty || 1), 0);

  return (
    <div
      className="p-3 border-round-xl border-1 surface-border bg-white select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border gap-2">
        <div className="flex align-items-center flex-1 min-w-0" style={{ gap: '10px' }}>
          <div
            className="flex align-items-center justify-content-center border-circle bg-blue-50 flex-shrink-0"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#e0f2fe',
            }}
          >
            <i className="pi pi-sparkles text-sm" style={{ color: '#0284c7' }} />
          </div>
          <div className="flex flex-column justify-content-center min-w-0">
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
              Pilih Layanan &amp; Paket Rekomendasi
            </span>
            <span
              className="text-overflow-ellipsis white-space-nowrap overflow-hidden"
              style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}
              title="Pilih layanan/paket tindakan lanjutan pasien dalam ruangan yang sama"
            >
              Pilih layanan/paket tindakan lanjutan pasien dalam ruangan yang sama
            </span>
          </div>
        </div>

        <div className="flex align-items-center gap-2 flex-shrink-0">
          {/* Active Room Doctor / Staff Duty Popover Button */}
          {!isProductTab && currentRoomObj && (() => {
            const isNotStarted = Boolean(currentRoomObj.is_not_started_today);
            const isPast = Boolean(currentRoomObj.is_past_today);
            const hasOngoing = Boolean(currentRoomObj.has_petugas);
            const hasCompanions = Boolean(currentRoomObj.companions && currentRoomObj.companions.length > 0);

            if (isNotStarted) {
              return (
                <button
                  type="button"
                  onClick={(e) => companionOpRef.current?.toggle(e)}
                  className="inline-flex align-items-center border-round-pill cursor-pointer transition-all border-1 hover:shadow-1"
                  style={{
                    background: '#fffbeb',
                    color: '#92400e',
                    borderColor: '#fcd34d',
                    padding: '3px 10px',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  title={`Shift di ${currentRoomObj.nama} belum dimulai (jadwal: ${currentRoomObj.shift || '13:00 WIB'}). Klik untuk melihat detail.`}
                >
                  <i className="pi pi-clock text-xs text-amber-600 flex-shrink-0" />
                  <span className="white-space-nowrap">
                    {currentRoomObj.nama} ({currentRoomObj.dokter_nama || currentRoomObj.petugas_pj || `${currentRoomObj.petugas_count} Petugas`})
                  </span>
                  {hasCompanions && (
                    <span
                      className="text-xs font-bold px-1.5 py-0 border-round-pill bg-amber-100 text-amber-800 flex-shrink-0"
                      style={{ fontSize: '10px' }}
                    >
                      +{currentRoomObj.companions?.length} Pendamping
                    </span>
                  )}
                  <i className="pi pi-chevron-down text-xs text-amber-700 flex-shrink-0 ml-0.5 opacity-80" />
                </button>
              );
            }

            if (isPast) {
              return (
                <span
                  className="inline-flex align-items-center border-round-pill bg-rose-50 text-rose-700 border-1 border-rose-200 font-bold"
                  style={{
                    padding: '4px 10px',
                    gap: '6px',
                    fontSize: '11px',
                  }}
                  title={`Shift pelayanan di ${currentRoomObj.nama} telah berakhir`}
                >
                  <i className="pi pi-times-circle text-rose-500 text-xs flex-shrink-0" />
                  <span>{currentRoomObj.nama}: Shift Selesai</span>
                </span>
              );
            }

            if (!hasOngoing) {
              return (
                <span
                  className="inline-flex align-items-center border-round-pill bg-rose-50 text-rose-700 border-1 border-rose-200 font-bold"
                  style={{
                    padding: '4px 10px',
                    gap: '6px',
                    fontSize: '11px',
                  }}
                  title={`Tidak ada dokter atau petugas bertugas di ${currentRoomObj.nama}`}
                >
                  <i className="pi pi-exclamation-circle text-rose-500 text-xs flex-shrink-0" />
                  <span>{currentRoomObj.nama}: Tidak Ada Petugas</span>
                </span>
              );
            }

            return (
              <button
                type="button"
                onClick={(e) => companionOpRef.current?.toggle(e)}
                className="inline-flex align-items-center border-round-pill cursor-pointer transition-all border-1 hover:shadow-1"
                style={{
                  background: '#f0fdf4',
                  color: '#166534',
                  borderColor: '#86efac',
                  padding: '3px 10px',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(22, 101, 52, 0.06)',
                }}
                title="Klik untuk melihat tim petugas & pendamping"
              >
                <i className="pi pi-users text-xs text-emerald-600 flex-shrink-0" />
                <span className="white-space-nowrap">
                  {currentRoomObj.nama} ({currentRoomObj.dokter_nama || currentRoomObj.petugas_pj || `${currentRoomObj.petugas_count} Petugas`})
                </span>
                {hasCompanions && (
                  <span
                    className="text-xs font-bold px-1.5 py-0 border-round-pill bg-emerald-100 text-emerald-800 flex-shrink-0"
                    style={{ fontSize: '10px' }}
                  >
                    +{currentRoomObj.companions?.length} Pendamping
                  </span>
                )}
                <i className="pi pi-chevron-down text-xs text-emerald-700 flex-shrink-0 ml-0.5 opacity-80" />
              </button>
            );
          })()}
        </div>
      </div>

      {/* ── ROOM & PRODUCT TABS (SAMAKAN PERSIS DENGAN PENDAFTARAN PASIEN) ── */}
      <div
        className="border-bottom-2 surface-border mb-3 overflow-x-auto flex align-items-center"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          borderColor: '#e2e8f0',
        }}
      >
        <div className="flex align-items-center" style={{ gap: '6px' }}>
          {allTabs.map((tab) => {
            const isActive = activeTabKey === tab.key;
            const hasSelected = tab.selectedCount > 0;

            let iconName = 'pi-building';
            let iconClass = 'text-500';

            if (tab.isProduct) {
              iconName = 'pi-shopping-bag';
              iconClass = isActive ? 'text-primary font-bold' : 'text-500';
            } else if (tab.isNotStarted) {
              iconName = 'pi-clock';
              iconClass = isActive ? 'text-amber-600 font-bold' : 'text-amber-500';
            } else if (tab.isPast) {
              iconName = 'pi-times-circle';
              iconClass = isActive ? 'text-rose-600 font-bold' : 'text-rose-400';
            } else if (tab.hasPetugas) {
              iconName = isActive ? 'pi-check-circle' : 'pi-building';
              iconClass = isActive ? 'text-primary font-bold' : 'text-emerald-600';
            } else {
              iconName = 'pi-building';
              iconClass = isActive ? 'text-primary font-bold' : 'text-400';
            }

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTabKey(tab.key)}
                className={`px-3 py-2 font-semibold text-xs border-none bg-transparent cursor-pointer flex align-items-center transition-colors relative white-space-nowrap ${
                  isActive ? 'text-primary font-bold' : 'text-600 hover:text-900'
                }`}
                style={{
                  borderBottom: isActive ? '2px solid var(--primary-color, #10b981)' : '2px solid transparent',
                  marginBottom: '-2px',
                  gap: '8px',
                }}
              >
                <i className={`pi ${iconName} ${iconClass}`} style={{ fontSize: '13px' }} />
                <span>{tab.label}</span>
                {hasSelected && (
                  <Tag
                    value={tab.selectedCount}
                    severity="info"
                    className="text-xs px-1.5 py-0 border-round-pill font-bold"
                    style={{ fontSize: '10px' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── NOTIFIKASI SHIFT BELUM MULAI / SELESAI / RUANGAN TERKUNCI ── */}
      {!isProductTab && currentRoomObj && currentRoomObj.is_not_started_today && (
        <div className="mb-3">
          <div
            className="inline-flex align-items-center border-round-lg border-1"
            style={{
              backgroundColor: '#fffbeb',
              borderColor: '#fde68a',
              padding: '6px 14px',
              gap: '8px',
              fontSize: '12px',
              color: '#92400e',
            }}
          >
            <i className="pi pi-clock text-amber-600 text-xs flex-shrink-0" />
            <span>
              Shift di <strong className="font-bold text-amber-950">{currentRoomObj.nama}</strong> baru dimulai pukul{' '}
              <strong className="font-bold text-amber-950">{currentRoomObj.earliest_start || (currentRoomObj.shift ? currentRoomObj.shift.split('-')[0].trim() : '13:00')} WIB</strong> (Shift:{' '}
              {currentRoomObj.shift || '13:00 - 20:00 WIB'}).
            </span>
          </div>
        </div>
      )}

      {!isProductTab && currentRoomObj && currentRoomObj.is_past_today && (
        <div className="mb-3">
          <div
            className="inline-flex align-items-center border-round-lg border-1"
            style={{
              backgroundColor: '#fff1f2',
              borderColor: '#fecdd3',
              padding: '6px 14px',
              gap: '8px',
              fontSize: '12px',
              color: '#9f1239',
            }}
          >
            <i className="pi pi-times-circle text-rose-500 text-xs flex-shrink-0" />
            <span>
              Shift di <strong className="font-bold text-rose-950">{currentRoomObj.nama}</strong> telah berakhir untuk hari ini (Shift:{' '}
              {currentRoomObj.shift}).
            </span>
          </div>
        </div>
      )}

      {isRuangDisabled && !currentRoomObj?.is_not_started_today && !currentRoomObj?.is_past_today && currentRoomObj?.has_petugas && (
        <div className="mb-3">
          <div
            className="inline-flex align-items-center border-round-lg border-1"
            style={{
              backgroundColor: '#fff7ed',
              borderColor: '#fed7aa',
              padding: '6px 14px',
              gap: '8px',
              fontSize: '12px',
              color: '#9a3412',
            }}
          >
            <i className="pi pi-info-circle text-orange-500 text-xs flex-shrink-0" />
            <span>
              Anda sudah memilih layanan dari ruangan <strong className="font-bold text-orange-950">{activeTreatmentRoom?.nama_ruangan}</strong>.
              Batalkan pilihan sebelumnya untuk berpindah ruangan.
            </span>
          </div>
        </div>
      )}

      {/* ── CATALOG ITEMS GRID ── */}
      {loading ? (
        <div className="flex align-items-center justify-content-center py-5">
          <ProgressSpinner style={{ width: '28px', height: '28px' }} />
          <span className="ml-2 text-xs font-semibold text-gray-500">Memuat katalog rekomendasi...</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-column align-items-center justify-content-center p-5 surface-card border-round-xl border-1 surface-border my-4 text-center">
          <i className="pi pi-inbox text-400 text-4xl mb-2" />
          <span className="text-700 font-bold block text-base">
            {isProductTab ? 'Katalog Produk' : currentRoomObj?.nama || 'Ruangan Ini'}
          </span>
          <span className="text-500 text-sm mt-1">
            Belum ada {isProductTab ? 'produk' : 'layanan atau paket'} yang tersedia di kategori ini.
          </span>
        </div>
      ) : (
        <div
          className="overflow-y-auto pt-2 pb-2"
          style={{
            maxHeight: '34rem',
          }}
        >
          <div className="grid">
            {displayItems.map((item) => {
              const isSelected = isItemSelected(item);
              const selectedObj = selectedItems.find((s) => s.jenis === item.jenis && s.kode === item.kode);
              const isPendaftaranLocked = Boolean(selectedObj?.is_locked || selectedObj?.is_pendaftaran);
              const isService = ['layanan', 'paket_layanan'].includes(item.jenis);
              const isPaket = item.jenis === 'paket_layanan' || item.jenis === 'paket_produk';
              const isProduk = ['produk', 'paket_produk'].includes(item.jenis);
              const isUnavailable = isService && (item.is_petugas_available === false || Boolean(item.is_not_started_today) || Boolean(item.is_past_today));
              const effectiveDisabled = isUnavailable || isRuangDisabled || disabled;

              return (
                <div key={`${item.jenis}_${item.kode}`} className="col-12 sm:col-6 md:col-4 lg:col-3 xl:col-3 p-2">
                  <div
                    className={`h-full border-round-xl border-1 overflow-hidden transition-all transition-duration-200 flex flex-column justify-content-between bg-white ${
                      isSelected
                        ? isPaket || isProduk
                          ? 'border-2 border-amber-500 shadow-4 bg-amber-50/10 cursor-pointer'
                          : 'border-2 border-blue-600 shadow-4 bg-blue-50/10 cursor-pointer'
                        : isPendaftaranLocked
                        ? 'border-2 border-amber-500 bg-amber-50/20 shadow-2 cursor-pointer'
                        : effectiveDisabled
                        ? 'surface-100 border-200 opacity-60 cursor-not-allowed'
                        : 'surface-border hover:border-blue-400 hover:shadow-2 cursor-pointer'
                    }`}
                    style={{
                      boxShadow: isSelected ? '0 4px 14px 0 rgba(37, 99, 235, 0.15)' : undefined,
                    }}
                    onClick={() => {
                      if (isPendaftaranLocked) {
                        showError(
                          toast,
                          `Item "${item.nama}" sudah dipilih saat pendaftaran awal dan tidak dapat diubah.`
                        );
                        return;
                      }
                      if (item.is_not_started_today) {
                        showWarning(
                          toast,
                          `Shift di ${item.nama_ruangan || 'ruangan ini'} baru dimulai pukul ${item.earliest_start || (item.shift ? item.shift.split('-')[0].trim() : '13:00')} WIB.`
                        );
                        return;
                      }
                      if (item.is_past_today) {
                        showWarning(
                          toast,
                          `Shift di ${item.nama_ruangan || 'ruangan ini'} telah selesai untuk hari ini.`
                        );
                        return;
                      }
                      if (isUnavailable) {
                        showWarning(
                          toast,
                          `Ruangan ${item.nama_ruangan || 'tujuan'} tidak memiliki dokter/petugas yang bertugas saat ini.`
                        );
                        return;
                      }
                      if (isRuangDisabled) {
                        showError(
                          toast,
                          `Tidak bisa memilih layanan dari ruangan berbeda! Aktif: "${activeTreatmentRoom?.nama_ruangan}". Batalkan pilihan sebelumnya terlebih dahulu.`
                        );
                        return;
                      }
                      if (!effectiveDisabled) handleToggleSelect(item);
                    }}
                  >
                    {/* Top Image Banner */}
                    <div
                      className="w-full relative overflow-hidden flex align-items-center justify-content-center select-none"
                      style={{ height: '145px', backgroundColor: '#f8fafc' }}
                    >
                      {item.foto ? (
                        <img
                          src={item.foto}
                          alt={item.nama}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            display: 'block',
                          }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : isSelected ? (
                        <div className="w-full h-full flex flex-column align-items-center justify-content-center bg-blue-50">
                          <i className="pi pi-sparkles text-blue-500 text-4xl" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-column align-items-center justify-content-center bg-slate-100 surface-100">
                          <i className="pi pi-image text-400 text-4xl opacity-60" />
                        </div>
                      )}

                      {/* Promo Badge Top Left */}
                      {item.is_promo && (
                        <div className="absolute top-0 left-0 m-2 z-2">
                          <span
                            className="inline-flex align-items-center font-bold text-white shadow-2"
                            style={{
                              background: 'linear-gradient(135deg, #ef4444, #f97316)',
                              fontSize: '10px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              lineHeight: '1.2',
                              letterSpacing: '0.02em',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                            }}
                          >
                            <i className="pi pi-percentage" style={{ fontSize: '9px' }} />
                            <span>
                              {item.jenis_diskon === 'persen'
                                ? `PROMO ${parseFloat(String(item.nilai_diskon || 0))}%`
                                : `PROMO ${formatRupiah(item.nilai_diskon || 0)}`}
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Checkbox Top Right */}
                      <div
                        className="absolute top-0 right-0 m-2 z-2 bg-white border-round-lg shadow-2 px-2 py-1 flex align-items-center justify-content-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!effectiveDisabled) handleToggleSelect(item);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={effectiveDisabled}
                          onChange={() => {
                            if (!effectiveDisabled) handleToggleSelect(item);
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 flex-1 flex flex-column justify-content-between">
                      <div>
                        {/* Tags Row */}
                        <div
                          className="flex align-items-center mb-2"
                          style={{
                            flexWrap: 'wrap',
                            gap: '6px',
                            minHeight: '26px',
                          }}
                        >
                          {/* Category Badge */}
                          <span
                            className="inline-flex align-items-center font-bold text-white shadow-1"
                            style={{
                              fontSize: '10px',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              backgroundColor: isProduk ? '#d97706' : '#0284c7',
                              lineHeight: 1.2,
                              letterSpacing: '0.01em',
                            }}
                          >
                            {item.nama_kategori || (isProduk ? 'Produk' : 'Layanan')}
                          </span>

                          {isPaket && (
                            <Tag
                              rounded
                              value={`Paket${item.total_sesi ? ` (${item.total_sesi} Sesi)` : ''}`}
                              severity="warning"
                              style={{
                                fontSize: '10px',
                                padding: '3px 10px',
                                fontWeight: 700,
                                lineHeight: 1.2,
                                borderRadius: '9999px',
                              }}
                            />
                          )}

                          {isService && item.is_past_today && (
                            <Tag
                              rounded
                              value="Shift Selesai"
                              severity="danger"
                              style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                fontWeight: 700,
                                lineHeight: 1.2,
                                borderRadius: '9999px',
                              }}
                            />
                          )}

                          {isService && !item.is_not_started_today && !item.is_past_today && item.is_petugas_available === false && (
                            <Tag
                              rounded
                              value="Tidak Ada Petugas"
                              severity="danger"
                              style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                fontWeight: 700,
                                lineHeight: 1.2,
                                borderRadius: '9999px',
                              }}
                            />
                          )}
                        </div>

                        {/* Title */}
                        <h4
                          className="text-sm font-bold text-900 m-0 mb-1 line-height-2"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '38px',
                          }}
                        >
                          {item.nama}
                        </h4>
                      </div>

                      {/* Footer */}
                      <div className="pt-2 mt-2 border-top-1 surface-border flex align-items-center justify-content-between gap-2">
                        {isProduk ? (
                          <div
                            className="inline-flex align-items-center text-xs text-600 font-medium"
                            style={{ gap: '5px' }}
                          >
                            <i className="pi pi-box text-xs text-500 flex-shrink-0" />
                            <span className="white-space-nowrap">{item.satuan || 'pcs'}</span>
                          </div>
                        ) : (
                          <div className="inline-flex align-items-center gap-1 text-xs text-600 font-medium min-w-0">
                            <i className="pi pi-clock text-xs text-500 flex-shrink-0" />
                            <span className="white-space-nowrap">
                              {item.durasi_menit || (isPaket ? 45 : 30)} Menit
                            </span>
                          </div>
                        )}

                        {isProduk && isSelected ? (
                          <div className="flex align-items-center" style={{ gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item, (selectedObj?.qty || 1) - 1)}
                              className="w-2rem h-2rem border-round-lg border-1 border-300 surface-50 cursor-pointer font-black text-base flex align-items-center justify-content-center text-700 hover:surface-200 transition-colors shadow-1 flex-shrink-0"
                              title="Kurangi Jumlah"
                              style={{ minWidth: '32px', minHeight: '32px' }}
                            >
                              −
                            </button>
                            <span
                              className="text-center font-bold text-amber-900 select-none"
                              style={{
                                fontSize: '15px',
                                minWidth: '22px',
                                display: 'inline-block',
                              }}
                            >
                              {selectedObj?.qty || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(item, (selectedObj?.qty || 1) + 1)}
                              className="w-2rem h-2rem border-round-lg border-none text-white cursor-pointer font-black text-base flex align-items-center justify-content-center shadow-2 hover:opacity-90 transition-opacity flex-shrink-0"
                              style={{
                                background: '#d97706',
                                minWidth: '32px',
                                minHeight: '32px',
                              }}
                              title="Tambah Jumlah"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="flex-shrink-0">
                            <span
                              className={`text-sm font-extrabold white-space-nowrap ${
                                isPaket ? 'text-amber-700' : 'text-blue-600'
                              }`}
                            >
                              {formatRupiah(item.harga)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SELECTED SUMMARY DRAWER BAR ── */}
      {cleanSelectedItems.length > 0 && (
        <div className="mt-4 p-3 border-round-xl flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 surface-card border-1 surface-border shadow-1">
          <div className="flex align-items-center gap-3">
            <div
              className="border-circle flex align-items-center justify-content-center flex-shrink-0"
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
              }}
            >
              <i className="pi pi-check font-bold" style={{ fontSize: '14px' }} />
            </div>
            <div>
              <span className="text-xs font-bold text-700 block mb-2">
                {cleanSelectedItems.length} Item Terpilih untuk Rekomendasi
              </span>
              <div className="flex align-items-center flex-wrap" style={{ gap: '10px' }}>
                {cleanSelectedItems.map((item, idx) => {
                  const isLocked = item.is_locked || item.is_pendaftaran;
                  const isProd = (item.jenis || '').includes('produk');
                  return (
                    <div
                      key={idx}
                      className={`inline-flex align-items-center border-round-xl font-bold shadow-1 ${
                        isLocked
                          ? 'bg-amber-50 text-amber-900 border-1 border-amber-300'
                          : isProd
                          ? 'bg-orange-50 text-orange-900 border-1 border-orange-200'
                          : 'surface-card text-900 border-1 surface-border'
                      }`}
                      style={{
                        padding: '6px 14px',
                        gap: '8px',
                        fontSize: '12.5px',
                        lineHeight: 1.2,
                      }}
                    >
                      {isLocked ? (
                        <i className="pi pi-lock text-amber-700 text-xs flex-shrink-0" />
                      ) : isProd ? (
                        <i className="pi pi-box text-orange-600 text-xs flex-shrink-0" />
                      ) : (
                        <i className="pi pi-sparkles text-primary text-xs flex-shrink-0" />
                      )}
                      <span className="white-space-nowrap">{item.nama}</span>
                      {item.qty && item.qty > 1 && (
                        <span
                          className="px-2 py-0.5 border-round font-extrabold text-white text-xs ml-1 shadow-1"
                          style={{ backgroundColor: '#d97706' }}
                        >
                          {item.qty}x
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex align-items-center gap-3 w-full sm:w-auto justify-content-between sm:justify-content-end border-top-1 sm:border-top-none pt-2 sm:pt-0 surface-border">
            <div className="text-right">
              <span className="text-[10px] text-500 block font-semibold uppercase">Total Estimasi</span>
              <span className="text-base font-black text-primary">{formatRupiah(totalHargaSelected)}</span>
            </div>

            <Button
              label="Hapus Pilihan Tambahan"
              icon="pi pi-trash"
              outlined
              severity="danger"
              size="small"
              className="font-bold text-xs border-round-lg"
              onClick={() => onChangeSelectedItems(selectedItems.filter((i) => i.is_locked || i.is_pendaftaran))}
            />
          </div>
        </div>
      )}

      {/* ── OVERLAY PANEL TIM PETUGAS RUANGAN ── */}
      <OverlayPanel ref={companionOpRef} className="shadow-4 border-round-xl">
        {(() => {
          if (!currentRoomObj) return null;

          return (
            <div style={{ minWidth: '250px', maxWidth: '320px' }}>
              <div className="font-bold text-xs text-900 mb-1 flex align-items-center justify-content-between">
                <span className="flex align-items-center gap-1.5">
                  <i className="pi pi-users text-teal-600 text-xs" />
                  <span>Tim Petugas ({currentRoomObj.nama})</span>
                </span>
              </div>
              {currentRoomObj.shift && (
                <div className="text-[11px] text-500 mb-2 flex align-items-center gap-1">
                  <i className="pi pi-clock text-[10px] text-400" />
                  <span>Shift: {currentRoomObj.shift}</span>
                </div>
              )}

              {currentRoomObj.is_not_started_today && (
                <div className="p-2 mb-2 bg-amber-50 border-1 border-amber-200 border-round-lg text-amber-800 text-[11px] font-medium flex align-items-start gap-1.5">
                  <i className="pi pi-clock text-amber-600 text-xs mt-0.5 flex-shrink-0" />
                  <span>
                    Sesi di {currentRoomObj.nama} baru dimulai pukul{' '}
                    <strong>{currentRoomObj.earliest_start || (currentRoomObj.shift ? currentRoomObj.shift.split('-')[0].trim() : '13:00')} WIB</strong>.
                    Layanan belum dapat dirujuk saat ini.
                  </span>
                </div>
              )}

              <div
                className="text-xs p-2 border-1 border-round-lg mb-2"
                style={{
                  backgroundColor: currentRoomObj.is_not_started_today ? '#fffbeb' : '#ecfdf5',
                  borderColor: currentRoomObj.is_not_started_today ? '#fde68a' : '#a7f3d0',
                }}
              >
                <div
                  className="font-semibold text-[11px]"
                  style={{ color: currentRoomObj.is_not_started_today ? '#92400e' : '#065f46' }}
                >
                  Penanggung Jawab (PJ):
                </div>
                <div
                  className="font-bold text-xs"
                  style={{ color: currentRoomObj.is_not_started_today ? '#b45309' : '#047857' }}
                >
                  {currentRoomObj.petugas_pj || currentRoomObj.dokter_nama || 'Petugas Jaga'}
                  {currentRoomObj.petugas_pj_jabatan && (
                    <span className="font-normal text-[11px] text-600 ml-1">
                      ({currentRoomObj.petugas_pj_jabatan})
                    </span>
                  )}
                </div>
              </div>

              {currentRoomObj.companions && currentRoomObj.companions.length > 0 ? (
                <>
                  <div className="text-[11px] font-semibold text-700 mb-1">
                    Petugas Pendamping ({currentRoomObj.companions.length}):
                  </div>
                  <ul className="m-0 pl-3 text-xs text-600" style={{ listStyleType: 'disc' }}>
                    {currentRoomObj.companions.map((c, i) => (
                      <li key={i} className="mb-1">
                        <span className="font-medium text-900">{c.nama_petugas}</span>
                        {c.jabatan_petugas && <span className="text-500 text-[11px]"> — {c.jabatan_petugas}</span>}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="text-[11px] text-500 italic">Tidak ada petugas pendamping.</div>
              )}
            </div>
          );
        })()}
      </OverlayPanel>
    </div>
  );
};
