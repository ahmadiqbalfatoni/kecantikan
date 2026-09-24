'use client';

import React from 'react';

interface StatStripProps {
  totalPasien: number;
  kunjunganHariIni: number;
  totalLayanan: number;
  totalSku: number;
  totalAset: number;
  stokMenipis: number;
  dokterCount: number;
  beauticianCount: number;
}

export const StatStrip: React.FC<StatStripProps> = ({
  totalPasien,
  kunjunganHariIni,
  totalLayanan,
  totalSku,
  totalAset,
  stokMenipis,
  dokterCount,
  beauticianCount,
}) => {
  const totalStaf = (dokterCount || 0) + (beauticianCount || 0);

  const formatAssetCompact = (val: number) => {
    if (!val || val === 0) return 'Rp 0';
    if (val >= 1000000) {
      const jt = val / 1000000;
      return `Rp ${jt % 1 === 0 ? jt : jt.toFixed(1)}jt`;
    }
    if (val >= 1000) {
      const rb = Math.round(val / 1000);
      return `Rp ${rb}rb`;
    }
    return `Rp ${val}`;
  };

  return (
    <div className="clinic-stat-strip-grid">
      {/* 1. PASIEN & KUNJUNGAN */}
      <div className="clinic-stat-col">
        <div>
          <span
            className="text-xs font-medium block mb-2"
            style={{ color: '#6F7A74', height: '16px', lineHeight: '16px' }}
          >
            Pasien & kunjungan
          </span>
          <div className="flex align-items-baseline gap-2 my-1" style={{ minHeight: '40px' }}>
            <span
              className="text-3xl lg:text-4xl font-bold tabular-nums"
              style={{ color: '#202A26', lineHeight: 1.1 }}
            >
              {totalPasien || 0}
            </span>
            <span className="text-xs font-normal" style={{ color: '#6F7A74', alignSelf: 'baseline' }}>
              pasien terdaftar
            </span>
          </div>
        </div>

        <div
          className="text-xs font-medium"
          style={{
            color: 'var(--primary-700, #047857)',
            marginTop: '16px',
            paddingTop: '12px',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {kunjunganHariIni > 0 ? `${kunjunganHariIni} kunjungan hari ini` : '0 kunjungan hari ini'}
        </div>
      </div>

      {/* 2. VARIAN LAYANAN */}
      <div className="clinic-stat-col">
        <div>
          <span
            className="text-xs font-medium block mb-2"
            style={{ color: '#6F7A74', height: '16px', lineHeight: '16px' }}
          >
            Varian layanan
          </span>
          <div className="flex align-items-baseline gap-2 my-1" style={{ minHeight: '40px' }}>
            <span
              className="text-3xl lg:text-4xl font-bold tabular-nums"
              style={{ color: '#202A26', lineHeight: 1.1 }}
            >
              {totalLayanan || 0}
            </span>
            <span className="text-xs font-normal" style={{ color: '#6F7A74', alignSelf: 'baseline' }}>
              katalog layanan
            </span>
          </div>
        </div>

        <div
          className="text-xs font-medium"
          style={{
            color: 'var(--primary-700, #047857)',
            marginTop: '16px',
            paddingTop: '12px',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Siap dipesan
        </div>
      </div>

      {/* 3. LOGISTIK ASET */}
      <div className="clinic-stat-col">
        <div>
          <span
            className="text-xs font-medium block mb-2"
            style={{ color: '#6F7A74', height: '16px', lineHeight: '16px' }}
          >
            Logistik aset
          </span>
          <div className="flex align-items-baseline gap-2 my-1" style={{ minHeight: '40px' }}>
            <span
              className="text-3xl lg:text-4xl font-bold tabular-nums"
              style={{ color: '#202A26', lineHeight: 1.1 }}
            >
              {totalSku || 0}
            </span>
            <span className="text-xs font-normal" style={{ color: '#6F7A74', alignSelf: 'baseline', whiteSpace: 'nowrap' }}>
              SKU · {formatAssetCompact(totalAset)}
            </span>
          </div>
        </div>

        <div
          className="text-xs font-medium"
          style={{
            color: stokMenipis > 0 ? '#B3873F' : 'var(--primary-700, #047857)',
            marginTop: '16px',
            paddingTop: '12px',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {stokMenipis > 0 ? `${stokMenipis} stok menipis` : 'Stok terkendali'}
        </div>
      </div>

      {/* 4. TENAGA MEDIS */}
      <div className="clinic-stat-col">
        <div>
          <span
            className="text-xs font-medium block mb-2"
            style={{ color: '#6F7A74', height: '16px', lineHeight: '16px' }}
          >
            Tenaga medis
          </span>
          <div className="flex align-items-baseline gap-2 my-1" style={{ minHeight: '40px' }}>
            <span
              className="text-3xl lg:text-4xl font-bold tabular-nums"
              style={{ color: '#202A26', lineHeight: 1.1 }}
            >
              {totalStaf || 0}
            </span>
            <span className="text-xs font-normal" style={{ color: '#6F7A74', alignSelf: 'baseline' }}>
              staf aktif
            </span>
          </div>
        </div>

        <div
          className="text-xs font-medium"
          style={{
            color: '#6F7A74',
            marginTop: '16px',
            paddingTop: '12px',
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {dokterCount || 0} dokter · {beauticianCount || 0} terapis
        </div>
      </div>
    </div>
  );
};

export default StatStrip;
