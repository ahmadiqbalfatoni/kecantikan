'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { DataTable, DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Divider } from 'primereact/divider';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { PasienFormCard } from '../pendaftaran-pasien/components/PasienFormCard';
import { PasienKtpCard } from '../components/PasienKtpCard';
import { DialogPilihanKunjungan } from '../components/DialogPilihanKunjungan';

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

const RegistrasiPasienPage = () => {
  const router = useRouter();
  const toast = useRef<Toast>(null);

  // Table & Pagination State
  const [data, setData] = useState<Pasien[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [first, setFirst] = useState(0);
  const [searchVal, setSearchVal] = useState('');
  const [keyword, setKeyword] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal / Dialog States
  const [dialogTambahPasienVisible, setDialogTambahPasienVisible] = useState<boolean>(false);
  const [dialogEditPasienVisible, setDialogEditPasienVisible] = useState<boolean>(false);
  const [editingPasien, setEditingPasien] = useState<Pasien | null>(null);
  const [detailPasien, setDetailPasien] = useState<Pasien | null>(null);
  const [pilihanKunjunganPasien, setPilihanKunjunganPasien] = useState<Pasien | null>(null);
  const [successDialogVisible, setSuccessDialogVisible] = useState<boolean>(false);
  const [newPatientData, setNewPatientData] = useState<any>(null);

  // Key untuk mereset form tambah saat dibuka ulang
  const [formKey, setFormKey] = useState<number>(1);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchPasienData = async () => {
    setLoading(true);
    try {
      const payload = {
        page,
        perPage: rows,
        keyword: keyword.trim(),
      };

      const res = await postData('/master/pendaftaran-pasien-cari', payload);
      if (['00', '0000', 200].includes(res.data.status) || res.status === 200) {
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
  }, [page, rows, keyword, refreshTrigger]);

  const onPageChange = (event: DataTableStateEvent) => {
    setFirst(event.first);
    setRows(event.rows);
    setPage((event.page || 0) + 1);
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

  // Tambah Pasien Baru Handlers
  const handleOpenTambahModal = () => {
    setFormKey((prev) => prev + 1);
    setDialogTambahPasienVisible(true);
  };

  const handleRegistrationSuccess = (resultData: any) => {
    setDialogTambahPasienVisible(false);
    setNewPatientData(resultData);
    setSuccessDialogVisible(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRegisterAnother = () => {
    setSuccessDialogVisible(false);
    setNewPatientData(null);
    setFormKey((prev) => prev + 1);
    setDialogTambahPasienVisible(true);
  };

  // Edit Pasien Handlers
  const handleEditPasien = (pasien: Pasien) => {
    setEditingPasien(pasien);
    setDialogEditPasienVisible(true);
  };

  const handleEditSuccess = () => {
    setDialogEditPasienVisible(false);
    setEditingPasien(null);
    setRefreshTrigger((prev) => prev + 1);
    showSuccess(toast, 'Data pasien berhasil diperbarui');
  };

  // DataTable Template
  const noRmBodyTemplate = (rowData: Pasien) => {
    return <span className="font-bold text-900 font-mono">{rowData.no_rm}</span>;
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

  const formatDateOnly = (val?: string | null) => {
    if (!val) return '-';
    return val.split('T')[0];
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

  const actionBodyTemplate = (rowData: Pasien) => {
    return (
      <div className="flex align-items-center justify-content-center gap-1">
        <Button
          icon="pi pi-eye"
          size="small"
          outlined
          severity="info"
          className="p-button-sm border-round-md"
          onClick={(e) => {
            e.stopPropagation();
            setDetailPasien(rowData);
          }}
          tooltip="Lihat Detail Profil Pasien"
          tooltipOptions={{ position: 'top' }}
        />
        <Button
          icon="pi pi-pencil"
          size="small"
          outlined
          severity="warning"
          className="p-button-sm border-round-md"
          onClick={(e) => {
            e.stopPropagation();
            handleEditPasien(rowData);
          }}
          tooltip="Edit Data Pasien"
          tooltipOptions={{ position: 'top' }}
        />
      </div>
    );
  };

  const headerTableTemplate = (
    <div className="flex flex-wrap align-items-center justify-content-between gap-3">
      <span className="text-xl font-bold text-900">Daftar Pasien Terdaftar</span>
      <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
        <IconField iconPosition="left" className="w-full md:w-22rem">
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
            placeholder="Cari Nama, No. RM, No. HP, atau NIK..."
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

  return (
    <div className="layout-registrasi-pasien">
      <Toast ref={toast} position="top-right" />

      {/* HEADER SECTION */}
      <div className="card p-4 mb-4 border-round-xl surface-card shadow-1 border-1 surface-border">
        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-900 m-0 flex align-items-center gap-2 mb-1">
              <i className="pi pi-user-plus text-teal-600 text-2xl" />
              Pasien Baru
            </h2>
            <p className="text-color-secondary m-0 text-sm">
              Pusat data pasien terdaftar dan formulir pendaftaran identitas pasien baru klinik kecantikan.
            </p>
          </div>
        </div>
      </div>

      {/* CARD UTAMA: ACTION BAR & DATATABLE PASIEN */}
      <div className="card border-round-xl p-4 shadow-1 surface-card border-1 surface-border mb-4">
        {/* BARIS TOMBOL AKSI: TAMBAH PASIEN BARU, CETAK, REFRESH */}
        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
          <Button
            type="button"
            size="small"
            label="Baru"
            icon="pi pi-plus"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            tooltip="Tambah Pasien Baru"
            tooltipOptions={{ position: 'bottom' }}
            onClick={handleOpenTambahModal}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            type="button"
            size="small"
            label="Cetak"
            icon="pi pi-print"
            outlined
            className="border-round-md font-medium px-3 border-purple-600 text-purple-600"
            tooltip="Cetak Data Pasien"
            tooltipOptions={{ position: 'bottom' }}
            onClick={() => window.print()}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            type="button"
            size="small"
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            tooltip="Refresh Data Pasien"
            tooltipOptions={{ position: 'bottom' }}
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
          />
        </div>

        {/* TABEL DATA PASIEN */}
        <DataTable
          value={data}
          scrollable
          lazy
          paginator
          first={first}
          rows={rows}
          totalRecords={totalRecords}
          onPage={onPageChange}
          header={headerTableTemplate}
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
          <Column field="tanggal_lahir" header="Tgl Lahir" align="center" style={{ minWidth: '8rem' }} body={(r: Pasien) => formatDateOnly(r.tanggal_lahir)} />
          <Column header="L/P" body={jenisKelaminBodyTemplate} align="center" style={{ minWidth: '7rem' }} />
          <Column field="kota_kabupaten" header="Kota / Alamat" style={{ minWidth: '12rem' }} body={(r: Pasien) => r.kota_kabupaten || r.provinsi || '-'} />
          <Column header="Aksi" body={actionBodyTemplate} align="center" style={{ minWidth: '7rem' }} />
        </DataTable>
      </div>

      {/* POPUP MODAL DIALOG: TAMBAH PASIEN BARU */}
      <Dialog
        visible={dialogTambahPasienVisible}
        onHide={() => setDialogTambahPasienVisible(false)}
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-user-plus text-teal-600 text-xl" />
            <div>
              <div className="font-bold text-lg text-900 leading-tight">Formulir Pasien Baru</div>
              <div className="text-xs text-500 font-normal">
                Pendaftaran identitas, data profil, dan rekam medis pasien baru.
              </div>
            </div>
          </div>
        }
        modal
        style={{ width: '100%', maxWidth: '980px' }}
        breakpoints={{ '960px': '95vw', '641px': '100vw' }}
        contentClassName="p-3"
      >
        <PasienFormCard
          key={formKey}
          onSuccess={handleRegistrationSuccess}
          onCancel={() => setDialogTambahPasienVisible(false)}
          toast={toast}
          submitLabel="Daftarkan Pasien Baru"
          hidePilihLayanan={true}
          hideHeader={true}
        />
      </Dialog>

      {/* POPUP MODAL DIALOG: EDIT DATA PASIEN */}
      <Dialog
        visible={dialogEditPasienVisible}
        onHide={() => {
          setDialogEditPasienVisible(false);
          setEditingPasien(null);
        }}
        header={
          <div className="flex align-items-center gap-2">
            <i className="pi pi-user-edit text-blue-600 text-xl" />
            <div>
              <div className="font-bold text-lg text-900 leading-tight">
                {editingPasien ? `Edit Data Pasien (${editingPasien.no_rm})` : 'Edit Data Pasien'}
              </div>
              <div className="text-xs text-500 font-normal">
                Perbarui data profil dan identitas rekam medis pasien.
              </div>
            </div>
          </div>
        }
        modal
        style={{ width: '100%', maxWidth: '980px' }}
        breakpoints={{ '960px': '95vw', '641px': '100vw' }}
        contentClassName="p-3"
      >
        {editingPasien && (
          <PasienFormCard
            initialData={editingPasien}
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setDialogEditPasienVisible(false);
              setEditingPasien(null);
            }}
            toast={toast}
            submitLabel="Simpan Perubahan"
            hidePilihLayanan={true}
            hideHeader={true}
          />
        )}
      </Dialog>

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
          <div className="flex justify-content-end align-items-center gap-2 pt-3 border-top-1 surface-border">
            <Button
              type="button"
              label="Tutup"
              icon="pi pi-times"
              severity="secondary"
              outlined
              className="text-xs font-medium"
              onClick={() => setDetailPasien(null)}
            />
            <Button
              type="button"
              label="Daftarkan Kunjungan"
              icon="pi pi-calendar-plus"
              severity="success"
              className="font-bold text-xs px-3 py-2 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-1"
              onClick={() => {
                if (detailPasien) {
                  const target = detailPasien;
                  setDetailPasien(null);
                  setPilihanKunjunganPasien(target);
                }
              }}
            />
          </div>
        }
      >
        {detailPasien && <PasienKtpCard pasien={detailPasien} />}
      </Dialog>

      {/* POPUP PILIH JENIS PENDAFTARAN (DAFTAR SEKARANG VS BOOKING JADWAL) */}
      <DialogPilihanKunjungan
        visible={Boolean(pilihanKunjunganPasien)}
        onHide={() => setPilihanKunjunganPasien(null)}
        pasien={pilihanKunjunganPasien}
        onSelectDaftarSekarang={(p) => {
          router.push(`/pendaftaran-antrean/pendaftaran-pasien?no_rm=${encodeURIComponent(p.no_rm)}`);
        }}
        onSelectBooking={(p) => {
          router.push(`/pendaftaran-antrean/pendaftaran-pasien?tab=1&no_rm=${encodeURIComponent(p.no_rm)}&create=true`);
        }}
      />

      {/* MODAL SUKSES REGISTRASI PASIEN BARU */}
      <Dialog
        visible={successDialogVisible}
        onHide={() => setSuccessDialogVisible(false)}
        modal
        closable={false}
        style={{ width: '100%', maxWidth: '520px' }}
        breakpoints={{ '960px': '90vw', '641px': '95vw' }}
        className="p-dialog-custom"
      >
        <div className="p-4 text-center">
          <div
            className="flex align-items-center justify-content-center border-round-circle mx-auto mb-3 bg-green-50 text-green-600"
            style={{ width: '4rem', height: '4rem' }}
          >
            <i className="pi pi-check text-2xl font-bold" />
          </div>

          <h3 className="text-xl font-bold text-900 m-0 mb-1">Pasien Baru Berhasil Didaftarkan!</h3>
          <p className="text-500 text-sm m-0 mb-4">
            Data pasien baru telah resmi tersimpan di rekam medis klinik.
          </p>

          {/* KARTU IDENTITAS NO RM */}
          {newPatientData && (
            <div className="p-3 border-round-xl bg-gray-50 border-1 surface-border text-left mb-4">
              <div className="flex align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border">
                <span className="text-xs text-500 uppercase font-semibold">Nomor Rekam Medis (No. RM)</span>
                <span className="font-mono font-bold text-lg text-emerald-700">
                  {newPatientData.no_rm || '-'}
                </span>
              </div>
              <div className="grid text-sm m-0">
                <div className="col-12 py-1 flex justify-content-between">
                  <span className="text-500">Nama Pasien:</span>
                  <span className="font-semibold text-900">{newPatientData.nama || '-'}</span>
                </div>
                {newPatientData.nik && (
                  <div className="col-12 py-1 flex justify-content-between">
                    <span className="text-500">NIK:</span>
                    <span className="font-mono text-700">{newPatientData.nik}</span>
                  </div>
                )}
                {newPatientData.no_hp && (
                  <div className="col-12 py-1 flex justify-content-between">
                    <span className="text-500">WhatsApp / HP:</span>
                    <span className="font-medium text-700">{newPatientData.no_hp}</span>
                  </div>
                )}
                {newPatientData.tanggal_lahir && (
                  <>
                    <div className="col-12 py-1 flex justify-content-between">
                      <span className="text-500">Tanggal Lahir:</span>
                      <span className="font-medium text-700">
                        {formatDateOnly(newPatientData.tanggal_lahir)}
                      </span>
                    </div>
                    {calculateAge(newPatientData.tanggal_lahir) !== null && (
                      <div className="col-12 py-1 flex justify-content-between">
                        <span className="text-500">Umur:</span>
                        <span className="font-medium text-700">
                          {calculateAge(newPatientData.tanggal_lahir)} tahun
                        </span>
                      </div>
                    )}
                  </>
                )}
                {newPatientData.jenis_kelamin && (
                  <div className="col-12 py-1 flex justify-content-between">
                    <span className="text-500">Jenis Kelamin:</span>
                    <span className="text-700">
                      {newPatientData.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TOMBOL AKSI ALUR KUNJUNGAN PASIEN BARU */}
          <div className="flex flex-column gap-2 mb-2">
            {/* OPSI 1: DAFTAR KUNJUNGAN HARI INI */}
            <Button
              type="button"
              label="Daftar Kunjungan Sekarang (Hari Ini)"
              icon="pi pi-user-plus"
              severity="success"
              className="w-full border-round-lg font-bold p-3 text-sm shadow-1 bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setSuccessDialogVisible(false);
                if (newPatientData?.no_rm) {
                  router.push(`/pendaftaran-antrean/pendaftaran-pasien?no_rm=${encodeURIComponent(newPatientData.no_rm)}`);
                } else {
                  router.push('/pendaftaran-antrean/pendaftaran-pasien');
                }
              }}
            />

            {/* OPSI 2: BOOKING & RESERVASI JADWAL */}
            <Button
              type="button"
              label="Buat Booking & Reservasi Jadwal"
              icon="pi pi-calendar-plus"
              severity="info"
              className="w-full border-round-lg font-bold p-3 text-sm shadow-1 bg-blue-600 border-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setSuccessDialogVisible(false);
                if (newPatientData?.no_rm) {
                  router.push(`/pendaftaran-antrean/pendaftaran-pasien?tab=1&no_rm=${encodeURIComponent(newPatientData.no_rm)}&create=true`);
                } else {
                  router.push('/pendaftaran-antrean/pendaftaran-pasien?tab=1&create=true');
                }
              }}
            />
          </div>

          {/* TOMBOL SEKUNDER */}
          <div className="flex flex-column sm:flex-row gap-2">
            <Button
              type="button"
              label="Daftarkan Pasien Baru Lagi"
              icon="pi pi-plus"
              outlined
              severity="secondary"
              className="flex-1 border-round-lg font-medium text-xs py-2"
              onClick={handleRegisterAnother}
            />
            <Button
              type="button"
              label="Selesai"
              icon="pi pi-check"
              outlined
              severity="secondary"
              className="flex-1 border-round-lg font-medium text-xs py-2"
              onClick={() => setSuccessDialogVisible(false)}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default RegistrasiPasienPage;
