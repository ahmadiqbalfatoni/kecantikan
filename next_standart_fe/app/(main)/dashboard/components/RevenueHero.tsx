'use client';

import React from 'react';

interface RevenueHeroProps {
  totalOmzet: number;
  omzetHariIni: number;
}

export const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num || 0).replace(/\s/g, ' ');
};

export const RevenueHero: React.FC<RevenueHeroProps> = ({ totalOmzet, omzetHariIni }) => {
  const isTodayEmpty = Number(omzetHariIni || 0) === 0;

  return (
    <div
      className="flex flex-column justify-content-between h-full"
      style={{
        padding: '24px 28px',
        background: 'linear-gradient(150deg, #FFFFFF 0%, #F6FAF8 100%)',
      }}
    >
      <div>
        <span
          className="text-xs font-semibold tracking-wide block mb-2"
          style={{ color: 'var(--primary-700, #047857)', height: '16px', lineHeight: '16px' }}
        >
          Total pendapatan
        </span>

        <div
          className="text-3xl lg:text-4xl font-bold tracking-tight my-1 tabular-nums flex align-items-baseline"
          style={{ color: 'var(--primary-900, #064e3b)', lineHeight: 1.1, minHeight: '40px' }}
        >
          {formatRupiah(totalOmzet)}
        </div>

        <p className="text-xs m-0 mt-2 font-normal" style={{ color: '#6F7A74' }}>
          Akumulasi seluruh omzet klinik
        </p>
      </div>

      <div
        className="mt-4 pt-3 text-xs flex align-items-center gap-2"
        style={{
          borderTop: '1px dashed #E5E7EB',
          color: '#6F7A74',
          minHeight: '20px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isTodayEmpty ? '#9AA39D' : 'var(--primary-color, #10b981)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span>
          {isTodayEmpty
            ? 'Hari ini: belum ada transaksi baru (Rp 0)'
            : `Hari ini: ${formatRupiah(omzetHariIni)}`}
        </span>
      </div>
    </div>
  );
};

export default RevenueHero;
