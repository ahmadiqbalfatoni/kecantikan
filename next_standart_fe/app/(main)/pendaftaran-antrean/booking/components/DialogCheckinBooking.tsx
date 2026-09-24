'use client';

import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { Toast } from 'primereact/toast';
import { CheckCircle2, User, Calendar, Clock, MapPin, Stethoscope, AlertCircle } from 'lucide-react';

interface BookingItem {
  kode_booking: string;
  no_rm: string;
  nama_pasien: string;
  no_hp_pasien?: string;
  jenis_layanan: string;
  kode_layanan: string;
  nama_layanan: string;
  kode_ruangan?: string;
  nama_ruangan?: string;
  nama_petugas?: string;
  jabatan_petugas?: string;
  tanggal_booking: string;
  jam_booking: string;
  dp_nominal: number;
  dp_status: string;
  butuh_konsul?: number | boolean;
}

interface Props {
  visible: boolean;
  booking: BookingItem | null;
  toast: React.RefObject<Toast>;
  onHide: () => void;
  onSuccess: (result: any) => void;
}

export const DialogCheckinBooking: React.FC<Props> = ({
  visible,
  booking,
  toast,
  onHide,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  if (!booking) return null;

  const handleCheckin = async () => {
    setLoading(true);
    try {
      const res = await postData('/transaksi/booking/checkin', {
        kode_booking: booking.kode_booking,
      });

      if (res.data?.status === 200 || res.data?.status === '200' || res.status === 200) {
        showSuccess(toast, res.data?.message || 'Check-in berhasil!');
        onSuccess(res.data?.data);
        onHide();
      } else {
        showError(toast, res.data?.message || 'Gagal melakukan check-in');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Terjadi kesalahan sistem';
      showError(toast, msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <CheckCircle2 className="text-primary" size={24} />
          <span className="font-bold text-xl">Konfirmasi Check-in Booking</span>
        </div>
      }
      visible={visible}
      style={{ width: '550px', maxWidth: '95vw' }}
      onHide={onHide}
      footer={
        <div className="flex justify-content-end gap-2 pt-2">
          <Button
            label="Batal"
            icon="pi pi-times"
            className="p-button-outlined p-button-secondary"
            onClick={onHide}
            disabled={loading}
          />
          <Button
            label="Proses Check-in"
            icon="pi pi-check"
            className="p-button-primary"
            onClick={handleCheckin}
            loading={loading}
          />
        </div>
      }
    >
      <div className="py-2">
        <div className="surface-100 p-3 border-round-lg mb-3">
          <div className="text-xs text-500 font-semibold mb-1 uppercase">KODE RESERVASI</div>
          <div className="text-xl font-bold text-primary">{booking.kode_booking}</div>
        </div>

        <div className="grid">
          <div className="col-12 sm:col-6">
            <div className="flex align-items-start gap-2 mb-3">
              <User size={18} className="text-500 mt-1" />
              <div>
                <div className="text-xs text-500">Pasien</div>
                <div className="font-semibold text-900">{booking.nama_pasien}</div>
                <div className="text-xs text-600">No. RM: {booking.no_rm}</div>
              </div>
            </div>
          </div>

          <div className="col-12 sm:col-6">
            <div className="flex align-items-start gap-2 mb-3">
              <Stethoscope size={18} className="text-500 mt-1" />
              <div>
                <div className="text-xs text-500">Layanan</div>
                <div className="font-semibold text-900">{booking.nama_layanan}</div>
                <Tag
                  value={booking.jenis_layanan === 'paket' ? 'Paket Layanan' : 'Layanan'}
                  severity={booking.jenis_layanan === 'paket' ? 'warning' : 'info'}
                  className="text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <div className="col-12 sm:col-6">
            <div className="flex align-items-start gap-2 mb-3">
              <Calendar size={18} className="text-500 mt-1" />
              <div>
                <div className="text-xs text-500">Tanggal & Jam</div>
                <div className="font-semibold text-900">{booking.tanggal_booking}</div>
                <div className="text-xs text-600 font-medium">{booking.jam_booking} WIB</div>
              </div>
            </div>
          </div>

          <div className="col-12 sm:col-6">
            <div className="flex align-items-start gap-2 mb-3">
              <MapPin size={18} className="text-500 mt-1" />
              <div>
                <div className="text-xs text-500">Ruangan Tujuan</div>
                <div className="font-semibold text-900">{booking.nama_ruangan || 'Ruang Treatment'}</div>
                <div className="text-xs text-500">Petugas: {booking.nama_petugas || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <Divider className="my-2" />

        {/* Informasi Status DP */}
        <div className="surface-50 border-1 border-200 border-round p-3 mb-3">
          <div className="flex justify-content-between align-items-center mb-1">
            <span className="text-sm text-600 font-medium">Uang Muka (DP):</span>
            <span className="font-bold text-base">{formatCurrency(booking.dp_nominal || 0)}</span>
          </div>
          <div className="flex justify-content-between align-items-center">
            <span className="text-sm text-600 font-medium">Status Pembayaran DP:</span>
            <Tag
              value={booking.dp_status.replace(/_/g, ' ').toUpperCase()}
              severity={
                booking.dp_status === 'sudah_bayar'
                  ? 'success'
                  : booking.dp_status === 'belum_bayar'
                  ? 'warning'
                  : 'danger'
              }
            />
          </div>
          {booking.dp_status === 'sudah_bayar' && (
            <div className="text-xs text-green-700 mt-2 flex align-items-center gap-1">
              <CheckCircle2 size={14} />
              <span>DP akan otomatis dicatat sebagai potongan tagihan saat pembayaran di Kasir.</span>
            </div>
          )}
        </div>

        {Boolean(booking.butuh_konsul) && (
          <div className="p-2.5 border-round bg-indigo-50 border-1 border-indigo-200 text-indigo-950 text-xs flex align-items-start gap-2 mb-3">
            <Stethoscope size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-900">Alur Konsultasi Dokter Aktif:</span> Pasien akan diterbitkan antrean ke <strong>Ruang Konsultasi Dokter</strong> terlebih dahulu. Pastikan dokter jaga di Ruang Konsultasi sudah bertugas atau segera hadir sebelum mengarahkan pasien ke ruang tunggu dokter.
            </div>
          </div>
        )}

        {/* Notice Info */}
        <div className="p-2 border-round bg-blue-50 border-1 border-blue-200 text-blue-900 text-xs flex align-items-start gap-2">
          <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-1" />
          <span>
            Saat dikonfirmasi, sistem secara otomatis menerbitkan data kunjungan baru (<code>trx_kunjungan</code>) dan nomor antrean langsung ke ruangan tujuan tanpa perlu mengambil nomor antrean awal di loket pendaftaran.
          </span>
        </div>
      </div>
    </Dialog>
  );
};
