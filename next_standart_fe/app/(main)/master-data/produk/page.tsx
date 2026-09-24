'use client';

import { useEffect, useRef, useState } from 'react';
import postData from '@/lib/axios/postData';
import formUpload from '@/lib/axios/formData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { ImageCropDialog } from '../components/ImageCropDialog';

const Page = () => {
    const toast = useRef<Toast>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [cropDialogVisible, setCropDialogVisible] = useState<boolean>(false);
    const [cropImageSrc, setCropImageSrc] = useState<string>('');

    const [data, setData] = useState<any[]>([]);
    const [kategoriList, setKategoriList] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [filterKategori, setFilterKategori] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_produk: '',
        kode_kategori_produk: '',
        nama: '',
        satuan: 'Pcs',
        harga_beli: 0,
        harga_jual: 0,
        no_batch: '',
        tanggal_kadaluarsa: '',
        status: 'aktif',
        foto: null,
        foto_url: '',
        hapus_foto: false,
    });
    const [saving, setSaving] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/produk-data', {
                page,
                perPage: rows,
                keyword,
                kode_kategori_produk: filterKategori || undefined,
            });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data produk');
        } finally {
            setLoading(false);
        }
    };

    const loadDropdowns = async () => {
        try {
            const resKat = await postData('/master/kategori-produk-data', { status: 'aktif' });
            setKategoriList((resKat.data.data || []).map((k: any) => ({ label: k.nama, value: k.kode_kategori_produk })));
        } catch (error) {
            console.error('Failed to load dropdowns');
        }
    };

    useEffect(() => {
        loadData();
    }, [page, rows, keyword, filterKategori]);

    useEffect(() => {
        loadDropdowns();
    }, []);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormData({
            kode_produk: '',
            kode_kategori_produk: kategoriList[0]?.value || '',
            nama: '',
            satuan: 'Pcs',
            harga_beli: 0,
            harga_jual: 0,
            no_batch: '',
            tanggal_kadaluarsa: '',
            status: 'aktif',
            foto: null,
            foto_url: '',
            hapus_foto: false,
        });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: any) => {
        setIsEdit(true);
        setSubmitted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormData({
            ...rowData,
            no_batch: rowData.no_batch || '',
            tanggal_kadaluarsa: rowData.tanggal_kadaluarsa ? String(rowData.tanggal_kadaluarsa).slice(0, 10) : '',
            foto: null,
            foto_url: rowData.foto || '',
            hapus_foto: false,
        });
        setDialogVisible(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                showError(toast, 'Ukuran file foto maksimal 10MB!');
                return;
            }
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showError(toast, 'Format file foto harus JPG, JPEG, PNG, atau WEBP!');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setCropImageSrc(reader.result as string);
                setCropDialogVisible(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpenCropper = () => {
        if (formData.foto) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropImageSrc(reader.result as string);
                setCropDialogVisible(true);
            };
            reader.readAsDataURL(formData.foto);
        } else if (formData.foto_url && !formData.hapus_foto) {
            setCropImageSrc(formData.foto_url);
            setCropDialogVisible(true);
        }
    };

    const handleCropSave = (croppedFile: File, previewUrl: string) => {
        setFormData((prev: any) => ({
            ...prev,
            foto: croppedFile,
            foto_url: previewUrl,
            hapus_foto: false,
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveFoto = () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormData((prev: any) => ({
            ...prev,
            foto: null,
            foto_url: '',
            hapus_foto: true,
        }));
    };

    const handleSave = async () => {
        setSubmitted(true);
        if (!formData.nama || !formData.nama.trim() || !formData.kode_kategori_produk || !formData.satuan) {
            showError(toast, 'Nama, Kategori, dan Satuan Produk wajib diisi!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/produk-update' : '/master/produk-create';
            const fd = new FormData();
            if (isEdit) {
                fd.append('kode_produk', formData.kode_produk);
            }
            fd.append('nama', formData.nama);
            fd.append('kode_kategori_produk', formData.kode_kategori_produk);
            fd.append('satuan', formData.satuan);
            fd.append('harga_beli', String(formData.harga_beli || 0));
            fd.append('harga_jual', String(formData.harga_jual || 0));
            fd.append('no_batch', formData.no_batch || '');
            fd.append('tanggal_kadaluarsa', formData.tanggal_kadaluarsa || '');
            fd.append('status', formData.status || 'aktif');

            if (formData.foto instanceof File) {
                fd.append('foto', formData.foto);
            }
            if (formData.hapus_foto) {
                fd.append('hapus_foto', '1');
            }

            const res = await formUpload(endpoint, fd, { 'X-Level': '1' });
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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} data produk ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/produk-delete', { kode_produk: codes });
                    showSuccess(toast, res.data.message || 'Berhasil dihapus');
                    setSelectedRows([]);
                    loadData();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal menghapus data');
                }
            }
        });
    };

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
    };

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-box text-purple-600 text-2xl" />
                        Kelola Data Produk & Skincare
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Katalog produk dan skincare yang dijual di klinik. Pengadaan produk baru dilakukan melalui menu Inventori.
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_produk)); }}
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
                    dataKey="kode_produk"
                    className="p-datatable-sm"
                    emptyMessage="Data produk tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Produk & Skincare</span>
                                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <Dropdown
                                        value={filterKategori}
                                        options={[{ label: 'Semua Kategori', value: '' }, ...kategoriList]}
                                        onChange={(e) => setFilterKategori(e.value)}
                                        placeholder="Filter Kategori"
                                        className="w-full md:w-14rem p-inputtext-sm text-sm border-round-md"
                                    />
                                    <IconField iconPosition="left" className="w-full md:w-18rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Cari Produk..." className="w-full text-sm" />
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
                                            setFilterKategori('');
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN:</span>
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor:'#22c55e', boxShadow:'0 1px 3px #22c55e55' }} />
                                    Status Aktif
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor:'#ef4444', boxShadow:'0 1px 3px #ef444455' }} />
                                    Status Tidak Aktif
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
                    {/* Foto Column matching Layanan Table */}
                    <Column
                        header="Foto"
                        headerStyle={{ width: '4.5rem', textAlign: 'center', fontWeight: 'bold' }}
                        align="center"
                        body={(r) => (
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: r.foto ? 'var(--surface-100, #f1f5f9)' : 'transparent',
                                    border: r.foto ? '1px solid var(--surface-border, #e2e8f0)' : '1.5px dashed var(--surface-400, #94a3b8)',
                                }}
                                title={r.nama}
                            >
                                {r.foto ? (
                                    <img
                                        src={r.foto}
                                        alt={r.nama}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e: any) => {
                                            e.currentTarget.style.display = 'none';
                                            if (e.currentTarget.parentElement) {
                                                e.currentTarget.parentElement.style.border = '1.5px dashed var(--surface-400, #94a3b8)';
                                                e.currentTarget.parentElement.style.backgroundColor = 'transparent';
                                                e.currentTarget.parentElement.innerHTML = '<i class="pi pi-image text-400 text-base"></i>';
                                            }
                                        }}
                                    />
                                ) : (
                                    <i className="pi pi-image text-400 text-base" />
                                )}
                            </div>
                        )}
                    ></Column>
                    <Column field="kode_produk" header="Kode" sortable headerStyle={{ fontWeight: 'bold', width: '7rem' }}></Column>
                    <Column field="nama" header="Nama Produk" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column field="nama_kategori" header="Kategori" body={(r) => r.nama_kategori || r.kode_kategori_produk || '-'}></Column>
                    <Column field="satuan" header="Satuan"></Column>
                    <Column field="no_batch" header="No. Batch" body={(r) => r.no_batch || '-'}></Column>
                    <Column field="tanggal_kadaluarsa" header="Tgl Kadaluarsa" body={(r) => r.tanggal_kadaluarsa ? String(r.tanggal_kadaluarsa).slice(0, 10) : '-'}></Column>
                    <Column field="harga_beli" header="Harga Beli" body={(r) => formatRupiah(r.harga_beli)}></Column>
                    <Column field="harga_jual" header="Harga Jual" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_jual)}</span>}></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_produk])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* Modal Tambah / Edit Produk */}
            <Dialog header={isEdit ? 'Edit Data Produk' : 'Tambah Data Produk'} visible={dialogVisible} style={{ width: '550px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Produk</label>
                            <InputText value={formData.kode_produk} disabled className="w-full text-sm" />
                        </div>
                    )}

                    {/* UPLOAD FOTO AREA */}
                    <div className="surface-50 p-3 border-round-xl border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="text-sm font-semibold text-800 flex align-items-center gap-2">
                                <i className="pi pi-image text-primary" />
                                <span>Foto Produk</span>
                                <span className="text-500 font-normal text-xs">(Rasio Kartu 4:3)</span>
                            </label>
                            {(formData.foto || (formData.foto_url && !formData.hapus_foto)) && (
                                <Tag
                                    value="Foto Terpasang"
                                    severity="success"
                                    icon="pi pi-check"
                                    className="text-[11px] font-semibold py-1 px-2 border-round-md"
                                />
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            style={{ display: 'none' }}
                        />

                        {!(formData.foto || (formData.foto_url && !formData.hapus_foto)) ? (
                            /* Empty State: Modern Dropzone */
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer border-2 border-dashed surface-border border-round-xl p-3 bg-white hover:surface-100 hover:border-primary transition-all flex flex-column align-items-center justify-content-center text-center gap-2 shadow-1"
                            >
                                <div className="w-3rem h-3rem border-circle bg-primary-50 text-primary flex align-items-center justify-content-center">
                                    <i className="pi pi-cloud-upload text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-800 m-0 mb-1">Klik untuk Memilih Foto Produk</p>
                                    <p className="text-xs text-500 m-0">Format: JPG, PNG, WEBP • Maksimal 10MB</p>
                                </div>
                                <Button
                                    type="button"
                                    label="Pilih File Gambar"
                                    icon="pi pi-plus"
                                    size="small"
                                    outlined
                                    className="p-button-sm text-xs font-semibold mt-1 pointer-events-none"
                                />
                            </div>
                        ) : (
                            /* Filled State: Balanced Preview & Actions */
                            <div className="bg-white p-3 border-round-xl border-1 surface-border shadow-1 flex flex-column sm:flex-row gap-3 align-items-center">
                                {/* 4:3 Aspect Ratio Preview */}
                                <div
                                    onClick={handleOpenCropper}
                                    className="cursor-pointer relative border-round-lg overflow-hidden bg-slate-100 border-1 surface-border flex-shrink-0 shadow-1 flex align-items-center justify-content-center hover:shadow-2 transition-all"
                                    style={{
                                        width: '136px',
                                        height: '102px',
                                    }}
                                    title="Klik untuk mengatur posisi / crop foto"
                                >
                                    {formData.foto ? (
                                        <img
                                            src={URL.createObjectURL(formData.foto)}
                                            alt="Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                                        />
                                    ) : (
                                        <img
                                            src={formData.foto_url}
                                            alt="Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                                            onError={(e: any) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black-alpha-40 flex flex-column align-items-center justify-content-center text-white opacity-0 hover:opacity-100 transition-all text-xs font-medium gap-1">
                                        <i className="pi pi-sliders-h text-base" />
                                        <span>Sesuaikan</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-column gap-2 flex-1 w-full">
                                    <Button
                                        type="button"
                                        label="Atur / Crop Foto"
                                        icon="pi pi-sliders-h"
                                        size="small"
                                        outlined
                                        className="p-button-sm text-xs font-semibold w-full justify-content-center"
                                        onClick={handleOpenCropper}
                                    />
                                    <Button
                                        type="button"
                                        label="Ganti Foto Lain"
                                        icon="pi pi-sync"
                                        size="small"
                                        outlined
                                        severity="secondary"
                                        className="p-button-sm text-xs font-semibold w-full justify-content-center"
                                        onClick={() => fileInputRef.current?.click()}
                                    />
                                    <Button
                                        type="button"
                                        label="Hapus Foto"
                                        icon="pi pi-trash"
                                        size="small"
                                        outlined
                                        severity="danger"
                                        className="p-button-sm text-xs font-semibold w-full justify-content-center"
                                        onClick={handleRemoveFoto}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Produk *</label>
                        <InputText value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} placeholder="Masukkan nama produk" className="w-full text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Kategori Produk *</label>
                        <Dropdown
                            value={formData.kode_kategori_produk}
                            options={kategoriList}
                            onChange={(e) => setFormData({ ...formData, kode_kategori_produk: e.value })}
                            placeholder="Pilih Kategori"
                            className="w-full text-sm"
                        />
                    </div>
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Satuan *</label>
                            <InputText value={formData.satuan} onChange={(e) => setFormData({ ...formData, satuan: e.target.value })} placeholder="misal: Pcs, Botol" className="w-full text-sm" />
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
                            <label className="block text-sm font-semibold mb-1">Harga Beli *</label>
                            <InputNumber value={formData.harga_beli} onValueChange={(e) => setFormData({ ...formData, harga_beli: e.value })} mode="currency" currency="IDR" locale="id-ID" className="w-full text-sm" />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Harga Jual *</label>
                            <InputNumber value={formData.harga_jual} onValueChange={(e) => setFormData({ ...formData, harga_jual: e.value })} mode="currency" currency="IDR" locale="id-ID" className="w-full text-sm" />
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">No. Batch</label>
                            <InputText value={formData.no_batch} onChange={(e) => setFormData({ ...formData, no_batch: e.target.value })} placeholder="misal: BTH-2026-001" className="w-full text-sm" />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Tanggal Kadaluarsa</label>
                            <InputText type="date" value={formData.tanggal_kadaluarsa} onChange={(e) => setFormData({ ...formData, tanggal_kadaluarsa: e.target.value })} className="w-full text-sm" />
                        </div>
                    </div>
                    <div className="p-2 border-round surface-100 text-xs text-color-secondary flex align-items-center gap-2 mt-1">
                        <i className="pi pi-info-circle text-primary text-sm" />
                        <span>Kuantitas stok fisik, batas minimum, dan restock produk dikelola melalui menu <strong>Inventori</strong>.</span>
                    </div>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogVisible(false)} />
                    <Button label="Simpan" icon="pi pi-check" loading={saving} onClick={handleSave} className="bg-primary border-none" />
                </div>
            </Dialog>

            {/* Modal Image Cropper */}
            <ImageCropDialog
                visible={cropDialogVisible}
                imageSrc={cropImageSrc}
                aspectRatio={1.65}
                onSave={handleCropSave}
                onHide={() => {
                    setCropDialogVisible(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                isProduk={true}
                previewTitle={formData.nama || 'Nama Produk'}
                previewCategory={kategoriList.find((k: any) => k.value === formData.kode_kategori_produk)?.label || 'PRODUK'}
                previewPrice={formData.harga_jual || 0}
                previewSatuan={formData.satuan || 'Pcs'}
            />
        </div>
    );
};

export default Page;
