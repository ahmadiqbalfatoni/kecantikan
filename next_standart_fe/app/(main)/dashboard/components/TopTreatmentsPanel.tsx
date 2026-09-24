'use client';

import React from 'react';

interface TreatmentItem {
  nama_layanan?: string;
  name?: string;
  total_sesi?: number;
  sessions?: number;
}

interface TopTreatmentsPanelProps {
  treatments: TreatmentItem[];
}

export const TopTreatmentsPanel: React.FC<TopTreatmentsPanelProps> = ({ treatments }) => {
  const rawList =
    treatments && treatments.length > 0
      ? treatments.slice(0, 5)
      : [
          { nama_layanan: 'Facial Glow Up', total_sesi: 26 },
          { nama_layanan: 'Laser Brightening (Klaim Sesi Paket)', total_sesi: 19 },
          { nama_layanan: 'Paket Brightening Laser Rejuvenation (3x)', total_sesi: 17 },
          { nama_layanan: 'Keramas', total_sesi: 13 },
          { nama_layanan: 'Konsultasi', total_sesi: 9 },
        ];

  const maxSessions = Math.max(
    ...rawList.map((t) => Number(t.total_sesi || t.sessions || 1)),
    1
  );

  return (
    <div
      className="clinic-panel h-full flex flex-column justify-content-between bg-white"
      style={{ padding: '24px' }}
    >
      <div>
        {/* HEADER CARD */}
        <div className="clinic-card-header">
          <h3 className="clinic-card-title">Treatment paling diminati</h3>
          <span className="clinic-pill clinic-pill-emerald">Top 5</span>
        </div>

        {/* 01-05 RANKED LIST */}
        <div className="flex flex-column gap-3 my-auto py-1">
          {rawList.map((item, idx) => {
            const rankStr = String(idx + 1).padStart(2, '0');
            const isFirst = idx === 0;
            const sessions = Number(item.total_sesi || item.sessions || 0);
            const title = item.nama_layanan || item.name || 'Treatment';
            const widthPct = Math.max(Math.round((sessions / maxSessions) * 100), 8);

            return (
              <div
                key={idx}
                className="flex align-items-center gap-3"
                style={{ minHeight: '28px' }}
              >
                {/* 1. NOMOR URUT (01 Gold, lainnya muted) */}
                <div style={{ width: '22px', flexShrink: 0 }}>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: isFirst ? '#B3873F' : '#6F7A74' }}
                  >
                    {rankStr}
                  </span>
                </div>

                {/* 2. NAMA LAYANAN */}
                <div style={{ width: '210px', flexShrink: 0 }}>
                  <span
                    className="text-xs font-medium block truncate"
                    style={{ color: '#202A26' }}
                    title={title}
                  >
                    {title}
                  </span>
                </div>

                {/* 3. BAR PROPORSIONAL */}
                <div className="flex-1" style={{ minWidth: '80px' }}>
                  <div
                    className="w-full border-round overflow-hidden"
                    style={{ height: '6px', backgroundColor: '#F3F4F6' }}
                  >
                    <div
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: isFirst ? 'var(--primary-color, #10b981)' : 'var(--primary-200, #98e1c9)',
                        height: '100%',
                        borderRadius: '3px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* 4. JUMLAH SESI */}
                <div style={{ width: '60px', flexShrink: 0, textAlign: 'right', paddingRight: '4px' }}>
                  <span className="text-xs tabular-nums font-normal" style={{ color: '#6F7A74' }}>
                    {sessions} sesi
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div
        className="text-[11px]"
        style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '16px',
          marginTop: '20px',
          color: '#6F7A74',
        }}
      >
        Dihitung berdasarkan akumulasi sesi tindakan medis & estetika yang selesai.
      </div>
    </div>
  );
};

export default TopTreatmentsPanel;
