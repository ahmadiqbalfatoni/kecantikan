'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable, DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { formatDateSystem } from '@/lib/tools/dateTools';
import { apiPasienCari, apiPasienDelete } from './endpoints';

export interface Pasien {
  id: number;
  no_rm: string;
  nama: string;
  nik?: string;
  no_hp?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  golongan_darah?: string;
  agama?: string;
  status_perkawinan?: string;
  kewarganegaraan?: string;
  pekerjaan?: string;
  provinsi?: string;
  kota_kabupaten?: string;
  kecamatan?: string;
  kelurahan_desa?: string;
  patokan?: string;
  alergi?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  toast: React.RefObject<Toast>;
  onSelectPasien?: (pasien: Pasien) => void;
  onAddNewPasien?: () => void;
  onEditPasien?: (pasien: Pasien) => void;
}

export const TabPasienLama: React.FC<Props> = ({
  toast,
  onSelectPasien,
  onAddNewPasien,
  onEditPasien,
}) => {
  const [data, setData] = useState<Pasien[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selection
  const [selectedDatas, setSelectedDatas] = useState<Pasien[]>([]);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [searchVal, setSearchVal] = useState('');
  const [keyword, setKeyword] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPasienData = async () => {
    setLoading(true);
    try {
      const payload = {
        page,
        perPage: rows,
        keyword: keyword.trim(),
      };

      const res = await postData(apiPasienCari, payload);
      if (['00', '0000'].includes(res.data.status)) {
        setData(res.data.data || []);
        setTotalRecords(res.data.total_data || 0);
      } else {
        showError(toast, res.data.message || 'Gagal memuat data pasien');
      }
    } catch (error: any) {
      showError(toast, 'Terjadi kesalahan saat memuat master data pasien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasienData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rows, keyword]);

  const onPageChange = (event: DataTableStateEvent) => {
    setFirst(event.first);
    setRows(event.rows);
    setPage((event.page || 0) + 1);
  };

  const handleOpenEditForm = (pasien: Pasien) => {
    if (onEditPasien) {
      onEditPasien(pasien);
    }
  };

  const handleOpenNewForm = () => {
    if (onAddNewPasien) {
      onAddNewPasien();
    }
  };

  const handleConfirmSingleDelete = (pasien: Pasien) => {
    confirmDialog({
      message: `Apakah Anda yakin ingin menghapus data pasien ${pasien.nama} (${pasien.no_rm})?`,
      header: 'Konfirmasi Hapus Pasien',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ya, Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setLoading(true);
        try {
          const res = await postData(apiPasienDelete, { no_rm: [pasien.no_rm] });
          showSuccess(toast, res.data?.message || 'Data pasien berhasil dihapus');
          setSelectedDatas((prev) => prev.filter((p) => p.no_rm !== pasien.no_rm));
          await fetchPasienData();
        } catch (error: any) {
          const msg = error?.response?.data?.message || 'Gagal menghapus data pasien';
          showError(toast, msg);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleConfirmBulkDelete = () => {
    if (selectedDatas.length === 0) return;
    const noRmList = selectedDatas.map((p) => p.no_rm);

    confirmDialog({
      message: `Apakah Anda yakin ingin menghapus ${selectedDatas.length} data pasien terpilih?`,
      header: 'Konfirmasi Hapus Masal',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ya, Hapus Semua',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        setLoading(true);
        try {
          const res = await postData(apiPasienDelete, { no_rm: noRmList });
          showSuccess(toast, res.data?.message || 'Data pasien terpilih berhasil dihapus');
          setSelectedDatas([]);
          await fetchPasienData();
        } catch (error: any) {
          const msg = error?.response?.data?.message || 'Gagal menghapus data pasien';
          showError(toast, msg);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Body Templates
  const noRmBodyTemplate = (rowData: Pasien) => {
    return <Tag value={rowData.no_rm} severity="info" className="font-bold text-xs" />;
  };

  const jenisKelaminBodyTemplate = (rowData: Pasien) => {
    if (!rowData.jenis_kelamin) return <span className="text-400 font-italic">-</span>;
    const isMale = rowData.jenis_kelamin === 'L';
    return (
      <Tag
        value={isMale ? 'Laki-Laki' : 'Perempuan'}
        severity={isMale ? 'warning' : 'success'}
        className="text-xs px-2 py-1"
      />
    );
  };

  const statusBodyTemplate = (rowData: Pasien) => {
    const statusVal = rowData.status || 'aktif';
    return (
      <Tag
        value={statusVal.toUpperCase()}
        severity={statusVal === 'aktif' ? 'success' : 'danger'}
        className="text-xs px-3 py-1 font-bold"
      />
    );
  };

  const actionBodyTemplate = (rowData: Pasien) => {
    return (
      <div className="flex justify-content-center gap-2">
        <Button
          icon="pi pi-pencil"
          outlined
          className="p-button-sm border-round-md"
          tooltip="Edit Profile"
          onClick={() => handleOpenEditForm(rowData)}
        />
        <Button
          icon="pi pi-trash"
          outlined
          severity="danger"
          className="p-button-sm border-round-md"
          tooltip="Hapus"
          onClick={() => handleConfirmSingleDelete(rowData)}
        />
        {onSelectPasien && (
          <Button
            icon="pi pi-ticket"
            outlined
            severity="success"
            className="p-button-sm border-round-md"
            tooltip="Pilih Pasien & Ambil Antrean"
            onClick={() => onSelectPasien(rowData)}
          />
        )}
      </div>
    );
  };

  const headerTemplate = (
    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
      <span className="text-xl font-bold">Data Master Pasien</span>
      <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
        <span className="p-input-icon-left w-full md:w-20rem">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={searchVal}
              className="w-full text-sm"
              placeholder="Cari Data..."
              onChange={(e) => {
                const value = e.target.value;
                setSearchVal(value);
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = setTimeout(() => {
                  setKeyword(value);
                  setPage(1);
                  setFirst(0);
                }, 400);
              }}
            />
          </IconField>
        </span>
        <Button
          type="button"
          icon="pi pi-filter-slash"
          outlined
          severity="danger"
          tooltip="Reset Filter"
          tooltipOptions={{ position: 'bottom' }}
          onClick={() => {
            setSearchVal('');
            setKeyword('');
            setPage(1);
            setFirst(0);
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <ConfirmDialog />

      <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
        {/* SUBHEADER TITLE */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
            <i className="pi pi-list text-purple-600 text-2xl" />
            Kelola Master Data Pasien
          </h3>
          <p className="text-500 text-sm m-0">
            Tambah, edit, hapus, atau kelola data rekam medis pasien terdaftar klinik.
          </p>
        </div>

        {/* TOP ACTION BUTTON BAR */}
        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
          <Button
            size="small"
            label="Baru"
            icon="pi pi-plus"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            onClick={handleOpenNewForm}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label={`Hapus${selectedDatas.length > 0 ? ` (${selectedDatas.length})` : ''}`}
            icon="pi pi-trash"
            severity="danger"
            outlined
            disabled={selectedDatas.length === 0}
            className="border-round-md font-medium px-3"
            onClick={handleConfirmBulkDelete}
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
            onClick={fetchPasienData}
          />
        </div>

        {/* DATA TABLE PASIEN LAMA */}
        <DataTable
          value={data}
          scrollable
          lazy
          paginator
          first={first}
          rows={rows}
          totalRecords={totalRecords}
          onPage={onPageChange}
          selectionMode="multiple"
          header={headerTemplate}
          loading={loading}
          selection={selectedDatas}
          onSelectionChange={(e) => setSelectedDatas(e.value as Pasien[])}
          dataKey="no_rm"
          emptyMessage="Data Kosong"
          rowsPerPageOptions={[10, 25, 50]}
          className="p-datatable-sm p-datatable-gridlines"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
          <Column field="no_rm" header="No. RM" body={noRmBodyTemplate} align="center" sortable style={{ minWidth: '8rem' }} />
          <Column field="nama" header="Nama Pasien" className="font-bold text-900" sortable style={{ minWidth: '12rem' }} />
          <Column field="nik" header="NIK" align="center" style={{ minWidth: '10rem' }} body={(r: Pasien) => r.nik || '-'} />
          <Column field="no_hp" header="No. HP" align="center" style={{ minWidth: '10rem' }} body={(r: Pasien) => r.no_hp || '-'} />
          <Column field="tanggal_lahir" header="Tgl Lahir" align="center" style={{ minWidth: '8rem' }} body={(r: Pasien) => (r.tanggal_lahir ? r.tanggal_lahir.split('T')[0] : '-')} />
          <Column header="L/P" body={jenisKelaminBodyTemplate} align="center" style={{ minWidth: '7rem' }} />
          <Column field="kota_kabupaten" header="Kota / Alamat" style={{ minWidth: '12rem' }} body={(r: Pasien) => r.kota_kabupaten || r.provinsi || '-'} />
          <Column field="status" header="Status" body={statusBodyTemplate} align="center" sortable style={{ minWidth: '8rem' }} />
          <Column field="created_at" header="Dibuat" body={(r: Pasien) => formatDateSystem(r.created_at)} align="center" sortable style={{ minWidth: '12rem' }} />
          <Column header="Aksi" body={actionBodyTemplate} align="center" frozen alignFrozen="right" style={{ minWidth: '10rem' }} />
        </DataTable>
      </div>
    </>
  );
};
