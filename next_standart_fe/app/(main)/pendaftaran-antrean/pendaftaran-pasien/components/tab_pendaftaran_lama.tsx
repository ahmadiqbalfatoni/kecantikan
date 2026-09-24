'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable, DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { formatDateSystem } from '@/lib/tools/dateTools';
import { apiPasienCari } from './endpoints';
import { StepPilihLayanan } from './StepPilihLayanan';
import { KarcisAntrianModal } from './dialogs/KarcisAntrianModal';
import { KarcisAntrianLayananModal } from './dialogs/KarcisAntrianLayananModal';
import { PasienKtpCard } from '../../components/PasienKtpCard';

export interface Pasien {
  id: number;
  no_rm: string;
  nama: string;
  nik?: string;
  no_hp?: string;
  email?: string;
  tempat_lahir?: string;
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
  kode_pos?: string;
  alamat?: string;
  patokan?: string;
  alergi?: string;
  nama_kontak_darurat?: string;
  no_hp_kontak_darurat?: string;
  hubungan_kontak_darurat?: string;
  foto?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  toast: React.RefObject<Toast>;
  onRefreshVisits?: () => void;
  onEditPasien?: (pasien: Pasien) => void;
  externalKeyword?: string;
  refreshTrigger?: number;
}

export const TabPendaftaranLama: React.FC<Props> = ({
  toast,
  onRefreshVisits,
  onEditPasien,
  externalKeyword,
  refreshTrigger,
}) => {
  // Step state: 1 = Cari & Pilih Pasien, 2 = Pilih Layanan & Paket Treatment
  const [step, setStep] = useState<number>(1);
  const [selectedPasien, setSelectedPasien] = useState<Pasien | null>(null);
  const [detailPasien, setDetailPasien] = useState<Pasien | null>(null);

  // Data & Table state
  const [data, setData] = useState<Pasien[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [searchVal, setSearchVal] = useState(externalKeyword || '');
  const [keyword, setKeyword] = useState(externalKeyword || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync externalKeyword from parent search card
  useEffect(() => {
    if (externalKeyword !== undefined && externalKeyword !== keyword) {
      setKeyword(externalKeyword);
      setSearchVal(externalKeyword);
      setPage(1);
      setFirst(0);
    }
  }, [externalKeyword]);

  // Success Modals
  const [karcisVisible, setKarcisVisible] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [antrianLayananModalVisible, setAntrianLayananModalVisible] = useState(false);
  const [antrianLayananData, setAntrianLayananData] = useState<any>(null);

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
  }, [page, rows, keyword, refreshTrigger]);

  const onPageChange = (event: DataTableStateEvent) => {
    setFirst(event.first);
    setRows(event.rows);
    setPage((event.page || 0) + 1);
  };

  const handleSelectPasien = (pasien: Pasien) => {
    setSelectedPasien(pasien);
    setStep(2);
  };

  const handleLayananSuccess = (resultData: any) => {
    if (resultData.antrian_layanan && resultData.antrian_layanan.length > 0) {
      setAntrianLayananData(resultData);
      setAntrianLayananModalVisible(true);
    } else {
      setTicketData({
        no_rm: resultData.no_rm,
        nama: resultData.nama_pasien,
        kode_kunjungan: resultData.kode_kunjungan,
        nomor_antrian: resultData.nomor_antrian_awal,
        kode_antrian: resultData.kode_antrian_awal,
        tanggal_kunjungan: resultData.tanggal_kunjungan,
        jam_datang: resultData.jam_datang,
      });
      setKarcisVisible(true);
    }

    if (onRefreshVisits) onRefreshVisits();
    setStep(1);
    setSelectedPasien(null);
  };

  const noRmBodyTemplate = (rowData: Pasien) => {
    return <span className="font-bold text-900">{rowData.no_rm}</span>;
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

  const actionBodyTemplate = (rowData: Pasien) => {
    return (
      <div className="flex align-items-center justify-content-center gap-1">
        <Button
          label="Pilih"
          icon="pi pi-arrow-right"
          iconPos="right"
          size="small"
          severity="success"
          className="border-round-md font-bold text-xs px-2 py-1"
          onClick={(e) => {
            e.stopPropagation();
            setDetailPasien(rowData);
          }}
          tooltip="Pilih Pasien"
          tooltipOptions={{ position: 'top' }}
        />
      </div>
    );
  };

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
      setFirst(0);
    }, 300);
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearchVal('');
    setKeyword('');
    setPage(1);
    setFirst(0);
  };

  const calculateAge = (birthDateStr?: string | null): number | null => {
    if (!birthDateStr) return null;
    try {
      const cleanStr = birthDateStr.split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          const now = new Date();
          let age = now.getFullYear() - year;
          const m = now.getMonth() - month;
          if (m < 0 || (m === 0 && now.getDate() < day)) {
            age--;
          }
          return age >= 0 ? age : null;
        }
      }
      const birth = new Date(birthDateStr);
      if (isNaN(birth.getTime())) return null;
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch (_) {
      return null;
    }
  };

  const headerTemplate = (
    <div className="flex flex-wrap align-items-center justify-content-between gap-2">
      <span className="text-xl font-bold text-900">Data Pasien Terdaftar</span>
      <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
        <IconField iconPosition="left" className="w-full md:w-20rem">
          <InputIcon className="pi pi-search" />
          <InputText
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                setKeyword(searchVal);
                setPage(1);
                setFirst(0);
              }
            }}
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
          onClick={handleClearSearch}
        />
      </div>
    </div>
  );

  if (step === 2 && selectedPasien) {
    return (
      <>
        <StepPilihLayanan
          pasienData={selectedPasien}
          toast={toast}
          onSuccess={handleLayananSuccess}
          onBack={() => {
            setStep(1);
            setSelectedPasien(null);
          }}
        />

        <KarcisAntrianModal
          visible={karcisVisible}
          onHide={() => setKarcisVisible(false)}
          data={ticketData}
        />

        <KarcisAntrianLayananModal
          visible={antrianLayananModalVisible}
          onHide={() => setAntrianLayananModalVisible(false)}
          data={antrianLayananData}
        />
      </>
    );
  }

  return (
    <>
      {/* DATA TABLE PASIEN LAMA UNTUK PENDAFTARAN */}
      <DataTable
        value={data}
        scrollable
        lazy
        paginator
        first={first}
        rows={rows}
        totalRecords={totalRecords}
        onPage={onPageChange}
        header={headerTemplate}
        loading={loading}
        dataKey="no_rm"
        emptyMessage="Data Pasien Tidak Ditemukan"
        rowsPerPageOptions={[10, 25, 50]}
        rowHover
        onRowClick={(e) => setDetailPasien(e.data as Pasien)}
        style={{ cursor: 'pointer' }}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data pasien"
      >
        <Column field="no_rm" header="No. RM" body={noRmBodyTemplate} align="center" sortable style={{ minWidth: '8rem' }} />
        <Column field="nama" header="Nama Pasien" className="font-bold text-900" sortable style={{ minWidth: '13rem' }} />
        <Column field="nik" header="NIK" align="center" style={{ minWidth: '10rem' }} body={(r: Pasien) => r.nik || '-'} />
        <Column field="no_hp" header="No. HP" align="center" style={{ minWidth: '10rem' }} body={(r: Pasien) => r.no_hp || '-'} />
        <Column field="tanggal_lahir" header="Tgl Lahir" align="center" style={{ minWidth: '8rem' }} body={(r: Pasien) => (r.tanggal_lahir ? r.tanggal_lahir.split('T')[0] : '-')} />
        <Column header="L/P" body={jenisKelaminBodyTemplate} align="center" style={{ minWidth: '7rem' }} />
        <Column field="kota_kabupaten" header="Kota / Alamat" style={{ minWidth: '12rem' }} body={(r: Pasien) => r.kota_kabupaten || r.provinsi || '-'} />
        <Column header="Aksi" body={actionBodyTemplate} align="center" style={{ minWidth: '7rem' }} />
      </DataTable>

      {/* DIALOG DETAIL PASIEN (e-KTP PASIEN MODEL) */}
      <Dialog
        visible={Boolean(detailPasien)}
        onHide={() => setDetailPasien(null)}
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-id-card text-emerald-600 text-xl" />
            <span className="font-bold text-base text-800">Kartu Identitas Pasien</span>
          </div>
        }
        modal
        style={{ width: '100%', maxWidth: '660px' }}
        breakpoints={{ '661px': '95vw' }}
        contentClassName="p-3 surface-50"
        footer={
          <div className="flex flex-wrap justify-content-end align-items-center gap-2 pt-3 border-top-1 surface-border">
            <Button
              label="Batal"
              icon="pi pi-times"
              severity="secondary"
              outlined
              className="text-xs font-medium"
              onClick={() => setDetailPasien(null)}
            />
            {onEditPasien && (
              <Button
                label="Lengkapi / Edit Data Pasien"
                icon="pi pi-user-edit"
                severity="warning"
                outlined
                className="font-medium text-xs"
                onClick={() => {
                  const target = detailPasien;
                  setDetailPasien(null);
                  if (target) onEditPasien(target);
                }}
              />
            )}
            <Button
              label="Pilih Layanan & Treatment"
              icon="pi pi-arrow-right"
              iconPos="right"
              severity="success"
              className="font-bold text-xs px-3 py-2 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-1"
              onClick={() => {
                const target = detailPasien;
                setDetailPasien(null);
                if (target) handleSelectPasien(target);
              }}
            />
          </div>
        }
      >
        {detailPasien && <PasienKtpCard pasien={detailPasien} />}
      </Dialog>

      <KarcisAntrianModal
        visible={karcisVisible}
        onHide={() => setKarcisVisible(false)}
        data={ticketData}
      />

      <KarcisAntrianLayananModal
        visible={antrianLayananModalVisible}
        onHide={() => setAntrianLayananModalVisible(false)}
        data={antrianLayananData}
      />
    </>
  );
};
