'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { PasienFormDialog } from '@/app/(main)/pendaftaran-antrean/pendaftaran-pasien/components/dialogs/PasienFormDialog';

// Helper hitung umur dari tanggal lahir
const hitungUmur = (tglLahir: string | Date | null | undefined): string => {
    if (!tglLahir) return '-';
    const lahir = new Date(tglLahir);
    if (isNaN(lahir.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - lahir.getFullYear();
    const m = today.getMonth() - lahir.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < lahir.getDate())) {
        age--;
    }
    return age >= 0 ? `${age} thn` : '-';
};

// Helper format tanggal DD-MM-YYYY
const formatTanggal = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export default function DataPasienPage() {
    const toast = useRef<Toast>(null);

    // Data State
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterGender, setFilterGender] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    // Detail Modal State
    const [detailVisible, setDetailVisible] = useState<boolean>(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);

    // Edit Modal State
    const [editVisible, setEditVisible] = useState<boolean>(false);
    const [patientToEdit, setPatientToEdit] = useState<any>(null);

    // Load data from backend
    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/pasien-data', {
                page,
                perPage: rows,
                keyword,
                status: filterStatus || undefined,
                jenis_kelamin: filterGender || undefined,
                sortField: 'created_at',
                sortOrder: 'desc'
            });

            if (res.data?.status === '00' || res.data?.status === 200 || res.status === 200) {
                setData(res.data.data || []);
                setTotalRecords(res.data.total_data || 0);
            } else {
                setData(res.data?.data || []);
                setTotalRecords(res.data?.total_data || 0);
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data pasien');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, rows, keyword, filterStatus, filterGender]);

    // Batch or Single Delete
    const handleDelete = (rms: string[]) => {
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus atau menonaktifkan ${rms.length} data pasien ini?`,
            header: 'Konfirmasi Hapus Pasien',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/pasien-delete', { no_rm: rms });
                    showSuccess(toast, res.data.message || 'Data pasien berhasil diproses');
                    setSelectedRows([]);
                    loadData();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal memproses penghapusan');
                }
            }
        });
    };

    // Open detail modal
    const handleOpenDetail = (row: any) => {
        setSelectedPatient(row);
        setDetailVisible(true);
    };

    // Open edit modal
    const handleOpenEdit = (row: any) => {
        setPatientToEdit(row);
        setEditVisible(true);
    };

    // Stats Summary calculation
    const stats = useMemo(() => {
        const total = totalRecords;
        const aktif = data.filter((d) => d.status === 'aktif').length;
        const laki = data.filter((d) => d.jenis_kelamin === 'L').length;
        const perempuan = data.filter((d) => d.jenis_kelamin === 'P').length;
        return { total, aktif, laki, perempuan };
    }, [data, totalRecords]);

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Quick Detail Dialog */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-id-card text-purple-600 text-xl" />
                        <span className="font-bold text-lg">Informasi Profil Pasien</span>
                    </div>
                }
                visible={detailVisible}
                style={{ width: '650px' }}
                modal
                onHide={() => setDetailVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Tutup"
                            icon="pi pi-times"
                            outlined
                            severity="secondary"
                            onClick={() => setDetailVisible(false)}
                        />
                        <Button
                            label="Edit Pasien"
                            icon="pi pi-pencil"
                            severity="success"
                            onClick={() => {
                                setDetailVisible(false);
                                if (selectedPatient) handleOpenEdit(selectedPatient);
                            }}
                        />
                    </div>
                }
            >
                {selectedPatient && (
                    <div className="flex flex-column gap-3 pt-2">
                        {/* Header Profile Card */}
                        <div className="flex align-items-center gap-3 p-3 border-round-xl surface-100 border-1 border-200">
                            <div
                                className="flex align-items-center justify-content-center border-circle font-bold text-2xl"
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    backgroundColor: selectedPatient.jenis_kelamin === 'P' ? '#fce7f3' : '#e0e7ff',
                                    color: selectedPatient.jenis_kelamin === 'P' ? '#db2777' : '#4f46e5'
                                }}
                            >
                                {selectedPatient.nama ? selectedPatient.nama.charAt(0).toUpperCase() : 'P'}
                            </div>
                            <div className="flex-1">
                                <div className="flex align-items-center justify-content-between">
                                    <h4 className="font-bold text-xl text-900 m-0">{selectedPatient.nama}</h4>
                                    <Tag
                                        value={selectedPatient.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                                        severity={selectedPatient.status === 'aktif' ? 'success' : 'danger'}
                                    />
                                </div>
                                <div className="flex flex-wrap align-items-center gap-2 mt-1 text-sm text-600">
                                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 border-round">
                                        {selectedPatient.no_rm}
                                    </span>
                                    <span>•</span>
                                    <span>NIK: {selectedPatient.nik || '-'}</span>
                                    <span>•</span>
                                    <span>{selectedPatient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} ({hitungUmur(selectedPatient.tanggal_lahir)})</span>
                                </div>
                            </div>
                        </div>

                        {/* Grid Data Diri */}
                        <div className="grid text-sm">
                            <div className="col-12 md:col-6">
                                <div className="surface-card p-3 border-round-lg border-1 border-200 h-full">
                                    <span className="text-xs font-bold text-500 uppercase block mb-2">Data Pribadi</span>
                                    <div className="flex flex-column gap-2">
                                        <div>
                                            <span className="text-500 block text-xs">Tempat, Tanggal Lahir</span>
                                            <span className="font-semibold text-800">
                                                {selectedPatient.tempat_lahir || '-'}, {formatTanggal(selectedPatient.tanggal_lahir)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-500 block text-xs">Golongan Darah / Agama</span>
                                            <span className="font-semibold text-800">
                                                {selectedPatient.golongan_darah || '-'} / {selectedPatient.agama || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-500 block text-xs">Pekerjaan</span>
                                            <span className="font-semibold text-800">{selectedPatient.pekerjaan || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-500 block text-xs">Status Perkawinan</span>
                                            <span className="font-semibold text-800 capitalize">
                                                {selectedPatient.status_perkawinan ? selectedPatient.status_perkawinan.replace('_', ' ') : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <div className="surface-card p-3 border-round-lg border-1 border-200 h-full">
                                    <span className="text-xs font-bold text-500 uppercase block mb-2">Kontak & Darurat</span>
                                    <div className="flex flex-column gap-2">
                                        <div>
                                            <span className="text-500 block text-xs">Nomor HP (WhatsApp)</span>
                                            <a
                                                href={`https://wa.me/${selectedPatient.no_hp?.replace(/^0/, '62')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-green-600 flex align-items-center gap-1 hover:underline"
                                            >
                                                <i className="pi pi-whatsapp" /> {selectedPatient.no_hp || '-'}
                                            </a>
                                        </div>
                                        <div>
                                            <span className="text-500 block text-xs">Email</span>
                                            <span className="font-semibold text-800">{selectedPatient.email || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-500 block text-xs">Kontak Darurat</span>
                                            <span className="font-semibold text-800">
                                                {selectedPatient.nama_kontak_darurat || '-'}
                                                {selectedPatient.hubungan_kontak_darurat ? ` (${selectedPatient.hubungan_kontak_darurat})` : ''}
                                            </span>
                                            {selectedPatient.no_hp_kontak_darurat && (
                                                <span className="text-500 block text-xs">{selectedPatient.no_hp_kontak_darurat}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="surface-card p-3 border-round-lg border-1 border-200">
                                    <span className="text-xs font-bold text-500 uppercase block mb-2">Alamat Domisili</span>
                                    <p className="m-0 font-medium text-800">
                                        {[
                                            selectedPatient.kelurahan_desa ? `Kel. ${selectedPatient.kelurahan_desa}` : '',
                                            selectedPatient.kecamatan ? `Kec. ${selectedPatient.kecamatan}` : '',
                                            selectedPatient.kota_kabupaten,
                                            selectedPatient.provinsi,
                                            selectedPatient.kode_pos ? `Kode Pos ${selectedPatient.kode_pos}` : ''
                                        ].filter(Boolean).join(', ') || '-'}
                                    </p>
                                    {selectedPatient.patokan && (
                                        <p className="m-0 mt-1 text-xs text-500 italic">
                                            Patokan: {selectedPatient.patokan}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {selectedPatient.alergi && (
                                <div className="col-12">
                                    <div className="p-3 border-round-lg bg-orange-50 border-1 border-orange-200 text-orange-900">
                                        <span className="font-bold flex align-items-center gap-1 mb-1 text-sm">
                                            <i className="pi pi-exclamation-triangle text-orange-600" />
                                            Catatan Riwayat Alergi:
                                        </span>
                                        <span className="text-sm">{selectedPatient.alergi}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Edit Patient Dialog */}
            <PasienFormDialog
                visible={editVisible}
                onHide={() => {
                    setEditVisible(false);
                    setPatientToEdit(null);
                }}
                initialData={patientToEdit}
                title={patientToEdit?.no_rm ? `Edit Profil Pasien (${patientToEdit.no_rm})` : 'Edit Profil Pasien'}
                submitLabel="Simpan Perubahan"
                toast={toast}
                onSuccess={() => {
                    showSuccess(toast, 'Data pasien berhasil diperbarui');
                    loadData();
                }}
            />

            {/* Main Content Card */}
            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-user text-purple-600 text-2xl" />
                        Kelola Master Data Pasien
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Katalog lengkap rekam medis profil pasien, identitas kependudukan, informasi kontak, dan demografis.
                    </p>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid mb-3">
                    <div className="col-12 sm:col-6 lg:col-3">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Total Pasien</span>
                                <span className="text-2xl font-bold text-900">{stats.total}</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-purple-100 flex align-items-center justify-content-center text-purple-700">
                                <i className="pi pi-users text-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="col-12 sm:col-6 lg:col-3">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Pasien Aktif</span>
                                <span className="text-2xl font-bold text-green-600">{stats.aktif}</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-green-100 flex align-items-center justify-content-center text-green-700">
                                <i className="pi pi-check-circle text-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="col-12 sm:col-6 lg:col-3">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Pasien Laki-laki</span>
                                <span className="text-2xl font-bold text-blue-600">{stats.laki}</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-blue-100 flex align-items-center justify-content-center text-blue-700">
                                <i className="pi pi-user text-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="col-12 sm:col-6 lg:col-3">
                        <div className="p-3 border-round-xl surface-ground border-1 border-200 flex align-items-center justify-content-between">
                            <div>
                                <span className="text-xs text-500 font-semibold uppercase block mb-1">Pasien Perempuan</span>
                                <span className="text-2xl font-bold text-pink-600">{stats.perempuan}</span>
                            </div>
                            <div className="w-3rem h-3rem border-round-lg bg-pink-100 flex align-items-center justify-content-center text-pink-700">
                                <i className="pi pi-heart text-xl" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Toolbar (Tanpa Tombol 'Baru' sesuai instruksi user) */}
                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Cetak"
                        icon="pi pi-print"
                        outlined
                        className="border-round-md font-medium px-3 border-purple-600 text-purple-600"
                        onClick={() => window.print()}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label={`Hapus${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        disabled={selectedRows.length === 0}
                        className="border-round-md font-medium px-3"
                        onClick={() => {
                            if (selectedRows.length < 1) return;
                            handleDelete(selectedRows.map((r) => r.no_rm));
                        }}
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
                        onClick={loadData}
                    />
                </div>

                {/* PrimeReact DataTable */}
                <DataTable
                    value={data}
                    loading={loading}
                    paginator
                    rows={rows}
                    totalRecords={totalRecords}
                    lazy
                    first={(page - 1) * rows}
                    onPage={(e) => {
                        setPage((e.page || 0) + 1);
                        setRows(e.rows);
                    }}
                    selection={selectedRows}
                    onSelectionChange={(e) => setSelectedRows(e.value as any[])}
                    dataKey="no_rm"
                    className="p-datatable-sm"
                    emptyMessage="Data pasien tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold text-900">Katalog Data Pasien</span>
                                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <Dropdown
                                        value={filterStatus}
                                        options={[
                                            { label: 'Semua Status', value: '' },
                                            { label: 'Aktif', value: 'aktif' },
                                            { label: 'Tidak Aktif', value: 'tidak aktif' }
                                        ]}
                                        onChange={(e) => setFilterStatus(e.value)}
                                        placeholder="Filter Status"
                                        className="w-full md:w-12rem p-inputtext-sm text-sm border-round-md"
                                    />
                                    <Dropdown
                                        value={filterGender}
                                        options={[
                                            { label: 'Semua Gender', value: '' },
                                            { label: 'Laki-laki (L)', value: 'L' },
                                            { label: 'Perempuan (P)', value: 'P' }
                                        ]}
                                        onChange={(e) => setFilterGender(e.value)}
                                        placeholder="Filter Gender"
                                        className="w-full md:w-12rem p-inputtext-sm text-sm border-round-md"
                                    />
                                    <IconField iconPosition="left" className="w-full md:w-16rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            placeholder="Cari No RM, Nama, NIK..."
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
                                        onClick={() => {
                                            setKeyword('');
                                            setFilterStatus('');
                                            setFilterGender('');
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Standard Status Legend Bar */}
                            <div className="flex flex-wrap align-items-center gap-3 px-2 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN STATUS:</span>
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '3px',
                                            backgroundColor: '#22c55e',
                                            boxShadow: '0 1px 3px #22c55e55'
                                        }}
                                    />
                                    Aktif
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '3px',
                                            backgroundColor: '#ef4444',
                                            boxShadow: '0 1px 3px #ef444455'
                                        }}
                                    />
                                    Tidak Aktif
                                </span>
                            </div>
                        </div>
                    }
                >
                    {/* Kolom Selection */}
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />

                    {/* Kolom Indikator Status */}
                    <Column
                        header="Status"
                        headerStyle={{ width: '4rem', textAlign: 'center' }}
                        bodyStyle={{ textAlign: 'center' }}
                        body={(rowData) => {
                            const isAktif = rowData.status === 'aktif';
                            return (
                                <div className="flex justify-content-center">
                                    <span
                                        title={isAktif ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                                        style={{
                                            display: 'inline-block',
                                            width: '14px',
                                            height: '14px',
                                            borderRadius: '3px',
                                            backgroundColor: isAktif ? '#22c55e' : '#ef4444',
                                            boxShadow: isAktif ? '0 1px 3px #22c55e66' : '0 1px 3px #ef444466'
                                        }}
                                    />
                                </div>
                            );
                        }}
                    />

                    {/* Kolom No RM */}
                    <Column
                        field="no_rm"
                        header="No. RM"
                        style={{ minWidth: '8rem' }}
                        body={(rowData) => (
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 border-round text-sm">
                                {rowData.no_rm}
                            </span>
                        )}
                    />

                    {/* Kolom Nama & NIK */}
                    <Column
                        field="nama"
                        header="Nama Pasien & NIK"
                        style={{ minWidth: '14rem' }}
                        body={(rowData) => (
                            <div className="flex flex-column">
                                <span className="font-bold text-900 text-sm hover:text-purple-600 cursor-pointer" onClick={() => handleOpenDetail(rowData)}>
                                    {rowData.nama}
                                </span>
                                <span className="text-500 text-xs mt-1">
                                    NIK: <span className="font-mono">{rowData.nik || '-'}</span>
                                </span>
                            </div>
                        )}
                    />

                    {/* Kolom Gender & Usia */}
                    <Column
                        header="Gender & Usia"
                        style={{ minWidth: '9rem' }}
                        body={(rowData) => {
                            const isLaki = rowData.jenis_kelamin === 'L';
                            return (
                                <div className="flex align-items-center gap-2">
                                    <Tag
                                        value={isLaki ? '♂ L' : '♀ P'}
                                        severity={isLaki ? 'info' : 'warning'}
                                        className="font-bold text-xs px-2"
                                    />
                                    <span className="text-700 text-xs font-semibold">
                                        {hitungUmur(rowData.tanggal_lahir)}
                                    </span>
                                </div>
                            );
                        }}
                    />

                    {/* Kolom Kontak No HP */}
                    <Column
                        field="no_hp"
                        header="No. HP"
                        style={{ minWidth: '10rem' }}
                        body={(rowData) => (
                            <div className="flex flex-column">
                                <a
                                    href={`https://wa.me/${rowData.no_hp?.replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-green-700 text-xs flex align-items-center gap-1 hover:underline"
                                >
                                    <i className="pi pi-whatsapp text-green-600" />
                                    {rowData.no_hp || '-'}
                                </a>
                                {rowData.email && (
                                    <span className="text-500 text-xs mt-1 truncate" style={{ maxWidth: '140px' }} title={rowData.email}>
                                        {rowData.email}
                                    </span>
                                )}
                            </div>
                        )}
                    />

                    {/* Kolom Wilayah / Alamat */}
                    <Column
                        field="kota_kabupaten"
                        header="Domisili"
                        style={{ minWidth: '11rem' }}
                        body={(rowData) => (
                            <div className="flex flex-column">
                                <span className="font-medium text-800 text-xs">
                                    {rowData.kota_kabupaten || '-'}
                                </span>
                                <span className="text-500 text-xs mt-1">
                                    {rowData.provinsi || '-'}
                                </span>
                            </div>
                        )}
                    />

                    {/* Kolom Riwayat Alergi */}
                    <Column
                        header="Alergi"
                        style={{ minWidth: '8rem' }}
                        body={(rowData) => {
                            if (!rowData.alergi) {
                                return <span className="text-400 text-xs">-</span>;
                            }
                            return (
                                <Tag
                                    icon="pi pi-exclamation-triangle"
                                    severity="warning"
                                    value="Ada Alergi"
                                    title={rowData.alergi}
                                    className="text-xs cursor-pointer"
                                    onClick={() => handleOpenDetail(rowData)}
                                />
                            );
                        }}
                    />

                    {/* Kolom Terdaftar */}
                    <Column
                        field="created_at"
                        header="Terdaftar"
                        style={{ minWidth: '7.5rem' }}
                        body={(rowData) => (
                            <span className="text-600 text-xs">
                                {formatTanggal(rowData.created_at)}
                            </span>
                        )}
                    />

                    {/* Kolom Aksi */}
                    <Column
                        header="Aksi"
                        headerStyle={{ width: '8.5rem', textAlign: 'center' }}
                        bodyStyle={{ textAlign: 'center' }}
                        body={(rowData) => (
                            <div className="flex align-items-center justify-content-center gap-1">
                                <Button
                                    icon="pi pi-eye"
                                    size="small"
                                    text
                                    rounded
                                    severity="info"
                                    tooltip="Lihat Detail"
                                    tooltipOptions={{ position: 'bottom' }}
                                    onClick={() => handleOpenDetail(rowData)}
                                />
                                <Button
                                    icon="pi pi-pencil"
                                    size="small"
                                    text
                                    rounded
                                    severity="success"
                                    tooltip="Edit Pasien"
                                    tooltipOptions={{ position: 'bottom' }}
                                    onClick={() => handleOpenEdit(rowData)}
                                />
                                <Button
                                    icon="pi pi-trash"
                                    size="small"
                                    text
                                    rounded
                                    severity="danger"
                                    tooltip="Hapus Pasien"
                                    tooltipOptions={{ position: 'bottom' }}
                                    onClick={() => handleDelete([rowData.no_rm])}
                                />
                            </div>
                        )}
                    />
                </DataTable>
            </div>
        </div>
    );
}
