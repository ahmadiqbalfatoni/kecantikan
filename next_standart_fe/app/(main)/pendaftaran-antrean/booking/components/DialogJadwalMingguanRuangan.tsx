'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import postData from '@/lib/axios/postData';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

interface JadwalDetail {
  kode_jadwal: string;
  no_sip: string;
  kode_ruangan: string;
  nama_ruangan: string;
  nama_karyawan: string;
  jabatan: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  kuota: number;
  status: string;
  is_penanggung_jawab?: number | boolean;
}

export interface RoomTabOption {
  kodeRuangan: string;
  namaRuangan: string;
  iconType?: 'doctor' | 'treatment';
}

interface Props {
  visible: boolean;
  onHide: () => void;
  // Multi-room support (tab ganda bila mode konsultasi aktif)
  rooms?: RoomTabOption[];
  // Fallback single room
  kodeRuangan?: string | null;
  namaRuangan?: string;
  tanggalTerpilih?: Date;
  onSelectTanggal?: (hariKey: string) => void;
}

const DAYS_OF_WEEK = [
  { key: 'senin', label: 'Senin', short: 'Sen' },
  { key: 'selasa', label: 'Selasa', short: 'Sel' },
  { key: 'rabu', label: 'Rabu', short: 'Rab' },
  { key: 'kamis', label: 'Kamis', short: 'Kam' },
  { key: 'jumat', label: 'Jumat', short: 'Jum' },
  { key: 'sabtu', label: 'Sabtu', short: 'Sab' },
  { key: 'minggu', label: 'Minggu', short: 'Min' },
];

const HARI_MAP = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

interface SessionGroup {
  sessionKey: string;
  jamMulai: string;
  jamSelesai: string;
  pjRow: JadwalDetail;
  companions: JadwalDetail[];
}

// Helper untuk mengelompokkan jadwal satu hari per SESI (jam_mulai + jam_selesai)
// Menempatkan PJ di baris utama, diikuti petugas pendamping
const getGroupedSessionsForDay = (daySchedules: JadwalDetail[]): SessionGroup[] => {
  if (!daySchedules || daySchedules.length === 0) return [];

  const sessionMap = new Map<string, { jamMulai: string; jamSelesai: string; rows: JadwalDetail[] }>();

  for (const s of daySchedules) {
    const jamMulaiClean = (s.jam_mulai || '').slice(0, 5);
    const jamSelesaiClean = (s.jam_selesai || '').slice(0, 5);
    const key = `${jamMulaiClean}-${jamSelesaiClean}`;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, { jamMulai: jamMulaiClean, jamSelesai: jamSelesaiClean, rows: [] });
    }
    sessionMap.get(key)!.rows.push(s);
  }

  // Urutkan sesi secara kronologis berdasarkan jam_mulai lalu jam_selesai
  const sortedSessions = Array.from(sessionMap.values()).sort((a, b) =>
    a.jamMulai.localeCompare(b.jamMulai) || a.jamSelesai.localeCompare(b.jamSelesai)
  );

  return sortedSessions.map((ses) => {
    // Cari karyawan yang merupakan PJ (is_penanggung_jawab == 1)
    const pjRow = ses.rows.find((r) => r.is_penanggung_jawab == 1) || ses.rows[0];

    // Filter pendamping:
    // 1. Bukan baris milik PJ itu sendiri
    // 2. Deduplikasi pendamping berdasarkan no_sip atau nama_karyawan
    const pjNoSip = String(pjRow.no_sip || '').trim().toLowerCase();
    const pjNama = String(pjRow.nama_karyawan || '').trim().toLowerCase();

    const seenCompanion = new Set<string>();
    if (pjNoSip) seenCompanion.add(pjNoSip);
    if (pjNama) seenCompanion.add(pjNama);

    const companions: JadwalDetail[] = [];
    for (const r of ses.rows) {
      if (r.kode_jadwal === pjRow.kode_jadwal) continue;
      const cNoSip = String(r.no_sip || '').trim().toLowerCase();
      const cNama = String(r.nama_karyawan || '').trim().toLowerCase();
      if (pjNoSip && cNoSip === pjNoSip) continue;
      if (pjNama && cNama === pjNama) continue;

      const dedupeKey = cNoSip || cNama;
      if (dedupeKey && seenCompanion.has(dedupeKey)) continue;
      if (dedupeKey) seenCompanion.add(dedupeKey);

      companions.push(r);
    }

    return {
      sessionKey: `${ses.jamMulai}-${ses.jamSelesai}`,
      jamMulai: ses.jamMulai,
      jamSelesai: ses.jamSelesai,
      pjRow,
      companions,
    };
  });
};

export const DialogJadwalMingguanRuangan: React.FC<Props> = ({
  visible,
  onHide,
  rooms,
  kodeRuangan,
  namaRuangan = 'Ruang Konsultasi',
  tanggalTerpilih,
}) => {
  // Normalisasi list ruangan yang bisa dipilih sebagai tab
  const activeRoomsList: RoomTabOption[] = React.useMemo(() => {
    if (rooms && rooms.length > 0) {
      return rooms.filter((r) => Boolean(r.kodeRuangan));
    }
    if (kodeRuangan) {
      return [{ kodeRuangan, namaRuangan, iconType: 'doctor' }];
    }
    return [];
  }, [rooms, kodeRuangan, namaRuangan]);

  const [activeRoomIdx, setActiveRoomIdx] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [scheduleCache, setScheduleCache] = useState<{ [kode: string]: JadwalDetail[] }>({});

  // Reset tab ke tab pertama saat modal dibuka
  useEffect(() => {
    if (visible) {
      setActiveRoomIdx(0);
    }
  }, [visible]);

  // Ruangan yang sedang aktif ditampilkan
  const currentRoom = activeRoomsList[activeRoomIdx] || activeRoomsList[0];

  // Ambil jadwal setiap kali ruangan aktif berubah atau dialog dibuka
  useEffect(() => {
    if (!visible || !currentRoom?.kodeRuangan) return;
    if (scheduleCache[currentRoom.kodeRuangan]) return; // Gunakan cache jika sudah ada

    loadSchedule(currentRoom.kodeRuangan);
  }, [visible, currentRoom?.kodeRuangan, scheduleCache]);

  const loadSchedule = async (kdRuang: string) => {
    setLoading(true);
    try {
      const res = await postData('/master/jadwal-karyawan-data', {
        kode_ruangan: kdRuang,
        status: 'aktif',
      });
      if (res.data?.status === 200 || res.status === 200) {
        const raw: JadwalDetail[] = res.data?.data || [];
        setScheduleCache((prev) => ({ ...prev, [kdRuang]: raw }));
      } else {
        setScheduleCache((prev) => ({ ...prev, [kdRuang]: [] }));
      }
    } catch (err) {
      console.error('Gagal mengambil jadwal mingguan ruangan:', err);
      setScheduleCache((prev) => ({ ...prev, [kdRuang]: [] }));
    } finally {
      setLoading(false);
    }
  };

  // Hari yang sedang dipilih di kalender form booking (Konsisten di semua tab!)
  const selectedDayKey = tanggalTerpilih ? HARI_MAP[tanggalTerpilih.getDay()] : null;
  const formattedSelectedDate = tanggalTerpilih
    ? tanggalTerpilih.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const activeSchedules = (currentRoom?.kodeRuangan && scheduleCache[currentRoom.kodeRuangan]) || [];

  // Kelompokkan jadwal per hari
  const scheduleByDay: { [key: string]: JadwalDetail[] } = {};
  DAYS_OF_WEEK.forEach((d) => {
    scheduleByDay[d.key] = activeSchedules.filter(
      (s) => (s.hari || '').toLowerCase() === d.key && s.status === 'aktif'
    );
  });

  const totalActiveDays = Object.values(scheduleByDay).filter((list) => list.length > 0).length;

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      style={{ width: '650px', maxWidth: '95vw' }}
      header={
        <div className="flex align-items-center gap-2">
          <div className="flex align-items-center justify-content-center bg-indigo-100 text-indigo-700 border-round-lg p-2">
            <Calendar size={20} />
          </div>
          <div>
            <div className="font-bold text-lg text-900 leading-tight">
              Jadwal Mingguan Petugas & Dokter
            </div>
            <div className="text-xs text-500 font-normal">
              Ketersediaan sesi &amp; jadwal kerja Senin s.d. Minggu
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-content-between align-items-center pt-2">
          <div className="text-xs text-600 flex align-items-center gap-1">
            <Info size={14} className="text-primary" />
            <span>
              {currentRoom?.namaRuangan}: aktif <strong>{totalActiveDays} dari 7 hari</strong> seminggu
            </span>
          </div>
          <Button
            label="Tutup"
            icon="pi pi-times"
            className="p-button-primary p-button-sm px-3"
            onClick={onHide}
          />
        </div>
      }
    >
      <div className="py-1">
        {/* Tab Switcher Ganda (Muncul jika ada lebih dari 1 ruangan: misal Ruang Konsul + Ruang Treatment) */}
        {activeRoomsList.length > 1 && (
          <div className="flex align-items-center gap-2 mb-3 p-1 bg-surface-100 border-round-xl border-1 surface-border">
            {activeRoomsList.map((rm, idx) => {
              const isActive = activeRoomIdx === idx;
              return (
                <button
                  key={rm.kodeRuangan}
                  type="button"
                  onClick={() => setActiveRoomIdx(idx)}
                  className={`flex-1 py-2 px-3 border-round-lg text-xs font-bold transition-all border-none cursor-pointer flex align-items-center justify-content-center gap-2 ${
                    isActive
                      ? 'bg-white text-primary shadow-2'
                      : 'bg-transparent text-600 hover:text-900 hover:bg-surface-200'
                  }`}
                >
                  {rm.iconType === 'doctor' ? (
                    <Stethoscope size={15} className={isActive ? 'text-primary' : 'text-500'} />
                  ) : (
                    <Building size={15} className={isActive ? 'text-primary' : 'text-500'} />
                  )}
                  <span>{rm.namaRuangan}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Banner Penanda Hari Terpilih di Kalender Booking (Konsisten di SEMUA Tab!) */}
        {tanggalTerpilih && (
          <div className="p-2.5 mb-3 bg-indigo-50 border-1 border-indigo-200 border-round-lg flex align-items-center justify-content-between">
            <div className="flex align-items-center gap-2">
              <span className="text-xs font-semibold text-indigo-900">
                Tanggal Booking Saat Ini:
              </span>
              <span className="text-xs font-bold text-indigo-700">
                {formattedSelectedDate}
              </span>
            </div>
            <span className="text-xs font-bold uppercase bg-indigo-600 text-white px-2.5 py-1 border-round-md shadow-1">
              Hari {selectedDayKey ? selectedDayKey.toUpperCase() : ''}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-column align-items-center justify-content-center py-6">
            <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
            <span className="text-xs text-500 mt-2">
              Memuat jadwal {currentRoom?.namaRuangan || 'ruangan'}...
            </span>
          </div>
        ) : (
          <div className="flex flex-column gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedules = scheduleByDay[day.key] || [];
              const groupedSessions = getGroupedSessionsForDay(daySchedules);
              const sessionCount = groupedSessions.length;
              const hasSchedule = sessionCount > 0;
              const isSelectedDay = selectedDayKey === day.key;
              const todayDayKey = HARI_MAP[new Date().getDay()];
              const isToday = todayDayKey === day.key;

              return (
                <div
                  key={day.key}
                  className={`p-3 border-round-xl transition-all transition-duration-150 border-2 ${
                    isSelectedDay
                      ? 'border-indigo-500 shadow-2 bg-indigo-50/30'
                      : isToday
                      ? 'border-blue-500 shadow-1 bg-blue-50/20'
                      : hasSchedule
                      ? 'surface-card border-200 hover:border-300'
                      : 'surface-100 border-200 opacity-75'
                  }`}
                >
                  <div
                    className="flex justify-content-between align-items-center"
                    style={{ marginBottom: '12px' }}
                  >
                    {/* Sisi Kiri: Nama Hari + Badge Pilihan Booking */}
                    <div className="flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <span className={`font-bold text-sm ${isToday ? 'text-blue-900' : isSelectedDay ? 'text-indigo-900' : 'text-900'}`}>
                        {day.label}
                      </span>

                      {isSelectedDay && (
                        <span
                          className="inline-flex align-items-center text-xs font-semibold text-indigo-700 bg-indigo-100 border-1 border-indigo-300 px-2.5 py-0.5 border-round-md"
                          style={{ gap: '4px' }}
                        >
                          <CheckCircle2 size={13} className="text-indigo-600 flex-shrink-0" />
                          Hari Pilihan Booking Anda
                        </span>
                      )}
                    </div>

                    {/* Sisi Kanan: Status Ketersediaan */}
                    <div>
                      {hasSchedule ? (
                        <Tag
                          value={`${sessionCount} Sesi Tersedia`}
                          severity="success"
                          className="text-xs font-semibold py-1 px-2.5 border-round-md"
                        />
                      ) : (
                        <Tag
                          value="Tidak Ada Jadwal"
                          severity="danger"
                          className="text-xs font-semibold py-1 px-2.5 border-round-md opacity-80"
                        />
                      )}
                    </div>
                  </div>

                  {/* Rincian Sesi & Petugas pada Hari Tersebut (Dikelompokkan Per Sesi: PJ dulu, lalu Pendamping) */}
                  <div>
                    {hasSchedule ? (
                      <div className="flex flex-column gap-2">
                        {groupedSessions.map((session, sIdx) => {
                          const pj = session.pjRow;
                          const isPjDoctor = (pj.jabatan || '').toLowerCase().includes('dokter');
                          const isPJ = pj.is_penanggung_jawab == 1;

                          return (
                            <div
                              key={session.sessionKey || sIdx}
                              className="border-1 surface-border border-round-lg overflow-hidden bg-white shadow-1"
                            >
                              {/* 1. Baris Petugas Penanggung Jawab (PJ) — Menampilkan Kuota */}
                              <div
                                className={`flex flex-column sm:flex-row sm:align-items-center justify-content-between text-xs py-3 bg-surface-50 gap-2 ${
                                  session.companions.length > 0 ? 'border-bottom-1 surface-border' : ''
                                }`}
                                style={{
                                  minHeight: '50px',
                                  paddingLeft: '18px',
                                  paddingRight: '18px',
                                }}
                              >
                                <div className="flex align-items-center gap-2 min-w-0">
                                  {isPjDoctor ? (
                                    <Stethoscope size={17} className="text-primary flex-shrink-0" />
                                  ) : (
                                    <User size={17} className="text-primary flex-shrink-0" />
                                  )}
                                  <span className="font-bold text-900 text-sm text-overflow-ellipsis overflow-hidden white-space-nowrap">
                                    {pj.nama_karyawan}
                                  </span>
                                   {isPJ ? (
                                     <Tag value="PJ" severity="warning" className="text-xs font-bold flex-shrink-0" style={{ fontSize: '10px', padding: '1px 6px' }} />
                                   ) : (
                                     <Tag value="PJ (Default)" severity="secondary" className="text-xs font-medium flex-shrink-0" style={{ fontSize: '10px', padding: '1px 6px' }} />
                                   )}
                                  <span className="text-500 capitalize flex-shrink-0 text-xs">
                                    ({pj.jabatan || 'Petugas'})
                                  </span>
                                </div>

                                <div className="flex align-items-center gap-2 ml-5 sm:ml-0 flex-shrink-0">
                                  <span
                                    className="text-700 font-semibold inline-flex align-items-center bg-white border-1 surface-border text-xs border-round-lg"
                                    style={{
                                      padding: '4px 12px',
                                      gap: '4px',
                                      lineHeight: 1,
                                    }}
                                  >
                                    <Clock size={13} className="text-500 flex-shrink-0" />
                                    <span>{session.jamMulai} - {session.jamSelesai} WIB</span>
                                  </span>
                                  {pj.kuota > 0 && (
                                    <span
                                      className="text-primary-700 font-semibold text-xs bg-primary-50 border-1 border-primary-100 inline-flex align-items-center border-round-lg"
                                      style={{
                                        padding: '4px 10px',
                                        lineHeight: 1,
                                        gap: '3px',
                                      }}
                                    >
                                      <span>Kuota:</span>
                                      <strong className="text-primary-800">{pj.kuota}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 2. Baris Petugas Pendamping (Hierarki Anak dengan Indentasi & Kuota DIHAPUS) */}
                              {session.companions.length > 0 && (
                                <div className="p-2 bg-white flex flex-column gap-2" style={{ paddingLeft: '14px', paddingRight: '14px' }}>
                                  {session.companions.map((comp, cIdx) => {
                                    const isCompDoctor = (comp.jabatan || '').toLowerCase().includes('dokter');

                                    return (
                                      <div
                                        key={comp.kode_jadwal || cIdx}
                                        className="flex flex-column sm:flex-row sm:align-items-center justify-content-between text-xs py-2 border-round surface-50 border-left-3 border-indigo-400 ml-2 sm:ml-3 gap-2"
                                        style={{ paddingLeft: '14px', paddingRight: '14px' }}
                                      >
                                        <div className="flex align-items-center gap-2 min-w-0">
                                          <span className="text-indigo-400 font-bold text-xs select-none">└</span>
                                          {isCompDoctor ? (
                                            <Stethoscope size={14} className="text-500 flex-shrink-0" />
                                          ) : (
                                            <User size={14} className="text-500 flex-shrink-0" />
                                          )}
                                          <span className="font-semibold text-800 text-overflow-ellipsis overflow-hidden white-space-nowrap">
                                            {comp.nama_karyawan}
                                          </span>
                                          <Tag
                                            value="Pendamping"
                                            severity="info"
                                            className="text-[10px] py-0 px-1 font-normal opacity-90 flex-shrink-0"
                                          />
                                          <span className="text-500 capitalize text-[11px] flex-shrink-0">
                                            ({comp.jabatan || 'Pendamping'})
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-500 italic flex align-items-center gap-1.5 py-1">
                        <XCircle size={14} className="text-red-400 flex-shrink-0" />
                        <span>
                          {currentRoom?.namaRuangan || 'Ruangan ini'} tidak memiliki jadwal praktek pada hari {day.label}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
};
