'use client';

import React from 'react';

export type LaporanModuleId =
  | 'penjualan'
  | 'treatment'
  | 'produk'
  | 'paket'
  | 'membership'
  | 'pasien'
  | 'kunjungan'
  | 'appointment'
  | 'dokter'
  | 'beautician'
  | 'komisi'
  | 'inventory'
  | 'stok_opname'
  | 'pembelian'
  | 'expired'
  | 'deposit'
  | 'voucher'
  | 'crm'
  | 'keuangan'
  | 'rekam_medis';

export interface ModuleItem {
  id: LaporanModuleId;
  label: string;
  isWip?: boolean;
}

export const LAPORAN_COLUMNS: { title: string; items: ModuleItem[] }[] = [
  {
    title: 'Kolom 1',
    items: [
      { id: 'penjualan', label: 'Laporan Penjualan', isWip: false },
      { id: 'treatment', label: 'Laporan Treatment', isWip: false },
      { id: 'produk', label: 'Laporan Produk', isWip: false },
      { id: 'paket', label: 'Laporan Paket', isWip: false },
      { id: 'membership', label: 'Laporan Membership', isWip: false },
    ],
  },
  {
    title: 'Kolom 2',
    items: [
      { id: 'pasien', label: 'Laporan Pasien', isWip: false },
      { id: 'kunjungan', label: 'Laporan Kunjungan', isWip: false },
      { id: 'appointment', label: 'Laporan Appointment', isWip: false },
      { id: 'dokter', label: 'Laporan Dokter', isWip: false },
      { id: 'beautician', label: 'Laporan Beautician', isWip: false },
    ],
  },
  {
    title: 'Kolom 3',
    items: [
      { id: 'komisi', label: 'Laporan Komisi', isWip: false },
      { id: 'inventory', label: 'Laporan Inventory', isWip: false },
      { id: 'stok_opname', label: 'Laporan Stok Opname', isWip: false },
      { id: 'pembelian', label: 'Laporan Pembelian', isWip: false },
      { id: 'expired', label: 'Laporan Expired', isWip: false },
    ],
  },
  {
    title: 'Kolom 4',
    items: [
      { id: 'deposit', label: 'Laporan Deposit', isWip: false },
      { id: 'voucher', label: 'Laporan Voucher', isWip: false },
      { id: 'crm', label: 'Laporan CRM', isWip: false },
      { id: 'keuangan', label: 'Laporan Keuangan', isWip: false },
    ],
  },
];

interface LaporanNavCardProps {
  activeModule: LaporanModuleId;
  onSelectModule: (id: LaporanModuleId) => void;
}

export const LaporanNavCard: React.FC<LaporanNavCardProps> = ({
  activeModule,
  onSelectModule,
}) => {
  return (
    <div className="mb-4 surface-card border-round-2xl border-1 surface-border shadow-2 overflow-hidden">
      {/* CARD HEADER SESUAI GAMBAR DENGAN AKSEN BIRU/EMERALD */}
      <div
        className="p-3 md:p-4 border-bottom-1 surface-border flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #f8fafc 100%)',
        }}
      >
        <div className="flex align-items-center gap-3">
          <div
            className="flex align-items-center justify-content-center border-round-xl shadow-1"
            style={{
              width: '46px',
              height: '46px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
            }}
          >
            <i className="pi pi-chart-line text-2xl" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-blue-900 m-0 tracking-wide flex align-items-center gap-2">
              LAPORAN &amp; ANALYTICS
            </h2>
            <p className="text-xs md:text-sm text-gray-600 m-0 mt-0.5">
              Pusat monitoring performa bisnis, operasional klinik, penjualan, dan rekam medis pasien.
            </p>
          </div>
        </div>

        {/* QUICK BUTTON UNTUK REKAM MEDIS KLINIS */}
        <div className="flex align-items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectModule('rekam_medis')}
            className={`font-semibold px-3 py-2 border-round-lg flex align-items-center gap-2 cursor-pointer text-xs md:text-sm transition-all border-none ${
              activeModule === 'rekam_medis'
                ? 'bg-emerald-600 text-white shadow-2'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-1'
            }`}
          >
            <i className="pi pi-folder-open" />
            <span>Laporan Rekam Medis</span>
          </button>
        </div>
      </div>

      {/* 4 KOLOM MODUL SESUAI GAMBAR REFERENSI */}
      <div className="p-3 md:p-4 bg-white">
        <div className="grid">
          {LAPORAN_COLUMNS.map((col, colIdx) => (
            <div
              key={colIdx}
              className={`col-12 sm:col-6 lg:col-3 ${
                colIdx !== 0 ? 'border-none lg:border-left-1 surface-border' : ''
              }`}
            >
              <ul className="list-none p-0 m-0 flex flex-column gap-1.5">
                {col.items.map((item) => {
                  const isActive = activeModule === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelectModule(item.id)}
                        className={`w-full text-left flex align-items-center justify-content-between p-2 border-round-lg cursor-pointer border-none transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-800 font-bold shadow-1'
                            : 'bg-transparent text-gray-700 hover:bg-gray-50'
                        }`}
                        style={{
                          borderLeft: isActive ? '4px solid #0284c7' : '4px solid transparent',
                        }}
                      >
                        <span className="flex align-items-center gap-2 text-xs md:text-sm">
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isActive
                                ? '#0284c7'
                                : item.isWip
                                ? '#94a3b8'
                                : '#10b981',
                              display: 'inline-block',
                            }}
                          />
                          {item.label}
                        </span>

                        {item.isWip ? (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 border-round">
                            WIP
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border-round">
                            Aktif
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LaporanNavCard;
