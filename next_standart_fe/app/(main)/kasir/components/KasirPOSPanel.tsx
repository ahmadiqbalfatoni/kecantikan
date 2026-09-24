'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import postData from '@/lib/axios/postData';
import { showError, showSuccess, showInfo, showWarning } from '@/lib/tools/generalTools';
import type { CartItem, BayarResult } from '../page';
import {
  PromoOption,
  checkPromoEligibility,
  calculateTransactionDiscounts,
  filterValidPromosForCart,
  formatRupiah,
} from '@/lib/tools/diskonKasir';
import { KasirVoucherModal } from './KasirVoucherModal';

interface KunjunganOption {
  kode_kunjungan: string;
  kode_booking?: string | null;
  no_rm: string;
  nama_pasien: string;
  no_hp: string;
  jam_datang: string;
  dp_nominal?: number;
  dp_status?: string | null;
  metode_pembayaran_dp?: string | null;
  layanan_pendaftaran?: CartItem[];
}

interface ItemOption {
  jenis: 'layanan' | 'produk';
  kode: string;
  nama: string;
  nama_kategori?: string;
  satuan?: string;
  foto?: string | null;
  durasi_menit?: number;
  nama_ruangan?: string;
  wajib_konsultasi?: string;
  harga: number;
}

interface KasirPOSPanelProps {
  toast: React.RefObject<Toast>;
  kode_transaksi: string | null;
  onDraftSaved: (kode: string) => void;
  onOpenBayar: (payload: {
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
  }) => void;
  onOpenStruk?: (result: BayarResult) => void;
}

export const KasirPOSPanel: React.FC<KasirPOSPanelProps> = ({
  toast,
  kode_transaksi,
  onDraftSaved,
  onOpenBayar,
  onOpenStruk,
}) => {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const [kunjunganList, setKunjunganList] = useState<KunjunganOption[]>([]);
  const [layananList, setLayananList] = useState<ItemOption[]>([]);
  const [produkList, setProdukList] = useState<ItemOption[]>([]);
  const [promoList, setPromoList] = useState<PromoOption[]>([]);

  const [selectedKunjungan, setSelectedKunjungan] = useState<KunjunganOption | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchItem, setSearchItem] = useState('');
  const [activeItemTab, setActiveItemTab] = useState<'layanan' | 'produk'>('layanan');
  const [editingKodeTrx, setEditingKodeTrx] = useState<string | null>(null);
  const [trxStatus, setTrxStatus] = useState<'draft' | 'lunas' | 'batal' | null>(null);
  const [selectedPromos, setSelectedPromos] = useState<PromoOption[]>([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [dpNominal, setDpNominal] = useState<number>(0);
  const [metodeDp, setMetodeDp] = useState<string | null>(null);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (kode_transaksi) {
      fetchDetail(kode_transaksi);
    } else {
      resetForm();
    }
  }, [kode_transaksi]);

  const resetForm = () => {
    setSelectedKunjungan(null);
    setCart([]);
    setEditingKodeTrx(null);
    setTrxStatus(null);
    setSelectedPromos([]);
    setShowVoucherModal(false);
    setSearchItem('');
    setDpNominal(0);
    setMetodeDp(null);
  };

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await postData('/master/kasir-options', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setKunjunganList(res.data.data.kunjungan || []);
        setLayananList(res.data.data.layanan || []);
        setProdukList(res.data.data.produk || []);
        setPromoList(res.data.data.promo || []);
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || err?.message || 'Gagal memuat opsi kasir');
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchDetail = async (kode: string) => {
    setLoadingDetail(true);
    try {
      const res = await postData('/master/kasir-detail', { kode_transaksi: kode });
      if (['00', '0000'].includes(res?.data?.status)) {
        const trx = res.data.data;
        setEditingKodeTrx(trx.kode_transaksi);
        setTrxStatus(trx.status);
        setDpNominal(parseFloat(String(trx.dp_nominal || 0)));
        setMetodeDp(trx.metode_pembayaran_dp || null);

        const kunjungan = kunjunganList.find((k) => k.kode_kunjungan === trx.kode_kunjungan) ||
          (trx.kode_kunjungan ? {
            kode_kunjungan: trx.kode_kunjungan,
            kode_booking: trx.kode_booking || null,
            no_rm: trx.no_rm,
            nama_pasien: trx.nama_pasien || trx.no_rm,
            no_hp: trx.no_hp || '',
            jam_datang: '',
            dp_nominal: parseFloat(String(trx.dp_nominal || 0)),
            dp_status: trx.dp_status || null,
            metode_pembayaran_dp: trx.metode_pembayaran_dp || null,
          } : null);
        setSelectedKunjungan(kunjungan);

        const cartItems: CartItem[] = (trx.details || []).map((d: any) => ({
          jenis: d.jenis,
          kode: d.kode,
          nama: d.nama,
          satuan: d.satuan || (d.jenis === 'layanan' ? 'tindakan' : 'pcs'),
          qty: d.qty,
          harga_satuan: parseFloat(d.harga_satuan),
          subtotal: parseFloat(d.subtotal),
          is_from_pendaftaran: Boolean(d.is_from_pendaftaran),
          kode_promo: d.kode_promo || null,
          nama_promo: d.nama_promo || null,
          jenis_diskon: d.jenis_diskon || null,
          nilai_diskon: d.nilai_diskon != null ? parseFloat(d.nilai_diskon) : null,
          diskon: d.diskon != null ? parseFloat(d.diskon) : 0,
          subtotal_setelah_diskon: d.subtotal_setelah_diskon != null ? parseFloat(d.subtotal_setelah_diskon) : parseFloat(d.subtotal),
        }));
        setCart(cartItems);

        // Rekonstruksi promo yang dipilih dari per-item snapshot atau kode_promo transaksi
        const promosFromItems: PromoOption[] = [];
        const usedItemCodes = new Set<string>();

        for (const item of cartItems) {
          if (item.kode_promo) {
            const foundInList = promoList.find((p) => p.kode_promo === item.kode_promo && p.kode_item === item.kode);
            if (foundInList) {
              promosFromItems.push(foundInList);
              usedItemCodes.add(item.kode);
            } else {
              promosFromItems.push({
                kode_detail_promo: `saved_${item.kode_promo}_${item.kode}`,
                kode_promo: item.kode_promo,
                nama_promo: item.nama_promo || trx.nama_promo || item.kode_promo,
                jenis_diskon: (item.jenis_diskon as any) || 'persen',
                nilai_diskon: item.nilai_diskon || 0,
                jenis_item: item.jenis,
                kode_item: item.kode,
                nama_item: item.nama,
              });
              usedItemCodes.add(item.kode);
            }
          }
        }

        // Auto-select promo untuk item di keranjang (produk maupun layanan) yang memiliki promo aktif di promoList
        for (const item of cartItems) {
          if (!usedItemCodes.has(item.kode)) {
            const promoEligible = promoList.find((p) => p.kode_item === item.kode);
            if (promoEligible) {
              promosFromItems.push(promoEligible);
              usedItemCodes.add(item.kode);
            }
          }
        }

        if (promosFromItems.length > 0) {
          setSelectedPromos(promosFromItems);
        } else if (trx.kode_promo) {
          const codes = String(trx.kode_promo).split(',').map((s: string) => s.trim()).filter(Boolean);
          const cartCodes = new Set(cartItems.map((c: any) => c.kode));
          const foundDetails = promoList.filter((p) =>
            codes.includes(p.kode_promo) && cartCodes.has(p.kode_item)
          );
          setSelectedPromos(foundDetails);
        } else {
          setSelectedPromos([]);
        }
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || err?.message || 'Gagal memuat detail transaksi');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleKunjunganChange = (kunjungan: KunjunganOption | null) => {
    setSelectedKunjungan(kunjungan);
    if (!kunjungan) {
      setCart([]);
      setEditingKodeTrx(null);
      setTrxStatus(null);
      setSelectedPromos([]);
      setShowVoucherModal(false);
      setDpNominal(0);
      setMetodeDp(null);
      return;
    }

    setDpNominal(parseFloat(String(kunjungan.dp_nominal || 0)));
    setMetodeDp(kunjungan.metode_pembayaran_dp || null);

    if (!editingKodeTrx) {
      const itemsFromPendaftaran = kunjungan.layanan_pendaftaran || [];
      setCart(itemsFromPendaftaran);

      // Auto-select promo untuk layanan & produk dari kunjungan jika ada promo aktif
      const autoPromos: PromoOption[] = [];
      const usedCodes = new Set<string>();

      for (const item of itemsFromPendaftaran) {
        if (item.kode_promo) {
          const found = promoList.find((p) => p.kode_promo === item.kode_promo && p.kode_item === item.kode);
          if (found) {
            autoPromos.push(found);
            usedCodes.add(item.kode);
          }
        }
      }
      for (const item of itemsFromPendaftaran) {
        if (!usedCodes.has(item.kode)) {
          const found = promoList.find((p) => p.kode_item === item.kode);
          if (found) {
            autoPromos.push(found);
            usedCodes.add(item.kode);
          }
        }
      }
      setSelectedPromos(autoPromos);
    }
  };

  const addToCart = (item: ItemOption) => {
    const existing = cart.find((c) => c.jenis === item.jenis && c.kode === item.kode);
    if (existing) {
      setCart(cart.map((c) =>
        c.jenis === item.jenis && c.kode === item.kode
          ? { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.harga_satuan }
          : c
      ));
    } else {
      setCart([...cart, {
        jenis: item.jenis,
        kode: item.kode,
        nama: item.nama,
        nama_kategori: item.nama_kategori,
        satuan: item.satuan || (item.jenis === 'layanan' ? 'tindakan' : 'pcs'),
        qty: 1,
        harga_satuan: item.harga,
        subtotal: item.harga,
        is_from_pendaftaran: false,
      }]);

      // Auto-select promo untuk produk maupun layanan saat ditambahkan ke keranjang
      const promoAvailable = promoList.find((p) => p.kode_item === item.kode);
      if (promoAvailable && !selectedPromos.some((sp) => sp.kode_item === item.kode)) {
        setSelectedPromos((prev) => [...prev, promoAvailable]);
      }
    }
  };

  const updateQty = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== idx));
    } else {
      setCart(cart.map((c, i) => i === idx ? { ...c, qty: newQty, subtotal: newQty * c.harga_satuan } : c));
    }
  };

  const removeItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  // Real-time Total & Discount Calculations via pure helper
  const {
    totalHarga,
    totalDiskon,
    totalBayar,
    itemDiscounts,
  } = useMemo(() => {
    return calculateTransactionDiscounts(cart, selectedPromos);
  }, [cart, selectedPromos]);

  // Reaktif: pantau keranjang untuk otomatis melepas promo yang targetnya dihapus dari keranjang
  useEffect(() => {
    if (selectedPromos.length === 0) return;
    const { validPromos, droppedPromos } = filterValidPromosForCart(cart, selectedPromos);
    if (droppedPromos.length > 0) {
      setSelectedPromos(validPromos);
      droppedPromos.forEach((p) => {
        showInfo(toast, `Promo "${p.nama_promo}" dilepas karena item "${p.nama_item || p.kode_item}" dihapus`);
      });
    }
  }, [cart]);

  // Auto-select promo aktif untuk produk dan layanan di keranjang yang belum memiliki promo terpilih
  useEffect(() => {
    if (promoList.length === 0 || cart.length === 0) return;
    setSelectedPromos((prev) => {
      const currentItemCodes = new Set(prev.map((p) => p.kode_item));
      const newlySelected: PromoOption[] = [];
      for (const item of cart) {
        if (!currentItemCodes.has(item.kode)) {
          const promo = promoList.find((p) => p.kode_item === item.kode);
          if (promo) {
            newlySelected.push(promo);
            currentItemCodes.add(item.kode);
          }
        }
      }
      if (newlySelected.length > 0) {
        return [...prev, ...newlySelected];
      }
      return prev;
    });
  }, [promoList, cart]);

  // Hitung jumlah promo yang eligible dari promoList untuk keranjang saat ini
  const eligiblePromoCount = useMemo(() => {
    return promoList.filter((p) => checkPromoEligibility(p, cart).eligible).length;
  }, [promoList, cart]);

  const sisaBayar = Math.max(0, totalBayar - dpNominal);

  const filteredItems = useMemo(() => {
    const list = activeItemTab === 'layanan' ? layananList : produkList;
    if (!searchItem.trim()) return list;
    const q = searchItem.toLowerCase();
    return list.filter((i) => i.nama.toLowerCase().includes(q) || i.nama_kategori?.toLowerCase().includes(q));
  }, [activeItemTab, layananList, produkList, searchItem]);

  const getItemsPayload = (): CartItem[] => {
    return cart.map((c) => {
      const disc = itemDiscounts[c.kode];
      return {
        jenis: c.jenis,
        kode: c.kode,
        nama: c.nama,
        qty: c.qty,
        harga_satuan: c.harga_satuan,
        subtotal: c.subtotal,
        is_from_pendaftaran: c.is_from_pendaftaran ? true : false,
        kode_promo: disc?.promo?.kode_promo || c.kode_promo || null,
        nama_promo: disc?.promo?.nama_promo || c.nama_promo || null,
        jenis_diskon: disc?.promo?.jenis_diskon || c.jenis_diskon || null,
        nilai_diskon: disc?.promo?.nilai_diskon != null ? disc.promo.nilai_diskon : (c.nilai_diskon || null),
        diskon: disc ? disc.diskon : (c.diskon || 0),
        subtotal_setelah_diskon: disc ? disc.subtotal_setelah_diskon : (c.subtotal_setelah_diskon || (c.subtotal - (c.diskon || 0))),
      };
    });
  };

  const handleSaveDraft = async () => {
    if (!selectedKunjungan) {
      showError(toast, 'Pilih pasien terlebih dahulu');
      return;
    }
    if (cart.length === 0) {
      showError(toast, 'Tambahkan minimal 1 item ke cart');
      return;
    }

    setSavingDraft(true);
    try {
      const itemsPayload = getItemsPayload();
      const uniquePromoCodes = [...new Set(selectedPromos.map((p) => p.kode_promo))].join(',');
      const uniquePromoNames = [...new Set(selectedPromos.map((p) => p.nama_promo))].join(', ');

      const payload = {
        kode_transaksi: editingKodeTrx || undefined,
        kode_kunjungan: selectedKunjungan.kode_kunjungan,
        no_rm: selectedKunjungan.no_rm,
        items: itemsPayload,
        kode_promo: uniquePromoCodes || undefined,
        nama_promo: uniquePromoNames || undefined,
        total_harga: totalHarga,
        total_diskon: totalDiskon,
        total_bayar: totalBayar,
        metode_bayar: 'tunai',
      };

      const res = await postData('/master/kasir-save', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        showSuccess(toast, 'Draft transaksi berhasil disimpan');
        onDraftSaved(res.data.data.kode_transaksi);
      } else {
        showError(toast, res?.data?.message || 'Gagal menyimpan draft');
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || err?.message || 'Gagal terhubung ke server');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleBayar = async () => {
    if (!selectedKunjungan) { showError(toast, 'Pilih pasien terlebih dahulu'); return; }
    if (cart.length === 0) { showError(toast, 'Cart masih kosong'); return; }

    setSavingDraft(true);
    try {
      const itemsPayload = getItemsPayload();
      const uniquePromoCodes = [...new Set(selectedPromos.map((p) => p.kode_promo))].join(',');
      const uniquePromoNames = [...new Set(selectedPromos.map((p) => p.nama_promo))].join(', ');

      const payload = {
        kode_transaksi: editingKodeTrx || undefined,
        kode_kunjungan: selectedKunjungan.kode_kunjungan,
        no_rm: selectedKunjungan.no_rm,
        items: itemsPayload,
        kode_promo: uniquePromoCodes || undefined,
        nama_promo: uniquePromoNames || undefined,
        total_harga: totalHarga,
        total_diskon: totalDiskon,
        total_bayar: totalBayar,
        metode_bayar: 'tunai',
      };
      const res = await postData('/master/kasir-save', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        const kodeTrx = res.data.data.kode_transaksi;
        setEditingKodeTrx(kodeTrx);
        onOpenBayar({
          kode_transaksi: kodeTrx,
          total_bayar: totalBayar,
          total_harga: totalHarga,
          dp_nominal: dpNominal,
          metode_pembayaran_dp: metodeDp,
          sisa_bayar: sisaBayar,
          nama_pasien: selectedKunjungan.nama_pasien,
          no_rm: selectedKunjungan.no_rm,
          items: itemsPayload,
          kode_promo: uniquePromoCodes || null,
          nama_promo: uniquePromoNames || null,
          total_diskon: totalDiskon,
        });
      } else {
        showError(toast, res?.data?.message || 'Gagal menyimpan sebelum bayar');
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || err?.message || 'Gagal terhubung ke server');
    } finally {
      setSavingDraft(false);
    }
  };

  const isReadOnly = trxStatus === 'lunas' || trxStatus === 'batal';

  if (loadingDetail) {
    return (
      <div className="flex align-items-center justify-content-center h-full surface-ground">
        <ProgressSpinner style={{ width: '32px', height: '32px' }} />
        <span className="ml-2 text-sm text-500 font-medium">Memuat rincian transaksi...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-2 overflow-hidden">
      {/* KIRI: Katalog Item (50%) */}
      <div style={{ flex: '1 1 50%', minWidth: 0 }} className="flex flex-column h-full surface-card border-round-xl border-1 surface-border shadow-1 overflow-hidden">
        {/* Header Catalog */}
        <div className="p-3 border-bottom-1 surface-border bg-white flex-shrink-0">
          <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2 m-0">
            <i className="pi pi-shopping-bag text-teal-600 text-sm" />
            KATALOG ITEM (LAYANAN &amp; PRODUK)
          </label>

          {/* Tabs layanan/produk - bebas dipilih kapan saja */}
          <div className="flex gap-1 mb-2 p-1 bg-slate-100 border-round-lg">
            {(['layanan', 'produk'] as const).map((tab) => {
              const isActive = activeItemTab === tab;
              const count = tab === 'layanan' ? layananList.length : produkList.length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveItemTab(tab)}
                  className={`flex-1 py-2 px-3 border-round-md font-bold text-xs border-none cursor-pointer flex align-items-center justify-content-center gap-2 transition-all ${
                    isActive ? 'bg-teal-600 text-white shadow-1' : 'bg-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className={`pi ${tab === 'layanan' ? 'pi-briefcase' : 'pi-box'}`} style={{ fontSize: '12px' }} />
                  <span>{tab === 'layanan' ? 'Layanan & Paket' : 'Produk'} ({count})</span>
                </button>
              );
            })}
          </div>


          <IconField iconPosition="left" className="w-full">
            <InputIcon className="pi pi-search text-xs text-400" />
            <InputText
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              placeholder={`Cari ${activeItemTab === 'layanan' ? 'layanan / paket' : 'produk'}...`}
              className="p-inputtext-sm w-full border-round-lg text-xs"
            />
          </IconField>
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto p-3 surface-ground">
          {loadingOptions ? (
            <div className="flex align-items-center justify-content-center py-5">
              <ProgressSpinner style={{ width: '28px', height: '28px' }} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center py-5 text-center">
              <i className="pi pi-inbox text-3xl text-300 mb-2" />
              <span className="text-xs text-500 font-medium">Tidak ada item ditemukan</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {filteredItems.map((item) => {
                const inCartItem = cart.find((c) => c.jenis === item.jenis && c.kode === item.kode);
                const inCart = Boolean(inCartItem);

                // Cari detail promo yang dicentang dan berlaku untuk item katalog ini
                const matchingDetails = selectedPromos.filter((dp) => dp.kode_item === item.kode);
                let diskonCatalog = 0;
                matchingDetails.forEach((dp) => {
                  diskonCatalog += dp.jenis_diskon === 'persen'
                    ? (item.harga * dp.nilai_diskon) / 100
                    : Math.min(dp.nilai_diskon, item.harga);
                });
                const hargaSetelahDiskon = Math.max(0, item.harga - diskonCatalog);

                // Item layanan dikunci saat transaksi sudah dipilih; produk tetap bebas
                const isLayananLocked = item.jenis === 'layanan' && Boolean(editingKodeTrx);
                const isItemDisabled = isReadOnly || isLayananLocked;

                return (
                  <div
                    key={item.kode}
                    onClick={() => !isItemDisabled && addToCart(item)}
                    title={isLayananLocked ? 'Layanan tidak bisa diubah saat transaksi sedang aktif' : undefined}
                    className={`surface-card p-3 border-round-xl border-1 transition-all user-select-none relative flex flex-column justify-content-between shadow-1 ${
                      isItemDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:shadow-2'
                    } ${inCart && !isItemDisabled ? 'border-2 border-teal-500 bg-teal-50/50' : 'surface-border'}`}
                  >
                    <div className="mb-2">
                      {matchingDetails.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {matchingDetails.map((dp) => (
                            <span
                              key={dp.kode_detail_promo}
                              className="text-xs font-extrabold px-2 py-0.5 border-round-md text-rose-700 bg-rose-100 border-1 border-rose-200 inline-block"
                            >
                              {dp.jenis_diskon === 'persen' ? `-${dp.nilai_diskon}%` : `-${formatRupiah(dp.nilai_diskon)}`}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex align-items-start justify-content-between gap-1 mb-1">
                        <div className="font-bold text-xs text-slate-900 line-height-2 flex-1">
                          {item.nama}
                        </div>
                        {inCart && (
                          <span
                            className="bg-teal-600 text-white font-bold px-2 py-1 border-round-md flex align-items-center gap-1 flex-shrink-0 shadow-1"
                          >
                            <i className="pi pi-check" style={{ fontSize: '6px' }} />
                            <span style={{ fontSize: '7px', lineHeight: 1 }}>Terpilih</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.nama_kategori || (item.jenis === 'layanan' ? 'Layanan' : 'Produk')}
                      </div>
                    </div>

                    <div className="flex align-items-center justify-content-between pt-2 border-top-1 surface-border">
                      {matchingDetails.length > 0 && diskonCatalog > 0 ? (
                        <div className="flex align-items-baseline gap-1.5">
                          <span className="text-xs text-slate-400 line-through font-semibold">{formatRupiah(item.harga)}</span>
                          <span className="font-black text-sm text-rose-600">{formatRupiah(hargaSetelahDiskon)}</span>
                        </div>
                      ) : (
                        <span className="font-black text-sm text-teal-700">{formatRupiah(item.harga)}</span>
                      )}
                      {inCart && inCartItem && (
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 border-round-md">
                          x{inCartItem.qty}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KANAN: Pasien & Rincian Kasir (50%) */}
      <div style={{ flex: '1 1 50%', minWidth: 0 }} className="flex flex-column h-full surface-card border-round-xl border-1 surface-border shadow-1 overflow-hidden">
        {/* Pasien selector header */}
        <div className="p-3 border-bottom-1 surface-border bg-white flex-shrink-0">
          <div className="flex align-items-center justify-content-between mb-2">
            <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
              <i className="pi pi-user text-teal-600 text-sm" />
              RINCIAN TRANSAKSI KASIR
            </label>
            {trxStatus && (
              <div className="flex align-items-center gap-2">
                <Tag
                  value={trxStatus.toUpperCase()}
                  severity={trxStatus === 'lunas' ? 'success' : trxStatus === 'batal' ? 'danger' : 'info'}
                  className="text-[10px] font-extrabold px-2 py-0.5"
                />
                {editingKodeTrx && <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 border-round-md">{editingKodeTrx}</span>}
              </div>
            )}
          </div>

          {/* Pasien Selector / Display */}
          {selectedKunjungan ? (
            <div className="bg-slate-50 border-round-xl p-3 border-1 surface-border flex align-items-center justify-content-between">
              <div>
                <div className="font-extrabold text-xs text-slate-900">{selectedKunjungan?.nama_pasien || '-'}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">No. RM: {selectedKunjungan?.no_rm}</div>
              </div>
              {selectedKunjungan?.kode_kunjungan && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 border-round-md">
                  {selectedKunjungan.kode_kunjungan}
                </span>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border-round-xl p-2.5 border-1 border-dashed surface-border text-center text-slate-500 text-xs">
              Silakan pilih transaksi dari daftar di sebelah kiri
            </div>
          )}
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-3 surface-ground flex flex-column gap-2">
          {cart.length === 0 ? (
            <div className="flex flex-column align-items-center justify-content-center h-full text-center py-5">
              <i className="pi pi-shopping-cart text-4xl text-300 mb-2" />
              <span className="text-xs text-400 font-medium">Pilih item dari katalog di sebelah kiri</span>
            </div>
          ) : (
            cart.map((item, idx) => {
              const disc = itemDiscounts[item.kode];
              const diskonSubtotal = disc ? disc.diskon : (item.diskon || 0);
              const subtotalSetelahDiskon = disc
                ? disc.subtotal_setelah_diskon
                : (item.subtotal_setelah_diskon !== undefined
                  ? item.subtotal_setelah_diskon
                  : Math.max(0, item.subtotal - diskonSubtotal));

              return (
                <div
                  key={`${item.jenis}_${item.kode}_${idx}`}
                  className="surface-card border-round-xl border-1 surface-border shadow-1 hover:shadow-2 transition-all flex align-items-center justify-content-between"
                  style={{
                    padding: '16px',
                    gap: '16px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Kolom 1: Nama & Harga Satuan (Mengambil seluruh sisa ruang di kiri) */}
                  <div className="flex-1 min-w-0 flex flex-column justify-content-center" style={{ gap: '4px' }}>
                    <span
                      className="font-bold text-xs text-slate-900 line-height-2"
                      title={item.nama}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.nama}
                    </span>
                    <div className="text-xs text-slate-500 font-medium">
                      {formatRupiah(item.harga_satuan)} / {item.satuan || 'pcs'}
                    </div>
                  </div>

                  {/* Grup Kanan: Stepper + Harga + Hapus (Rapat di kanan) */}
                  <div className="flex align-items-center flex-shrink-0" style={{ gap: '8px' }}>
                    {/* Stepper Qty */}
                    <div className="flex align-items-center justify-content-center flex-shrink-0" style={{ width: '80px' }}>
                      {!isReadOnly && item.jenis !== 'layanan' ? (
                        <div className="flex align-items-center justify-content-between w-full bg-slate-100 p-1 border-round-lg border-1 surface-border">
                          <button
                            onClick={() => updateQty(idx, item.qty - 1)}
                            className="border-none bg-white hover:bg-slate-200 border-round-md font-bold cursor-pointer text-slate-700 shadow-1 flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
                          >−</button>
                          <span className="font-extrabold text-xs px-1 text-slate-900 text-center flex-1" style={{ minWidth: '16px' }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(idx, item.qty + 1)}
                            className="border-none bg-teal-600 hover:bg-teal-700 text-white border-round-md font-bold cursor-pointer shadow-1 flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
                          >+</button>
                        </div>
                      ) : (
                        <span className="font-extrabold text-xs text-slate-700">x{item.qty}</span>
                      )}
                    </div>

                    {/* Blok Harga & Tombol Hapus */}
                    <div className="flex align-items-center justify-content-end flex-shrink-0" style={{ gap: '10px' }}>
                      {/* Blok Harga (Rata Kanan) */}
                      <div className="text-right flex flex-column align-items-end justify-content-center" style={{ minWidth: '68px', whiteSpace: 'nowrap' }}>
                        {diskonSubtotal > 0 ? (
                          <div className="flex flex-column align-items-end" style={{ gap: '2px', lineHeight: 1.2 }}>
                            <span className="text-slate-400 line-through font-medium" style={{ fontSize: '11px' }}>
                              {formatRupiah(item.subtotal)}
                            </span>
                            <span className="font-semibold text-xs text-teal-700">
                              {formatRupiah(subtotalSetelahDiskon)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-xs text-teal-700" style={{ lineHeight: 1.2 }}>
                            {formatRupiah(item.subtotal)}
                          </span>
                        )}
                      </div>

                      {/* Tombol Hapus / Spacer agar sejajar vertikal antar kartu */}
                      {!isReadOnly && item.jenis !== 'layanan' ? (
                        <button
                          onClick={() => removeItem(idx)}
                          className="border-none bg-transparent cursor-pointer text-slate-400 hover:text-red-600 p-0 flex align-items-center justify-content-center flex-shrink-0 transition-colors"
                          style={{ width: '24px', height: '24px' }}
                          title="Hapus Item"
                        >
                          <i className="pi pi-trash text-xs" />
                        </button>
                      ) : !isReadOnly ? (
                        <div style={{ width: '24px', height: '24px' }} className="flex-shrink-0" />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Actions */}
        <div className="p-3 border-top-1 surface-border bg-white flex-shrink-0 flex flex-column gap-2.5">
          {/* Baris Ringkas Voucher / Promo Diskon Ala Shopee */}
          <div>
            <div
              onClick={() => !isReadOnly && setShowVoucherModal(true)}
              className={`surface-card border-round-xl border-1 flex align-items-center justify-content-between transition-all ${
                isReadOnly
                  ? 'surface-border cursor-default'
                  : 'surface-border hover:border-teal-500 hover:shadow-2 cursor-pointer'
              }`}
              style={{
                minHeight: '48px',
                padding: '12px 16px',
                gap: '10px',
                boxSizing: 'border-box',
              }}
            >
              {/* Kiri: Icon + Label */}
              <div className="flex align-items-center flex-1 min-w-0" style={{ gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="pi pi-ticket text-white text-xs" />
                </div>
                <span
                  className="font-extrabold text-xs text-slate-800 truncate"
                  title="Voucher / Promo Diskon"
                >
                  Voucher / Promo Diskon
                </span>
              </div>

              {/* Kanan: Ringkasan Status (Tanpa teks nominal) */}
              <div className="flex align-items-center flex-shrink-0" style={{ gap: '8px' }}>
                {selectedPromos.length > 0 ? (
                  <span
                    className="font-extrabold bg-teal-100 text-teal-800 border-round-md"
                    style={{ fontSize: '10px', padding: '2px 8px', whiteSpace: 'nowrap' }}
                  >
                    {selectedPromos.length} promo dipakai
                  </span>
                ) : eligiblePromoCount > 0 && !isReadOnly ? (
                  <span
                    className="font-extrabold bg-amber-100 text-amber-800 border-round-md"
                    style={{ fontSize: '10px', padding: '2px 8px', whiteSpace: 'nowrap' }}
                  >
                    {eligiblePromoCount} promo tersedia
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium text-xs" style={{ whiteSpace: 'nowrap' }}>
                    {isReadOnly ? 'Tanpa Promo' : 'Pilih atau masukkan kode'}
                  </span>
                )}
                {!isReadOnly && <i className="pi pi-chevron-right text-slate-400 text-xs" />}
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div
            className="surface-card border-round-xl border-1 surface-border shadow-1 flex flex-column"
            style={{ padding: '16px', gap: '8px', boxSizing: 'border-box' }}
          >
            {/* 1. Subtotal Layanan & Produk */}
            <div className="flex justify-content-between align-items-center text-xs text-slate-600 font-normal">
              <span>Subtotal Layanan & Produk</span>
              <span>{formatRupiah(totalHarga)}</span>
            </div>

            {/* 2. Voucher Diskon (warna hijau, hanya tampil jika ada diskon) */}
            {totalDiskon > 0 && (
              <div className="flex justify-content-between align-items-center text-xs text-emerald-600 font-normal">
                <span>Voucher Diskon</span>
                <span>-{formatRupiah(totalDiskon)}</span>
              </div>
            )}

            {dpNominal > 0 && (
              <div className="flex justify-content-between align-items-center text-xs bg-teal-50/70 p-2 border-round-md border-1 border-teal-200">
                <span className="text-teal-900 font-medium flex align-items-center gap-1.5">
                  <i className="pi pi-check-circle text-xs text-teal-600" />
                  Uang Muka (DP {metodeDp ? metodeDp.toUpperCase() : 'Terbayar'})
                </span>
                <span className="font-semibold text-teal-800">-{formatRupiah(dpNominal)}</span>
              </div>
            )}

            {/* 3. TOTAL BAYAR (paling menonjol) */}
            <div className="flex justify-content-between align-items-center pt-2 border-top-1 surface-border">
              <div>
                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide block">
                  {dpNominal > 0 ? 'Sisa Pelunasan' : 'TOTAL BAYAR'}
                </span>
                {dpNominal > 0 && (
                  <span className="text-[10px] text-slate-400">Total Tindakan: {formatRupiah(totalBayar)}</span>
                )}
              </div>
              <span className="font-black text-base text-teal-700">
                {formatRupiah(dpNominal > 0 ? sisaBayar : totalBayar)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex gap-2">
              <Button
                label="Draft"
                icon="pi pi-save"
                outlined
                severity="secondary"
                onClick={handleSaveDraft}
                loading={savingDraft}
                disabled={cart.length === 0 || !selectedKunjungan}
                className="font-bold text-xs border-round-lg flex-1 py-2"
              />
              <Button
                label={dpNominal > 0 ? 'Pelunasan' : 'Bayar'}
                icon="pi pi-credit-card"
                severity="success"
                onClick={handleBayar}
                loading={savingDraft}
                disabled={cart.length === 0 || !selectedKunjungan}
                className="font-bold text-xs bg-teal-600 border-none border-round-lg text-white shadow-2 flex-1 py-2"
              />
            </div>
          )}

          {isReadOnly && trxStatus === 'lunas' && (
            <div className="flex gap-2">
              <Button
                label="Cetak Struk"
                icon="pi pi-print"
                severity="success"
                onClick={() => {
                  if (onOpenStruk) {
                    onOpenStruk({
                      kode_transaksi: editingKodeTrx || '',
                      metode_bayar: 'tunai',
                      total_harga: totalHarga,
                      total_diskon: totalDiskon,
                      total_bayar: totalBayar,
                      dp_nominal: dpNominal,
                      metode_pembayaran_dp: metodeDp,
                      sisa_bayar: sisaBayar,
                      nominal_bayar: totalBayar,
                      kembalian: 0,
                      nama_pasien: selectedKunjungan?.nama_pasien,
                      no_rm: selectedKunjungan?.no_rm,
                      items: cart.map((c) => {
                        const disc = itemDiscounts[c.kode];
                        return {
                          ...c,
                          diskon: disc ? disc.diskon : (c.diskon || 0),
                          subtotal_setelah_diskon: disc ? disc.subtotal_setelah_diskon : (c.subtotal_setelah_diskon || c.subtotal),
                          nama_promo: disc?.promo?.nama_promo || c.nama_promo || null,
                          jenis_diskon: disc?.promo?.jenis_diskon || c.jenis_diskon || null,
                          nilai_diskon: disc?.promo?.nilai_diskon != null ? disc.promo.nilai_diskon : (c.nilai_diskon || null),
                        };
                      }),
                      kode_promo: [...new Set(selectedPromos.map((p) => p.kode_promo))].join(','),
                      nama_promo: [...new Set(selectedPromos.map((p) => p.nama_promo))].join(', '),
                    });
                  }
                }}
                className="font-bold text-xs bg-teal-600 hover:bg-teal-700 border-none border-round-lg text-white shadow-2 flex-1 py-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL VOUCHER / PROMO DISKON ALA SHOPEE */}
      <KasirVoucherModal
        visible={showVoucherModal}
        onHide={() => setShowVoucherModal(false)}
        promoList={promoList}
        cart={cart}
        selectedPromos={selectedPromos}
        onApply={(newPromos) => {
          setSelectedPromos(newPromos);
          showSuccess(toast, `${newPromos.length} promo berhasil diterapkan`);
        }}
        onNotifyConflict={(msg) => {
          showWarning(toast, msg);
        }}
      />
    </div>
  );
};
