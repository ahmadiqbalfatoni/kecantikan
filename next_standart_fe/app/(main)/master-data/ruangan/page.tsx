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
    const [filterIsKonsultasi, setFilterIsKonsultasi] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_ruangan: '',
        nama_ruangan: '',
        status: 'aktif',
        is_konsultasi: 0,
    });
    const [saving, setSaving] = useState<boolean>(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/ruangan-data', {
                page,
                perPage: rows,
                keyword,
                is_konsultasi: filterIsKonsultasi === '' ? undefined : filterIsKonsultasi,
            });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data ruangan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, rows, keyword, filterIsKonsultasi]);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({ kode_ruangan: '', nama_ruangan: '', status: 'aktif', is_konsultasi: 0 });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: any) => {
        setIsEdit(true);
        setSubmitted(false);
        setFormData({
            ...rowData,
            is_konsultasi: rowData.is_konsultasi === 1 || rowData.is_konsultasi === '1' ? 1 : 0,
        });
        setDialogVisible(true);
    };

    const handleSave = async () => {
        setSubmitted(true);
        if (!formData.nama_ruangan || !formData.nama_ruangan.trim()) {
            showError(toast, 'Nama Ruangan wajib diisi!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/ruangan-update' : '/master/ruangan-create';
            const res = await postData(endpoint, {
                ...formData,
                is_konsultasi: formData.is_konsultasi ? 1 : 0,
            });
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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} data ruangan ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/ruangan-delete', { kode_ruangan: codes });
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
                        <i className="pi pi-building text-purple-600 text-2xl" />
                        Kelola Master Data Ruangan
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan ruangan tindakan, perawatan, dan konsultasi klinik.
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_ruangan)); }}
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
                    dataKey="kode_ruangan"
                    className="p-datatable-sm"
                    emptyMessage="Data ruangan tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Ruangan</span>
                                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <Dropdown
                                        value={filterIsKonsultasi}
                                        options={[
                                            { label: 'Semua Tipe Ruangan', value: '' },
                                            { label: '🩺 Ruangan Konsultasi', value: '1' },
                                            { label: '💆 Ruangan Biasa / Tindakan', value: '0' },
                                        ]}
                                        onChange={(e) => setFilterIsKonsultasi(e.value)}
                                        placeholder="Filter Tipe Ruangan"
                                        className="w-full md:w-14rem p-inputtext-sm text-sm border-round-md"
                                    />
                                    <IconField iconPosition="left" className="w-full md:w-16rem">
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
                                        onClick={() => { setKeyword(''); setFilterIsKonsultasi(''); }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN STATUS:</span>
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#22c55e', boxShadow: '0 1px 3px #22c55e55' }} />
                                    Aktif
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444', boxShadow: '0 1px 3px #ef444455' }} />
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
                    <Column field="kode_ruangan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column field="nama_ruangan" header="Nama Ruangan" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        header="Tipe Ruangan"
                        sortable
                        sortField="is_konsultasi"
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r) =>
                            r.is_konsultasi === 1 || r.is_konsultasi === '1' ? (
                                <Tag value="🩺 Ruangan Konsultasi" severity="info" className="font-bold text-xs px-2 py-1" />
                            ) : (
                                <Tag value="💆 Ruangan Biasa / Tindakan" severity="secondary" className="font-bold text-xs px-2 py-1" />
                            )
                        }
                    ></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit Ruangan" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_ruangan])} tooltip="Hapus Ruangan" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            <Dialog header={isEdit ? 'Edit Data Ruangan' : 'Tambah Data Ruangan'} visible={dialogVisible} style={{ width: '520px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Ruangan</label>
                            <InputText value={formData.kode_ruangan} disabled className="w-full text-sm border-round-md" />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Ruangan *</label>
                        <InputText
                            value={formData.nama_ruangan}
                            onChange={(e) => setFormData({ ...formData, nama_ruangan: e.target.value })}
                            placeholder="contoh : Ruang Perawatan 1 / Ruang Konsultasi Dokter"
                            className={`w-full text-sm border-round-md ${submitted && !formData.nama_ruangan?.trim() ? 'p-invalid' : ''}`}
                        />
                        {submitted && !formData.nama_ruangan?.trim() && (
                            <small className="p-error text-red-500 text-xs block mt-1">Nama ruangan wajib diisi.</small>
                        )}
                    </div>

                    {/* Tipe / Jenis Ruangan Selector */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Tipe / Fungsi Ruangan *</label>
                        <div className="flex flex-column gap-2 mt-1">
                            <div
                                onClick={() => setFormData({ ...formData, is_konsultasi: 1 })}
                                className={`p-3 border-round-lg border-1 cursor-pointer transition-all flex align-items-center gap-3 ${
                                    formData.is_konsultasi === 1 ? 'bg-purple-50 border-purple-500 shadow-1' : 'bg-white surface-border hover:bg-slate-50'
                                }`}
                            >
                                <i className={`pi pi-user text-2xl ${formData.is_konsultasi === 1 ? 'text-purple-600' : 'text-slate-400'}`} />
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-slate-900 flex align-items-center gap-1.5">
                                        🩺 Ruangan Konsultasi
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Digunakan khusus untuk sesi konsultasi dokter & pengisian rekam medis medis pasien.
                                    </div>
                                </div>
                                {formData.is_konsultasi === 1 && <i className="pi pi-check-circle text-purple-600 text-xl" />}
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, is_konsultasi: 0 })}
                                className={`p-3 border-round-lg border-1 cursor-pointer transition-all flex align-items-center gap-3 ${
                                    formData.is_konsultasi === 0 ? 'bg-teal-50 border-teal-500 shadow-1' : 'bg-white surface-border hover:bg-slate-50'
                                }`}
                            >
                                <i className={`pi pi-building text-2xl ${formData.is_konsultasi === 0 ? 'text-teal-600' : 'text-slate-400'}`} />
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-slate-900 flex align-items-center gap-1.5">
                                        💆 Ruangan Biasa / Tindakan
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Digunakan untuk eksekusi treatment, facial, laser, peeling, & perawatan kecantikan.
                                    </div>
                                </div>
                                {formData.is_konsultasi === 0 && <i className="pi pi-check-circle text-teal-600 text-xl" />}
                            </div>
                        </div>
                    </div>

                    <div className="surface-50 p-3 border-round-md border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <span className="font-bold text-sm text-900">Status Ruangan</span>
                            <InputSwitch
                                checked={formData.status === 'aktif'}
                                onChange={(e) => setFormData({ ...formData, status: e.value ? 'aktif' : 'nonaktif' })}
                            />
                        </div>
                        <span className="text-xs text-600 block">
                            <strong>Status: {formData.status === 'aktif' ? 'Aktif' : 'Non-aktif'}</strong>. {formData.status === 'aktif' ? 'Ruangan aktif dan dapat digunakan dalam seluruh transaksi.' : 'Ruangan dinonaktifkan dari transaksi.'}
                        </span>
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
