'use client';

import React, { useState } from 'react';
import { formatRupiah } from './RevenueHero';

interface PaymentItem {
  metode_bayar: string;
  nominal?: number;
  amount?: number;
  pct?: number;
}

interface PaymentDonutPanelProps {
  paymentData: PaymentItem[];
  totalOmzet: number;
}

export const PaymentDonutPanel: React.FC<PaymentDonutPanelProps> = ({
  paymentData,
  totalOmzet,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const rawList =
    paymentData && paymentData.length > 0
      ? paymentData
      : [
          { metode_bayar: 'QRIS', nominal: 6905000 },
          { metode_bayar: 'Debit', nominal: 1100000 },
          { metode_bayar: 'Tunai', nominal: 200000 },
        ];

  const calculatedTotal = rawList.reduce(
    (acc, cur) => acc + (parseFloat(String(cur.nominal || cur.amount || 0)) || 0),
    0
  );

  const finalTotal = calculatedTotal > 0 ? calculatedTotal : totalOmzet || 8205000;

  const getMethodStyle = (name: string, idx: number) => {
    const n = name.toUpperCase();
    if (n.includes('QRIS')) {
      return { color: '#10b981', label: 'QRIS' }; // Primary Emerald
    }
    if (n.includes('DEBIT') || n.includes('TRANSFER')) {
      return { color: '#B3873F', label: 'Debit' }; // Amber Gold
    }
    if (n.includes('TUNAI') || n.includes('CASH')) {
      return { color: '#34d399', label: 'Tunai' }; // Light Emerald Green
    }
    const fallbacks = ['#10b981', '#B3873F', '#34d399', '#059669'];
    return { color: fallbacks[idx % fallbacks.length], label: name };
  };

  const parsedItems = rawList.map((item, idx) => {
    const nominal = parseFloat(String(item.nominal || item.amount || 0));
    const realPct =
      item.pct !== undefined
        ? item.pct
        : finalTotal > 0
        ? Math.round((nominal / finalTotal) * 100)
        : 0;
    const style = getMethodStyle(item.metode_bayar || 'TUNAI', idx);
    return {
      ...item,
      nominal,
      realPct,
      color: style.color,
      displayName: style.label,
    };
  });

  // Minimum segment visibility calculation:
  // Ensure small percentages (like Tunai 2%) have at least 7% visual segment
  const MIN_VISIBLE_PCT = 7;
  let visualItems = parsedItems.map((item) => {
    if (item.realPct > 0 && item.realPct < MIN_VISIBLE_PCT) {
      return { ...item, visualPct: MIN_VISIBLE_PCT };
    }
    return { ...item, visualPct: item.realPct };
  });

  const totalVisual = visualItems.reduce((acc, cur) => acc + cur.visualPct, 0);
  if (totalVisual > 0 && totalVisual !== 100) {
    const dominantItem = visualItems.reduce((prev, current) =>
      prev.visualPct > current.visualPct ? prev : current
    );
    dominantItem.visualPct -= totalVisual - 100;
  }

  // SVG Donut geometry (diameter ~140px, ring stroke 18px)
  const radius = 50;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const currentHoveredItem =
    hoveredIndex !== null && visualItems[hoveredIndex] ? visualItems[hoveredIndex] : null;

  return (
    <div
      className="clinic-panel h-full flex flex-column justify-content-between bg-white"
      style={{ padding: '24px' }}
    >
      {/* 1. HEADER CARD */}
      <div className="clinic-card-header">
        <h3 className="clinic-card-title">Komposisi pembayaran</h3>
        <span className="clinic-pill clinic-pill-emerald">Real-time</span>
      </div>

      {/* 2. DONUT + LEGEND (SEJAJAR VERTIKAL DI TENGAH CARD) */}
      <div className="flex flex-column sm:flex-row align-items-center justify-content-between my-auto py-2 gap-3 sm:gap-4">
        {/* DONUT SVG DENGAN CENTER LABEL & INTERACTIVE HOVER */}
        <div
          className="relative flex-shrink-0 flex justify-content-center align-items-center"
          style={{ width: '144px', height: '144px' }}
        >
          <svg
            width="144"
            height="144"
            viewBox="0 0 144 144"
            className="transform -rotate-90 overflow-visible"
          >
            {/* Background ring */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              fill="transparent"
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
            />

            {/* Segment slices */}
            {visualItems.map((item, idx) => {
              const arcLength = (item.visualPct / 100) * circumference;
              const gapLength = 3; // Gap tipis antar segmen
              const visibleStroke = Math.max(arcLength - gapLength, 4);
              const strokeDasharray = `${visibleStroke} ${circumference - visibleStroke}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.visualPct;

              const isItemHovered = hoveredIndex === idx;

              return (
                <circle
                  key={idx}
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isItemHovered ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: hoveredIndex === null || isItemHovered ? 1 : 0.45,
                    transform: isItemHovered ? 'scale(1.04)' : 'scale(1)',
                    transformOrigin: '72px 72px',
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* LABEL DI TENGAH DONUT (CENTER LABEL) */}
          <div
            className="absolute flex flex-column align-items-center justify-content-center pointer-events-none text-center"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              zIndex: 2,
            }}
          >
            {currentHoveredItem ? (
              <>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    color: '#1e293b',
                    fontSize: '12px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatRupiah(currentHoveredItem.nominal)}
                </span>
                <span
                  className="font-semibold mt-0.5 truncate max-w-full px-1"
                  style={{
                    color: currentHoveredItem.color,
                    fontSize: '10.5px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentHoveredItem.displayName} ({currentHoveredItem.realPct}%)
                </span>
              </>
            ) : (
              <>
                <span
                  className="font-bold tabular-nums"
                  style={{
                    color: '#1e293b',
                    fontSize: '13px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatRupiah(finalTotal)}
                </span>
                <span
                  className="mt-0.5 font-medium"
                  style={{
                    color: '#6F7A74',
                    fontSize: '9.5px',
                    lineHeight: 1.2,
                  }}
                >
                  Total transaksi
                </span>
              </>
            )}
          </div>
        </div>

        {/* DAFTAR LEGEND DENGAN PROGRESS BAR & SINKRONISASI HOVER */}
        <div className="flex-1 min-w-0 w-full flex flex-column gap-2.5">
          {visualItems.map((item, idx) => {
            const isItemHovered = hoveredIndex === idx;

            return (
              <div
                key={idx}
                className="flex flex-column gap-1.5 p-2 rounded-lg cursor-pointer"
                style={{
                  backgroundColor: isItemHovered ? '#F8FAF9' : 'transparent',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                  transform: isItemHovered ? 'translateX(3px)' : 'none',
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  className="flex justify-content-between align-items-center gap-2"
                  style={{ minWidth: 0 }}
                >
                  <div className="flex align-items-center gap-2 min-w-0 flex-shrink-0">
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '3px',
                        backgroundColor: item.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="font-semibold text-xs truncate"
                      style={{ color: '#202A26', whiteSpace: 'nowrap' }}
                    >
                      {item.displayName}
                    </span>
                  </div>

                  <div
                    className="tabular-nums flex align-items-center gap-1.5 flex-shrink-0"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <strong
                      className="font-bold text-xs"
                      style={{ color: '#202A26', whiteSpace: 'nowrap' }}
                    >
                      {formatRupiah(item.nominal)}
                    </strong>
                    <span style={{ color: '#9CA3AF', fontSize: '11px' }}>·</span>
                    <span
                      className="font-bold text-xs"
                      style={{
                        color: item.color,
                        minWidth: '28px',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.realPct}%
                    </span>
                  </div>
                </div>

                {/* Progress bar proporsional tebal 6px (minimum 4% agar persentase kecil tetap tampak jelas) */}
                <div
                  className="w-full overflow-hidden"
                  style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px' }}
                >
                  <div
                    style={{
                      width: `${Math.max(item.realPct, 4)}%`,
                      backgroundColor: item.color,
                      height: '100%',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. FOOTER TOTAL */}
      <div
        className="text-xs flex justify-content-between align-items-center"
        style={{
          borderTop: '1px solid #E5E7EB',
          paddingTop: '16px',
          marginTop: '16px',
        }}
      >
        <span style={{ color: '#6F7A74' }}>Total transaksi tercatat</span>
        <span className="font-bold tabular-nums text-sm" style={{ color: '#1e293b', whiteSpace: 'nowrap' }}>
          {formatRupiah(finalTotal)}
        </span>
      </div>
    </div>
  );
};

export default PaymentDonutPanel;

