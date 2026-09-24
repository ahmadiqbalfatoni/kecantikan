'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Pasien } from './PasienKtpCard';

interface DialogPilihanKunjunganProps {
  visible: boolean;
  onHide: () => void;
  pasien: Pasien | null;
  onSelectDaftarSekarang: (pasien: Pasien) => void;
  onSelectBooking: (pasien: Pasien) => void;
}

export const DialogPilihanKunjungan: React.FC<DialogPilihanKunjunganProps> = ({
  visible,
  onHide,
  pasien,
  onSelectDaftarSekarang,
  onSelectBooking,
}) => {
  const [selectedOption, setSelectedOption] = useState<'walkin' | 'booking' | null>(null);

  // Reset selected option saat dialog dibuka ulang
  useEffect(() => {
    if (visible) {
      setSelectedOption(null);
    }
  }, [visible]);

  if (!pasien) return null;

  const hasAlergi = Boolean(
    pasien.alergi &&
    pasien.alergi.trim() !== '' &&
    pasien.alergi.trim() !== '-' &&
    pasien.alergi.trim().toLowerCase() !== 'tidak ada'
  );

  const handleConfirm = () => {
    if (selectedOption === 'walkin') {
      onHide();
      onSelectDaftarSekarang(pasien);
    } else if (selectedOption === 'booking') {
      onHide();
      onSelectBooking(pasien);
    }
  };

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Dialog
      visible={visible}
      onHide={() => {
        setSelectedOption(null);
        onHide();
      }}
      modal
      style={{ width: '100%', maxWidth: '600px' }}
      breakpoints={{ '641px': '95vw' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 3px 8px rgba(16, 185, 129, 0.25)',
              flexShrink: 0,
              marginRight: '12px',
            }}
          >
            <i className="pi pi-calendar-plus" style={{ fontSize: '18px', color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
              {selectedOption ? 'Konfirmasi Pendaftaran Kunjungan' : 'Pilih Alur Kunjungan Pasien'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#059669' }}>{pasien.no_rm}</span>
              <span style={{ margin: '0 6px', color: '#94a3b8' }}>•</span>
              <span style={{ fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>{pasien.nama}</span>
            </div>
          </div>
        </div>
      }
      contentClassName="p-3 surface-50"
      footer={
        <div className="flex justify-content-between align-items-center pt-2 border-top-1 surface-border">
          {selectedOption ? (
            <>
              <Button
                type="button"
                label="Kembali"
                icon="pi pi-arrow-left"
                severity="secondary"
                outlined
                className="text-xs font-medium"
                onClick={() => setSelectedOption(null)}
              />
              <Button
                type="button"
                label={selectedOption === 'walkin' ? 'Ya, Lanjutkan Daftar Sekarang' : 'Ya, Lanjutkan Buat Booking'}
                icon={selectedOption === 'walkin' ? 'pi pi-check' : 'pi pi-calendar'}
                severity={selectedOption === 'walkin' ? 'success' : 'info'}
                className="text-xs font-bold px-3 py-2 text-white shadow-1"
                style={{
                  backgroundColor: selectedOption === 'walkin' ? '#059669' : '#2563eb',
                  borderColor: selectedOption === 'walkin' ? '#059669' : '#2563eb',
                }}
                onClick={handleConfirm}
              />
            </>
          ) : (
            <div className="w-full flex justify-content-end">
              <Button
                type="button"
                label="Batal"
                icon="pi pi-times"
                severity="secondary"
                outlined
                className="text-xs font-medium"
                onClick={onHide}
              />
            </div>
          )}
        </div>
      }
    >
      {!selectedOption ? (
        /* TAHAP 1: PILIHAN ALUR KUNJUNGAN */
        <div className="flex flex-column gap-3 py-1">
          <p className="text-xs text-600 m-0 mb-1">
            Silakan pilih alur kunjungan untuk pasien <strong>{pasien.nama}</strong> ({pasien.no_rm}):
          </p>

          {/* OPSI 1: DAFTAR KUNJUNGAN SEKARANG (WALK-IN) */}
          <div
            className="border-round-xl p-3 border-2 transition-all cursor-pointer surface-card hover:shadow-2"
            style={{
              borderColor: '#10b981',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              display: 'flex',
              alignItems: 'flex-start',
            }}
            onClick={() => setSelectedOption('walkin')}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 3px 8px rgba(5, 150, 105, 0.25)',
                flexShrink: 0,
                marginRight: '14px',
                marginTop: '2px',
              }}
            >
              <i className="pi pi-user-plus" style={{ fontSize: '20px', color: '#ffffff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-emerald-950 mb-1">
                Daftar Kunjungan Sekarang
              </div>
              <p className="text-xs text-emerald-800 m-0 leading-normal mb-2">
                Pasien datang langsung hari ini. Lanjutkan ke pemilihan layanan & treatment, sesi petugas, dan antrean klinik.
              </p>
              <div className="flex justify-content-end mt-2">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#047857',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <span>Pilih Daftar Sekarang</span>
                  <i className="pi pi-arrow-right" style={{ fontSize: '11px' }} />
                </span>
              </div>
            </div>
          </div>

          {/* OPSI 2: BOOKING & RESERVASI JADWAL */}
          <div
            className="border-round-xl p-3 border-2 transition-all cursor-pointer surface-card hover:shadow-2"
            style={{
              borderColor: '#3b82f6',
              background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
              display: 'flex',
              alignItems: 'flex-start',
            }}
            onClick={() => setSelectedOption('booking')}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)',
                flexShrink: 0,
                marginRight: '14px',
                marginTop: '2px',
              }}
            >
              <i className="pi pi-calendar-plus" style={{ fontSize: '20px', color: '#ffffff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-blue-950 mb-1">
                Booking & Reservasi Jadwal
              </div>
              <p className="text-xs text-blue-800 m-0 leading-normal mb-2">
                Jadwalkan kunjungan di tanggal mendatang, tentukan jam kedatangan, slot dokter/ruangan, dan konfirmasi pembayaran DP.
              </p>
              <div className="flex justify-content-end mt-2">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1d4ed8',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  <span>Pilih Buat Booking</span>
                  <i className="pi pi-arrow-right" style={{ fontSize: '11px' }} />
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAHAP 2: VALIDASI & KONFIRMASI */
        <div className="flex flex-column gap-3 py-1">
          {/* Card Validasi Alur Terpilih */}
          <div
            className="p-3 border-round-xl border-1 shadow-1"
            style={{
              backgroundColor: selectedOption === 'walkin' ? '#f0fdf4' : '#eff6ff',
              borderColor: selectedOption === 'walkin' ? '#86efac' : '#93c5fd',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: selectedOption === 'walkin' ? '#059669' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                  marginRight: '12px',
                }}
              >
                <i
                  className={selectedOption === 'walkin' ? 'pi pi-user-plus' : 'pi pi-calendar-plus'}
                  style={{ fontSize: '20px', color: '#ffffff' }}
                />
              </div>
              <div className="flex-1">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    backgroundColor: selectedOption === 'walkin' ? '#047857' : '#1d4ed8',
                    color: '#ffffff',
                    lineHeight: '1.2',
                  }}
                >
                  {selectedOption === 'walkin' ? 'Alur Pendaftaran Langsung' : 'Alur Booking Reservasi'}
                </span>
                <div className="font-bold text-sm text-900 mt-1">
                  {selectedOption === 'walkin'
                    ? 'Daftar Kunjungan Hari Ini (Walk-In)'
                    : 'Booking & Reservasi Jadwal Mendatang'}
                </div>
              </div>
            </div>

            {/* Rincian Pasien & Ringkasan Validasi */}
            <div className="grid grid-nogutter text-xs gap-2 pt-1">
              <div className="col-12 flex justify-content-between pb-1 border-bottom-1 surface-border">
                <span className="text-600">Nama Pasien</span>
                <span className="font-bold text-900 uppercase">{pasien.nama}</span>
              </div>
              <div className="col-12 flex justify-content-between pb-1 border-bottom-1 surface-border">
                <span className="text-600">Nomor Rekam Medis</span>
                <span className="font-bold font-mono text-emerald-700">{pasien.no_rm}</span>
              </div>
              <div className="col-12 flex justify-content-between pb-1 border-bottom-1 surface-border">
                <span className="text-600">Tanggal Kunjungan</span>
                <span className="font-bold text-900">
                  {selectedOption === 'walkin' ? `Hari Ini (${todayStr})` : 'Pilih Pada Formulir Booking'}
                </span>
              </div>
              <div className="col-12 flex justify-content-between pb-1">
                <span className="text-600">Nomor Kontak (WhatsApp)</span>
                <span className="font-mono font-semibold text-800">{pasien.no_hp || '—'}</span>
              </div>
            </div>
          </div>

          {/* Validasi Riwayat Alergi (Jika Ada) */}
          {hasAlergi && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#7f1d1d' }}>
              <i className="pi pi-exclamation-triangle text-red-600" style={{ fontSize: '18px', marginRight: '10px', flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Perhatian Medis : </span>
                <span style={{ fontWeight: 800, color: '#450a0a', textTransform: 'uppercase' }}>{pasien.alergi}</span>
                <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '2px' }}>
                  Pastikan menginformasikan riwayat alergi ini kepada dokter / perawat saat pendaftaran.
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-500 m-0 text-center font-italic">
            Klik tombol <strong>Lanjutkan</strong> di bawah untuk membuka formulir {selectedOption === 'walkin' ? 'pendaftaran kunjungan' : 'booking jadwal'}.
          </p>
        </div>
      )}
    </Dialog>
  );
};
