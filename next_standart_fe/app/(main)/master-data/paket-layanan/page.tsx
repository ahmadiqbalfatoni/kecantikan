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
    const [layananOptions, setLayananOptions] = useState<any[]>([]);
    const [ruanganList, setRuanganList] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<any>(null);

    const tipeOptions = [
        { label: 'MEDICAL TREATMENT (Wajib Konsul)', value: 'MEDICAL TREATMENT' },
        { label: 'BEAUTY TREATMENT (Opsional)', value: 'BEAUTY TREATMENT' },
        { label: 'SERVICE TREATMENT (Tidak Perlu Konsul)', value: 'SERVICE TREATMENT' }
    ];

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_paket_layanan: '',
        kode_ruangan: '',
        nama: '',
        tipe: 'BEAUTY TREATMENT',
        harga_paket: 0,
        masa_berlaku_hari: 365,
        is_masa_berlaku_selamanya: false,
        is_selamanya: true,
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
            const res = await postData('/master/paket-layanan-data', { page, perPage: rows, keyword });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data paket layanan');
        } finally {
            setLoading(false);
        }
    };

    const loadLayanan = async () => {
        try {
            const res = await postData('/master/layanan-data', { status: 'aktif' });
            const list = (res.data.data || []).map((l: any) => {
                const tipeVal = l.tipe || 'BEAUTY TREATMENT';
                let labelExtra = '';
                if (tipeVal === 'MEDICAL TREATMENT') labelExtra = ' [MEDICAL]';
                else if (tipeVal === 'BEAUTY TREATMENT') labelExtra = ' [BEAUTY]';
                else if (tipeVal === 'SERVICE TREATMENT') labelExtra = ' [SERVICE]';

                return {
                    label: `${l.nama} (${l.kode_layanan})${labelExtra} - ${formatRupiah(l.harga || 0)}`,
                    value: l.kode_layanan,
                    nama: l.nama,
                    kode_ruangan: l.kode_ruangan,
                    nama_ruangan: l.nama_ruangan,
                    tipe: tipeVal,
                    harga: Number(l.harga) || 0
                };
            });
            setLayananOptions(list);
        } catch (error) {
            console.error('Failed to load layanan options');
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
    }, [page, rows, keyword]);

    useEffect(() => {
        loadLayanan();
        loadRuangan();
    }, []);

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

    const getFilteredLayananOptions = (kodeRuangan?: string) => {
        const rCode = kodeRuangan !== undefined ? kodeRuangan : formData.kode_ruangan;
        let list = layananOptions;
        if (rCode) {
            list = list.filter((l: any) => l.kode_ruangan === rCode);
        }
        return list;
    };

    const calculateNormalTotal = (detailsList: any[]) => {
        return (detailsList || []).reduce((acc: number, det: any) => {
            const found = layananOptions.find((l: any) => l.value === det.kode_layanan);
            const itemHarga = found?.harga !== undefined ? found.harga : (det.harga_layanan || 0);
            return acc + (itemHarga * (det.jumlah_sesi || 1));
        }, 0);
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        const initialRuangan = ruanganList[0]?.value || '';
        const initialAvailable = getFilteredLayananOptions(initialRuangan);

        const initialDetails = initialAvailable.length > 0 ? [{ kode_layanan: initialAvailable[0].value, jumlah_sesi: 1 }] : [];
        const initialPrice = calculateNormalTotal(initialDetails);

        setFormData({
            kode_paket_layanan: '',
            kode_ruangan: initialRuangan,
            nama: '',
            tipe: 'BEAUTY TREATMENT',
            harga_paket: initialPrice,
            masa_berlaku_hari: 365,
            is_masa_berlaku_selamanya: false,
            is_selamanya: true,
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
        const isMasaBerlakuSelamanya = Boolean(rowData.is_masa_berlaku_selamanya) || Number(rowData.masa_berlaku_hari) === 0 || rowData.masa_berlaku_hari === null;
        setFormData({
            ...rowData,
            tipe: rowData.tipe || 'BEAUTY TREATMENT',
            kode_ruangan: rowData.kode_ruangan || '',
            masa_berlaku_hari: isMasaBerlakuSelamanya ? 365 : Number(rowData.masa_berlaku_hari),
            is_masa_berlaku_selamanya: isMasaBerlakuSelamanya,
            is_selamanya: Boolean(rowData.is_selamanya),
            tanggal_mulai: formatYmd(rowData.tanggal_mulai),
            tanggal_selesai: formatYmd(rowData.tanggal_selesai),
            foto: null,
            foto_url: rowData.foto || '',
            hapus_foto: false,
            details: (rowData.details || []).map((d: any) => ({
                kode_layanan: d.kode_layanan,
                jumlah_sesi: d.jumlah_sesi,
                harga_layanan: d.harga_layanan || 0
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
        if (_expandedRows[rowData.kode_paket_layanan]) {
            delete _expandedRows[rowData.kode_paket_layanan];
        } else {
            _expandedRows[rowData.kode_paket_layanan] = true;
        }
        setExpandedRows(_expandedRows);
    };

    const handleAddDetail = () => {
        const available = getFilteredLayananOptions();
        if (available.length === 0) {
            showError(toast, 'Tidak ada layanan yang tersedia!');
            return;
        }
        const newDetails = [...formData.details, { kode_layanan: available[0].value, jumlah_sesi: 1 }];
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
        if (!formData.tipe) {
            showError(toast, 'Tipe Paket wajib dipilih!');
            return;
        }
        if (!formData.details || formData.details.length === 0) {
            showError(toast, 'Minimal tambahkan 1 detail layanan!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/paket-layanan-update' : '/master/paket-layanan-create';
            
            const fd = new FormData();
            if (isEdit) {
                fd.append('kode_paket_layanan', formData.kode_paket_layanan);
            }
            fd.append('nama', formData.nama);
            fd.append('tipe', formData.tipe || 'BEAUTY TREATMENT');
            fd.append('kode_ruangan', formData.kode_ruangan || '');
            fd.append('harga_paket', String(formData.harga_paket || 0));
            fd.append('masa_berlaku_hari', String(formData.masa_berlaku_hari || 365));
            fd.append('is_masa_berlaku_selamanya', formData.is_masa_berlaku_selamanya ? '1' : '0');
            fd.append('is_selamanya', formData.is_selamanya ? '1' : '0');
            fd.append('tanggal_mulai', formData.tanggal_mulai || '');
            fd.append('tanggal_selesai', formData.tanggal_selesai || '');
            fd.append('status', formData.status || 'aktif');
            fd.append('details', JSON.stringify(formData.details || []));

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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} paket layanan ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/paket-layanan-delete', { kode_paket_layanan: codes });
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
                        Detail Layanan Paket: {data.nama} ({data.kode_paket_layanan})
                    </h5>
                    <span className="text-xs text-500 font-medium">Total: {data.details?.length || 0} Layanan</span>
                </div>
                <div className="border-1 surface-border border-round overflow-hidden surface-card">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="surface-200 text-800 text-xs">
                                <th className="p-2 border-bottom-1 surface-border" style={{ width: '3rem' }}>No</th>
                                <th className="p-2 border-bottom-1 surface-border">Kode Layanan</th>
                                <th className="p-2 border-bottom-1 surface-border">Nama Layanan</th>
                                <th className="p-2 border-bottom-1 surface-border">Tipe Layanan</th>
                                <th className="p-2 border-bottom-1 surface-border text-right">Harga Satuan</th>
                                <th className="p-2 border-bottom-1 surface-border text-right" style={{ width: '120px' }}>Jumlah Sesi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.details || []).map((item: any, idx: number) => {
                                const tipeVal = item.tipe_layanan || 'BEAUTY TREATMENT';
                                const isItemInactive = item.status_layanan === 'nonaktif';
                                let severity: 'danger' | 'info' | 'success' | 'warning' = 'info';
                                if (tipeVal === 'MEDICAL TREATMENT') severity = 'danger';
                                else if (tipeVal === 'SERVICE TREATMENT') severity = 'success';

                                return (
                                    <tr key={idx} className={`border-bottom-1 surface-border text-sm ${isItemInactive ? 'bg-red-50' : 'hover:surface-100'}`}>
                                        <td className="p-2 text-500">{idx + 1}</td>
                                        <td className="p-2 text-primary font-medium">{item.kode_layanan}</td>
                                        <td className="p-2 font-medium">
                                            {item.nama_layanan || item.kode_layanan}
                                            {isItemInactive && (
                                                <Tag value="LAYANAN NONAKTIF" severity="danger" className="text-[10px] px-2 py-0.5 ml-2 font-bold" />
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <Tag value={tipeVal} severity={severity} className="text-xs px-2 py-0.5" />
                                        </td>
                                        <td className="p-2 text-right font-medium text-600">{formatRupiah(item.harga_layanan || 0)}</td>
                                        <td className="p-2 text-right">
                                            <Tag value={`${item.jumlah_sesi} Sesi`} severity="info" />
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!data.details || data.details.length === 0) && (
                                <tr>
                                    <td colSpan={6} className="p-3 text-center text-500 text-sm">Tidak ada detail layanan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const normalTotal = calculateNormalTotal(formData.details || []);

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header Action Bar */}
            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-box text-purple-600 text-2xl" />
                        Kelola Paket Layanan
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tambah, edit, atau nonaktifkan bundel paket treatment dan sesi layanan.
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
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_paket_layanan)); }}
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
                    dataKey="kode_paket_layanan"
                    className="p-datatable-sm"
                    emptyMessage="Data paket layanan tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Paket Layanan</span>
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
                                title={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif (Layanan Non-aktif / Expired)'}
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
                    <Column field="kode_paket_layanan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column field="nama" header="Nama Paket" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        field="tipe"
                        header="Tipe Paket"
                        sortable
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r) => {
                            const val = r.tipe || 'BEAUTY TREATMENT';
                            let severity: 'danger' | 'info' | 'success' | 'warning' = 'info';
                            if (val === 'MEDICAL TREATMENT') severity = 'danger';
                            else if (val === 'SERVICE TREATMENT') severity = 'success';
                            return <Tag value={val} severity={severity} className="text-xs px-2 py-1" />;
                        }}
                    ></Column>
                    <Column field="nama_ruangan" header="Ruangan" body={(r) => r.nama_ruangan ? `${r.kode_ruangan ? r.kode_ruangan + ' - ' : ''}${r.nama_ruangan}` : (r.kode_ruangan || '-')}></Column>
                    <Column
                        header="Detail Layanan"
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
                    <Column
                        field="masa_berlaku_hari"
                        header="Masa Berlaku"
                        body={(r) => (Boolean(r.is_masa_berlaku_selamanya) || Number(r.masa_berlaku_hari) === 0 || r.masa_berlaku_hari === null) ? (
                            <Tag value="Selamanya" severity="success" icon="pi pi-infinity" className="text-xs" />
                        ) : `${r.masa_berlaku_hari} Hari`}
                    ></Column>
                    <Column
                        header="Periode Aktif Paket"
                        body={(r) => {
                            if (r.has_inactive_layanan) {
                                return (
                                    <div className="flex flex-column gap-1 text-xs">
                                        <Tag severity="danger" value="Nonaktif (Layanan Non-aktif)" className="text-[10px] py-1 px-2 font-bold" style={{ width: 'fit-content' }} />
                                        <span className="text-red-500 text-[11px] font-medium" title={(r.inactive_layanan_names || []).join(', ')}>
                                            Ada layanan nonaktif
                                        </span>
                                    </div>
                                );
                            }

                            if (Boolean(r.is_selamanya)) {
                                return (
                                    <div className="flex flex-column gap-1 text-xs">
                                        <Tag severity="success" value="Aktif Selamanya" icon="pi pi-infinity" className="text-[11px] py-1 px-2 font-bold" style={{ width: 'fit-content' }} />
                                    </div>
                                );
                            }

                            const start = formatYmd(r.tanggal_mulai);
                            const end = formatYmd(r.tanggal_selesai);
                            const sisa = r.sisa_hari !== undefined ? parseInt(r.sisa_hari, 10) : 0;
                            const isInactive = r.status === 'nonaktif' || (end && sisa <= 0);

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

                            if (end) {
                                return (
                                    <div className="flex flex-column gap-1 text-xs">
                                        <span className="font-bold text-green-600 flex align-items-center gap-1">
                                            <i className="pi pi-clock text-green-600 text-xs" />
                                            Sisa {sisa} Hari
                                        </span>
                                        {start && (
                                            <span className="text-500 text-[11px]">
                                                {start} s/d {end}
                                            </span>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div className="flex flex-column gap-1 text-xs">
                                    <Tag severity="success" value="Aktif" className="text-[11px] py-1 px-2 font-bold" style={{ width: 'fit-content' }} />
                                    {start && <span className="text-500 text-[11px]">Mulai {start}</span>}
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
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_paket_layanan])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* Modal Create/Edit */}
            <Dialog header={isEdit ? 'Edit Paket Layanan' : 'Tambah Paket Layanan'} visible={dialogVisible} style={{ width: '620px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Paket</label>
                            <InputText value={formData.kode_paket_layanan} disabled className="w-full text-sm border-round-md" />
                        </div>
                    )}

                    {/* UPLOAD FOTO AREA */}
                    <div className="surface-50 p-3 border-round-xl border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="text-sm font-semibold text-800 flex align-items-center gap-2">
                                <i className="pi pi-image text-primary" />
                                <span>Foto Paket Layanan</span>
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
                                    <p className="text-sm font-semibold text-800 m-0 mb-1">Klik untuk Memilih Foto Paket Layanan</p>
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
                                            <span className="text-xs font-semibold text-700">Pratinjau Foto Paket</span>
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
                        <label className="block text-sm font-semibold mb-1">Nama Paket *</label>
                        <InputText
                            value={formData.nama}
                            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                            placeholder="contoh : Paket Glowing Skin"
                            className={`w-full text-sm border-round-md ${submitted && !formData.nama?.trim() ? 'p-invalid' : ''}`}
                        />
                        {submitted && !formData.nama?.trim() && (
                            <small className="p-error text-red-500 text-xs block mt-1">Nama paket wajib diisi.</small>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Tipe Paket *</label>
                        <Dropdown
                            value={formData.tipe}
                            options={tipeOptions}
                            onChange={(e) => setFormData({ ...formData, tipe: e.value })}
                            placeholder="Pilih Tipe Paket..."
                            className="w-full text-sm border-round-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Ruangan</label>
                        <Dropdown
                            value={formData.kode_ruangan}
                            options={ruanganList}
                            onChange={(e) => {
                                const newRuangan = e.value;
                                const filteredLayanan = getFilteredLayananOptions(newRuangan);

                                const validDetails = (formData.details || []).filter((d: any) =>
                                    !newRuangan || filteredLayanan.some((fl: any) => fl.value === d.kode_layanan)
                                );

                                if (validDetails.length === 0 && filteredLayanan.length > 0) {
                                    validDetails.push({ kode_layanan: filteredLayanan[0].value, jumlah_sesi: 1 });
                                }

                                const newPrice = calculateNormalTotal(validDetails);
                                setFormData({
                                    ...formData,
                                    kode_ruangan: newRuangan,
                                    details: validDetails,
                                    harga_paket: newPrice
                                });
                            }}
                            placeholder="Pilih Ruangan..."
                            showClear
                            filter
                            className="w-full text-sm border-round-md"
                        />
                        {formData.kode_ruangan && (
                            <small className="text-purple-600 font-medium text-xs block mt-1">
                                <i className="pi pi-filter mr-1" />
                                {getFilteredLayananOptions().length > 0
                                    ? `Menampilkan ${getFilteredLayananOptions().length} layanan yang terdaftar di ruangan ini.`
                                    : 'Perhatian: Tidak ada layanan yang terdaftar di ruangan ini.'}
                            </small>
                        )}
                    </div>

                    <div className="grid">
                        <div className="col-12">
                            <label className="block text-sm font-semibold mb-1">Harga Paket (Rp) *</label>
                            <InputNumber
                                value={formData.harga_paket}
                                onValueChange={(e) => setFormData({ ...formData, harga_paket: e.value || 0 })}
                                mode="currency"
                                currency="IDR"
                                locale="id-ID"
                                className="w-full text-sm border-round-md"
                            />
                            <div className="flex align-items-center justify-content-between text-xs mt-1">
                                <span className="text-600">
                                    Total Normal Layanan: <strong className="text-purple-700">{formatRupiah(normalTotal)}</strong>
                                </span>
                                {normalTotal > 0 && formData.harga_paket < normalTotal && (
                                    <span className="text-green-600 font-bold">
                                        (Hemat Diskon: {formatRupiah(normalTotal - formData.harga_paket)})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 1. MASA BERLAKU SESI KONSUMEN (EXPIRED PASIEN) */}
                    <div className="surface-50 p-3 border-round-md border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-1">
                            <span className="font-bold text-sm text-900 flex align-items-center gap-2">
                                <i className="pi pi-user-check text-purple-600" />
                                Masa Berlaku Konsumen (Sesi)
                            </span>
                            <div className="flex align-items-center gap-2">
                                <span className="text-xs font-semibold text-700">Berlaku Selamanya</span>
                                <InputSwitch
                                    checked={Boolean(formData.is_masa_berlaku_selamanya)}
                                    onChange={(e) => setFormData({ ...formData, is_masa_berlaku_selamanya: e.value })}
                                />
                            </div>
                        </div>
                        <p className="text-500 text-xs m-0 mb-2">
                            Mencatat batas waktu kedaluwarsa sesi bagi pasien setelah membeli paket ini.
                        </p>

                        {formData.is_masa_berlaku_selamanya ? (
                            <div className="text-xs text-green-700 bg-green-50 p-2 border-round-md border-1 border-green-200 flex align-items-center gap-2">
                                <i className="pi pi-check-circle text-green-600 text-sm" />
                                <span>
                                    Sesi paket ini <strong>Berlaku Selamanya</strong> bagi pasien (tidak ada batas waktu kedaluwarsa setelah dibeli).
                                </span>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold mb-1">Masa Berlaku Sesi Pasien (Hari) *</label>
                                <InputNumber
                                    value={formData.masa_berlaku_hari}
                                    onValueChange={(e) => setFormData({ ...formData, masa_berlaku_hari: e.value })}
                                    suffix=" hari"
                                    min={1}
                                    placeholder="Contoh: 365"
                                    className="w-full text-sm border-round-md"
                                />
                                <small className="text-500 text-[11px] block mt-1">
                                    Contoh: jika diisi 365 hari, pasien wajib menggunakan sesi sebelum 365 hari sejak tanggal pembelian.
                                </small>
                            </div>
                        )}
                    </div>

                    {/* 2. PERIODE AKTIF PAKET LAYANAN (KATALOG KLINIK) */}
                    <div className="surface-50 p-3 border-round-md border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-1">
                            <span className="font-bold text-sm text-900 flex align-items-center gap-2">
                                <i className="pi pi-calendar text-blue-600" />
                                Periode Aktif Paket Layanan
                            </span>
                            <div className="flex align-items-center gap-2">
                                <span className="text-xs font-semibold text-700">Aktif Selamanya</span>
                                <InputSwitch
                                    checked={Boolean(formData.is_selamanya)}
                                    onChange={(e) => setFormData({ ...formData, is_selamanya: e.value })}
                                />
                            </div>
                        </div>
                        <p className="text-500 text-xs m-0 mb-2">
                            Mencatat masa ketersediaan paket ini untuk dijual di klinik / transaksi.
                        </p>

                        {formData.is_selamanya ? (
                            <div className="text-xs text-blue-700 bg-blue-50 p-2 border-round-md border-1 border-blue-200 flex align-items-center gap-2">
                                <i className="pi pi-info-circle text-blue-600 text-sm" />
                                <span>
                                    Paket ini diset <strong>Aktif Selamanya</strong> di klinik tanpa batasan tanggal promo.
                                </span>
                            </div>
                        ) : (
                            <div className="grid pt-1">
                                <div className="col-6">
                                    <label className="block text-xs font-semibold mb-1">Tanggal Mulai Aktif</label>
                                    <InputText
                                        type="date"
                                        value={formData.tanggal_mulai || ''}
                                        onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                                        className="w-full text-sm border-round-md"
                                    />
                                    <small className="text-400 text-[11px] block mt-1">Kosongkan untuk tanggal hari ini</small>
                                </div>
                                <div className="col-6">
                                    <label className="block text-xs font-semibold mb-1">Tanggal Selesai Aktif</label>
                                    <InputText
                                        type="date"
                                        value={formData.tanggal_selesai || ''}
                                        onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                                        className="w-full text-sm border-round-md"
                                    />
                                    <small className="text-400 text-[11px] block mt-1">Kosongkan jika tidak dibatasi</small>
                                </div>
                            </div>
                        )}
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
                    </div>

                    <div className="mt-2 border-top-1 surface-border pt-3">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label className="font-bold text-sm text-900">Detail Layanan Dalam Paket *</label>
                            <Button label="Tambah Layanan" icon="pi pi-plus" text size="small" onClick={handleAddDetail} />
                        </div>
                        <div className="text-xs text-blue-700 bg-blue-50 p-2 border-round-md border-1 border-blue-200 mb-2 flex align-items-center gap-2">
                            <i className="pi pi-info-circle text-blue-600 text-sm" />
                            <span>
                                Bebas memilih layanan dengan tipe berbeda (Medical, Beauty, Service) untuk digabungkan ke dalam paket.
                            </span>
                        </div>
                        {submitted && (!formData.details || formData.details.length === 0) && (
                            <small className="p-error text-red-500 text-xs block mb-2">Minimal tambahkan 1 detail layanan dalam paket.</small>
                        )}

                        {(formData.details || []).map((det: any, idx: number) => {
                            const availableLayanan = getFilteredLayananOptions();
                            const currentOption = layananOptions.find((l: any) => l.value === det.kode_layanan);
                            let rowLayananOptions = availableLayanan;
                            if (currentOption && !rowLayananOptions.some((o: any) => o.value === det.kode_layanan)) {
                                rowLayananOptions = [currentOption, ...rowLayananOptions];
                            }
                            return (
                                <div key={idx} className="flex align-items-center gap-2 mb-2 p-2 surface-100 border-round">
                                    <div className="flex-grow-1">
                                        <Dropdown
                                            value={det.kode_layanan}
                                            options={rowLayananOptions}
                                            onChange={(e) => handleDetailChange(idx, 'kode_layanan', e.value)}
                                            placeholder="Pilih Layanan..."
                                            filter
                                            emptyMessage="Tidak ada layanan yang tersedia"
                                            className="w-full text-sm"
                                        />
                                    </div>
                                    <div style={{ width: '120px' }}>
                                        <InputNumber
                                            value={det.jumlah_sesi}
                                            onValueChange={(e) => handleDetailChange(idx, 'jumlah_sesi', e.value || 1)}
                                            suffix=" Sesi"
                                            min={1}
                                            className="w-full text-sm"
                                        />
                                    </div>
                                    <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => handleRemoveDetail(idx)} tooltip="Hapus" />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogVisible(false)} />
                    <Button label="Simpan" icon="pi pi-check" loading={saving} onClick={handleSave} className="bg-primary border-none" />
                </div>
            </Dialog>

            {/* DIALOG ATUR & CROP FOTO PAKET LAYANAN */}
            <ImageCropDialog
                visible={cropDialogVisible}
                onHide={() => setCropDialogVisible(false)}
                imageSrc={cropImageSrc}
                aspectRatio={1.65}
                targetWidth={560}
                targetHeight={340}
                onSave={handleCropSave}
                previewTitle={formData.nama || 'Contoh Nama Paket Layanan'}
                previewCategory="PAKET TREATMENT"
                previewPrice={formData.harga_paket || 250000}
                previewDuration={60}
            />
        </div>
    );
};

export default Page;
