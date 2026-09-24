'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { useSession } from 'next-auth/react';

interface CabangRecord {
    id?: number;
    kode_cabang: string;
    nama_cabang: string;
    alamat?: string;
    no_telp?: string;
    email?: string;
    pj_manager?: string;
    status: 'aktif' | 'tidak aktif';
    total_user?: number;
    total_pasien?: number;
    total_karyawan?: number;
    kunjungan_hari_ini?: number;
    total_omzet?: number;
    created_at?: string;
}

export default function ManajemenCabangPage() {
    const toast = useRef<Toast>(null);
    const { data: session } = useSession();

    const [cabangList, setCabangList] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [keyword, setKeyword] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    // Modal Create / Edit
    const [showModal, setShowModal] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [formData, setFormData] = useState<{
        kode_cabang?: string;
        nama_cabang: string;
        alamat: string;
        no_telp: string;
        email: string;
        pj_manager: string;
        status: 'aktif' | 'tidak aktif';
    }>({
        nama_cabang: '',
        alamat: '',
        no_telp: '',
        email: '',
        pj_manager: '',
        status: 'aktif',
    });
    const [formLoading, setFormLoading] = useState<boolean>(false);

    const isSuperAdmin = (session?.user?.role || '').toLowerCase() === 'superadmin';

    const fetchCabang = async () => {
        setLoading(true);
        try {
            const payload: any = {};
            if (keyword) payload.search = keyword;
            if (filterStatus) payload.status = filterStatus;

            const res = await postData('/master/cabang-data', payload);
            if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
                setCabangList(res.data.data || []);
            } else {
                showError(toast, res?.data?.message || 'Gagal memuat data cabang');
            }
        } catch (err: any) {
            showError(toast, err?.message || 'Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCabang();
    }, [filterStatus]);

    const openCreateModal = () => {
        setIsEdit(false);
        setFormData({
            nama_cabang: '',
            alamat: '',
            no_telp: '',
            email: '',
            pj_manager: '',
            status: 'aktif',
        });
        setShowModal(true);
    };

    const openEditModal = (cabang: CabangRecord) => {
        setIsEdit(true);
        setFormData({
            kode_cabang: cabang.kode_cabang,
            nama_cabang: cabang.nama_cabang,
            alamat: cabang.alamat || '',
            no_telp: cabang.no_telp || '',
            email: cabang.email || '',
            pj_manager: cabang.pj_manager || '',
            status: cabang.status,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.nama_cabang.trim()) {
            showError(toast, 'Nama Cabang wajib diisi!');
            return;
        }

        setFormLoading(true);
        try {
            const endpoint = isEdit ? '/master/cabang-update' : '/master/cabang-create';
            const res = await postData(endpoint, formData);

            if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
                showSuccess(toast, res?.data?.message || (isEdit ? 'Cabang berhasil diperbarui' : 'Cabang baru berhasil dibuat'));
                setShowModal(false);
                fetchCabang();
            } else {
                showError(toast, res?.data?.message || 'Gagal menyimpan data cabang');
            }
        } catch (err: any) {
            showError(toast, err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = (cabang: CabangRecord) => {
        if (cabang.kode_cabang === 'CBG-001') {
            showError(toast, 'Cabang Utama (CBG-001) tidak dapat dihapus');
            return;
        }

        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus data cabang "${cabang.nama_cabang}" (${cabang.kode_cabang})?`,
            header: 'Konfirmasi Hapus Cabang',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            accept: async () => {
                try {
                    const res = await postData('/master/cabang-delete', { kode_cabang: cabang.kode_cabang });
                    if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
                        showSuccess(toast, res?.data?.message || 'Cabang berhasil dihapus');
                        fetchCabang();
                    } else {
                        showError(toast, res?.data?.message || 'Gagal menghapus cabang');
                    }
                } catch (err: any) {
                    showError(toast, err?.response?.data?.message || 'Gagal memproses penghapusan');
                }
            },
        });
    };

    const handleDeleteMultiple = (rows: CabangRecord[]) => {
        const validRows = rows.filter((r) => r.kode_cabang !== 'CBG-001');
        if (validRows.length === 0) {
            showError(toast, 'Cabang Utama (CBG-001) tidak dapat dihapus');
            return;
        }

        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus ${validRows.length} cabang terpilih?`,
            header: 'Konfirmasi Hapus Cabang',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            accept: async () => {
                try {
                    for (const row of validRows) {
                        await postData('/master/cabang-delete', { kode_cabang: row.kode_cabang });
                    }
                    showSuccess(toast, `${validRows.length} cabang berhasil diproses`);
                    setSelectedRows([]);
                    fetchCabang();
                } catch (err: any) {
                    showError(toast, err?.response?.data?.message || 'Gagal memproses penghapusan');
                }
            },
        });
    };

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-building text-purple-600 text-2xl" />
                        Kelola Data Cabang Klinik
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan data cabang klinik kecantikan dan penanggung jawab operasional.
                    </p>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    {isSuperAdmin && (
                        <>
                            <Button
                                size="small"
                                label="Baru"
                                icon="pi pi-plus"
                                outlined
                                severity="success"
                                className="border-round-md font-medium px-3"
                                onClick={openCreateModal}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
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
                                    handleDeleteMultiple(selectedRows);
                                }}
                            />
                            <Divider layout="vertical" className="m-0 h-2rem" />
                        </>
                    )}
                    <Button
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        loading={loading}
                        onClick={fetchCabang}
                    />
                </div>

                {/* Keterangan Status */}
                <div className="flex flex-wrap align-items-center gap-3 px-3 py-2 mb-3 border-round-md surface-100 text-xs font-medium text-color-secondary">
                    <span className="flex align-items-center gap-1">
                        <i className="pi pi-info-circle text-gray-500" />
                        <span className="font-semibold text-gray-700">KETERANGAN STATUS:</span>
                    </span>
                    <span className="flex align-items-center gap-1.5 text-gray-700">
                        <span
                            style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                backgroundColor: '#22c55e',
                                boxShadow: '0 1px 3px #22c55e55',
                            }}
                        />
                        Aktif
                    </span>
                    <span className="flex align-items-center gap-1.5 text-gray-700">
                        <span
                            style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                backgroundColor: '#ef4444',
                                boxShadow: '0 1px 3px #ef444455',
                            }}
                        />
                        Tidak Aktif
                    </span>
                </div>

                {/* DataTable Cabang */}
                <DataTable
                    value={cabangList}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    selection={selectedRows}
                    onSelectionChange={(e: any) => setSelectedRows(e.value as any[])}
                    dataKey="kode_cabang"
                    className="p-datatable-sm"
                    emptyMessage="Data cabang tidak ditemukan."
                    responsiveLayout="scroll"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Cabang Klinik</span>
                                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <Dropdown
                                        value={filterStatus}
                                        options={[
                                            { label: 'Semua Status', value: null },
                                            { label: 'Aktif', value: 'aktif' },
                                            { label: 'Tidak Aktif', value: 'tidak aktif' },
                                        ]}
                                        onChange={(e) => setFilterStatus(e.value)}
                                        placeholder="Filter Status"
                                        className="p-inputtext-sm w-full sm:w-12rem"
                                    />
                                    <IconField iconPosition="left" className="w-full sm:w-16rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchCabang()}
                                            placeholder="Cari Cabang / PJ..."
                                            className="w-full text-sm"
                                        />
                                    </IconField>
                                    <Button
                                        type="button"
                                        icon="pi pi-filter-slash"
                                        outlined
                                        severity="danger"
                                        tooltip="Reset Filter"
                                        onClick={() => {
                                            setKeyword('');
                                            setFilterStatus(null);
                                            fetchCabang();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    }
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column
                        header=""
                        headerStyle={{ width: '3rem' }}
                        align="center"
                        body={(r: CabangRecord) => {
                            const isActive = r.status === 'aktif';
                            return (
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '3px',
                                        backgroundColor: isActive ? '#22c55e' : '#ef4444',
                                        boxShadow: `0 1px 3px ${isActive ? '#22c55e55' : '#ef444455'}`,
                                    }}
                                    title={isActive ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                                />
                            );
                        }}
                    />
                    <Column
                        field="kode_cabang"
                        header="Kode Cabang"
                        sortable
                        className="font-bold text-blue-700"
                        headerStyle={{ minWidth: '8rem' }}
                    />
                    <Column
                        field="nama_cabang"
                        header="Nama Cabang"
                        sortable
                        className="font-semibold text-900"
                        headerStyle={{ minWidth: '13rem' }}
                    />
                    <Column
                        field="pj_manager"
                        header="Penanggung Jawab (PJ)"
                        sortable
                        headerStyle={{ minWidth: '12rem' }}
                        body={(r: CabangRecord) => r.pj_manager || '-'}
                    />
                    <Column
                        field="no_telp"
                        header="No. Telepon"
                        headerStyle={{ minWidth: '10rem' }}
                        body={(r: CabangRecord) => r.no_telp || '-'}
                    />
                    <Column
                        field="email"
                        header="Email"
                        headerStyle={{ minWidth: '12rem' }}
                        body={(r: CabangRecord) => r.email || '-'}
                    />
                    <Column
                        field="alamat"
                        header="Alamat"
                        headerStyle={{ minWidth: '14rem' }}
                        body={(r: CabangRecord) => r.alamat || '-'}
                    />

                    {isSuperAdmin && (
                        <Column
                            header="Aksi"
                            align="center"
                            headerStyle={{ width: '8rem', textAlign: 'center' }}
                            body={(r: CabangRecord) => (
                                <div className="flex align-items-center justify-content-center gap-2">
                                    <Button
                                        icon="pi pi-pencil"
                                        outlined
                                        severity="success"
                                        size="small"
                                        className="border-round-md"
                                        tooltip="Edit Cabang"
                                        onClick={() => openEditModal(r)}
                                    />
                                    {r.kode_cabang !== 'CBG-001' && (
                                        <Button
                                            icon="pi pi-trash"
                                            outlined
                                            severity="danger"
                                            size="small"
                                            className="border-round-md"
                                            tooltip="Hapus Cabang"
                                            onClick={() => handleDelete(r)}
                                        />
                                    )}
                                </div>
                            )}
                        />
                    )}
                </DataTable>
            </div>

            {/* Modal Dialog Tambah / Edit Cabang */}
            <Dialog
                header={isEdit ? 'Edit Data Cabang' : 'Tambah Cabang Baru'}
                visible={showModal}
                style={{ width: '520px' }}
                modal
                onHide={() => setShowModal(false)}
                footer={
                    <div className="flex justify-content-end gap-2 pt-3 border-top-1 surface-border">
                        <Button
                            label="Batal"
                            icon="pi pi-times"
                            outlined
                            severity="secondary"
                            onClick={() => setShowModal(false)}
                        />
                        <Button
                            label={isEdit ? 'Simpan Perubahan' : 'Tambah Cabang'}
                            icon="pi pi-check"
                            severity="success"
                            onClick={handleSave}
                            loading={formLoading}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">Kode Cabang</label>
                            <InputText
                                value={formData.kode_cabang}
                                disabled
                                className="w-full text-sm bg-gray-100 font-bold"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">
                            Nama Cabang <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            value={formData.nama_cabang}
                            onChange={(e) => setFormData({ ...formData, nama_cabang: e.target.value })}
                            placeholder="Contoh: Klinik Cabang Surabaya"
                            className="w-full text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Penanggung Jawab / Manager</label>
                        <InputText
                            value={formData.pj_manager}
                            onChange={(e) => setFormData({ ...formData, pj_manager: e.target.value })}
                            placeholder="Nama Dokter PJ / Manager Cabang"
                            className="w-full text-sm"
                        />
                    </div>

                    <div className="grid">
                        <div className="col-12 sm:col-6">
                            <label className="text-xs font-bold text-gray-700 block mb-1">No. Telepon</label>
                            <InputText
                                value={formData.no_telp}
                                onChange={(e) => setFormData({ ...formData, no_telp: e.target.value })}
                                placeholder="08xxxxxxxxxx"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="col-12 sm:col-6">
                            <label className="text-xs font-bold text-gray-700 block mb-1">Email Cabang</label>
                            <InputText
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="cabang@klinik.com"
                                className="w-full text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Alamat Lengkap</label>
                        <InputTextarea
                            value={formData.alamat}
                            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                            placeholder="Jalan, Nomor, Kelurahan, Kecamatan, Kota"
                            rows={3}
                            className="w-full text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Status Operasional</label>
                        <Dropdown
                            value={formData.status}
                            options={[
                                { label: 'Aktif', value: 'aktif' },
                                { label: 'Tidak Aktif', value: 'tidak aktif' },
                            ]}
                            onChange={(e) => setFormData({ ...formData, status: e.value })}
                            className="w-full text-sm"
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
