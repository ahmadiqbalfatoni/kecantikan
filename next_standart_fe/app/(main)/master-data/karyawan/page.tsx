'use client';

import { useEffect, useRef, useState } from 'react';
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
import { InputSwitch } from 'primereact/inputswitch';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { showError, showSuccess } from '@/lib/tools/generalTools';

const Page = () => {
    const toast = useRef<Toast>(null);

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        no_sip: '',
        kode_user: '',
        nama: '',
        jabatan: 'dokter',
        no_hp: '',
        email: '',
        status: 'aktif',
    });
    const [saving, setSaving] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    const JABATAN_MAP: Record<string, { label: string; severity: 'info' | 'danger' | 'warning' | 'success' | 'secondary' }> = {
        owner: { label: 'OWNER / MANAGER', severity: 'info' },
        manager: { label: 'OWNER / MANAGER', severity: 'info' },
        dokter: { label: 'DOKTER', severity: 'danger' },
        beautician: { label: 'BEAUTICIAN / TERAPIS', severity: 'warning' },
        terapis: { label: 'BEAUTICIAN / TERAPIS', severity: 'warning' },
        perawat: { label: 'BEAUTICIAN / TERAPIS', severity: 'warning' },
        kasir: { label: 'KASIR', severity: 'success' },
        warehouse: { label: 'WAREHOUSE / LOGISTIK', severity: 'secondary' },
        logistik: { label: 'WAREHOUSE / LOGISTIK', severity: 'secondary' },
        apoteker: { label: 'WAREHOUSE / LOGISTIK', severity: 'secondary' },
        superadmin: { label: 'SUPERADMIN / IT', severity: 'info' },
        admin: { label: 'ADMIN', severity: 'info' },
    };

    const jabatanOptions = [
        { label: 'Owner / Manager', value: 'owner' },
        { label: 'Admin', value: 'admin' },
        { label: 'Dokter', value: 'dokter' },
        { label: 'Beautician / Terapis', value: 'beautician' },
        { label: 'Kasir', value: 'kasir' },
        { label: 'Warehouse / Logistik', value: 'warehouse' },
        { label: 'Superadmin / IT', value: 'superadmin' },
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/karyawan-data', { page, perPage: rows, keyword });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data karyawan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, rows, keyword]);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({ no_sip: '', kode_user: '', nama: '', jabatan: 'dokter', no_hp: '', email: '', status: 'aktif' });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: any) => {
        setIsEdit(true);
        setSubmitted(false);
        let jab = (rowData.jabatan || '').toLowerCase();
        if (jab === 'terapis' || jab === 'perawat') jab = 'beautician';
        else if (jab === 'manager') jab = 'owner';
        else if (jab === 'logistik' || jab === 'apoteker') jab = 'warehouse';
        else if (jab === 'it') jab = 'superadmin';
        setFormData({ ...rowData, jabatan: jab || 'dokter' });
        setDialogVisible(true);
    };

    const handleSave = async () => {
        if (!formData.nama || !formData.no_sip || !formData.jabatan) {
            showError(toast, 'Nama, No SIP, dan Jabatan wajib diisi!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/karyawan-update' : '/master/karyawan-create';
            const res = await postData(endpoint, formData);
            showSuccess(toast, res.data.message || 'Berhasil disimpan');
            setDialogVisible(false);
            loadData();
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (codes: string[]) => {
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus ${codes.length} data karyawan ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/karyawan-delete', { no_sip: codes });
                    showSuccess(toast, res.data.message || 'Berhasil dihapus');
                    setSelectedRows([]);
                    loadData();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal menghapus data');
                }
            }
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
                        <i className="pi pi-users text-purple-600 text-2xl" />
                        Kelola Data Karyawan & Dokter
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan data karyawan dan tenaga medis klinik.
                    </p>
                </div>


                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Baru"
                        icon="pi pi-plus"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        onClick={handleOpenCreate}
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.no_sip)); }}
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



                <DataTable
                    value={data}
                    loading={loading}
                    paginator
                    rows={rows}
                    totalRecords={totalRecords}
                    lazy
                    first={(page - 1) * rows}
                    onPage={(e) => { setPage((e.page || 0) + 1); setRows(e.rows); }}
                    selection={selectedRows}
                    onSelectionChange={(e) => setSelectedRows(e.value as any[])}
                    dataKey="no_sip"
                    className="p-datatable-sm"
                    emptyMessage="Data karyawan tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Karyawan & Dokter</span>
                                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <IconField iconPosition="left" className="w-full md:w-20rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Cari Data..." className="w-full text-sm" />
                                    </IconField>
                                    <Button
                                        type="button"
                                        icon="pi pi-filter-slash"
                                        outlined
                                        severity="danger"
                                        tooltip="Reset Filter"
                                        tooltipOptions={{ position: 'bottom' }}
                                        onClick={() => setKeyword('')}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN STATUS:</span>
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor:'#22c55e', boxShadow:'0 1px 3px #22c55e55' }} />
                                    Aktif
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor:'#ef4444', boxShadow:'0 1px 3px #ef444455' }} />
                                    Tidak Aktif
                                </span>
                            </div>
                        </div>
                    }
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                    <Column
                        header=""
                        headerStyle={{ width: '3rem' }}
                        align="center"
                        body={(r) => (
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    backgroundColor: r.status === 'aktif' ? '#22c55e' : '#ef4444',
                                    boxShadow: r.status === 'aktif' ? '0 1px 3px #22c55e55' : '0 1px 3px #ef444455'
                                }}
                                title={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                            />
                        )}
                    ></Column>
                    <Column field="kode_karyawan" header="Kode" sortable headerStyle={{ fontWeight: 'bold', width: '7rem' }}></Column>
                    <Column field="no_sip" header="No SIP" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column field="nama" header="Nama Karyawan" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        field="jabatan"
                        header="Jabatan"
                        sortable
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r) => {
                            const item = JABATAN_MAP[(r.jabatan || '').toLowerCase()] || {
                                label: (r.jabatan || '-').toUpperCase(),
                                severity: 'info' as const,
                            };
                            return (
                                <Tag
                                    value={item.label}
                                    severity={item.severity}
                                    className="text-xs font-semibold px-2 py-1"
                                />
                            );
                        }}
                    ></Column>
                    <Column field="no_hp" header="No HP" body={(r) => r.no_hp || '-'}></Column>
                    <Column field="email" header="Email" body={(r) => r.email || '-'}></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.no_sip])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            <Dialog header={isEdit ? 'Edit Data Karyawan' : 'Tambah Data Karyawan'} visible={dialogVisible} style={{ width: '500px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    <div>
                        <label className="block text-sm font-semibold mb-1">No SIP *</label>
                        <InputText value={formData.no_sip} onChange={(e) => setFormData({ ...formData, no_sip: e.target.value })} disabled={isEdit} placeholder="masukkan No SIP" className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Lengkap *</label>
                        <InputText value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} placeholder="Masukkan nama lengkap" className="w-full text-sm" />
                    </div>
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Jabatan *</label>
                            <Dropdown
                                value={formData.jabatan}
                                options={jabatanOptions}
                                onChange={(e) => setFormData({ ...formData, jabatan: e.value })}
                                placeholder="Pilih Jabatan"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Status *</label>
                            <Dropdown
                                value={formData.status}
                                options={[{ label: 'Aktif', value: 'aktif' }, { label: 'Nonaktif', value: 'nonaktif' }]}
                                onChange={(e) => setFormData({ ...formData, status: e.value })}
                                className="w-full text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">No HP</label>
                            <InputText value={formData.no_hp || ''} onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })} placeholder="misal: 08123456789" className="w-full text-sm" />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Email</label>
                            <InputText value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@karyawan.com" className="w-full text-sm" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogVisible(false)} />
                    <Button label="Simpan" icon="pi pi-check" loading={saving} onClick={handleSave} className="bg-primary border-none" />
                </div>
            </Dialog>
        </div>
    );
};

export default Page;
