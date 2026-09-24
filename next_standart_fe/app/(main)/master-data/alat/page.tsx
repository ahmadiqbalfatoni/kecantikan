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
import { Calendar } from 'primereact/calendar';
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
    const [ruanganList, setRuanganList] = useState<any[]>([]);

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_alat: '',
        kode_ruangan: '',
        nama: '',
        merk: '',
        tanggal_beli: null,
        kondisi: 'baik',
        status: 'aktif',
    });
    const [saving, setSaving] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    const kondisiOptions = [
        { label: 'Baik', value: 'baik' },
        { label: 'Rusak Ringan', value: 'rusak_ringan' },
        { label: 'Rusak Berat', value: 'rusak_berat' },
        { label: 'Maintenance', value: 'maintenance' },
    ];

    const getKondisiSeverity = (kondisi: string) => {
        switch (kondisi) {
            case 'baik': return 'success';
            case 'rusak_ringan': return 'warning';
            case 'rusak_berat': return 'danger';
            case 'maintenance': return 'info';
            default: return 'secondary';
        }
    };

    const loadRuangan = async () => {
        try {
            const res = await postData('/master/ruangan-data', {});
            const options = (res.data.data || []).map((r: any) => ({
                label: `${r.kode_ruangan} - ${r.nama_ruangan}`,
                value: r.kode_ruangan
            }));
            setRuanganList(options);
        } catch (error) {}
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/alat-data', { page, perPage: rows, keyword });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data alat');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRuangan();
    }, []);

    useEffect(() => {
        loadData();
    }, [page, rows, keyword]);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({ kode_alat: '', kode_ruangan: '', nama: '', merk: '', tanggal_beli: null, kondisi: 'baik', status: 'aktif' });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: any) => {
        setIsEdit(true);
        setSubmitted(false);
        setFormData({
            ...rowData,
            kode_ruangan: rowData.kode_ruangan || '',
            tanggal_beli: rowData.tanggal_beli ? new Date(rowData.tanggal_beli) : null
        });
        setDialogVisible(true);
    };

    const handleSave = async () => {
        if (!formData.nama || !formData.kondisi) {
            showError(toast, 'Nama Alat dan Kondisi wajib diisi!');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...formData,
                tanggal_beli: formData.tanggal_beli && formData.tanggal_beli instanceof Date && !isNaN(formData.tanggal_beli.getTime())
                    ? formData.tanggal_beli.toISOString().slice(0, 10)
                    : null
            };
            const endpoint = isEdit ? '/master/alat-update' : '/master/alat-create';
            const res = await postData(endpoint, payload);
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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} data alat ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/alat-delete', { kode_alat: codes });
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
                        <i className="pi pi-wrench text-purple-600 text-2xl" />
                        Kelola Alat & Peralatan Medis
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan alat medis, kecantikan, dan fasilitas klinik.
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_alat)); }}
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
                    dataKey="kode_alat"
                    className="p-datatable-sm"
                    emptyMessage="Data alat tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Alat & Peralatan</span>
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
                    <Column field="kode_alat" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column field="nama" header="Nama Alat" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column field="nama_ruangan" header="Ruangan" body={(r) => r.nama_ruangan || r.kode_ruangan || '-'}></Column>
                    <Column field="merk" header="Merk / Brand" body={(r) => r.merk || '-'}></Column>
                    <Column field="tanggal_beli" header="Tgl Beli" body={(r) => r.tanggal_beli ? new Date(r.tanggal_beli).toLocaleDateString('id-ID') : '-'}></Column>
                    <Column field="kondisi" header="Kondisi" body={(r) => <Tag value={r.kondisi?.replace('_', ' ')?.toUpperCase()} severity={getKondisiSeverity(r.kondisi)} />}></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_alat])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            <Dialog header={isEdit ? 'Edit Data Alat' : 'Tambah Data Alat'} visible={dialogVisible} style={{ width: '500px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Alat</label>
                            <InputText value={formData.kode_alat} disabled className="w-full text-sm" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Alat *</label>
                        <InputText value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} placeholder="Masukkan nama alat" className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Ruangan (Lokasi Alat)</label>
                        <Dropdown
                            value={formData.kode_ruangan}
                            options={ruanganList}
                            onChange={(e) => setFormData({ ...formData, kode_ruangan: e.value })}
                            placeholder="Pilih Ruangan (Opsional)"
                            className="w-full text-sm"
                            filter
                            showClear
                        />
                    </div>
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Merk / Brand</label>
                            <InputText value={formData.merk || ''} onChange={(e) => setFormData({ ...formData, merk: e.target.value })} placeholder="misal: Samsung, GE" className="w-full text-sm" />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Tanggal Beli</label>
                            <Calendar value={formData.tanggal_beli} onChange={(e) => setFormData({ ...formData, tanggal_beli: e.value })} dateFormat="dd/mm/yy" placeholder="Pilih tanggal" className="w-full text-sm" showIcon />
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Kondisi *</label>
                            <Dropdown
                                value={formData.kondisi}
                                options={kondisiOptions}
                                onChange={(e) => setFormData({ ...formData, kondisi: e.value })}
                                placeholder="Pilih Kondisi"
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
