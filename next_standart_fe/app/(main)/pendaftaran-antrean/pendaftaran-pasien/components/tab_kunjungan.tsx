'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiPasienData, apiPasienBatal } from './endpoints';

interface Kunjungan {
  kunjungan_id: number;
  kode_kunjungan: string;
  no_rm: string;
  nama_pasien: string;
  no_hp: string;
  jam_datang: string;
  status_kunjungan: 'berlangsung' | 'selesai' | 'batal';
  nomor_antrian?: string;
  kode_antrian_awal?: string;
  dipanggil_at?: string;
  jenis_layanan?: string;
  nama_layanan_detail?: string;
}

interface Props {
  toast: React.RefObject<Toast>;
  refreshTrigger?: number;
}

export const TabKunjungan: React.FC<Props> = ({ toast, refreshTrigger }) => {
  const [data, setData] = useState<Kunjungan[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Cancel Dialog State
  const [batalDialogVisible, setBatalDialogVisible] = useState(false);
  const [selectedKunjunganBatal, setSelectedKunjunganBatal] = useState<Kunjungan | null>(null);
  const [batalLoading, setBatalLoading] = useState(false);

  const fetchKunjunganData = async () => {
    setLoading(true);
    try {
      const payload = {
        page,
        perPage: rows,
        keyword,
        status: statusFilter || undefined,
        sortField: 'created_at',
        sortOrder: 'desc',
      };

      const res = await postData(apiPasienData, payload);
      if (['00', '0000'].includes(res.data.status)) {
        setData(res.data.data || []);
        setTotalRecords(res.data.total_data || 0);
      } else {
        showError(toast, res.data.message || 'Gagal mengambil data kunjungan');
      }
    } catch (error: any) {
      showError(toast, 'Terjadi kesalahan saat memuat data kunjungan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKunjunganData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rows, keyword, statusFilter, refreshTrigger]);

  // Auto-polling interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchKunjunganData();
    }, 8000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, page, rows, keyword, statusFilter]);

  const onPageChange = (event: DataTableStateEvent) => {
    setFirst(event.first);
    setRows(event.rows);
    setPage((event.page || 0) + 1);
  };

  const handleOpenBatalDialog = (row: Kunjungan) => {
    setSelectedKunjunganBatal(row);
    setBatalDialogVisible(true);
  };

  const handleConfirmBatal = async () => {
    if (!selectedKunjunganBatal) return;
    setBatalLoading(true);
    try {
      const res = await postData(apiPasienBatal, {
        kode_kunjungan: selectedKunjunganBatal.kode_kunjungan,
      });

      if (['00', '0000'].includes(res.data.status)) {
        showSuccess(toast, res.data.message || 'Kunjungan berhasil dibatalkan');
        setBatalDialogVisible(false);
        fetchKunjunganData();
      } else {
        showError(toast, res.data.message || 'Gagal membatalkan kunjungan');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Terjadi kesalahan sistem';
      showError(toast, msg);
    } finally {
      setBatalLoading(false);
    }
  };

  const statusOptions = [
    { label: 'Semua Status', value: '' },
    { label: 'Berlangsung', value: 'berlangsung' },
    { label: 'Selesai', value: 'selesai' },
    { label: 'Batal', value: 'batal' },
  ];

  const statusBodyTemplate = (rowData: Kunjungan) => {
    let severity: 'info' | 'success' | 'danger' | 'warning' = 'info';
    let label = rowData.status_kunjungan.toUpperCase();

    if (rowData.status_kunjungan === 'berlangsung') {
      severity = 'info';
      label = 'BERLANGSUNG';
    } else if (rowData.status_kunjungan === 'selesai') {
      severity = 'success';
      label = 'SELESAI';
    } else if (rowData.status_kunjungan === 'batal') {
      severity = 'danger';
      label = 'BATAL';
    }

    return <Tag value={label} severity={severity} className="px-3 py-1 font-bold text-xs" />;
  };

  const antrianBodyTemplate = (rowData: Kunjungan) => {
    if (!rowData.nomor_antrian) return <span className="text-400 font-italic">-</span>;
    return (
      <span className="inline-flex align-items-center justify-content-center bg-blue-100 text-blue-800 font-extrabold border-round px-3 py-1 text-sm border-1 border-blue-200">
        {rowData.nomor_antrian}
      </span>
    );
  };

  const jenisLayananBodyTemplate = (rowData: Kunjungan) => {
    if (!rowData.jenis_layanan && !rowData.nama_layanan_detail) {
      return <span className="text-400 font-italic text-xs">Tanpa Layanan</span>;
    }

    const types = (rowData.jenis_layanan || '').split(', ').map((t) => t.trim()).filter(Boolean);
    return (
      <div className="flex flex-column gap-1">
        <div className="flex align-items-center gap-1 flex-wrap">
          {types.map((t, idx) => (
            <Tag
              key={idx}
              value={t.toUpperCase()}
              severity={t === 'paket' ? 'warning' : 'info'}
              className="text-xs px-2 py-0 font-bold"
            />
          ))}
        </div>
        {rowData.nama_layanan_detail && (
          <span className="text-xs text-800 font-medium max-w-15rem block truncate" title={rowData.nama_layanan_detail}>
            {rowData.nama_layanan_detail}
          </span>
        )}
      </div>
    );
  };

  const actionBodyTemplate = (rowData: Kunjungan) => {
    if (rowData.status_kunjungan === 'batal') {
      return <span className="text-xs text-400 font-italic">Dibatalkan</span>;
    }
    if (rowData.status_kunjungan === 'selesai') {
      return <span className="text-xs text-green-600 font-semibold"><i className="pi pi-check mr-1" />Selesai</span>;
    }

    return (
      <Button
        label="Batal"
        icon="pi pi-times-circle"
        className="p-button-danger p-button-outlined p-button-sm border-round-lg"
        onClick={() => handleOpenBatalDialog(rowData)}
      />
    );
  };

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      {/* TOOLBAR SEARCH & FILTERS */}
      <div className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
        <div className="flex flex-column md:flex-row align-items-stretch md:align-items-center gap-2 w-full md:w-auto">
          <div className="p-input-icon-left w-full md:w-20rem">
            <i className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, RM, atau antrian..."
              className="w-full border-round-lg"
            />
          </div>

          <Dropdown
            value={statusFilter}
            options={statusOptions}
            onChange={(e) => setStatusFilter(e.value)}
            className="w-full md:w-12rem border-round-lg"
          />
        </div>

        <div className="flex align-items-center gap-2 justify-content-end">
          <Button
            icon={`pi ${autoRefresh ? 'pi-sync spin-icon text-blue-500' : 'pi-pause'}`}
            label={autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            className={`p-button-sm border-round-lg ${autoRefresh ? 'p-button-outlined p-button-info' : 'p-button-outlined p-button-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          />

          <Button
            icon="pi pi-refresh"
            label="Refresh"
            className="p-button-sm p-button-secondary border-round-lg"
            onClick={fetchKunjunganData}
            loading={loading}
          />
        </div>
      </div>

      {/* DATA TABLE KUNJUNGAN */}
      <DataTable
        value={data}
        lazy
        paginator
        first={first}
        rows={rows}
        totalRecords={totalRecords}
        onPage={onPageChange}
        loading={loading}
        rowsPerPageOptions={[10, 25, 50]}
        tableStyle={{ minWidth: '50rem' }}
        className="p-datatable-gridlines p-datatable-sm border-round-lg overflow-hidden"
        emptyMessage="Belum ada pendaftaran kunjungan pasien hari ini."
      >
        <Column header="No. Antrian" body={antrianBodyTemplate} style={{ width: '100px', textAlign: 'center' }} />
        <Column field="kode_kunjungan" header="Kode Kunjungan" className="font-semibold text-blue-700" style={{ width: '150px' }} />
        <Column field="no_rm" header="No. RM" className="font-semibold" style={{ width: '120px' }} />
        <Column field="nama_pasien" header="Nama Pasien" className="font-bold text-900" />
        <Column header="Jenis / Treatment" body={jenisLayananBodyTemplate} style={{ minWidth: '180px' }} />
        <Column field="no_hp" header="No. HP" style={{ width: '130px' }} />
        <Column field="jam_datang" header="Jam Datang" style={{ width: '110px' }} />
        <Column header="Status" body={statusBodyTemplate} style={{ width: '130px', textAlign: 'center' }} />
        <Column header="Aksi" body={actionBodyTemplate} style={{ width: '120px', textAlign: 'center' }} />
      </DataTable>

      {/* DIALOG KONFIRMASI BATAL */}
      <Dialog
        visible={batalDialogVisible}
        onHide={() => setBatalDialogVisible(false)}
        header="Konfirmasi Pembatalan Kunjungan"
        style={{ width: '420px' }}
        modal
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Batal"
              icon="pi pi-times"
              className="p-button-outlined p-button-secondary"
              onClick={() => setBatalDialogVisible(false)}
              disabled={batalLoading}
            />
            <Button
              label="Ya, Batalkan Kunjungan"
              icon="pi pi-check"
              className="p-button-danger"
              onClick={handleConfirmBatal}
              loading={batalLoading}
            />
          </div>
        }
      >
        {selectedKunjunganBatal && (
          <div className="text-center py-2">
            <i className="pi pi-exclamation-triangle text-red-500 text-5xl mb-3 block" />
            <p className="m-0 text-900 font-semibold text-base">
              Apakah Anda yakin ingin membatalkan kunjungan pasien ini?
            </p>
            <div className="surface-100 p-3 border-round mt-3 text-left text-xs border-1 surface-border">
              <div><b>Nama:</b> {selectedKunjunganBatal.nama_pasien}</div>
              <div><b>No. RM:</b> {selectedKunjunganBatal.no_rm}</div>
              <div><b>Kode Kunjungan:</b> {selectedKunjunganBatal.kode_kunjungan}</div>
              <div><b>No. Antrian:</b> {selectedKunjunganBatal.nomor_antrian || '-'}</div>
            </div>
            <p className="text-xs text-500 mt-2 m-0">
              *Nomor antrian <b>{selectedKunjunganBatal.nomor_antrian || '-'}</b> akan dikembalikan ke status TERSEDIA untuk pasien berikutnya.
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
};
