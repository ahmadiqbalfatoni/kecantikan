'use client';

import React from 'react';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';

export interface ServiceItem {
  jenis: 'layanan' | 'paket' | 'klaim_paket';
  kode_layanan: string;
  kode_kategori: string;
  nama_kategori: string;
  nama: string;
  foto?: string | null;
  harga: number;
  harga_asal?: number;
  is_promo?: boolean;
  kode_promo?: string;
  nama_promo?: string;
  jenis_diskon?: 'persen' | 'nominal';
  nilai_diskon?: number;
  durasi_menit: number;
  masa_berlaku_hari?: number;
  total_sesi?: number;
  kode_ruangan?: string;
  nama_ruangan?: string;
  wajib_konsultasi?: 'tidak' | 'opsional' | 'wajib';
  kode_ruangan_konsultasi?: string;
  is_konsultasi?: number;
  tipe?: 'MEDICAL TREATMENT' | 'BEAUTY TREATMENT' | 'SERVICE TREATMENT' | string;
  tipe_paket?: string;
  kode_kepemilikan_paket_layanan?: string;
  kode_detail_kepemilikan_paket_layanan?: string;
  nama_paket_asal?: string;
  sisa_sesi?: number;
  sesi_terbooking?: number;
  sesi_tersedia?: number;
  tanggal_expired?: string;
  // Validasi ketersediaan petugas hari ini (Walk-In)
  is_petugas_available?: boolean;
  alasan_tidak_tersedia?: string | null;
  petugas_jaga_count?: number;
  petugas_pj_nama?: string | null;
  ruangan_cek?: string;
  nama_ruangan_cek?: string;
}

export interface RuanganGroup {
  kode_ruangan: string;
  nama_ruangan: string;
  deskripsi: string;
  items: ServiceItem[];
  is_konsultasi?: number;
  has_petugas_jaga_today?: boolean;
  petugas_jaga_count?: number;
  petugas_pj?: {
    nama?: string;
    jabatan?: string;
    no_sip?: string;
    jam_mulai?: string;
    jam_selesai?: string;
  } | null;
  petugas_jaga_names?: string[];
  antrean_aktif_count?: number;
  jam_booking_terdekat?: string | null;
  nama_pasien_booking_terdekat?: string | null;
  total_booking_hari_ini?: number;
  daftar_booking_hari_ini?: BookingItemDetail[];
}

export interface BookingItemDetail {
  kode_booking: string;
  jam_booking: string;
  jam_booking_full?: string;
  nama_pasien: string;
  no_rm?: string;
  nama_petugas?: string;
  jabatan_petugas?: string;
  jam_mulai?: string;
  jam_selesai?: string;
  nama_ruangan?: string;
  durasi_menit?: number;
  layanan_summary?: string;
  is_upcoming?: boolean;
  petugas_pendamping?: Array<{
    kode_jadwal?: string;
    no_sip?: string;
    nama_petugas: string;
    jabatan_petugas?: string;
  }>;
  daftar_petugas_pendamping?: Array<{
    kode_jadwal?: string;
    no_sip?: string;
    nama_petugas: string;
    jabatan_petugas?: string;
  }>;
  jumlah_pendamping?: number;
}

export const getItemConsultType = (item: ServiceItem) => {
  // 1. Prioritas Utama: Jika properti wajib_konsultasi terdefinisi secara eksplisit (dari master data/database)
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

  // 2. Fallback: Untuk paket (mst_paket_layanan) atau klaim paket yang tidak memiliki kolom wajib_konsultasi eksplisit
  const effectiveTipe = (
    item.jenis === 'klaim_paket' && item.tipe_paket
      ? item.tipe_paket
      : item.tipe || ''
  ).toString().trim().toUpperCase();

  const isWajib = effectiveTipe === 'MEDICAL TREATMENT';
  const isService = effectiveTipe === 'SERVICE TREATMENT';
  const isOpsional = !isWajib && !isService; // BEAUTY TREATMENT -> selalu opsional
  return { isWajib, isService, isOpsional };
};

export const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(val || 0);
};

export interface LayananCardProps {
  item: ServiceItem;
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle: (item: ServiceItem) => void;
  formatPrice?: (val: number) => string;
  gridClassName?: string;
  isClaimedElsewhere?: boolean;
}

export const LayananCard: React.FC<LayananCardProps> = ({
  item,
  isSelected,
  isDisabled = false,
  onToggle,
  formatPrice = formatRupiah,
  gridClassName,
  isClaimedElsewhere = false,
}) => {
  const isPaket = item.jenis === 'paket';
  const isKlaim = item.jenis === 'klaim_paket';
  const { isWajib, isService, isOpsional } = getItemConsultType(item);

  const isFullBooked = isKlaim && item.sesi_tersedia !== undefined && item.sesi_tersedia <= 0;
  const effectiveDisabled = isDisabled || isFullBooked || isClaimedElsewhere;

  const key = isKlaim
    ? `klaim_${item.kode_detail_kepemilikan_paket_layanan || item.kode_layanan}`
    : `${item.jenis}_${item.kode_layanan}`;

  return (
    <div key={key} className={gridClassName || "col-12 sm:col-6 md:col-4 lg:col-3 xl:col-3 p-2"}>
      <div
        className={`h-full border-round-xl border-1 overflow-hidden transition-all transition-duration-200 flex flex-column justify-content-between cursor-pointer bg-white ${
          isSelected
            ? isKlaim || isPaket
              ? 'border-2 border-amber-500 shadow-4 bg-amber-50/10'
              : 'border-2 border-blue-600 shadow-4 bg-blue-50/10'
            : isClaimedElsewhere
            ? 'surface-100 border-200 opacity-70 cursor-not-allowed bg-emerald-50/20'
            : effectiveDisabled
            ? 'surface-100 border-200 opacity-60 cursor-not-allowed'
            : 'surface-border hover:border-blue-400 hover:shadow-2'
        }`}
        style={{
          boxShadow: isSelected ? '0 4px 14px 0 rgba(37, 99, 235, 0.15)' : undefined,
        }}
        onClick={() => {
          if (!effectiveDisabled) onToggle(item);
        }}
      >
        {/* Top Image / Placeholder Banner */}
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
                // If broken image URL, hide img and fallback
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

          {/* Floating Promo Badge */}
          {item.is_promo && !isClaimedElsewhere && (
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

          {/* Floating Already Claimed Badge */}
          {!isSelected && isClaimedElsewhere && (
            <div className="absolute top-0 left-0 m-2 z-2">
              <span className="px-2.5 py-1 bg-emerald-700 text-white font-bold text-[10px] border-round shadow-2 flex align-items-center gap-1">
                <i className="pi pi-gift text-[10px]" /> Sudah Diklaim
              </span>
            </div>
          )}

          {/* Floating Checkbox on Top Right */}
          <div
            className="absolute top-0 right-0 m-2 z-2 bg-white border-round-lg shadow-2 px-2 py-1 flex align-items-center justify-content-center"
            onClick={(e) => {
              e.stopPropagation();
              if (!effectiveDisabled) onToggle(item);
            }}
          >
            <Checkbox
              checked={isSelected || isClaimedElsewhere}
              disabled={effectiveDisabled}
              onChange={() => {
                if (!effectiveDisabled) onToggle(item);
              }}
            />
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3 flex-1 flex flex-column justify-content-between">
          <div>
            {/* Tags Row - Membungkus dengan rapi jika sempit tanpa terpotong */}
            <div
              className="flex align-items-center mb-2"
              style={{
                flexWrap: 'wrap',
                gap: '6px',
                minHeight: '26px',
              }}
            >
              {isKlaim ? (
                <Tag
                  rounded
                  value={`🎁 Klaim${item.sisa_sesi !== undefined ? ` (${item.sisa_sesi} Sesi)` : ''}`}
                  severity="warning"
                  style={{ fontSize: '10px', padding: '3px 10px', fontWeight: 700, lineHeight: 1.2, borderRadius: '9999px' }}
                />
              ) : isPaket ? (
                <Tag
                  rounded
                  value={`Paket${item.total_sesi ? ` (${item.total_sesi} Sesi)` : ''}`}
                  severity="warning"
                  style={{ fontSize: '10px', padding: '3px 10px', fontWeight: 700, lineHeight: 1.2, borderRadius: '9999px' }}
                />
              ) : (
                <span
                  className="inline-flex align-items-center font-bold text-white shadow-1"
                  style={{
                    fontSize: '10px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#0284c7',
                    lineHeight: 1.2,
                    letterSpacing: '0.01em',
                  }}
                >
                  {item.nama_kategori || 'Layanan'}
                </span>
              )}

              {isFullBooked && (
                <Tag rounded value="Penuh" severity="danger" style={{ fontSize: '10px', padding: '3px 10px', fontWeight: 700, lineHeight: 1.2, borderRadius: '9999px' }} />
              )}

              {isWajib && (
                <span
                  className="inline-flex align-items-center font-bold text-white shadow-1"
                  style={{
                    fontSize: '10px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#ef4444',
                    lineHeight: 1.2,
                    letterSpacing: '0.01em',
                  }}
                >
                  Wajib Konsul
                </span>
              )}
              {isService && (
                <span
                  className="inline-flex align-items-center font-bold text-white shadow-1"
                  style={{
                    fontSize: '10px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#10b981',
                    lineHeight: 1.2,
                    letterSpacing: '0.01em',
                  }}
                >
                  Tanpa Konsul
                </span>
              )}
              {isOpsional && (
                <span
                  className="inline-flex align-items-center font-bold text-white shadow-1"
                  style={{
                    fontSize: '10px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#0284c7',
                    lineHeight: 1.2,
                    letterSpacing: '0.01em',
                  }}
                >
                  Opsional Konsul
                </span>
              )}
            </div>

            {/* Title with uniform height */}
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

            {/* Info Paket Asal (jika klaim) */}
            {isKlaim && item.nama_paket_asal && (
              <div
                className="text-[11px] text-amber-900 font-medium overflow-hidden text-overflow-ellipsis white-space-nowrap mb-1"
                title={item.nama_paket_asal}
              >
                <span className="text-amber-600 font-semibold">Paket:</span> {item.nama_paket_asal}
              </div>
            )}

            {/* Notifikasi jika layanan ini sudah diklaim via paket */}
            {isClaimedElsewhere && (
              <div className="flex align-items-center gap-1 text-[11px] text-emerald-800 font-semibold mb-1 bg-emerald-50 p-1 border-round border-1 border-emerald-200">
                <i className="pi pi-check-circle text-xs text-emerald-600 flex-shrink-0" />
                <span className="line-height-1">Sudah dipilih via Klaim Paket (Rp 0)</span>
              </div>
            )}
          </div>

          {/* Footer: Duration & Price (Rapi, Sejajar, Tidak Berantakan) */}
          <div className="pt-2 mt-2 border-top-1 surface-border flex align-items-center justify-content-between gap-2">
            <div className="flex align-items-center gap-1 text-xs text-600 font-medium min-w-0">
              <i className="pi pi-clock text-xs text-500 flex-shrink-0" />
              <span className="white-space-nowrap">{item.durasi_menit} Menit</span>
              {isKlaim && item.sisa_sesi !== undefined && (
                <span className="font-bold text-amber-800 ml-1 white-space-nowrap">
                  · Sisa: {item.sisa_sesi}
                </span>
              )}
            </div>

            <div className="flex-shrink-0">
              <span className={`text-sm font-extrabold white-space-nowrap ${isKlaim ? 'text-amber-700' : isPaket ? 'text-amber-700' : 'text-blue-600'}`}>
                {isKlaim ? 'Rp 0 (Klaim)' : formatPrice(item.harga_asal ?? item.harga)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
