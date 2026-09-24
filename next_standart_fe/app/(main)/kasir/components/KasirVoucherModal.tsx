'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Tag, X, Ticket, AlertCircle, Zap } from 'lucide-react';
import {
  PromoOption,
  CartItem,
  checkPromoEligibility,
  calculateItemDiscount,
  resolvePromoConflict,
  formatRupiah,
} from '@/lib/tools/diskonKasir';

interface KasirVoucherModalProps {
  visible: boolean;
  onHide: () => void;
  promoList: PromoOption[];
  cart: CartItem[];
  selectedPromos: PromoOption[];
  onApply: (newSelectedPromos: PromoOption[]) => void;
  onNotifyConflict?: (message: string) => void;
}

interface ProcessedVoucher {
  promo: PromoOption;
  eligible: boolean;
  targetItem?: CartItem;
  savings: number;
  reason?: string;
}

export const KasirVoucherModal: React.FC<KasirVoucherModalProps> = ({
  visible,
  onHide,
  promoList,
  cart,
  selectedPromos,
  onApply,
  onNotifyConflict,
}) => {
  // State draft pemilihan di dalam modal (tidak langsung mengubah state kasir utama sebelum Terapkan)
  const [draftSelected, setDraftSelected] = useState<PromoOption[]>([]);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // Sync draft state saat modal dibuka (sekaligus auto-select voucher untuk produk & layanan yang eligible)
  useEffect(() => {
    if (visible) {
      const current = [...selectedPromos];
      const usedItemCodes = new Set(current.map((p) => p.kode_item));
      for (const item of cart) {
        if (!usedItemCodes.has(item.kode)) {
          const promo = promoList.find((p) => p.kode_item === item.kode);
          if (promo) {
            current.push(promo);
            usedItemCodes.add(item.kode);
          }
        }
      }
      setDraftSelected(current);
      setConflictNotice(null);
    }
  }, [visible, selectedPromos, cart, promoList]);

  // Satu daftar voucher yang menyambung: voucher eligible di atas, ineligible di bawahnya
  const voucherList = useMemo(() => {
    const eligibleItems: ProcessedVoucher[] = [];
    const ineligibleItems: ProcessedVoucher[] = [];

    for (const p of promoList) {
      const check = checkPromoEligibility(p, cart);
      if (check.eligible && check.targetItem) {
        const calc = calculateItemDiscount(check.targetItem, p);
        eligibleItems.push({
          promo: p,
          eligible: true,
          targetItem: check.targetItem,
          savings: calc.diskon,
        });
      } else {
        ineligibleItems.push({
          promo: p,
          eligible: false,
          savings: 0,
          reason: check.reason || 'Syarat promo tidak terpenuhi',
        });
      }
    }

    // Urutan: eligible di atas, belum memenuhi syarat di bawahnya dalam satu daftar
    return [...eligibleItems, ...ineligibleItems];
  }, [promoList, cart]);

  // Hitung total hemat sementara berdasarkan draftSelected
  const totalHematDraft = useMemo(() => {
    let sum = 0;
    for (const p of draftSelected) {
      const target = cart.find((c) => c.kode === p.kode_item);
      if (target) {
        const calc = calculateItemDiscount(target, p);
        sum += calc.diskon;
      }
    }
    return sum;
  }, [draftSelected, cart]);

  // Handler toggle promo di draft
  const handleTogglePromo = (promo: PromoOption) => {
    const isChecked = draftSelected.some((p) => p.kode_detail_promo === promo.kode_detail_promo);

    if (isChecked) {
      // Lepas promo
      setDraftSelected(draftSelected.filter((p) => p.kode_detail_promo !== promo.kode_detail_promo));
      setConflictNotice(null);
    } else {
      // Pasang promo dengan penanganan konflik (1 promo per item)
      const res = resolvePromoConflict(draftSelected, promo);
      setDraftSelected(res.nextPromos);
      if (res.replacedPromo) {
        const msg = res.message || `Promo "${res.replacedPromo.nama_promo}" digantikan oleh "${promo.nama_promo}"`;
        setConflictNotice(msg);
        if (onNotifyConflict) onNotifyConflict(msg);
      } else {
        setConflictNotice(null);
      }
    }
  };

  const handleConfirm = () => {
    onApply(draftSelected);
    onHide();
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      closable={false}
      modal
      style={{ width: '680px', maxWidth: '96vw' }}
      contentStyle={{
        maxHeight: '74vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '1.25rem 1.5rem',
        boxSizing: 'border-box',
      }}
      header={
        <div className="flex align-items-center justify-content-between w-full" style={{ boxSizing: 'border-box' }}>
          <div className="flex align-items-center" style={{ gap: '10px' }}>
            <div
              className="flex align-items-center justify-content-center flex-shrink-0 border-round-lg text-teal-700 bg-teal-50 border-1 border-teal-200"
              style={{ width: '40px', height: '40px', minWidth: '40px' }}
            >
              <Ticket size={20} />
            </div>
            <div className="flex flex-column gap-1">
              <span className="text-base font-bold text-slate-900 block" style={{ lineHeight: 1.2 }}>
                Pilih Voucher / Promo Diskon
              </span>
              <span className="text-xs text-slate-500 font-normal">
                Pilih voucher promo aktif untuk menghemat rincian tagihan kasir
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onHide}
            className="flex align-items-center justify-content-center border-none bg-transparent text-slate-400 hover:text-slate-700 hover:surface-200 cursor-pointer p-0 border-round-circle transition-all"
            style={{ width: '32px', height: '32px' }}
            title="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>
      }
      footer={
        <div className="flex align-items-center justify-content-between pt-2 border-top-1 surface-border w-full flex-wrap gap-2" style={{ boxSizing: 'border-box' }}>
          <div className="flex align-items-baseline gap-2 text-left">
            <span className="text-xs text-slate-500 font-medium">
              Total Hemat ({draftSelected.length} promo):
            </span>
            <span className="text-lg font-black text-teal-700">
              {totalHematDraft > 0 ? formatRupiah(totalHematDraft) : 'Rp 0'}
            </span>
          </div>
          <div className="flex align-items-center gap-2">
            <Button
              type="button"
              label="Batal"
              icon="pi pi-times"
              text
              size="small"
              severity="secondary"
              className="text-xs font-semibold px-3"
              onClick={onHide}
            />
            <Button
              type="button"
              label="Konfirmasi & Terapkan"
              icon="pi pi-check"
              size="small"
              className="bg-teal-600 hover:bg-teal-700 border-none font-bold text-xs px-4 py-2 text-white shadow-1"
              onClick={handleConfirm}
            />
          </div>
        </div>
      }
    >
      {/* ─── KONTEN BODY MODAL (SATU DAFTAR VOUCHER MENYAMBUNG) ─── */}
      <div className="flex flex-column gap-3 w-full" style={{ boxSizing: 'border-box', overflowX: 'hidden' }}>
        {/* Notifikasi Peringatan / Konflik */}
        {conflictNotice && (
          <div
            className="p-2.5 border-round-xl bg-amber-50 border-1 border-amber-300 text-amber-900 text-xs flex align-items-center justify-content-between gap-2 shadow-1 w-full"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="flex align-items-center gap-2 min-w-0">
              <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-xs leading-tight">{conflictNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setConflictNotice(null)}
              className="border-none bg-transparent text-amber-700 hover:text-amber-900 cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Info Jumlah Pilihan di Atas Daftar */}
        <div className="flex align-items-center justify-content-end w-full" style={{ boxSizing: 'border-box' }}>
          <span
            className="font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 border-round-md"
            style={{
              fontSize: '10px',
              padding: '2px 8px',
              lineHeight: '1.2',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {draftSelected.length} promo dipilih
          </span>
        </div>

        {/* SATU DAFTAR KARTU VOUCHER */}
        {voucherList.length === 0 ? (
          <div
            className="text-center py-5 px-3 surface-card border-1 border-dashed surface-border border-round-xl flex flex-column align-items-center justify-content-center gap-2 w-full"
            style={{ boxSizing: 'border-box' }}
          >
            <div
              className="flex align-items-center justify-content-center"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#94a3b8',
              }}
            >
              <Tag size={20} />
            </div>
            <span className="text-xs text-slate-700 font-bold">Belum ada promo aktif</span>
            <span className="text-xs text-slate-500 font-medium max-w-20rem">
              Saat ini belum ada promo diskon yang terdaftar di klinik
            </span>
          </div>
        ) : (
          <div className="flex flex-column w-full" style={{ gap: '12px', boxSizing: 'border-box' }}>
            {voucherList.map(({ promo, eligible, targetItem, savings, reason }) => {
              const isChecked = eligible && draftSelected.some((p) => p.kode_detail_promo === promo.kode_detail_promo);

              const conflictingPromo = eligible
                ? draftSelected.find(
                    (p) => p.kode_item === promo.kode_item && p.kode_detail_promo !== promo.kode_detail_promo
                  )
                : null;

              return (
                <div
                  key={promo.kode_detail_promo}
                  onClick={() => eligible && handleTogglePromo(promo)}
                  className={`voucher-card surface-card border-round-xl border-1 transition-all flex align-items-center w-full user-select-none ${
                    eligible
                      ? isChecked
                        ? 'border-2 border-teal-500 bg-teal-50/30 shadow-2 cursor-pointer'
                        : 'surface-border hover:border-teal-300 shadow-1 hover:shadow-2 cursor-pointer'
                      : 'surface-border opacity-60 bg-slate-50 shadow-none cursor-not-allowed'
                  }`}
                  style={{
                    boxSizing: 'border-box',
                    padding: '14px 16px',
                    gap: '14px',
                  }}
                >
                  {/* KOLOM 1: KOTAK DISKON KIRI */}
                  <div
                    className={`voucher-discount-box border-round-lg flex flex-column align-items-center justify-content-center flex-shrink-0 text-center transition-all ${
                      eligible
                        ? isChecked
                          ? 'bg-teal-600 text-white shadow-1'
                          : 'bg-teal-50 text-teal-800 border-1 border-teal-200'
                        : 'bg-slate-200 text-slate-500 border-1 border-slate-300'
                    }`}
                    style={{
                      width: '88px',
                      minWidth: '88px',
                      padding: '10px 6px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Tag size={16} className={eligible ? (isChecked ? 'text-white' : 'text-teal-600') : 'text-slate-400'} />
                    <span className="font-extrabold text-sm leading-tight mt-1">
                      {promo.jenis_diskon === 'persen' ? `${promo.nilai_diskon}%` : `Rp ${(promo.nilai_diskon / 1000).toFixed(0)}k`}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 ${
                        eligible ? (isChecked ? 'text-teal-100' : 'text-teal-700') : 'text-slate-500'
                      }`}
                    >
                      OFF
                    </span>
                  </div>

                  {/* KOLOM 2: KONTEN TENGAH */}
                  <div className="flex-1 min-w-0 flex flex-column" style={{ gap: '6px' }}>
                    {/* Baris 1: Judul Nama Promo + Kode Badge */}
                    <div className="flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <span className={`font-semibold text-xs leading-tight ${eligible ? 'text-slate-900' : 'text-slate-700'}`}>
                        {promo.nama_promo}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 border-round-md ${
                          eligible
                            ? 'text-teal-800 bg-teal-100 border-1 border-teal-200'
                            : 'text-slate-500 bg-slate-200 border-1 border-slate-300'
                        }`}
                      >
                        {promo.kode_promo}
                      </span>
                    </div>

                    {/* Baris 2: Berlaku untuk item */}
                    <div className="flex align-items-center text-xs text-slate-600" style={{ gap: '6px' }}>
                      <Tag size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        Berlaku untuk:{' '}
                        <strong className={`font-medium ${eligible ? 'text-teal-800' : 'text-slate-700'}`}>
                          {targetItem?.nama || promo.nama_item || 'Item Terkait'}
                        </strong>
                      </span>
                    </div>

                    {/* Baris 3: Pemisah Tipis */}
                    <div className="border-top-1 surface-border my-1" />

                    {/* Baris 4: Jika Eligible tampil Hemat Rp X; Jika Ineligible tampil Alasan */}
                    {eligible ? (
                      <div className="flex align-items-center justify-content-between flex-wrap gap-1">
                        <span className="text-xs font-bold text-emerald-600 flex align-items-center">
                          <Zap size={13} className="text-emerald-500 mr-1 flex-shrink-0" />
                          Hemat {formatRupiah(savings)}
                        </span>
                        {promo.tanggal_selesai && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            s/d {new Date(promo.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex align-items-start text-xs text-rose-600 font-medium" style={{ gap: '6px' }}>
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-rose-500" />
                        <span className="line-height-2" style={{ wordBreak: 'break-word' }}>
                          {reason}
                        </span>
                      </div>
                    )}

                    {/* Baris 5: Konflik jika menggantikan promo lain */}
                    {conflictingPromo && !isChecked && (
                      <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 border-1 border-amber-200 px-2 py-0.5 border-round-md mt-1">
                        ⚡ Menggantikan: {conflictingPromo.nama_promo}
                      </div>
                    )}
                  </div>

                  {/* KOLOM 3: CHECKBOX KANAN */}
                  <div
                    className="flex align-items-center justify-content-center flex-shrink-0"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={!eligible}
                      onChange={() => eligible && handleTogglePromo(promo)}
                      className="pointer-events-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 640px) {
          .voucher-discount-box {
            width: 72px !important;
            min-width: 72px !important;
            padding: 8px 4px !important;
          }
          .voucher-card {
            padding: 10px 12px !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </Dialog>
  );
};
