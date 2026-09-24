'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import postData from '@/lib/axios/postData';
import formUpload from '@/lib/axios/formData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { DialogCheckinBooking } from './DialogCheckinBooking';
import { DialogDetailBooking } from './DialogDetailBooking';
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  ClockAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Calendar as CalendarIcon,
  CreditCard,
  UserX,
  UserCheck,
} from 'lucide-react';

interface BookingRow {
  id: number;
  kode_booking: string;
  no_rm: string;
  nama_pasien: string;
  no_hp_pasien?: string;
  nik_pasien?: string;
  jenis_layanan: string;
  kode_layanan: string;
  nama_layanan: string;
  harga_layanan: number;
  total_biaya?: number;
  total_items?: number;
  items?: any[];
  kode_jadwal: string;
  no_sip?: string;
  nama_petugas?: string;
  jabatan_petugas?: string;
  kode_ruangan?: string;
  nama_ruangan?: string;
  tanggal_booking: string;
  jam_booking: string;
  catatan_pasien?: string;
  status: 'dikonfirmasi' | 'dibatalkan' | 'selesai' | 'tidak_hadir';
  dp_nominal: number;
  dp_status: 'belum_bayar' | 'sudah_bayar' | 'hangus' | 'dipotong_treatment';
  dp_dibayar_at?: string;
  metode_pembayaran_dp?: string;
  alasan_bebas_dp?: string;
  sumber: 'staff' | 'whatsapp';
  butuh_konsul?: number | boolean;
  created_at: string;
  can_checkin: boolean;
  can_cancel: boolean;
  can_pay_dp: boolean;
  can_mark_tidak_hadir?: boolean;
}

interface Props {
  toast: React.RefObject<Toast>;
  onNavigateToCreate: () => void;
  refreshTrigger?: number;
}

export const DaftarBookingTab: React.FC<Props> = ({ toast, onNavigateToCreate, refreshTrigger }) => {
  const [data, setData] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDpStatus, setFilterDpStatus] = useState<string>('');
  const [filterTanggal, setFilterTanggal] = useState<Date | null>(null);

  // Dialogs
  const [selectedBookingForCheckin, setSelectedBookingForCheckin] = useState<BookingRow | null>(null);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<BookingRow | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Auto scan loading
  const [loadingAutoScan, setLoadingAutoScan] = useState(false);

  // Tolerance Settings Shortcut
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(30);
  const [dialogToleranceMinutes, setDialogToleranceMinutes] = useState<number>(30);
  const [showToleranceDialog, setShowToleranceDialog] = useState(false);
  const [loadingTolerance, setLoadingTolerance] = useState(false);
  const [savingTolerance, setSavingTolerance] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDateToYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    fetchBookingData();
  }, [page, rows, keyword, filterStatus, filterDpStatus, filterTanggal, refreshTrigger]);

  const fetchBookingData = async () => {
    setLoading(true);
    try {
      const payload: any = {
        page,
        perPage: rows,
        keyword: keyword.trim(),
      };

      if (filterStatus) payload.status = filterStatus;
      if (filterDpStatus) payload.dp_status = filterDpStatus;
      if (filterTanggal) payload.tanggal_booking = formatDateToYMD(filterTanggal);

      const res = await postData('/transaksi/booking/data', payload);

      if (res.data?.status === 200 || res.status === 200) {
        setData(res.data?.data || []);
        setTotalRecords(res.data?.total_data || 0);
      } else {
        setData([]);
        setTotalRecords(0);
      }
    } catch (err: any) {
      console.error('Error fetching booking data:', err);
      showError(toast, 'Gagal memuat data booking');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
      setFirst(0);
    }, 400);
  };

  const handleResetFilter = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const hasActiveFilter = searchVal || keyword || filterTanggal || filterStatus || filterDpStatus || page !== 1 || first !== 0;
    setSearchVal('');
    setKeyword('');
    setFilterTanggal(null);
    setFilterStatus('');
    setFilterDpStatus('');
    setPage(1);
    setFirst(0);
    if (!hasActiveFilter) {
      fetchBookingData();
    }
  };

  // Tandai DP Lunas
  const handleMarkDpLunas = (row: BookingRow) => {
    confirmDialog({
      message: `Tandai pembayaran DP sebesar ${formatCurrency(row.dp_nominal)} untuk pasien ${row.nama_pasien} (${row.kode_booking}) sebagai LUNAS?`,
      header: 'Konfirmasi Pelunasan DP',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Ya, Tandai Lunas',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-success',
      accept: async () => {
        try {
          const res = await postData('/transaksi/booking/update-dp', {
            kode_booking: row.kode_booking,
          });
          if (res.data?.status === 200 || res.status === 200) {
            showSuccess(toast, res.data?.message || 'DP berhasil ditandai lunas!');
            fetchBookingData();
          } else {
            showError(toast, res.data?.message || 'Gagal memperbarui status DP');
          }
        } catch (e: any) {
          showError(toast, e?.response?.data?.message || 'Terjadi kesalahan');
        }
      },
    });
  };

  // Batalkan Booking
  const handleCancelBooking = (row: BookingRow) => {
    confirmDialog({
      message: `Apakah Anda yakin ingin MEMBATALKAN reservasi booking ${row.kode_booking} atas nama ${row.nama_pasien}?`,
      header: 'Konfirmasi Pembatalan Booking',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ya, Batalkan',
      rejectLabel: 'Tidak',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          const res = await postData('/transaksi/booking/cancel', {
            kode_booking: row.kode_booking,
          });
          if (res.data?.status === 200 || res.status === 200) {
            showSuccess(toast, res.data?.message || 'Booking berhasil dibatalkan');
            fetchBookingData();
          } else {
            showError(toast, res.data?.message || 'Gagal membatalkan booking');
          }
        } catch (e: any) {
          showError(toast, e?.response?.data?.message || 'Terjadi kesalahan');
        }
      },
    });
  };

  // Tandai Tidak Hadir
  const handleMarkTidakHadir = (row: BookingRow) => {
    const isDpPaid = row.dp_status === 'sudah_bayar';
    confirmDialog({
      message: `Tandai pasien ${row.nama_pasien} (${row.kode_booking}) sebagai TIDAK HADIR?${
        isDpPaid ? ' Uang muka (DP) sebesar ' + formatCurrency(row.dp_nominal) + ' akan dinyatakan HANGUS.' : ''
      }`,
      header: 'Konfirmasi Pasien Tidak Hadir',
      icon: 'pi pi-user-minus',
      acceptLabel: 'Ya, Tandai Tidak Hadir',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        try {
          const res = await postData('/transaksi/booking/mark-no-show', {
            kode_booking: row.kode_booking,
          });
          if (res.data?.status === 200 || res.status === 200) {
            showSuccess(toast, res.data?.message || 'Booking ditandai tidak hadir');
            fetchBookingData();
          } else {
            showError(toast, res.data?.message || 'Gagal memperbarui status');
          }
        } catch (e: any) {
          showError(toast, e?.response?.data?.message || 'Terjadi kesalahan');
        }
      },
    });
  };

  // Scan Booking Kedaluwarsa
  const handleAutoScanExpired = async () => {
    setLoadingAutoScan(true);
    try {
      const res = await postData('/transaksi/booking/mark-no-show', { auto_scan: true });
      if (res.data?.status === 200 || res.status === 200) {
        showSuccess(toast, res.data?.message || 'Pemeriksaan kedaluwarsa selesai');
        fetchBookingData();
      } else {
        showError(toast, res.data?.message || 'Gagal memeriksa booking kedaluwarsa');
      }
    } catch (e: any) {
      showError(toast, e?.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoadingAutoScan(false);
    }
  };

  // Ambil data konfigurasi toleransi keterlambatan dari server
  const fetchToleranceConfig = async () => {
    try {
      const res = await postData('/setup/config-data', {
        kode: ['toleransi_keterlambatan_menit'],
      });
      if (res.data?.status === 200 || res.status === 200) {
        const val = parseInt(res.data?.data?.toleransi_keterlambatan_menit || '30', 10);
        if (!isNaN(val) && val > 0) {
          setToleranceMinutes(val);
          setDialogToleranceMinutes(val);
        }
      }
    } catch (e) {
      console.error('Error fetching tolerance config:', e);
    }
  };

  useEffect(() => {
    fetchToleranceConfig();
  }, []);

  const handleOpenToleranceDialog = async () => {
    setLoadingTolerance(true);
    setShowToleranceDialog(true);
    try {
      const res = await postData('/setup/config-data', {
        kode: ['toleransi_keterlambatan_menit'],
      });
      if (res.data?.status === 200 || res.status === 200) {
        const val = parseInt(res.data?.data?.toleransi_keterlambatan_menit || '30', 10);
        if (!isNaN(val) && val > 0) {
          setToleranceMinutes(val);
          setDialogToleranceMinutes(val);
        }
      }
    } catch (e) {
      console.error('Error fetching tolerance config:', e);
    } finally {
      setLoadingTolerance(false);
    }
  };

  const handleSaveTolerance = async () => {
    if (!dialogToleranceMinutes || dialogToleranceMinutes < 1 || dialogToleranceMinutes > 180) {
      showError(toast, 'Toleransi keterlambatan harus antara 1 sampai 180 menit');
      return;
    }

    setSavingTolerance(true);
    try {
      const formData = new FormData();
      formData.append('kode', JSON.stringify(['toleransi_keterlambatan_menit']));
      formData.append('keterangan', JSON.stringify([String(dialogToleranceMinutes)]));

      const res = await formUpload('/setup/config-create', formData, { 'X-Level': '1' });

      if (res.data?.status === 200 || res.status === 200) {
        showSuccess(toast, 'Pengaturan toleransi keterlambatan berhasil disimpan');
        setToleranceMinutes(dialogToleranceMinutes);
        setShowToleranceDialog(false);
        // Refresh tabel booking langsung agar status overdue booking mencerminkan nilai baru
        fetchBookingData();
      } else {
        showError(toast, res.data?.message || 'Gagal menyimpan pengaturan toleransi');
      }
    } catch (err: any) {
      console.error('Error saving tolerance config:', err);
      showError(toast, err?.response?.data?.message || 'Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSavingTolerance(false);
    }
  };

  const statusOptions = [
    { label: 'Semua Status', value: '' },
    { label: 'Dikonfirmasi', value: 'dikonfirmasi' },
    { label: 'Selesai (Check-in)', value: 'selesai' },
    { label: 'Dibatalkan', value: 'dibatalkan' },
    { label: 'Tidak Hadir', value: 'tidak_hadir' },
  ];

  const dpStatusOptions = [
    { label: 'Semua Status DP', value: '' },
    { label: 'Belum Bayar', value: 'belum_bayar' },
    { label: 'Sudah Bayar', value: 'sudah_bayar' },
    { label: 'Hangus', value: 'hangus' },
    { label: 'Dipotong Treatment', value: 'dipotong_treatment' },
  ];

  const headerTableTemplate = (
    <div className="flex flex-column gap-3">
      {/* Baris atas: 3 filter di kiri + pencarian di kanan */}
      <div className="flex flex-wrap align-items-center justify-content-between gap-2">
        {/* Kiri: 3 Kontrol Filter (Tanggal, Status Booking, Status DP) */}
        <div className="flex flex-wrap align-items-center gap-2 w-full md:w-auto">
          <Calendar
            value={filterTanggal}
            onChange={(e) => {
              setFilterTanggal(e.value as Date);
              setPage(1);
              setFirst(0);
            }}
            dateFormat="yy-mm-dd"
            placeholder="Semua Tanggal"
            showIcon
            showButtonBar
            className="w-full sm:w-12rem p-inputtext-sm text-sm border-round-md"
          />

          <Dropdown
            value={filterStatus}
            options={statusOptions}
            onChange={(e) => {
              setFilterStatus(e.value);
              setPage(1);
              setFirst(0);
            }}
            placeholder="Status Booking"
            className="w-full sm:w-11rem p-inputtext-sm text-sm border-round-md"
          />

          <Dropdown
            value={filterDpStatus}
            options={dpStatusOptions}
            onChange={(e) => {
              setFilterDpStatus(e.value);
              setPage(1);
              setFirst(0);
            }}
            placeholder="Status DP"
            className="w-full sm:w-11rem p-inputtext-sm text-sm border-round-md"
          />
        </div>

        {/* Kanan: Pencarian + Reset Filter */}
        <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
          <IconField iconPosition="left" className="w-full sm:w-16rem md:w-18rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={searchVal}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari Data..."
              className="w-full text-sm"
            />
          </IconField>

          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            tooltipOptions={{ position: 'bottom' }}
            onClick={handleResetFilter}
          />
        </div>
      </div>

      {/* Legenda warna status */}
      <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
        <span className="flex align-items-center gap-1">
          <i className="pi pi-info-circle" />
          <span className="font-semibold">KETERANGAN STATUS:</span>
        </span>
        <span
          className={`flex align-items-center gap-1 cursor-pointer transition-colors ${filterStatus === 'dikonfirmasi' ? 'font-bold text-900' : 'hover:text-900'}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'dikonfirmasi' ? '' : 'dikonfirmasi');
            setPage(1);
            setFirst(0);
          }}
          title="Klik untuk filter Dikonfirmasi"
        >
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#3b82f6', boxShadow: '0 1px 3px #3b82f655' }} />
          Dikonfirmasi
        </span>
        <span
          className={`flex align-items-center gap-1 cursor-pointer transition-colors ${filterStatus === 'selesai' ? 'font-bold text-900' : 'hover:text-900'}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'selesai' ? '' : 'selesai');
            setPage(1);
            setFirst(0);
          }}
          title="Klik untuk filter Selesai Check-in"
        >
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#22c55e', boxShadow: '0 1px 3px #22c55e55' }} />
          Selesai Check-in
        </span>
        <span
          className={`flex align-items-center gap-1 cursor-pointer transition-colors ${filterStatus === 'tidak_hadir' ? 'font-bold text-900' : 'hover:text-900'}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'tidak_hadir' ? '' : 'tidak_hadir');
            setPage(1);
            setFirst(0);
          }}
          title="Klik untuk filter Tidak Hadir"
        >
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b', boxShadow: '0 1px 3px #f59e0b55' }} />
          Tidak Hadir
        </span>
        <span
          className={`flex align-items-center gap-1 cursor-pointer transition-colors ${filterStatus === 'dibatalkan' ? 'font-bold text-900' : 'hover:text-900'}`}
          onClick={() => {
            setFilterStatus(filterStatus === 'dibatalkan' ? '' : 'dibatalkan');
            setPage(1);
            setFirst(0);
          }}
          title="Klik untuk filter Dibatalkan"
        >
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444', boxShadow: '0 1px 3px #ef444455' }} />
          Dibatalkan
        </span>
      </div>
    </div>
  );

  return (
    <>
      <ConfirmDialog />

      {/* Dialog Checkin */}
      <DialogCheckinBooking
        visible={showCheckinDialog}
        booking={selectedBookingForCheckin}
        toast={toast}
        onHide={() => setShowCheckinDialog(false)}
        onSuccess={() => fetchBookingData()}
      />

      {/* Dialog Detail Ticket */}
      <DialogDetailBooking
        visible={showDetailDialog}
        booking={selectedBookingForDetail}
        onHide={() => setShowDetailDialog(false)}
      />

      {/* Dialog Pengaturan Toleransi Keterlambatan */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-cog text-primary" style={{ fontSize: '1.25rem' }} />
            <span className="font-bold text-lg text-900">Pengaturan Toleransi Keterlambatan</span>
          </div>
        }
        visible={showToleranceDialog}
        onHide={() => !savingTolerance && setShowToleranceDialog(false)}
        style={{ width: '450px', maxWidth: '95vw' }}
        modal
        closable={!savingTolerance}
        footer={
          <div className="flex justify-content-end gap-2 pt-2">
            <Button
              type="button"
              label="Batal"
              icon="pi pi-times"
              outlined
              severity="secondary"
              className="p-button-sm"
              disabled={savingTolerance}
              onClick={() => setShowToleranceDialog(false)}
            />
            <Button
              type="button"
              label="Simpan"
              icon="pi pi-check"
              className="p-button-sm font-semibold"
              loading={savingTolerance}
              onClick={handleSaveTolerance}
            />
          </div>
        }
      >
        <div className="pt-2">
          {loadingTolerance ? (
            <div className="flex align-items-center justify-content-center p-4">
              <i className="pi pi-spin pi-spinner text-primary text-2xl" />
            </div>
          ) : (
            <div className="flex flex-column gap-3">
              <div>
                <label htmlFor="toleransi-menit-input" className="block text-sm font-semibold text-800 mb-2">
                  Toleransi Keterlambatan Kedatangan (menit) <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  id="toleransi-menit-input"
                  value={dialogToleranceMinutes}
                  onValueChange={(e) => setDialogToleranceMinutes(e.value || 30)}
                  min={1}
                  max={180}
                  suffix=" menit"
                  showButtons
                  buttonLayout="horizontal"
                  step={5}
                  decrementButtonClassName="p-button-secondary p-button-outlined"
                  incrementButtonClassName="p-button-secondary p-button-outlined"
                  incrementButtonIcon="pi pi-plus"
                  decrementButtonIcon="pi pi-minus"
                  className="w-full"
                  inputClassName="text-center font-bold text-base"
                />
              </div>

              <div className="p-3 surface-100 border-round-md border-left-3 border-primary text-xs text-700 line-height-3">
                <i className="pi pi-info-circle mr-1.5 text-primary font-semibold" />
                Booking akan otomatis bisa ditandai <strong>&quot;Tidak Hadir&quot;</strong> setelah pasien terlambat melebihi durasi ini dari jam janji temu.
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* HEADER SECTION */}
      <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
        <div className="flex align-items-center gap-2 mb-1">
          <CalendarCheck className="text-primary" size={24} />
          <h2 className="text-xl font-bold text-900 m-0">Daftar & Kelola Booking Pasien</h2>
        </div>
        <p className="text-xs text-500 mt-1 mb-0">
          Pantau jadwal reservasi janji temu pasien, konfirmasi pembayaran DP, serta lakukan check-in kedatangan hari ini.
        </p>
      </div>

      {/* CARD UTAMA: ACTION BAR & DATATABLE */}
      <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
        {/* Action Buttons */}
        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
          <Button
            size="small"
            label="Baru"
            icon="pi pi-plus"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            onClick={onNavigateToCreate}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label="Cek Kedaluwarsa"
            icon="pi pi-clock"
            outlined
            severity="warning"
            className="border-round-md font-medium px-3"
            onClick={handleAutoScanExpired}
            loading={loadingAutoScan}
            tooltip={`Scan & update booking yang telah melewati waktu toleransi (${toleranceMinutes} menit) menjadi tidak hadir`}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label="Pengaturan Toleransi"
            icon="pi pi-cog"
            outlined
            severity="secondary"
            className="border-round-md font-medium px-3"
            onClick={handleOpenToleranceDialog}
            tooltip="Atur batas toleransi keterlambatan kedatangan pasien"
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            loading={loading}
            onClick={fetchBookingData}
            tooltip="Refresh Data Booking"
          />
        </div>

        {/* DATA TABLE WRAPPER DENGAN OVERFLOW-X AUTO & LEBAR PROPORSIONAL */}
        <div className="overflow-x-auto w-full border-round-lg">
          <DataTable
            value={data}
            loading={loading}
            paginator
            rows={rows}
            totalRecords={totalRecords}
            lazy
            first={first}
            onPage={(e) => {
              setFirst(e.first);
              setRows(e.rows);
              setPage(Math.floor(e.first / e.rows) + 1);
            }}
            header={headerTableTemplate}
            rowsPerPageOptions={[10, 20, 50]}
            emptyMessage="Tidak ada data booking / reservasi yang ditemukan"
            responsiveLayout="scroll"
            rowHover
            tableStyle={{ minWidth: '1200px' }}
            className="booking-datatable"
          >
            {/* Kolom Indikator Status Warna (Standar Master Data) */}
            <Column
              header=""
              headerStyle={{ width: '45px', textAlign: 'center' }}
              align="center"
              style={{ width: '45px', textAlign: 'center', verticalAlign: 'middle', padding: '0.85rem 0.25rem' }}
              body={(rowData: BookingRow) => {
                const statusColorMap: Record<string, { color: string; label: string }> = {
                  dikonfirmasi: { color: '#3b82f6', label: 'Dikonfirmasi' },
                  selesai: { color: '#22c55e', label: 'Selesai Check-in' },
                  tidak_hadir: { color: '#f59e0b', label: 'Tidak Hadir' },
                  dibatalkan: { color: '#ef4444', label: 'Dibatalkan' },
                };
                const st = statusColorMap[rowData.status] || { color: '#94a3b8', label: rowData.status };
                return (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      backgroundColor: st.color,
                      boxShadow: `0 1px 3px ${st.color}55`,
                    }}
                    title={`Status: ${st.label}`}
                  />
                );
              }}
            />

            {/* Kolom Kode Booking */}
            <Column
              field="kode_booking"
              header="Kode Booking"
              headerStyle={{ width: '150px' }}
              style={{ width: '150px', minWidth: '140px', verticalAlign: 'middle', padding: '0.85rem 1rem' }}
              body={(rowData: BookingRow) => (
                <div>
                  <div className="font-bold text-primary text-sm flex align-items-center gap-1">
                    <span>{rowData.kode_booking}</span>
                  </div>
                  <div className="mt-1">
                    <Tag
                      value={rowData.sumber ? rowData.sumber.toUpperCase() : 'STAFF'}
                      severity={rowData.sumber === 'whatsapp' ? 'success' : 'secondary'}
                      className="text-xs py-0 px-2 font-semibold"
                    />
                  </div>
                </div>
              )}
            />

            {/* Kolom Pasien */}
            <Column
              header="Pasien"
              headerStyle={{ width: '180px' }}
              style={{ width: '180px', minWidth: '160px', verticalAlign: 'middle', padding: '0.85rem 1rem' }}
              body={(rowData: BookingRow) => (
                <div>
                  <div className="font-bold text-900" style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>
                    {rowData.nama_pasien}
                  </div>
                  <div className="text-xs text-500 mt-1">No. RM: {rowData.no_rm}</div>
                  {rowData.no_hp_pasien && (
                    <div className="text-xs text-600 font-medium mt-0.5">{rowData.no_hp_pasien}</div>
                  )}
                </div>
              )}
            />

            {/* Kolom Layanan / Paket */}
            <Column
              header="Layanan / Paket"
              headerStyle={{ minWidth: '250px' }}
              style={{ minWidth: '250px', verticalAlign: 'middle', padding: '0.85rem 1rem' }}
              body={(rowData: BookingRow) => (
                <div>
                  <div className="font-semibold text-800 text-sm" style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>
                    {rowData.nama_layanan}
                  </div>
                  <div className="flex align-items-center gap-2 mt-1.5 flex-wrap">
                    {rowData.total_items && rowData.total_items > 1 ? (
                      <Tag value={`${rowData.total_items} Item`} severity="warning" className="text-xs py-0 px-1 font-bold" />
                    ) : (
                      <Tag
                        value={
                          rowData.jenis_layanan === 'klaim_paket'
                            ? 'Klaim Paket'
                            : rowData.jenis_layanan === 'paket'
                            ? 'Paket'
                            : 'Layanan'
                        }
                        severity={
                          rowData.jenis_layanan === 'klaim_paket'
                            ? 'info'
                            : rowData.jenis_layanan === 'paket'
                            ? 'warning'
                            : 'info'
                        }
                        className="text-xs py-0 px-1 font-semibold"
                      />
                    )}
                    {Number(rowData.butuh_konsul) === 1 && (
                      <Tag
                        value="Konsul Dulu"
                        style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}
                        className="text-xs py-0 px-1 font-semibold"
                      />
                    )}
                    <span className="text-xs text-700 font-bold">
                      {formatCurrency(rowData.total_biaya || rowData.harga_layanan || 0)}
                    </span>
                  </div>
                </div>
              )}
            />

            {/* Kolom Tanggal & Jam */}
            <Column
              header="Jadwal Janji Temu"
              headerStyle={{ width: '165px' }}
              style={{ width: '165px', minWidth: '155px', verticalAlign: 'middle', padding: '0.85rem 1rem' }}
              body={(rowData: BookingRow) => (
                <div>
                  <div className="font-semibold text-900 text-sm">{rowData.tanggal_booking}</div>
                  <div className="text-xs text-500 flex align-items-center mt-1 font-medium">
                    <Clock size={13} className="text-primary mr-1 flex-shrink-0" />
                    <span>{rowData.jam_booking} WIB</span>
                  </div>
                </div>
              )}
            />

            {/* Kolom Petugas & Ruangan */}
            <Column
              header="Petugas & Ruangan"
              headerStyle={{ minWidth: '230px' }}
              style={{ minWidth: '230px', verticalAlign: 'middle', padding: '0.85rem 1rem' }}
              body={(rowData: BookingRow) => (
                <div>
                  <div className="font-semibold text-800 text-sm" style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>
                    {rowData.nama_petugas || '-'}
                  </div>
                  <div className="text-xs text-500 mt-1 flex align-items-center" style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>
                    <i className="pi pi-map-marker text-xs text-400 mr-1 flex-shrink-0" />
                    <span>{rowData.nama_ruangan || '-'}</span>
                  </div>
                </div>
              )}
            />

            {/* Kolom Uang Muka (DP) */}
            <Column
              header="Uang Muka (DP)"
              headerStyle={{ width: '165px' }}
              style={{ width: '165px', minWidth: '150px', verticalAlign: 'middle', padding: '0.85rem 1rem' }}
              body={(rowData: BookingRow) => {
                const dpStatusSeverityMap: any = {
                  belum_bayar: 'warning',
                  sudah_bayar: 'success',
                  hangus: 'danger',
                  dipotong_treatment: 'info',
                };

                const dpStatusLabelMap: any = {
                  belum_bayar: 'Belum Bayar',
                  sudah_bayar: 'Lunas DP',
                  hangus: 'Hangus',
                  dipotong_treatment: 'Dipotong Kasir',
                };

                const methodLabelMap: Record<string, string> = {
                  cash: 'Tunai',
                  transfer: 'Transfer',
                  qris: 'QRIS',
                };

                return (
                  <div>
                    <div className="font-bold text-900 text-sm">
                      {formatCurrency(rowData.dp_nominal || 0)}
                    </div>
                    <div className="flex align-items-center gap-1 mt-1 flex-wrap">
                      <Tag
                        value={dpStatusLabelMap[rowData.dp_status] || rowData.dp_status}
                        severity={dpStatusSeverityMap[rowData.dp_status] || 'secondary'}
                        className="text-xs py-0 px-1 font-semibold"
                      />
                      {rowData.dp_nominal > 0 && rowData.metode_pembayaran_dp && (
                        <Tag
                          value={methodLabelMap[rowData.metode_pembayaran_dp] || rowData.metode_pembayaran_dp.toUpperCase()}
                          severity="info"
                          className="text-xs py-0 px-1 font-semibold"
                        />
                      )}
                    </div>
                    {rowData.dp_nominal === 0 && rowData.alasan_bebas_dp && (
                      <div className="text-xs text-500 mt-1 italic line-clamp-1" title={`Alasan: ${rowData.alasan_bebas_dp}`}>
                        {rowData.alasan_bebas_dp}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Kolom Aksi */}
            <Column
              header="Aksi"
              align="center"
              alignHeader="center"
              headerStyle={{ width: '110px', textAlign: 'center' }}
              style={{ width: '110px', textAlign: 'center', verticalAlign: 'middle', padding: '0.85rem 0.5rem' }}
              body={(rowData: BookingRow) => (
                <div className="flex align-items-center justify-content-center gap-2">
                  {/* 1. CHECK-IN BUTTON */}
                  {rowData.can_checkin && (
                    <Button
                      icon="pi pi-check"
                      outlined
                      severity="success"
                      className="p-button-sm border-round-md"
                      tooltip="Check-in Sekarang"
                      onClick={() => {
                        setSelectedBookingForCheckin(rowData);
                        setShowCheckinDialog(true);
                      }}
                    />
                  )}

                  {/* 2. TANDAI DP LUNAS BUTTON */}
                  {rowData.can_pay_dp && (
                    <Button
                      icon="pi pi-dollar"
                      outlined
                      severity="warning"
                      className="p-button-sm border-round-md"
                      tooltip="Tandai DP Lunas"
                      onClick={() => handleMarkDpLunas(rowData)}
                    />
                  )}

                  {/* 3. BATALKAN BUTTON */}
                  {rowData.can_cancel && (
                    <Button
                      icon="pi pi-times"
                      outlined
                      severity="danger"
                      className="p-button-sm border-round-md"
                      tooltip="Batalkan Booking"
                      onClick={() => handleCancelBooking(rowData)}
                    />
                  )}

                  {/* 4. TANDAI TIDAK HADIR BUTTON */}
                  {rowData.can_mark_tidak_hadir && (
                    <Button
                      icon="pi pi-user-minus"
                      outlined
                      severity="secondary"
                      className="p-button-sm border-round-md"
                      tooltip="Tandai Tidak Hadir"
                      onClick={() => handleMarkTidakHadir(rowData)}
                    />
                  )}

                  {/* 5. LIHAT BUKTI / CETAK */}
                  <Button
                    icon="pi pi-print"
                    outlined
                    severity="info"
                    className="p-button-sm border-round-md"
                    tooltip="Lihat Bukti Reservasi"
                    onClick={() => {
                      setSelectedBookingForDetail(rowData);
                      setShowDetailDialog(true);
                    }}
                  />
                </div>
              )}
            />
          </DataTable>
        </div>

        {/* Global Styles for Booking DataTable Padding & Polish */}
        <style jsx global>{`
          .booking-datatable .p-datatable-thead > tr > th {
            padding: 0.95rem 1rem !important;
            font-size: 0.84rem;
            font-weight: 700;
            color: #334155;
            background-color: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            white-space: nowrap;
          }
          .booking-datatable .p-datatable-tbody > tr > td {
            padding: 0.95rem 1rem !important;
            font-size: 0.85rem;
            border-bottom: 1px solid #f1f5f9;
          }
          .booking-datatable .p-datatable-tbody > tr:hover {
            background-color: #f8fafc !important;
          }
        `}</style>
      </div>
    </>
  );
};
