'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Toast } from 'primereact/toast';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';

import { KasirSidebar } from './components/KasirSidebar';
import { KasirPOSPanel } from './components/KasirPOSPanel';
import { KasirBayarModal } from './components/KasirBayarModal';
import { KasirStrukModal } from './components/KasirStrukModal';

export interface CartItem {
  jenis: 'layanan' | 'produk';
  kode: string;
  nama: string;
  nama_kategori?: string;
  satuan?: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  is_promo?: boolean;
  kode_promo_item?: string;
  is_from_pendaftaran?: boolean;
  // Info promo per-item dari pendaftaran (diskon diterapkan di kasir)
  kode_promo?: string | null;
  nama_promo?: string | null;
  jenis_diskon?: 'persen' | 'nominal' | null;
  nilai_diskon?: number | null;
  diskon?: number | null;
  subtotal_setelah_diskon?: number | null;
}

export interface TransaksiListItem {
  kode_transaksi: string;
  kode_kunjungan: string | null;
  no_rm: string;
  nama_pasien: string;
  no_hp: string;
  kode_promo: string | null;
  nama_promo: string | null;
  tanggal_transaksi: string;
  total_harga: number;
  total_diskon: number;
  total_bayar: number;
  dp_nominal?: number;
  metode_pembayaran_dp?: string | null;
  sisa_bayar?: number;
  metode_bayar: string;
  status: 'draft' | 'lunas' | 'batal';
}

export interface BayarResult {
  kode_transaksi: string;
  metode_bayar: string;
  total_harga?: number;
  total_diskon?: number;
  total_bayar: number;
  dp_nominal?: number;
  metode_pembayaran_dp?: string | null;
  sisa_bayar?: number;
  nominal_bayar: number;
  kembalian: number;
  nama_pasien?: string;
  no_rm?: string;
  items?: CartItem[];
  kode_promo?: string | null;
  nama_promo?: string | null;
}

export default function KasirPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useRef<Toast>(null);

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  // State sidebar
  const [transaksiList, setTransaksiList] = useState<TransaksiListItem[]>([]);
  const [selectedKodeTrx, setSelectedKodeTrx] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  // State modal
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [showStrukModal, setShowStrukModal] = useState(false);
  const [bayarResult, setBayarResult] = useState<BayarResult | null>(null);

  // Pending bayar payload (from POS panel)
  const [pendingBayarPayload, setPendingBayarPayload] = useState<{
    kode_transaksi: string;
    total_bayar: number;
    total_harga?: number;
    dp_nominal?: number;
    metode_pembayaran_dp?: string | null;
    sisa_bayar?: number;
    nama_pasien: string;
    no_rm: string;
    items: CartItem[];
    kode_promo?: string | null;
    nama_promo?: string | null;
    total_diskon?: number;
  } | null>(null);

  const refreshList = useCallback(() => {
    setListRefreshKey((k) => k + 1);
  }, []);

  const handleSelectTrx = (kode: string) => {
    setSelectedKodeTrx(kode);
  };

  const handleNewTrx = () => {
    setSelectedKodeTrx(null);
  };

  const handleDraftSaved = (kode_transaksi: string) => {
    setSelectedKodeTrx(kode_transaksi);
    refreshList();
  };

  const handleOpenBayar = (payload: typeof pendingBayarPayload) => {
    setPendingBayarPayload(payload);
    setShowBayarModal(true);
  };

  const handleBayarConfirm = async (metode: string, nominal: number) => {
    if (!pendingBayarPayload) return;
    try {
      const res = await postData('/master/kasir-bayar', {
        kode_transaksi: pendingBayarPayload.kode_transaksi,
        metode_bayar: metode,
        nominal_bayar: nominal,
      });

      if (['00', '0000'].includes(res?.data?.status)) {
        const result: BayarResult = {
          ...res.data.data,
          nama_pasien: pendingBayarPayload.nama_pasien,
          no_rm: pendingBayarPayload.no_rm,
          items: pendingBayarPayload.items,
          kode_promo: res.data.data?.kode_promo || pendingBayarPayload.kode_promo,
          nama_promo: res.data.data?.nama_promo || pendingBayarPayload.nama_promo,
          total_diskon: res.data.data?.total_diskon !== undefined ? res.data.data.total_diskon : pendingBayarPayload.total_diskon,
        };
        setBayarResult(result);
        setShowBayarModal(false);
        setShowStrukModal(true);
        setSelectedKodeTrx(null);
        refreshList();
      } else {
        showError(toast, res?.data?.message || 'Pembayaran gagal');
      }
    } catch {
      showError(toast, 'Gagal terhubung ke server');
    }
  };

  return (
    <div className="w-full">
      <div
        style={{
          height: 'calc(100vh - 9rem)',
          minHeight: '600px',
          overflow: 'hidden',
        }}
        className="flex gap-3 h-full overflow-hidden"
      >
        <Toast ref={toast} position="top-right" />

        {/* SIDEBAR KIRI: Daftar Transaksi & Stat */}
        <div style={{ width: '290px', flexShrink: 0 }} className="h-full overflow-hidden border-round-xl shadow-1 border-1 surface-border">
          <KasirSidebar
            toast={toast}
            selectedKodeTrx={selectedKodeTrx}
            refreshKey={listRefreshKey}
            onSelectTrx={handleSelectTrx}
            onNewTrx={handleNewTrx}
            onListChange={setTransaksiList}
          />
        </div>

        {/* PANEL UTAMA POS: Katalog (Kiri 50%) & Cart/Checkout (Kanan 50%) */}
        <div className="flex-1 h-full overflow-hidden">
          <KasirPOSPanel
            toast={toast}
            kode_transaksi={selectedKodeTrx}
            onDraftSaved={handleDraftSaved}
            onOpenBayar={handleOpenBayar}
            onOpenStruk={(res) => {
              setBayarResult(res);
              setShowStrukModal(true);
            }}
          />
        </div>

        {/* MODAL BAYAR */}
        <KasirBayarModal
          visible={showBayarModal}
          totalBayar={pendingBayarPayload?.sisa_bayar !== undefined ? pendingBayarPayload.sisa_bayar : (pendingBayarPayload?.total_bayar || 0)}
          totalTagihanAsli={pendingBayarPayload?.total_bayar || 0}
          dpNominal={pendingBayarPayload?.dp_nominal || 0}
          metodeDp={pendingBayarPayload?.metode_pembayaran_dp || null}
          onHide={() => setShowBayarModal(false)}
          onConfirm={handleBayarConfirm}
        />

        {/* MODAL STRUK */}
        <KasirStrukModal
          visible={showStrukModal}
          result={bayarResult}
          onHide={() => setShowStrukModal(false)}
        />
      </div>
    </div>
  );
}
