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
import { InputSwitch } from 'primereact/inputswitch';
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
    const [produkOptions, setProdukOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<any>(null);

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_paket_produk: '',
        nama: '',
        harga_paket: 0,
        masa_berlaku_hari: 365,
        tanggal_mulai: '',
        tanggal_selesai: '',
        status: 'aktif',
        foto: null,
        foto_url: '',
        hapus_foto: false,
        details: []
    });
    const [saving, setSaving] = useState<boolean>(false);

    const formatRupiah = (val: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/paket-produk-data', { page, perPage: rows, keyword });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data paket produk');
        } finally {
            setLoading(false);
        }
    };

    const loadProduk = async () => {
        try {
            const res = await postData('/master/produk-data', { status: 'aktif' });
            const list = (res.data.data || []).map((p: any) => ({
                label: `${p.nama} (${p.kode_produk}) - ${formatRupiah(p.harga_jual || 0)}`,
                value: p.kode_produk,
                nama: p.nama,
                harga: Number(p.harga_jual) || 0
            }));
            setProdukOptions(list);
        } catch (error) {
            console.error('Failed to load produk options');
        }
    };

    useEffect(() => {
        loadData();
    }, [page, rows, keyword]);

    useEffect(() => {
        loadProduk();
    }, []);

    const calculateNormalTotal = (detailsList: any[], customOptions?: any[]) => {
        const opts = customOptions || produkOptions;
        return (detailsList || []).reduce((acc: number, det: any) => {
            const found = opts.find((p: any) => p.value === det.kode_produk);
            const itemHarga = found?.harga !== undefined ? found.harga : (det.harga || 0);
            return acc + (itemHarga * (det.jumlah || 1));
        }, 0);
    };

    const formatYmd = (val: any) => {
        if (!val) return '';
        if (typeof val === 'string') {
            if (val.includes('T')) return val.split('T')[0];
            if (val.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
        }
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (_) {
            return '';
        }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        const initialDetails = produkOptions.length > 0 ? [{ kode_produk: produkOptions[0].value, jumlah: 1 }] : [];
        const initialPrice = calculateNormalTotal(initialDetails);
        setFormData({
            kode_paket_produk: '',
            nama: '',
            harga_paket: initialPrice,
            masa_berlaku_hari: 365,
            tanggal_mulai: '',
            tanggal_selesai: '',
            status: 'aktif',
            foto: null,
            foto_url: '',
            hapus_foto: false,
            details: initialDetails
        });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: any) => {
        setIsEdit(true);
        setSubmitted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormData({
            ...rowData,
            harga_paket: Number(rowData.harga_paket) || 0,
            tanggal_mulai: formatYmd(rowData.tanggal_mulai),
            tanggal_selesai: formatYmd(rowData.tanggal_selesai),
            foto: null,
            foto_url: rowData.foto || '',
            hapus_foto: false,
            details: (rowData.details || []).map((d: any) => ({
                kode_produk: d.kode_produk,
                jumlah: d.jumlah
            }))
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

    const toggleRowExpansion = (rowData: any) => {
        let _expandedRows = { ...expandedRows };
        if (_expandedRows[rowData.kode_paket_produk]) {
            delete _expandedRows[rowData.kode_paket_produk];
        } else {
            _expandedRows[rowData.kode_paket_produk] = true;
        }
        setExpandedRows(_expandedRows);
    };

    const handleAddDetail = () => {
        if (produkOptions.length === 0) return;
        const newDetails = [...formData.details, { kode_produk: produkOptions[0].value, jumlah: 1 }];
        const newPrice = calculateNormalTotal(newDetails);
        setFormData((prev: any) => ({
            ...prev,
            details: newDetails,
            harga_paket: newPrice
        }));
    };

    const handleRemoveDetail = (index: number) => {
        const newDetails = formData.details.filter((_: any, i: number) => i !== index);
        const newPrice = calculateNormalTotal(newDetails);
        setFormData((prev: any) => ({
            ...prev,
            details: newDetails,
            harga_paket: newPrice
        }));
    };

    const handleDetailChange = (index: number, field: string, val: any) => {
        setFormData((prev: any) => {
            const updated = [...prev.details];
            updated[index] = { ...updated[index], [field]: val };
            const newPrice = calculateNormalTotal(updated);
            return {
                ...prev,
                details: updated,
                harga_paket: newPrice
            };
        });
    };

    const handleSave = async () => {
        setSubmitted(true);
        if (!formData.nama || !formData.nama.trim()) {
            showError(toast, 'Nama Paket wajib diisi!');
            return;
        }
        if (!formData.details || formData.details.length === 0) {
            showError(toast, 'Minimal tambahkan 1 detail produk!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/paket-produk-update' : '/master/paket-produk-create';
            const fd = new FormData();
            if (isEdit) {
                fd.append('kode_paket_produk', formData.kode_paket_produk);
            }
            fd.append('nama', formData.nama);
            fd.append('harga_paket', String(formData.harga_paket || 0));
            fd.append('masa_berlaku_hari', String(formData.masa_berlaku_hari || 365));
            fd.append('tanggal_mulai', formData.tanggal_mulai || '');
            fd.append('tanggal_selesai', formData.tanggal_selesai || '');
            fd.append('status', formData.status || 'aktif');
            fd.append('details', JSON.stringify(formData.details));

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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} paket produk ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/paket-produk-delete', { kode_paket_produk: codes });
                    showSuccess(toast, res.data.message || 'Berhasil dihapus');
                    setSelectedRows([]);
                    loadData();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal menghapus data');
                }
            }
        });
    };

    const rowExpansionTemplate = (data: any) => {
        return (
            <div className="p-3 surface-50 border-round border-1 surface-border my-2">
                <div className="flex align-items-center justify-content-between mb-2">
                    <h5 className="m-0 font-bold text-sm text-900 flex align-items-center gap-2">
                        <i className="pi pi-list text-purple-600"></i>
                        Detail Produk Paket: {data.nama} ({data.kode_paket_produk})
                    </h5>
                    <span className="text-xs text-500 font-medium">Total: {data.details?.length || 0} Produk</span>
                </div>
                <div className="border-1 surface-border border-round overflow-hidden surface-card">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="surface-200 text-800 text-xs">
                                <th className="p-2 border-bottom-1 surface-border" style={{ width: '3rem' }}>No</th>
                                <th className="p-2 border-bottom-1 surface-border">Kode Produk</th>
                                <th className="p-2 border-bottom-1 surface-border">Nama Produk</th>
                                <th className="p-2 border-bottom-1 surface-border text-right" style={{ width: '120px' }}>Jumlah Pcs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.details || []).map((item: any, idx: number) => (
                                <tr key={idx} className="border-bottom-1 surface-border text-sm hover:surface-100">
                                    <td className="p-2 text-500">{idx + 1}</td>
                                    <td className="p-2 text-primary font-medium">{item.kode_produk}</td>
                                    <td className="p-2 font-medium">{item.nama_produk || item.kode_produk}</td>
                                    <td className="p-2 text-right">
                                        <Tag value={`${item.jumlah} Pcs`} severity="info" />
                                    </td>
                                </tr>
                            ))}
                            {(!data.details || data.details.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="p-3 text-center text-500 text-sm">Tidak ada detail produk.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const normalTotal = calculateNormalTotal(formData.details);

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header Action Bar */}
            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-inbox text-purple-600 text-2xl" />
                        Kelola Paket Produk & Skincare
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan bundel paket produk dan skincare klinik.
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_paket_produk)); }}
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
                    expandedRows={expandedRows}
                    onRowToggle={(e) => setExpandedRows(e.data)}
                    rowExpansionTemplate={rowExpansionTemplate}
                    dataKey="kode_paket_produk"
                    className="p-datatable-sm"
                    emptyMessage="Data paket produk tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Paket Produk & Skincare</span>
                                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <IconField iconPosition="left" className="w-full md:w-20rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Cari Paket Produk..." className="w-full text-sm" />
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
                    <Column expander style={{ width: '3rem' }} />
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
                    {/* Foto Column matching Paket Layanan Table */}
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
                    <Column field="kode_paket_produk" header="Kode" sortable headerStyle={{ fontWeight: 'bold', width: '8.5rem' }}></Column>
                    <Column field="nama" header="Nama Paket" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        header="Detail Produk"
                        body={(r) => (
                            <Button
                                label={`Lihat Detail (${r.details?.length || 0})`}
                                icon="pi pi-eye"
                                text
                                size="small"
                                className="p-button-sm text-primary font-semibold p-1"
                                onClick={() => toggleRowExpansion(r)}
                            />
                        )}
                    ></Column>
                    <Column field="harga_paket" header="Harga Paket" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_paket)}</span>}></Column>
                    <Column field="masa_berlaku_hari" header="Masa Berlaku" body={(r) => `${r.masa_berlaku_hari} Hari`}></Column>
                    <Column
                        header="Periode Aktif Paket"
                        body={(r) => {
                            const start = formatYmd(r.tanggal_mulai);
                            const end = formatYmd(r.tanggal_selesai);
                            const sisa = r.sisa_hari !== undefined ? parseInt(r.sisa_hari, 10) : 0;
                            const isInactive = r.status === 'nonaktif' || sisa <= 0;

                            if (isInactive) {
                                return (
                                    <div className="flex flex-column gap-1 text-xs">
                                        <Tag severity="danger" value="0 Hari (Nonaktif)" className="text-[10px] py-0 px-2 font-bold" style={{ width: 'fit-content' }} />
                                        {start && end && (
                                            <span className="text-400 text-[11px]">
                                                {start} s/d {end}
                                            </span>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div className="flex flex-column gap-1 text-xs">
                                    <span className="font-bold text-green-600 flex align-items-center gap-1">
                                        <i className="pi pi-clock text-green-600 text-xs" />
                                        Sisa {sisa} Hari
                                    </span>
                                    {start && end && (
                                        <span className="text-500 text-[11px]">
                                            {start} s/d {end}
                                        </span>
                                    )}
                                </div>
                            );
                        }}
                    ></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_paket_produk])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* Modal Create/Edit */}
            <Dialog header={isEdit ? 'Edit Paket Produk' : 'Tambah Paket Produk'} visible={dialogVisible} style={{ width: '600px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Paket</label>
                            <InputText value={formData.kode_paket_produk} disabled className="w-full text-sm border-round-md" />
                        </div>
                    )}

                    {/* UPLOAD FOTO AREA */}
                    <div className="surface-50 p-3 border-round-xl border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="text-sm font-semibold text-800 flex align-items-center gap-2">
                                <i className="pi pi-image text-primary" />
                                <span>Foto Paket Produk</span>
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
                                    <p className="text-sm font-semibold text-800 m-0 mb-1">Klik untuk Memilih Foto Paket Produk</p>
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
                        <label className="block text-sm font-semibold mb-1">Nama Paket *</label>
                        <InputText
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            placeholder="contoh : Paket Acne Care Complete"
                            className={`w-full text-sm border-round-md ${submitted && !formData.nama?.trim() ? 'p-invalid' : ''}`}
                        />
                        {submitted && !formData.nama?.trim() && (
                            <small className="p-error text-red-500 text-xs block mt-1">Nama paket wajib diisi.</small>
                        )}
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Harga Paket (Rp) *</label>
                            <InputNumber
                                value={formData.harga_paket}
                                onValueChange={(e) => setFormData({ ...formData, harga_paket: e.value !== null && e.value !== undefined ? e.value : 0 })}
                                mode="currency"
                                currency="IDR"
                                locale="id-ID"
                                className="w-full text-sm border-round-md"
                            />
                            <div className="flex align-items-center justify-content-between text-xs mt-1">
                                <span className="text-600">
                                    Total Normal: <strong className="text-purple-700">{formatRupiah(normalTotal)}</strong>
                                </span>
                                {normalTotal > 0 && formData.harga_paket < normalTotal && (
                                    <span className="text-green-600 font-bold">
                                        (Hemat: {formatRupiah(normalTotal - formData.harga_paket)})
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-sm font-semibold mb-1">Masa Berlaku (Hari) *</label>
                            <InputNumber value={formData.masa_berlaku_hari} onValueChange={(e) => setFormData({ ...formData, masa_berlaku_hari: e.value })} suffix=" hari" className="w-full text-sm border-round-md" />
                        </div>
                    </div>

                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Tanggal Mulai Aktif</label>
                            <InputText
                                type="date"
                                value={formData.tanggal_mulai || ''}
                                onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                                className="w-full text-sm border-round-md"
                            />
                            <small className="text-400 text-xs block mt-1">Kosongkan untuk otomatis tanggal hari ini</small>
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Tanggal Selesai Aktif (Kustom)</label>
                            <InputText
                                type="date"
                                value={formData.tanggal_selesai || ''}
                                onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                                className="w-full text-sm border-round-md"
                            />
                            <small className="text-400 text-xs block mt-1">Otomatis dihitung dari masa berlaku jika kosong</small>
                        </div>
                    </div>

                    <div className="surface-50 p-3 border-round-md border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <span className="font-bold text-sm text-900">Status Paket</span>
                            <InputSwitch
                                checked={formData.status === 'aktif'}
                                onChange={(e) => setFormData({ ...formData, status: e.value ? 'aktif' : 'nonaktif' })}
                            />
                        </div>
                        <span className="text-xs text-600 block">
                            <strong>Status: {formData.status === 'aktif' ? 'Aktif' : 'Non-aktif'}</strong>. {formData.status === 'aktif' ? 'Paket aktif dan dapat digunakan dalam transaksi.' : 'Paket dinonaktifkan.'}
                        </span>
                        <div className="text-xs text-purple-700 bg-purple-50 p-2 border-round-md border-1 border-purple-200 mt-2">
                            <i className="pi pi-clock mr-1" />
                            <strong>Hitungan Mundur Masa Aktif:</strong> Periode aktif dihitung mundur dari total <strong>{formData.masa_berlaku_hari || 0} Hari</strong> sejak tanggal pembuatan/mulai. Paket akan otomatis <strong>Non-aktif</strong> begitu sisa hari mencapai 0.
                        </div>
                    </div>

                    <div className="mt-2 border-top-1 surface-border pt-3">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="font-bold text-sm text-900">Detail Produk Dalam Paket *</label>
                            <Button label="Tambah Produk" icon="pi pi-plus" text size="small" onClick={handleAddDetail} />
                        </div>
                        {submitted && (!formData.details || formData.details.length === 0) && (
                            <small className="p-error text-red-500 text-xs block mb-2">Minimal tambahkan 1 detail produk dalam paket.</small>
                        )}

                        {(formData.details || []).map((det: any, idx: number) => (
                            <div key={idx} className="flex align-items-center gap-2 mb-2 p-2 surface-100 border-round">
                                <div className="flex-grow-1">
                                    <Dropdown
                                        value={det.kode_produk}
                                        options={produkOptions}
                                        onChange={(e) => handleDetailChange(idx, 'kode_produk', e.value)}
                                        placeholder="Pilih Produk..."
                                        filter
                                        className="w-full text-sm"
                                    />
                                </div>
                                <div style={{ width: '120px' }}>
                                    <InputNumber
                                        value={det.jumlah}
                                        onValueChange={(e) => handleDetailChange(idx, 'jumlah', e.value || 1)}
                                        suffix=" Pcs"
                                        min={1}
                                        className="w-full text-sm"
                                    />
                                </div>
                                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleRemoveDetail(idx)} tooltip="Hapus" />
                            </div>
                        ))}
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
                previewTitle={formData.nama || 'Nama Paket Produk'}
                previewCategory="PAKET PRODUK"
                previewSatuan="Paket"
                previewPrice={formData.harga_paket || 0}
            />
        </div>
    );
};

export default Page;
