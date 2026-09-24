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
    const [ruanganList, setRuanganList] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [filterTipe, setFilterTipe] = useState<string>('');
    const [filterKategori, setFilterKategori] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    // Single unified Tipe Layanan & Alur Konsultasi Options
    const tipeLayananOptions = [
        {
            label: 'Medical Treatment (Wajib Konsultasi Dokter)',
            value: 'MEDICAL TREATMENT',
            wajib_konsultasi: 'wajib',
            description: 'Pasien wajib melalui ruang konsultasi dokter sebelum tindakan medis.'
        },
        {
            label: 'Beauty Treatment (Konsultasi Opsional)',
            value: 'BEAUTY TREATMENT',
            wajib_konsultasi: 'opsional',
            description: 'Pasien dapat memilih konsultasi terlebih dahulu atau langsung tindakan perawatan.'
        },
        {
            label: 'Service Treatment (Langsung Tindakan / Tanpa Konsul)',
            value: 'SERVICE TREATMENT',
            wajib_konsultasi: 'tidak',
            description: 'Layanan reguler/salon, pasien langsung ke ruang tindakan tanpa konsultasi dokter.'
        }
    ];

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_layanan: '',
        kode_kategori_layanan: '',
        kode_ruangan: '',
        wajib_konsultasi: 'opsional',
        kode_ruangan_konsultasi: '',
        nama: '',
        tipe: 'BEAUTY TREATMENT',
        harga: 0,
        durasi_menit: 30,
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
            const res = await postData('/master/layanan-data', {
                page,
                perPage: rows,
                keyword,
                kode_kategori_layanan: filterKategori || undefined,
                tipe: filterTipe || undefined
            });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data layanan');
        } finally {
            setLoading(false);
        }
    };

    const loadKategori = async () => {
        try {
            const res = await postData('/master/kategori-layanan-data', { status: 'aktif' });
            const list = (res.data.data || []).map((k: any) => ({ label: k.nama, value: k.kode_kategori_layanan }));
            setKategoriList(list);
        } catch (error) {
            console.error('Failed to fetch kategori list');
        }
    };

    const loadRuangan = async () => {
        try {
            const res = await postData('/master/ruangan-dropdown', {});
            const list = (res.data.data || []).map((r: any) => ({ label: `${r.kode_ruangan} - ${r.nama_ruangan}`, value: r.kode_ruangan }));
            setRuanganList(list);
        } catch (error) {
            console.error('Failed to fetch ruangan list');
        }
    };

    useEffect(() => {
        loadData();
    }, [page, rows, keyword, filterTipe, filterKategori]);

    useEffect(() => {
        loadKategori();
        loadRuangan();
    }, []);

    // Handler when selecting Tipe Layanan & Alur Konsultasi
    const handleTipeChange = (newTipe: string) => {
        let wk = 'opsional';
        if (newTipe === 'MEDICAL TREATMENT') wk = 'wajib';
        else if (newTipe === 'SERVICE TREATMENT') wk = 'tidak';

        setFormData((prev: any) => ({
            ...prev,
            tipe: newTipe,
            wajib_konsultasi: wk,
            kode_ruangan_konsultasi: wk === 'tidak' ? '' : prev.kode_ruangan_konsultasi
        }));
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFormData({
            kode_layanan: '',
            kode_kategori_layanan: kategoriList[0]?.value || '',
            kode_ruangan: ruanganList[0]?.value || '',
            wajib_konsultasi: 'opsional',
            kode_ruangan_konsultasi: '',
            nama: '',
            tipe: 'BEAUTY TREATMENT',
            harga: 0,
            durasi_menit: 30,
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

        let wk = rowData.wajib_konsultasi;
        if (!wk) {
            if (rowData.tipe === 'MEDICAL TREATMENT') wk = 'wajib';
            else if (rowData.tipe === 'SERVICE TREATMENT') wk = 'tidak';
            else wk = 'opsional';
        }
        setFormData({
            ...rowData,
            kode_ruangan: rowData.kode_ruangan || '',
            wajib_konsultasi: wk,
            kode_ruangan_konsultasi: rowData.kode_ruangan_konsultasi || '',
            tipe: rowData.tipe || 'BEAUTY TREATMENT',
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
        if (!formData.nama || !formData.nama.trim() || !formData.kode_kategori_layanan) {
            showError(toast, 'Nama dan Kategori Layanan wajib diisi!');
            return;
        }

        // Pastikan wajib_konsultasi tersinkron dengan tipe
        let wk = formData.wajib_konsultasi;
        if (formData.tipe === 'MEDICAL TREATMENT') wk = 'wajib';
        else if (formData.tipe === 'SERVICE TREATMENT') wk = 'tidak';
        else wk = 'opsional';

        const payload = {
            ...formData,
            wajib_konsultasi: wk,
            kode_ruangan_konsultasi: wk === 'tidak' ? null : (formData.kode_ruangan_konsultasi || null)
        };

        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/layanan-update' : '/master/layanan-create';
            const fd = new FormData();
            if (isEdit) {
                fd.append('kode_layanan', formData.kode_layanan);
            }
            fd.append('nama', formData.nama);
            fd.append('tipe', formData.tipe || 'BEAUTY TREATMENT');
            fd.append('kode_kategori_layanan', formData.kode_kategori_layanan);
            fd.append('kode_ruangan', formData.kode_ruangan || '');
            fd.append('wajib_konsultasi', wk);
            fd.append('kode_ruangan_konsultasi', wk === 'tidak' ? '' : (formData.kode_ruangan_konsultasi || ''));
            fd.append('harga', String(formData.harga || 0));
            fd.append('durasi_menit', String(formData.durasi_menit || 30));
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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} data layanan ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/layanan-delete', { kode_layanan: codes });
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
                        <i className="pi pi-sparkles text-purple-600 text-2xl" />
                        Kelola Data Layanan
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau kelola katalog layanan treatment medis dan perawatan klinik.
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_layanan)); }}
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
                    dataKey="kode_layanan"
                    className="p-datatable-sm"
                    emptyMessage="Data layanan tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Layanan</span>
                                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <Dropdown
                                        value={filterTipe}
                                        options={[
                                            { label: 'Semua Tipe Layanan', value: '' },
                                            { label: 'Medical Treatment (Wajib)', value: 'MEDICAL TREATMENT' },
                                            { label: 'Beauty Treatment (Opsional)', value: 'BEAUTY TREATMENT' },
                                            { label: 'Service Treatment (Langsung)', value: 'SERVICE TREATMENT' },
                                        ]}
                                        onChange={(e) => setFilterTipe(e.value)}
                                        placeholder="Filter Tipe Layanan"
                                        className="w-full md:w-14rem p-inputtext-sm text-sm border-round-md"
                                    />
                                    <Dropdown
                                        value={filterKategori}
                                        options={[{ label: 'Semua Kategori', value: '' }, ...kategoriList]}
                                        onChange={(e) => setFilterKategori(e.value)}
                                        placeholder="Filter Kategori"
                                        className="w-full md:w-12rem p-inputtext-sm text-sm border-round-md"
                                    />
                                    <IconField iconPosition="left" className="w-full md:w-16rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            placeholder="Cari Layanan..."
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
                                            setFilterTipe('');
                                            setFilterKategori('');
                                        }}
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
                    <Column field="kode_layanan" header="Kode" sortable headerStyle={{ fontWeight: 'bold', width: '7rem' }}></Column>
                    <Column field="nama" header="Nama Layanan" sortable headerStyle={{ fontWeight: 'bold' }}></Column>

                    {/* Single Unified Column: Tipe Layanan & Alur Konsultasi */}
                    <Column
                        field="tipe"
                        header="Tipe Layanan"
                        sortable
                        headerStyle={{ fontWeight: 'bold', minWidth: '15rem' }}
                        body={(r) => {
                            const val = r.tipe || 'BEAUTY TREATMENT';
                            let severity: 'danger' | 'info' | 'success' = 'info';
                            let title = 'Beauty Treatment';
                            let desc = 'Konsultasi Opsional';

                            if (val === 'MEDICAL TREATMENT' || r.wajib_konsultasi === 'wajib') {
                                severity = 'danger';
                                title = 'Medical Treatment';
                                desc = 'Wajib Konsultasi';
                            } else if (val === 'SERVICE TREATMENT' || r.wajib_konsultasi === 'tidak') {
                                severity = 'success';
                                title = 'Service Treatment';
                                desc = 'Langsung Tindakan';
                            }

                            return (
                                <div className="flex flex-column gap-1">
                                    <div className="flex align-items-center gap-2">
                                        <Tag
                                            value={title}
                                            severity={severity}
                                            className="text-xs font-semibold px-2 py-1"
                                        />
                                    </div>
                                    <span className="text-500 text-xs flex align-items-center gap-1">
                                        <i className="pi pi-info-circle text-xs" />
                                        {desc}
                                    </span>
                                </div>
                            );
                        }}
                    ></Column>

                    <Column field="nama_kategori" header="Kategori" body={(r) => r.nama_kategori || r.kode_kategori_layanan || '-'}></Column>
                    
                    <Column
                        field="nama_ruangan"
                        header="Ruangan"
                        style={{ minWidth: '11rem' }}
                        body={(r) => (
                            <div className="flex flex-column">
                                <span className="text-800 font-medium text-sm">
                                    {r.nama_ruangan ? `${r.kode_ruangan ? r.kode_ruangan + ' - ' : ''}${r.nama_ruangan}` : (r.kode_ruangan || '-')}
                                </span>
                                {r.nama_ruangan_konsultasi && r.wajib_konsultasi !== 'tidak' && (
                                    <span className="text-500 text-xs mt-1 flex align-items-center gap-1" title="Ruang Konsultasi Terjadwal">
                                        <i className="pi pi-comments text-purple-600 text-xs" />
                                        Konsul: {r.nama_ruangan_konsultasi}
                                    </span>
                                )}
                            </div>
                        )}
                    ></Column>

                    <Column field="harga" header="Harga" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga)}</span>}></Column>
                    <Column field="durasi_menit" header="Durasi" body={(r) => `${r.durasi_menit} Menit`}></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_layanan])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* Modal Tambah / Edit Layanan */}
            <Dialog
                header={isEdit ? 'Edit Data Layanan' : 'Tambah Data Layanan'}
                visible={dialogVisible}
                style={{ width: '550px' }}
                modal
                onHide={() => setDialogVisible(false)}
            >
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Layanan</label>
                            <InputText value={formData.kode_layanan} disabled className="w-full text-sm" />
                        </div>
                    )}

                    {/* UPLOAD FOTO AREA */}
                    <div className="surface-50 p-3 border-round-xl border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="text-sm font-semibold text-800 flex align-items-center gap-2">
                                <i className="pi pi-image text-primary" />
                                <span>Foto Layanan</span>
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
                                    <p className="text-sm font-semibold text-800 m-0 mb-1">Klik untuk Memilih Foto Layanan</p>
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
                                        <span>Atur Posisi</span>
                                    </div>
                                </div>

                                {/* Structured Actions filling the right side */}
                                <div className="flex-1 w-full flex flex-column justify-content-between gap-2">
                                    <div>
                                        <div className="flex align-items-baseline justify-content-between">
                                            <span className="text-xs font-semibold text-700">Pratinjau Foto Layanan</span>
                                            <span className="text-xs text-500 font-medium">Maks. 10MB (4:3)</span>
                                        </div>
                                        <p className="text-xs text-500 m-0 mt-1 line-height-2">
                                            Sesuaikan posisi & perbesaran agar gambar pas di kartu booking.
                                        </p>
                                    </div>

                                    <div className="flex flex-column gap-2 mt-1">
                                        {/* Primary Action */}
                                        <Button
                                            type="button"
                                            label="Atur / Sesuaikan Posisi Foto"
                                            icon="pi pi-sliders-h"
                                            size="small"
                                            severity="info"
                                            className="w-full text-xs font-semibold border-round-md py-2 justify-content-center shadow-1"
                                            onClick={handleOpenCropper}
                                        />

                                        {/* Secondary Actions in 2 Equal Columns */}
                                        <div className="grid grid-nogutter gap-2">
                                            <div className="col">
                                                <Button
                                                    type="button"
                                                    label="Ganti File"
                                                    icon="pi pi-upload"
                                                    size="small"
                                                    outlined
                                                    severity="secondary"
                                                    className="w-full text-xs font-medium border-round-md py-1-5 justify-content-center"
                                                    onClick={() => fileInputRef.current?.click()}
                                                />
                                            </div>
                                            <div className="col">
                                                <Button
                                                    type="button"
                                                    label="Hapus Foto"
                                                    icon="pi pi-trash"
                                                    size="small"
                                                    outlined
                                                    severity="danger"
                                                    className="w-full text-xs font-medium border-round-md py-1-5 justify-content-center"
                                                    onClick={handleRemoveFoto}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Layanan *</label>
                        <InputText
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            placeholder="Masukkan nama layanan"
                            className="w-full text-sm"
                        />
                    </div>

                    {/* Satu input terpadu: Tipe Layanan & Alur Konsultasi */}
                    <div>
                        <label className="block text-sm font-semibold mb-1">Tipe Layanan & Alur Konsultasi *</label>
                        <Dropdown
                            value={formData.tipe}
                            options={tipeLayananOptions}
                            onChange={(e) => handleTipeChange(e.value)}
                            placeholder="Pilih Tipe Layanan & Alur Konsultasi"
                            className="w-full text-sm"
                        />
                        <small className="text-500 block mt-1">
                            {formData.tipe === 'MEDICAL TREATMENT' && '🩺 Wajib melalui ruang konsultasi dokter sebelum tindakan medis.'}
                            {formData.tipe === 'BEAUTY TREATMENT' && '💆 Pasien dapat memilih konsultasi terlebih dahulu atau langsung tindakan perawatan.'}
                            {formData.tipe === 'SERVICE TREATMENT' && '✂️ Layanan reguler/salon, pasien langsung diarahkan ke ruang tindakan tanpa konsultasi dokter.'}
                        </small>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Kategori Layanan *</label>
                        <Dropdown
                            value={formData.kode_kategori_layanan}
                            options={kategoriList}
                            onChange={(e) => setFormData({ ...formData, kode_kategori_layanan: e.value })}
                            placeholder="Pilih Kategori"
                            className="w-full text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Ruangan Tindakan Utama</label>
                        <Dropdown
                            value={formData.kode_ruangan}
                            options={ruanganList}
                            onChange={(e) => setFormData({ ...formData, kode_ruangan: e.value })}
                            placeholder="Pilih Ruangan Tindakan"
                            showClear
                            className="w-full text-sm"
                        />
                    </div>

                    {/* Ruangan Konsultasi hanya dimunculkan jika bukan SERVICE TREATMENT */}
                    {formData.tipe !== 'SERVICE TREATMENT' && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Ruangan Konsultasi {formData.tipe === 'MEDICAL TREATMENT' ? '*' : '(Opsional)'}
                            </label>
                            <Dropdown
                                value={formData.kode_ruangan_konsultasi}
                                options={ruanganList}
                                onChange={(e) => setFormData({ ...formData, kode_ruangan_konsultasi: e.value })}
                                placeholder="Pilih Ruangan Konsultasi (Default Ruang Konsul)"
                                showClear
                                className="w-full text-sm"
                            />
                        </div>
                    )}

                    <div className="grid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Harga (Rp) *</label>
                            <InputNumber
                                value={formData.harga}
                                onValueChange={(e) => setFormData({ ...formData, harga: e.value })}
                                mode="currency"
                                currency="IDR"
                                locale="id-ID"
                                className="w-full text-sm"
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">Durasi (Menit) *</label>
                            <InputNumber
                                value={formData.durasi_menit}
                                onValueChange={(e) => setFormData({ ...formData, durasi_menit: e.value })}
                                suffix=" menit"
                                className="w-full text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Status *</label>
                        <Dropdown
                            value={formData.status}
                            options={[{ label: 'Aktif', value: 'aktif' }, { label: 'Nonaktif', value: 'nonaktif' }]}
                            onChange={(e) => setFormData({ ...formData, status: e.value })}
                            className="w-full text-sm"
                        />
                    </div>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogVisible(false)} />
                    <Button label="Simpan" icon="pi pi-check" loading={saving} onClick={handleSave} className="bg-primary border-none" />
                </div>
            </Dialog>

            {/* DIALOG ATUR & CROP FOTO LAYANAN */}
            <ImageCropDialog
                visible={cropDialogVisible}
                onHide={() => setCropDialogVisible(false)}
                imageSrc={cropImageSrc}
                aspectRatio={1.65}
                targetWidth={560}
                targetHeight={340}
                onSave={handleCropSave}
                previewTitle={formData.nama || 'Contoh Nama Layanan'}
                previewCategory={kategoriList.find((k: any) => k.value === formData.kode_kategori_layanan)?.label || 'LAYANAN'}
                previewPrice={formData.harga || 100000}
                previewDuration={formData.durasi_menit || 30}
                consultType={formData.tipe === 'MEDICAL TREATMENT' ? 'wajib' : formData.tipe === 'SERVICE TREATMENT' ? 'tidak' : 'opsional'}
            />
        </div>
    );
};

export default Page;
