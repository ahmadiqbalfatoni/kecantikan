'use client';

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Calendar, Clock, Sparkles, MapPin, Info, Check, Users, ChevronDown } from 'lucide-react';
import { RuanganGroup, BookingItemDetail } from '../../components/shared/LayananCard';

interface Props {
  visible: boolean;
  onHide: () => void;
  ruangan: RuanganGroup | null;
  todayDateStr?: string;
  todayDayName?: string;
}

/**
 * Ekstraksi 2 huruf inisial nama petugas (misal: "Rani Kartika, S.Kep.Ns" -> "RK")
 */
const getInitials = (name?: string): string => {
  if (!name || name.trim() === '' || name === '-') return '--';
  // Bersihkan gelar umum medis / akademis dan koma
  const cleaned = name
    .replace(/\b(dr\.|drg\.|dr|drg|Sp\.[A-Za-z]+|S\.[A-Za-z\.]+|M\.[A-Za-z\.]+|,.*$)\b/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    const rawParts = name.split(/[\s,]+/).filter(Boolean);
    if (rawParts.length === 0) return '--';
    return (rawParts[0][0] + (rawParts[1] ? rawParts[1][0] : '')).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Format ringkasan nama pendamping (misal: 1 orang -> "Fajar Ramadhan", 2 orang -> "A, B")
 */
const getCompanionSummary = (
  companions: Array<{ nama_petugas: string }>,
  total: number
): string => {
  if (total === 1 && companions.length > 0) {
    return companions[0].nama_petugas;
  }
  if (total === 2 && companions.length >= 2) {
    return `${companions[0].nama_petugas}, ${companions[1].nama_petugas}`;
  }
  if (total > 2 && companions.length > 0) {
    return `${companions[0].nama_petugas} +${total - 1} lainnya`;
  }
  return '';
};

export const DialogSemuaBookingRuangan: React.FC<Props> = ({
  visible,
  onHide,
  ruangan,
  todayDateStr,
  todayDayName,
}) => {
  const companionOpRef = React.useRef<OverlayPanel>(null);
  const [activeCompanionData, setActiveCompanionData] = React.useState<{
    pj: string;
    jam: string;
    ruangan: string;
    companions: Array<{ nama_petugas: string; jabatan_petugas?: string }>;
  } | null>(null);

  const bookings: BookingItemDetail[] = React.useMemo(() => {
    if (!ruangan?.daftar_booking_hari_ini) return [];
    // Urutkan secara kronologis berdasarkan jam_booking
    return [...ruangan.daftar_booking_hari_ini].sort((a, b) =>
      (a.jam_booking || '').localeCompare(b.jam_booking || '')
    );
  }, [ruangan]);

  const totalBookings = bookings.length;
  const upcomingCount = bookings.filter((b) => b.is_upcoming).length;

  return (
    <>
      <Dialog
        visible={visible}
        onHide={onHide}
        style={{ width: '640px', maxWidth: '95vw' }}
        className="p-dialog-clean"
        header={
          <div className="flex align-items-center gap-3">
            {/* 1. Header Icon Badge (Kotak rounded ~36px, background biru muda tint accent) */}
            <div
              className="flex align-items-center justify-content-center flex-shrink-0 bg-blue-50 text-blue-600 border-1 border-blue-100"
              style={{ width: '36px', height: '36px', borderRadius: '10px' }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <div className="font-bold text-lg text-900 leading-tight">
                Daftar Jadwal Booking Terkonfirmasi Hari Ini
              </div>
              <div className="text-xs text-500 font-normal flex align-items-center gap-1 mt-1">
                <MapPin size={13} className="text-400 flex-shrink-0" />
                <span className="font-medium text-700">{ruangan?.nama_ruangan || 'Ruangan'}</span>
                {(todayDayName || todayDateStr) && (
                  <>
                    <span className="text-300">•</span>
                    <span>
                      {todayDayName ? `${todayDayName.toUpperCase()}, ` : ''}
                      {todayDateStr || ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        }
        footer={
          /* 4. Footer Modal (Garis pemisah tipis, ikon check di teks total, tombol tutup secondary outline) */
          <div
            className="flex justify-content-between align-items-center pt-3 mt-1"
            style={{ borderTop: '1px solid #f3f4f6' }}
          >
            <div className="text-xs text-600 flex align-items-center gap-1.5">
              <Check size={14} className="text-emerald-600 flex-shrink-0" />
              <span>
                Total <strong>{totalBookings} booking</strong> terdaftar di ruangan ini hari ini
                {upcomingCount > 0 ? ` (${upcomingCount} sesi belum lewat)` : ''}
              </span>
            </div>
            <Button
              label="Tutup"
              className="p-button-outlined p-button-secondary p-button-sm px-3.5 py-2 text-xs font-semibold"
              style={{
                backgroundColor: 'transparent',
                borderColor: '#d1d5db',
                color: '#374151',
                borderRadius: '10px',
              }}
              onClick={onHide}
            />
          </div>
        }
      >
        <div className="py-2">
          {/* 2. Banner Peringatan (Background abu-abu muda netral, ikon info) */}
          <div
            className="p-3 mb-3 border-1 flex align-items-start gap-2.5"
            style={{
              backgroundColor: '#f9fafb',
              borderColor: '#e5e7eb',
              borderRadius: '12px',
            }}
          >
            <Info size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700 line-height-2">
              Berikut seluruh pasien yang telah mengonfirmasi reservasi di <strong>{ruangan?.nama_ruangan}</strong> untuk hari ini. Pastikan estimasi tindakan walk-in yang didaftarkan tidak menyebabkan keterlambatan penanganan bagi pasien booking.
            </div>
          </div>

          {/* Empty State */}
          {bookings.length === 0 ? (
            <div
              className="p-5 text-center border-1"
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                borderRadius: '12px',
              }}
            >
              <i className="pi pi-calendar-times text-400 text-3xl mb-2" />
              <div className="text-sm font-bold text-700">Tidak Ada Booking Terkonfirmasi</div>
              <div className="text-xs text-500 mt-1">
                Belum ada pasien yang melakukan reservasi terkonfirmasi di ruangan ini untuk hari ini.
              </div>
            </div>
          ) : (
            <div className="flex flex-column gap-3 pr-1" style={{ maxHeight: '440px', overflowY: 'auto' }}>
              {bookings.map((b, idx) => {
                const isNearestUpcoming = b.is_upcoming && b.jam_booking === ruangan?.jam_booking_terdekat;
                const petugasInitials = getInitials(b.nama_petugas);
                const companions = b.petugas_pendamping || b.daftar_petugas_pendamping || [];
                const totalCompanions = b.jumlah_pendamping || companions.length;
                const hasCompanions = totalCompanions > 0;
                const companionSummary = getCompanionSummary(companions, totalCompanions);
                const fullCompanionNames = companions.map((c) => c.nama_petugas).join(', ');

                return (
                  /* 3. Card Booking (Background TETAP PUTIH, border highlight biru jika Sesi Terdekat) */
                  <div
                    key={b.kode_booking || idx}
                    className="flex align-items-stretch transition-all"
                    style={{
                      backgroundColor: '#ffffff',
                      border: isNearestUpcoming ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      gap: '14px',
                      boxShadow: isNearestUpcoming ? '0 1px 3px 0 rgba(59, 130, 246, 0.1)' : 'none',
                    }}
                  >
                    {/* 3a. Kotak Jam (TETAP PUTIH, Border biru accent, Teks biru accent, Stretch penuh) */}
                    <div
                      className="flex flex-column align-items-center justify-content-center flex-shrink-0 align-self-stretch"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #60a5fa',
                        borderRadius: '10px',
                        minWidth: '80px',
                        padding: '8px 10px',
                      }}
                    >
                      <span
                        className="text-base font-bold leading-none font-mono"
                        style={{ color: '#2563eb' }}
                      >
                        {b.jam_booking}
                      </span>
                      <span
                        className="text-[10px] font-semibold tracking-wider mt-1"
                        style={{ color: '#3b82f6' }}
                      >
                        WIB
                      </span>
                    </div>

                    {/* Konten Utama Card (Kanan) */}
                    <div className="flex-1 min-w-0 flex flex-column justify-content-between" style={{ gap: '8px' }}>
                      {/* Baris 1: Identitas Pasien (Kiri) & Badge Status (Kanan) */}
                      <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                        {/* Identitas: Nama Pasien + No. RM */}
                        <div className="flex align-items-center min-w-0 gap-2">
                          <span className="font-bold text-sm text-900 truncate">
                            {b.nama_pasien}
                          </span>
                          {b.no_rm && (
                            <span
                              className="text-[11px] font-mono font-semibold px-2 py-0.5 flex-shrink-0 border-1"
                              style={{
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                borderColor: '#bfdbfe',
                                borderRadius: '6px',
                              }}
                            >
                              {b.no_rm}
                            </span>
                          )}
                        </div>

                        {/* 3c. Badge Status ("Sesi Terdekat" warna AMBER/KUNING) */}
                        <div className="flex align-items-center flex-shrink-0">
                          {isNearestUpcoming ? (
                            <span
                              className="inline-flex align-items-center text-[11px] font-semibold px-2.5 py-0.5 border-1"
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                borderColor: '#fde68a',
                                borderRadius: '9999px',
                                gap: '5px',
                              }}
                            >
                              <Clock size={11} className="text-amber-600 flex-shrink-0" />
                              <span>Sesi terdekat</span>
                            </span>
                          ) : b.is_upcoming ? (
                            <span
                              className="inline-flex align-items-center text-[11px] font-medium px-2.5 py-0.5 border-1"
                              style={{
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                borderColor: '#dbeafe',
                                borderRadius: '9999px',
                                gap: '5px',
                              }}
                            >
                              <Clock size={11} className="text-blue-500 flex-shrink-0" />
                              <span>Akan datang</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex align-items-center text-[11px] font-normal px-2.5 py-0.5 border-1"
                              style={{
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                                borderColor: '#e5e7eb',
                                borderRadius: '9999px',
                              }}
                            >
                              Sesi lewat
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Baris 2: Layanan & Estimasi Durasi */}
                      <div className="flex align-items-center text-xs text-700 flex-wrap gap-2">
                        {/* Item Layanan */}
                        <div className="flex align-items-center font-medium text-800" style={{ gap: '6px' }}>
                          <Sparkles size={13} className="text-gray-500 flex-shrink-0" />
                          <span className="truncate">{b.layanan_summary || 'Layanan / Paket'}</span>
                        </div>

                        {/* Titik Pemisah */}
                        <span className="text-300 font-bold">•</span>

                        {/* Item Estimasi */}
                        <div className="flex align-items-center text-600" style={{ gap: '6px' }}>
                          <Clock size={13} className="text-gray-500 flex-shrink-0" />
                          <span>
                            Estimasi <strong className="text-800 font-semibold">{b.durasi_menit || 30} menit</strong>
                          </span>
                        </div>
                      </div>

                      {/* 3e. Baris 3: Info Petugas dengan AVATAR Lingkaran, Petugas Pendamping, & Kode Booking di POJOK KANAN BAWAH */}
                      <div
                        className="flex align-items-center justify-content-between gap-2 pt-2 mt-1 flex-wrap"
                        style={{ borderTop: '1px solid #f3f4f6' }}
                      >
                        {/* Petugas PJ + Pendamping */}
                        <div className="flex align-items-center gap-2 min-w-0 flex-wrap">
                          <div className="flex align-items-center gap-2 min-w-0">
                            <div
                              className="flex align-items-center justify-content-center flex-shrink-0 font-bold border-1"
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: '#d1fae5',
                                color: '#065f46',
                                borderColor: '#a7f3d0',
                                fontSize: '9.5px',
                                letterSpacing: '-0.5px',
                              }}
                            >
                              {petugasInitials}
                            </div>
                            <div className="text-xs text-gray-700 truncate">
                              <strong className="text-800 font-semibold">{b.nama_petugas || '-'}</strong>
                              {b.jabatan_petugas ? (
                                <span className="text-500 font-normal"> · {b.jabatan_petugas}</span>
                              ) : null}
                            </div>
                          </div>

                          {/* Indikator Petugas Pendamping (Hanya tampil jika ADA pendamping) */}
                          {hasCompanions && (
                            <div
                              className="inline-flex align-items-center gap-1 text-[11px] text-green-700 font-medium cursor-pointer hover:underline pl-0.5"
                              title={`Pendamping: ${fullCompanionNames}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const shiftStr = b.jam_mulai && b.jam_selesai
                                  ? `${b.jam_mulai} - ${b.jam_selesai} WIB`
                                  : `${b.jam_booking} WIB`;
                                setActiveCompanionData({
                                  pj: b.nama_petugas || 'Penanggung Jawab',
                                  jam: shiftStr,
                                  ruangan: ruangan?.nama_ruangan || b.nama_ruangan || 'Ruangan',
                                  companions: companions,
                                });
                                companionOpRef.current?.toggle(e);
                              }}
                            >
                              <span className="text-300 font-bold">•</span>
                              <span className="font-semibold text-green-700">
                                + {totalCompanions} petugas pendamping{companionSummary ? ` (${companionSummary})` : ''}
                              </span>
                              <ChevronDown size={12} className="text-green-600 opacity-90 flex-shrink-0" />
                            </div>
                          )}
                        </div>

                        {/* 3d. Kode Booking di POJOK KANAN BAWAH */}
                        {b.kode_booking && (
                          <span className="text-xs font-mono text-400 flex-shrink-0">
                            {b.kode_booking}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Dialog>

      {/* Popover / OverlayPanel Tim Petugas Sesi (Struktur Persis Step 3) */}
      <OverlayPanel ref={companionOpRef} className="shadow-4 border-round-xl">
        {activeCompanionData && (
          <div style={{ maxWidth: '320px' }}>
            <div className="font-bold text-xs text-900 mb-1 flex align-items-center gap-1.5">
              <Users size={14} className="text-primary" />
              <span>Tim Petugas Sesi ({activeCompanionData.ruangan})</span>
            </div>
            <div className="text-[11px] text-500 mb-2">Shift: {activeCompanionData.jam}</div>
            <div
              className="text-xs p-2 border-1 border-round-lg mb-2"
              style={{
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
              }}
            >
              <div className="font-semibold text-[11px]" style={{ color: '#065f46' }}>
                Penanggung Jawab (PJ):
              </div>
              <div className="font-bold" style={{ color: '#047857' }}>
                {activeCompanionData.pj}
              </div>
            </div>
            <div className="text-[11px] font-semibold text-700 mb-1">
              Petugas Pendamping ({activeCompanionData.companions.length}):
            </div>
            <ul className="m-0 pl-3 text-xs text-600" style={{ listStyleType: 'disc' }}>
              {activeCompanionData.companions.map((c, i) => (
                <li key={i} className="mb-1">
                  <span className="font-medium text-900">{c.nama_petugas}</span>
                  {c.jabatan_petugas && <span className="text-500 text-[11px]"> — {c.jabatan_petugas}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </OverlayPanel>
    </>
  );
};
