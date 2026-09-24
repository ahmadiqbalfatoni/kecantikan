'use client';

import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';

const METODE_LIST = [
  { value: 'tunai', label: 'Tunai', icon: 'pi-wallet', color: '#0d9488', bg: '#f0fdfa' },
  { value: 'debit', label: 'Debit', icon: 'pi-credit-card', color: '#0ea5e9', bg: '#f0f9ff' },
  { value: 'kredit', label: 'Kredit', icon: 'pi-credit-card', color: '#8b5cf6', bg: '#faf5ff' },
  { value: 'qris', label: 'QRIS', icon: 'pi-qrcode', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'transfer', label: 'Transfer', icon: 'pi-arrow-right-arrow-left', color: '#6366f1', bg: '#eef2ff' },
];

const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

interface KasirBayarModalProps {
  visible: boolean;
  totalBayar: number; // Ini adalah Sisa Pelunasan yang harus diterima kasir
  totalTagihanAsli?: number;
  dpNominal?: number;
  metodeDp?: string | null;
  onHide: () => void;
  onConfirm: (metode: string, nominal: number) => Promise<void>;
}

export const KasirBayarModal: React.FC<KasirBayarModalProps> = ({
  visible,
  totalBayar,
  totalTagihanAsli,
  dpNominal = 0,
  metodeDp,
  onHide,
  onConfirm,
}) => {
  const [selectedMetode, setSelectedMetode] = useState('tunai');
  const [nominal, setNominal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const hasDp = dpNominal > 0;
  const kembalian = selectedMetode === 'tunai' ? Math.max(0, (nominal || 0) - totalBayar) : 0;
  const nominalValid = selectedMetode !== 'tunai' || (nominal || 0) >= totalBayar;

  // Quick nominal buttons for tunai
  const quickAmounts = [totalBayar, Math.ceil(totalBayar / 50000) * 50000, Math.ceil(totalBayar / 100000) * 100000];
  const uniqueAmounts = [...new Set(quickAmounts)].filter((a) => a >= totalBayar);

  const handleConfirm = async () => {
    if (!nominalValid) return;
    setLoading(true);
    try {
      await onConfirm(selectedMetode, selectedMetode === 'tunai' ? (nominal || totalBayar) : totalBayar);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={null}
      style={{ width: '430px', borderRadius: '16px', overflow: 'hidden' }}
      contentStyle={{ padding: 0 }}
      closable={!loading}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '20px 24px 16px' }}>
        <div className="flex align-items-center gap-3 mb-3">
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#0d9488,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="pi pi-credit-card text-white" style={{ fontSize: '18px' }} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>Proses Pembayaran Kasir</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Pilih metode & konfirmasi pelunasan</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
          {hasDp && (
            <div className="flex justify-content-between align-items-center text-xs text-slate-400 mb-2 pb-2 border-bottom-1 border-white-alpha-10">
              <span>Total Tindakan: <strong className="text-white">{formatRupiah(totalTagihanAsli || (totalBayar + dpNominal))}</strong></span>
              <span className="text-teal-300 font-bold">DP {metodeDp ? `(${metodeDp.toUpperCase()})` : ''}: -{formatRupiah(dpNominal)}</span>
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {hasDp ? 'Sisa Pelunasan Wajib Dibayar' : 'Total Tagihan'}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#34d399' }}>{formatRupiah(totalBayar)}</div>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Pilih Metode */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Metode Pembayaran
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {METODE_LIST.map((m) => {
              const isActive = selectedMetode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => { setSelectedMetode(m.value); setNominal(0); }}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: isActive ? `2px solid ${m.color}` : '1.5px solid #e2e8f0',
                    background: isActive ? m.bg : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s',
                    boxShadow: isActive ? `0 0 0 3px ${m.color}20` : 'none',
                  }}
                >
                  <i className={`pi ${m.icon}`} style={{ fontSize: '18px', color: isActive ? m.color : '#94a3b8' }} />
                  <span style={{ fontSize: '11px', fontWeight: isActive ? 800 : 600, color: isActive ? m.color : '#64748b' }}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input nominal (tunai only) */}
        {selectedMetode === 'tunai' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Nominal Diterima
            </div>
            <InputNumber
              value={nominal}
              onValueChange={(e) => setNominal(e.value || 0)}
              mode="currency"
              currency="IDR"
              locale="id-ID"
              minFractionDigits={0}
              className="w-full"
              inputStyle={{ fontSize: '18px', fontWeight: 800, textAlign: 'right', padding: '10px 14px' }}
              min={0}
            />
            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {uniqueAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setNominal(amt)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: nominal === amt ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                    background: nominal === amt ? '#f0fdfa' : '#f8fafc',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: nominal === amt ? '#0d9488' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatRupiah(amt)}
                </button>
              ))}
            </div>

            {/* Kembalian */}
            {nominal > 0 && (
              <div style={{
                marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
                background: kembalian > 0 ? '#f0fdfa' : '#fff1f2',
                border: `1.5px solid ${kembalian >= 0 ? '#5eead4' : '#fca5a5'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                  {kembalian >= 0 ? '💵 Kembalian' : '⚠️ Kurang'}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: kembalian >= 0 ? '#0d9488' : '#e11d48' }}>
                  {formatRupiah(Math.abs(kembalian))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Confirm button */}
        <Button
          label={`Konfirmasi Bayar • ${formatRupiah(totalBayar)}`}
          icon="pi pi-check-circle"
          className="w-full"
          onClick={handleConfirm}
          loading={loading}
          disabled={!nominalValid}
          style={{
            background: nominalValid ? 'linear-gradient(135deg,#0d9488,#059669)' : '#cbd5e1',
            border: 'none',
            fontSize: '13px',
            fontWeight: 800,
            padding: '14px',
            borderRadius: '10px',
            boxShadow: nominalValid ? '0 4px 14px rgba(13,148,136,0.3)' : 'none',
          }}
        />
      </div>
    </Dialog>
  );
};
