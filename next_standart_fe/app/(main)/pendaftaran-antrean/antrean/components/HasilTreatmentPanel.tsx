'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { AntrianLayananData } from './interfaces';
import {
    CheckCircle2,
    Trash2,
    Plus,
    Minus,
    Sparkles,
    ShoppingBag,
    Tag as TagIcon,
    Loader2,
    ShieldCheck,
    X,
    Ticket,
    User,
    Search,
    RotateCcw,
    ChevronDown
} from 'lucide-react';

interface ProdukItem {
    kode_produk: string;
    nama: string;
    harga_jual: number;
    satuan?: string;
    kode_kategori_produk?: string;
    nama_kategori?: string;
    foto?: string | null;
}

interface SelectedProduk {
    kode_produk: string;
    nama: string;
    harga_jual: number;
    satuan?: string;
    qty: number;
    is_rekomendasi_dokter?: boolean;
    foto?: string | null;
}

interface HasilTreatmentPanelProps {
    activePatient: AntrianLayananData | null;
    toast: React.RefObject<Toast>;
    getGridData: () => void;
    kodeRuangan: string;
    namaRuangan: string;
    savedFormData?: Record<string, any>;
    savedCatatanPetugas?: string;
    savedPetugasNama?: string;
    selectedPetugas?: string;
    initialFotoBeforeUrl?: string;
    onFotoBeforeChange?: (url: string) => void;
    onHasilSavedChange?: (saved: boolean) => void;
}

const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const getCategoryBadgeStyle = (catName?: string) => {
    const lower = (catName || '').toLowerCase();
    if (lower.includes('rambut') || lower.includes('hair')) {
        return { color: '#2563EB', borderColor: '#2563EB' };
    }
    if (lower.includes('muka') || lower.includes('wajah') || lower.includes('face')) {
        return { color: '#0C8F62', borderColor: '#0C8F62' };
    }
    if (lower.includes('badan') || lower.includes('tubuh') || lower.includes('body')) {
        return { color: '#D97706', borderColor: '#D97706' };
    }
    return { color: '#0C8F62', borderColor: '#0C8F62' };
};

export const HasilTreatmentPanel: React.FC<HasilTreatmentPanelProps> = ({
    activePatient,
    toast,
    getGridData,
    kodeRuangan,
    namaRuangan,
    savedFormData,
    savedCatatanPetugas,
    savedPetugasNama,
    selectedPetugas,
    initialFotoBeforeUrl = '',
    onFotoBeforeChange,
    onHasilSavedChange,
}) => {
    // Foto Before & After state
    const [fotoBeforeUrl, setFotoBeforeUrl] = useState<string>(initialFotoBeforeUrl || '');
    const [uploadingFotoBefore, setUploadingFotoBefore] = useState<boolean>(false);
    const fileInputBeforeRef = useRef<HTMLInputElement>(null);
    const pendingFotoBeforeRef = useRef<{ base64: string; fileName: string } | null>(null);

    const [fotoAfterUrl, setFotoAfterUrl] = useState<string>('');
    const [uploadingFoto, setUploadingFoto] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingFotoAfterRef = useRef<{ base64: string; fileName: string } | null>(null);

    // Produk Dropdown & Selection state
    const [produkOptions, setProdukOptions] = useState<ProdukItem[]>([]);
    const [loadingProduk, setLoadingProduk] = useState<boolean>(false);
    const [selectedProdukList, setSelectedProdukList] = useState<SelectedProduk[]>([]);

    // State Popup Modal Produk & Draft Seleksi
    const [showProdukModal, setShowProdukModal] = useState<boolean>(false);
    const [draftProdukList, setDraftProdukList] = useState<SelectedProduk[]>([]);
    const [modalSearch, setModalSearch] = useState<string>('');
    const [modalCategory, setModalCategory] = useState<string>('ALL');

    // State Biaya Custom
    const [showCustomFeeModal, setShowCustomFeeModal] = useState<boolean>(false);
    const [customFeeNama, setCustomFeeNama] = useState<string>('');
    const [customFeeHarga, setCustomFeeHarga] = useState<number | null>(null);

    // Layanan Pasien Pendaftaran State
    const [layananPasienList, setLayananPasienList] = useState<any[]>([]);
    const [loadingLayanan, setLoadingLayanan] = useState<boolean>(false);

    // Catatan treatment
    const [catatan, setCatatan] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Setelah submit, kunci semua input agar tidak bisa diubah lagi
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

    // Modal Konfirmasi Persetujuan
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

    const handleAddCustomFee = () => {
        if (isSubmitted) return;
        if (!customFeeNama.trim()) {
            showError(toast, 'Nama biaya / produk custom wajib diisi!');
            return;
        }
        if (!customFeeHarga || customFeeHarga <= 0) {
            showError(toast, 'Nominal harga wajib lebih dari 0!');
            return;
        }

        const customItem: SelectedProduk = {
            kode_produk: `CST-${Date.now().toString().slice(-10)}`,
            nama: customFeeNama.trim(),
            harga_jual: customFeeHarga,
            satuan: 'item',
            qty: 1,
        };

        setSelectedProdukList((prev) => [...prev, customItem]);
        setDraftProdukList((prev) => [...prev, customItem]);
        setShowCustomFeeModal(false);
        setCustomFeeNama('');
        setCustomFeeHarga(null);
        showSuccess(toast, 'Biaya tambahan custom berhasil ditambahkan!');
    };

    useEffect(() => {
        fetchProdukOptions();
    }, []);

    const prevPatientKeyRef = useRef<string | null>(null);
    const patientKey = `${activePatient?.kode_antrian_layanan || ''}_${activePatient?.kode_kunjungan || ''}`;

    const loadExistingRekomendasiProduk = async (kodeKunjungan: string) => {
        if (!kodeKunjungan) return;
        if (Array.isArray((activePatient as any)?.rekomendasi_produk_dokter) && (activePatient as any).rekomendasi_produk_dokter.length > 0) {
            const mapped: SelectedProduk[] = (activePatient as any).rekomendasi_produk_dokter.map((item: any) => ({
                kode_produk: item.kode_produk,
                nama: item.nama || item.nama_produk,
                harga_jual: parseFloat(item.harga_jual || item.harga || 0),
                satuan: item.satuan || 'pcs',
                qty: parseInt(item.qty || 1, 10),
                is_rekomendasi_dokter: true,
                foto: item.foto || item.foto_produk || null,
            }));
            setSelectedProdukList(mapped);
            return;
        }
        try {
            const res = await postData('/master/kunjungan-produk-rekomendasi', { kode_kunjungan: kodeKunjungan });
            const list = res.data?.data || [];
            if (list.length > 0) {
                const mapped: SelectedProduk[] = list.map((item: any) => ({
                    kode_produk: item.kode_produk,
                    nama: item.nama || item.nama_produk,
                    harga_jual: parseFloat(item.harga_jual || item.harga || 0),
                    satuan: item.satuan || 'pcs',
                    qty: parseInt(item.qty || 1, 10),
                    is_rekomendasi_dokter: true,
                    foto: item.foto || null,
                }));
                setSelectedProdukList(mapped);
            }
        } catch (_) {
            // silent fail
        }
    };

    const loadLayananPasien = async (kodeKunjungan: string) => {
        setLoadingLayanan(true);
        try {
            const res = await postData('/master/antrian-layanan-pendaftaran-items', {
                kode_kunjungan: kodeKunjungan,
            });
            if (['00', '0000', 200, '200'].includes(res.data?.status) || res.status === 200) {
                if (res.data?.data?.length > 0) {
                    setLayananPasienList(res.data.data);
                } else if ((activePatient as any)?.details && (activePatient as any).details.length > 0) {
                    setLayananPasienList((activePatient as any).details);
                } else {
                    setLayananPasienList([]);
                }
            } else if ((activePatient as any)?.details && (activePatient as any).details.length > 0) {
                setLayananPasienList((activePatient as any).details);
            } else {
                setLayananPasienList([]);
            }
        } catch (_) {
            if ((activePatient as any)?.details && (activePatient as any).details.length > 0) {
                setLayananPasienList((activePatient as any).details);
            } else {
                setLayananPasienList([]);
            }
        } finally {
            setLoadingLayanan(false);
        }
    };

    // Reset state & auto-load rekomendasi produk & layanan pasien HANYA saat pasien berganti
    useEffect(() => {
        if (!activePatient?.kode_antrian_layanan && !activePatient?.kode_kunjungan) {
            return;
        }

        if (prevPatientKeyRef.current !== patientKey) {
            prevPatientKeyRef.current = patientKey;

            const isAlreadyCompleted = activePatient?.status === 'selesai';
            setIsSubmitted(isAlreadyCompleted);
            onHasilSavedChange?.(isAlreadyCompleted);

            setFotoBeforeUrl(initialFotoBeforeUrl || savedFormData?.foto_before || (activePatient as any)?.foto_before || '');
            setFotoAfterUrl(savedFormData?.foto_after || (activePatient as any)?.foto_after || '');
            setCatatan(savedCatatanPetugas || (activePatient as any)?.catatan_hasil_treatment || (activePatient as any)?.catatan || '');
            setSelectedProdukList([]);

            if (activePatient?.kode_kunjungan) {
                loadExistingRekomendasiProduk(activePatient.kode_kunjungan);
                loadLayananPasien(activePatient.kode_kunjungan);
            } else if ((activePatient as any)?.details && (activePatient as any).details.length > 0) {
                setLayananPasienList((activePatient as any).details);
            } else {
                setLayananPasienList([]);
            }
        }
    }, [patientKey, activePatient?.status]);

    // Sinkronisasi foto before jika baru tersedia dari parent tanpa mereset data lain
    useEffect(() => {
        if (initialFotoBeforeUrl && !fotoBeforeUrl) {
            setFotoBeforeUrl(initialFotoBeforeUrl);
        }
    }, [initialFotoBeforeUrl]);

    const fetchProdukOptions = async () => {
        setLoadingProduk(true);
        try {
            const res = await postData('/master/produk-dropdown', {});
            const list: ProdukItem[] = (res.data?.data || [])
                .filter((p: any) => !String(p.kode_produk || '').startsWith('CUSTOM-') && !String(p.kode_produk || '').startsWith('CST-'))
                .map((p: any) => ({
                    kode_produk: p.kode_produk,
                    nama: p.nama,
                    harga_jual: parseFloat(p.harga_jual || 0),
                    satuan: p.satuan || 'pcs',
                    kode_kategori_produk: p.kode_kategori_produk,
                    nama_kategori: p.nama_kategori || 'Produk',
                    foto: p.foto || null,
                }));
            setProdukOptions(list);
        } catch (_) {
            showError(toast, 'Gagal memuat daftar produk');
        } finally {
            setLoadingProduk(false);
        }
    };

    // Unggah / Siapkan Foto Before
    const handleBeforeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitted) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError(toast, 'File harus berupa gambar (JPG, PNG, WEBP, dll)');
            return;
        }

        try {
            setUploadingFotoBefore(true);
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            pendingFotoBeforeRef.current = { base64, fileName: file.name };
            setFotoBeforeUrl(base64);
            onFotoBeforeChange?.(base64);
            if (fileInputBeforeRef.current) fileInputBeforeRef.current.value = '';
        } catch (_) {
            showError(toast, 'Gagal memproses foto before');
        } finally {
            setUploadingFotoBefore(false);
        }
    };

    // Unggah / Siapkan Foto After
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitted) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError(toast, 'File harus berupa gambar (JPG, PNG, WEBP, dll)');
            return;
        }

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            pendingFotoAfterRef.current = { base64, fileName: file.name };
            setFotoAfterUrl(base64);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (_) {
            showError(toast, 'Gagal memproses gambar');
        }
    };

    // Guard untuk mencegah double-trigger / duplicate click event
    const lastAddRef = useRef<{ kode: string; time: number }>({ kode: '', time: 0 });

    // Buka Pop-up Modal Produk: inisialisasi draft dari daftar yang sudah terpilih
    const handleOpenProdukModal = () => {
        if (isSubmitted) return;
        setDraftProdukList([...selectedProdukList]);
        setModalSearch('');
        setModalCategory('ALL');
        setShowProdukModal(true);
    };

    // Konfirmasi dari Pop-up Modal Produk: terapkan draft ke tampilan utama
    const handleConfirmProdukModal = () => {
        setSelectedProdukList([...draftProdukList]);
        setShowProdukModal(false);
        showSuccess(toast, 'Daftar produk tambahan berhasil diterapkan!');
    };

    // Tambahkan produk ke daftar draft di modal
    const handleDraftAddProduk = (prod: ProdukItem) => {
        const now = Date.now();
        if (lastAddRef.current.kode === prod.kode_produk && now - lastAddRef.current.time < 250) {
            return;
        }
        lastAddRef.current = { kode: prod.kode_produk, time: now };

        setDraftProdukList((prev) => {
            const existingIndex = prev.findIndex((p) => p.kode_produk === prod.kode_produk);
            if (existingIndex > -1) {
                return prev.map((p, idx) =>
                    idx === existingIndex ? { ...p, qty: p.qty + 1 } : p
                );
            }
            return [...prev, {
                kode_produk: prod.kode_produk,
                nama: prod.nama,
                harga_jual: prod.harga_jual,
                satuan: prod.satuan || 'pcs',
                qty: 1,
                foto: prod.foto || null,
            }];
        });
    };

    // Update Qty produk di draft modal
    const handleDraftUpdateQty = (kode_produk: string, delta: number) => {
        setDraftProdukList((prev) =>
            prev
                .map((p) => {
                    if (p.kode_produk === kode_produk) {
                        const newQty = p.qty + delta;
                        return newQty > 0 ? { ...p, qty: newQty } : null;
                    }
                    return p;
                })
                .filter((p): p is SelectedProduk => p !== null)
        );
    };

    // Remove produk di draft modal
    const handleDraftRemoveProduk = (kode_produk: string) => {
        setDraftProdukList((prev) => prev.filter((p) => p.kode_produk !== kode_produk));
    };

    // Calculate Total di Tampilan Utama
    const grandTotal = selectedProdukList.reduce((acc, curr) => acc + curr.qty * curr.harga_jual, 0);
    const totalHargaLayanan = layananPasienList.reduce((acc, curr) => acc + parseFloat(curr.harga || 0), 0);

    // Click Simpan & Setujui
    const handleSaveClick = () => {
        if (!activePatient) {
            showError(toast, 'Tidak ada pasien aktif yang dipilih');
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        if (!activePatient) return;
        setShowConfirmModal(false);
        setSubmitting(true);

        try {
            let finalFotoBefore = fotoBeforeUrl;

            // Simpan / Upload Foto Before jika berupa base64 atau pending saat tombol selesai di-klik
            if (pendingFotoBeforeRef.current || (finalFotoBefore && finalFotoBefore.startsWith('data:image/'))) {
                try {
                    const base64Data = pendingFotoBeforeRef.current?.base64 || finalFotoBefore;
                    const fileName = pendingFotoBeforeRef.current?.fileName || 'foto_before.jpg';
                    const resBefore = await postData('/master/ruangan-form-upload-foto', {
                        image_base64: base64Data,
                        file_name: fileName,
                        prefix: 'before',
                    });
                    const pathBefore = resBefore?.data?.data?.file_path || resBefore?.data?.file_path;
                    if (pathBefore) {
                        finalFotoBefore = pathBefore;
                        pendingFotoBeforeRef.current = null;
                        setFotoBeforeUrl(finalFotoBefore);
                        onFotoBeforeChange?.(finalFotoBefore);
                    }
                } catch (errBefore) {
                    console.error('Gagal mengunggah foto before saat selesai:', errBefore);
                }
            }

            let finalFotoAfter = fotoAfterUrl;

            // Simpan / Upload Foto After jika berupa base64 atau pending saat tombol selesai di-klik
            if (pendingFotoAfterRef.current || (finalFotoAfter && finalFotoAfter.startsWith('data:image/'))) {
                try {
                    const base64Data = pendingFotoAfterRef.current?.base64 || finalFotoAfter;
                    const fileName = pendingFotoAfterRef.current?.fileName || 'foto_after.jpg';
                    const resAfter = await postData('/master/ruangan-form-upload-foto', {
                        image_base64: base64Data,
                        file_name: fileName,
                        prefix: 'after',
                    });
                    const pathAfter = resAfter?.data?.data?.file_path || resAfter?.data?.file_path;
                    if (pathAfter) {
                        finalFotoAfter = pathAfter;
                        pendingFotoAfterRef.current = null;
                        setFotoAfterUrl(finalFotoAfter);
                    }
                } catch (errAfter) {
                    console.error('Gagal mengunggah foto after saat selesai:', errAfter);
                }
            }

            const payload = {
                kode_kunjungan: activePatient.kode_kunjungan,
                no_rm: activePatient.no_rm,
                kode_rekam_medis: activePatient.kode_antrian_layanan,
                kode_antrian_layanan: activePatient.kode_antrian_layanan,
                kode_ruangan: kodeRuangan,
                nama_ruangan: namaRuangan,
                foto_before: finalFotoBefore,
                foto_after: finalFotoAfter,
                catatan: catatan,
                catatan_petugas: savedCatatanPetugas,
                hasil_form: {
                    ...(savedFormData || {}),
                    ...(finalFotoBefore ? { foto_before: finalFotoBefore } : {}),
                    ...(finalFotoAfter ? { foto_after: finalFotoAfter } : {}),
                },
                kode_karyawan: selectedPetugas || activePatient.kode_karyawan,
                produk_items: selectedProdukList.map((p) => ({
                    kode_produk: p.kode_produk,
                    nama: p.nama,
                    qty: p.qty,
                    harga_jual: p.harga_jual,
                    satuan: p.satuan || 'pcs',
                })),
            };

            const res = await postData('/master/hasil-treatment-save', payload);

            if (['00', '0000', 200, '200'].includes(res?.data?.status) || res?.status === 200) {
                showSuccess(
                    toast,
                    res.data?.message || 'Hasil treatment & rekomendasi produk berhasil disimpan ke kasir!'
                );

                // Kunci form setelah berhasil simpan tanpa mengosongkan nilainya
                setIsSubmitted(true);
                onHasilSavedChange?.(true);

                // Refresh data grid
                getGridData();
            } else {
                showError(toast, res?.data?.message || 'Gagal menyimpan hasil treatment');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Terjadi kesalahan saat menyimpan');
        } finally {
            setSubmitting(false);
        }
    };

    // Kategori produk unik untuk filter di modal
    const availableCategories = React.useMemo(() => {
        const setCats = new Set<string>();
        produkOptions.forEach((p) => {
            if (p.nama_kategori) setCats.add(p.nama_kategori);
        });
        return Array.from(setCats);
    }, [produkOptions]);

    // Filter produk options di modal: produk yang sudah dipilih TETAP ditampilkan di list (Point 3)
    const modalFilteredProduk = React.useMemo(() => {
        return produkOptions.filter((p) => {
            if (modalCategory !== 'ALL' && p.nama_kategori !== modalCategory) return false;
            if (modalSearch.trim()) {
                const q = modalSearch.toLowerCase().trim();
                const matchName = (p.nama || '').toLowerCase().includes(q);
                const matchCode = (p.kode_produk || '').toLowerCase().includes(q);
                const matchCat = (p.nama_kategori || '').toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchCat) return false;
            }
            return true;
        });
    }, [produkOptions, modalCategory, modalSearch]);

    // Map produk terpilih di draft untuk indikator visual di katalog modal
    const draftSelectedMap = React.useMemo(() => {
        const map = new Map<string, number>();
        draftProdukList.forEach((item) => {
            map.set(item.kode_produk, item.qty);
        });
        return map;
    }, [draftProdukList]);

    // Subtotal dan total item dalam draft modal
    const draftGrandTotal = React.useMemo(() => {
        return draftProdukList.reduce((acc, curr) => acc + curr.qty * curr.harga_jual, 0);
    }, [draftProdukList]);

    const draftTotalQty = React.useMemo(() => {
        return draftProdukList.reduce((acc, curr) => acc + curr.qty, 0);
    }, [draftProdukList]);

    return (
        <div className="card shadow-2 border-round-xl p-4 surface-card border-top-3 border-teal-500 mb-4">
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .lucide-spin {
                    animation: spin 1s linear infinite;
                }
                .treatment-summary-card:hover {
                    border-color: #5eead4 !important;
                    box-shadow: 0 4px 10px rgba(13, 148, 136, 0.1) !important;
                    transform: translateY(-1px);
                }
                /* Custom Thin & Sleek Scrollbar */
                .custom-thin-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 transparent;
                }
                .custom-thin-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-thin-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-thin-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 9999px;
                }
                .custom-thin-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
            `}</style>
            {/* Header persis disamakan dengan Form Penanganan */}
            <div className="mb-3 border-bottom-1 surface-border pb-3">
                <h3 className="text-xl font-black text-teal-900 m-0 flex align-items-center gap-2">
                    <i className="pi pi-file-edit text-teal-600 text-2xl" />
                    Hasil Treatment &amp; Rekomendasi Produk Pasien
                </h3>
                <p className="text-xs text-500 m-0 mt-1">
                    Isi foto setelah tindakan (After), catatan hasil treatment, dan pilih produk tambahan untuk diteruskan langsung ke kasir.
                </p>
            </div>

            <div className="grid">
                {/* ── SEKSI KIRI: DOKUMENTASI FOTO BEFORE & AFTER + CATATAN ── */}
                <div className="col-12 lg:col-5 flex flex-column gap-3">
                    {/* Dokumentasi Foto Before & After Container */}
                    <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3">
                        <div className="flex align-items-center justify-content-between pb-2 border-bottom-1 surface-border">
                            <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                <i className="pi pi-camera text-teal-600 text-sm" />
                                DOKUMENTASI FOTO BEFORE &amp; AFTER
                            </label>
                            <span className="text-[10px] text-500 font-semibold">Dokumentasi Tindakan</span>
                        </div>

                        {/* 1. Foto Before Box */}
                        <div className="surface-card p-3 border-round-lg border-1 surface-border">
                            <div className="flex align-items-center justify-content-between mb-2">
                                <div className="flex align-items-center gap-2">
                                    <span className="text-sm line-height-1 flex align-items-center justify-content-center" style={{ transform: 'translateY(-1.5px)' }}>📷</span>
                                    <span className="text-xs font-bold text-700">FOTO BEFORE (SEBELUM TINDAKAN)</span>
                                </div>
                                {fotoBeforeUrl && (
                                    <Tag value="Tersedia" severity="success" className="text-[10px] px-2 py-0" />
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputBeforeRef}
                                onChange={handleBeforeFileSelect}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />

                            {fotoBeforeUrl ? (
                                <div className="relative border-round-lg overflow-hidden border-1 border-teal-400 shadow-1 text-center bg-teal-50/40 p-2">
                                    <img
                                        src={fotoBeforeUrl}
                                        alt="Foto Before"
                                        style={{ maxHeight: '150px', width: '100%', objectFit: 'cover', borderRadius: '6px' }}
                                    />
                                    {!isSubmitted && (
                                        <div className="flex gap-2 mt-2 justify-content-center">
                                            <Button
                                                label="Ganti Foto"
                                                icon="pi pi-refresh"
                                                size="small"
                                                outlined
                                                severity="info"
                                                onClick={() => fileInputBeforeRef.current?.click()}
                                                loading={uploadingFotoBefore}
                                                className="text-xs font-bold p-1 px-2"
                                            />
                                            <Button
                                                label="Hapus"
                                                icon="pi pi-trash"
                                                size="small"
                                                outlined
                                                severity="danger"
                                                onClick={() => {
                                                    pendingFotoBeforeRef.current = null;
                                                    setFotoBeforeUrl('');
                                                    onFotoBeforeChange?.('');
                                                }}
                                                className="text-xs font-bold p-1 px-2"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    onClick={() => !isSubmitted && fileInputBeforeRef.current?.click()}
                                    className={`border-2 border-dashed border-300 bg-white border-round-lg p-3 text-center transition-all ${
                                        isSubmitted ? 'opacity-60' : 'cursor-pointer hover:surface-100 hover:border-teal-400'
                                    }`}
                                >
                                    {uploadingFotoBefore ? (
                                        <div className="py-2">
                                            <ProgressSpinner style={{ width: '24px', height: '24px' }} />
                                            <p className="text-xs text-500 m-0 mt-1">Mengunggah Foto Before...</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <i className="pi pi-cloud-upload text-2xl text-teal-600 mb-1" />
                                            <p className="font-bold text-xs m-0 text-700">Unggah Foto Before (Sebelum Tindakan)</p>
                                            <p className="text-[10px] text-400 m-0 mt-0.5">Format JPG, PNG, WEBP (Maks 5MB)</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 2. Foto After Box */}
                        <div className="surface-card p-3 border-round-lg border-1 surface-border">
                            <div className="flex align-items-center justify-content-between mb-2">
                                <div className="flex align-items-center gap-2">
                                    <span className="text-sm line-height-1 flex align-items-center justify-content-center" style={{ transform: 'translateY(-1px)' }}>✨</span>
                                    <span className="text-xs font-bold text-700">FOTO AFTER (SESUDAH TINDAKAN)</span>
                                </div>
                                {fotoAfterUrl && (
                                    <Tag value="Tersedia" severity="success" className="text-[10px] px-2 py-0" />
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />

                            {fotoAfterUrl ? (
                                <div className="relative border-round-lg overflow-hidden border-1 border-teal-500 shadow-1 text-center bg-teal-50/40 p-2">
                                    <img
                                        src={fotoAfterUrl}
                                        alt="Foto After"
                                        style={{ maxHeight: '150px', width: '100%', objectFit: 'cover', borderRadius: '6px' }}
                                    />
                                    {!isSubmitted && (
                                        <div className="flex gap-2 mt-2 justify-content-center">
                                            <Button
                                                label="Ganti Foto"
                                                icon="pi pi-refresh"
                                                size="small"
                                                outlined
                                                severity="info"
                                                onClick={() => fileInputRef.current?.click()}
                                                loading={uploadingFoto}
                                                className="text-xs font-bold p-1 px-2"
                                            />
                                            <Button
                                                label="Hapus"
                                                icon="pi pi-trash"
                                                size="small"
                                                outlined
                                                severity="danger"
                                                onClick={() => {
                                                    pendingFotoAfterRef.current = null;
                                                    setFotoAfterUrl('');
                                                }}
                                                className="text-xs font-bold p-1 px-2"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    onClick={() => !isSubmitted && fileInputRef.current?.click()}
                                    className={`border-2 border-dashed border-300 bg-white border-round-lg p-3 text-center transition-all ${
                                        isSubmitted ? 'opacity-60' : 'cursor-pointer hover:surface-100 hover:border-teal-400'
                                    }`}
                                >
                                    {uploadingFoto ? (
                                        <div className="py-2">
                                            <ProgressSpinner style={{ width: '24px', height: '24px' }} />
                                            <p className="text-xs text-500 m-0 mt-1">Mengunggah Foto After...</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <i className="pi pi-cloud-upload text-2xl text-teal-600 mb-1" />
                                            <p className="font-bold text-xs m-0 text-700">Unggah Foto After (Sesudah Tindakan)</p>
                                            <p className="text-[10px] text-400 m-0 mt-0.5">Format JPG, PNG, WEBP (Maks 5MB)</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Catatan Dokter Box */}
                    <div className="p-3 surface-50 border-round-xl border-1 surface-border flex-1 flex flex-column">
                        <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                            <i className="pi pi-pencil text-teal-600 text-sm" />
                            CATATAN HASIL TREATMENT (OPSIONAL)
                        </label>
                        <InputTextarea
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            placeholder="Catatan hasil penanganan, kondisi kulit pasien setelah treatment, atau instruksi tindak lanjut..."
                            disabled={isSubmitted}
                            className="w-full text-sm border-round-md shadow-1 bg-white border-300 focus:border-teal-500 flex-1 p-3"
                            style={{ resize: 'none', minHeight: '90px' }}
                        />
                    </div>
                </div>

                {/* ── SEKSI KANAN: PRODUK TAMBAHAN KASIR ── */}
                <div className="col-12 lg:col-7">
                    <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3 h-full">

                        {/* 1. LAYANAN / TINDAKAN YANG DIPILIH PASIEN DARI PENDAFTARAN / SETELAH KONSULTASI */}
                        <div>
                            <div className="flex align-items-center justify-content-between mb-2">
                                <div className="flex align-items-center" style={{ gap: '6px' }}>
                                    <TagIcon size={14} className="text-teal-600 flex-shrink-0" />
                                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider" style={{ lineHeight: 1 }}>
                                        Layanan yang Dipilih Pasien ({layananPasienList.length > 0 ? layananPasienList.length : 1})
                                    </span>
                                </div>
                                <span
                                    className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        height: '22px',
                                        padding: '0 8px',
                                        borderRadius: '6px',
                                        whiteSpace: 'nowrap',
                                        lineHeight: 1
                                    }}
                                >
                                    Tindakan
                                </span>
                            </div>

                            {loadingLayanan ? (
                                <div
                                    className="p-3 text-center text-xs text-500 surface-card border-1 surface-border flex align-items-center justify-content-center gap-2"
                                    style={{ borderRadius: '13px' }}
                                >
                                    <Loader2 size={14} className="lucide-spin text-teal-600" />
                                    <span>Memuat layanan pasien...</span>
                                </div>
                            ) : layananPasienList.length === 0 ? (
                                <div
                                    className="treatment-summary-card surface-card border-1 surface-border p-3 flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2"
                                    style={{
                                        borderRadius: '13px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div className="flex align-items-center min-w-0" style={{ gap: '10px' }}>
                                        <div
                                            className="flex align-items-center justify-content-center flex-shrink-0"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                minWidth: '28px',
                                                minHeight: '28px',
                                                borderRadius: '50%',
                                                background: '#ccfbf1',
                                                color: '#0f766e'
                                            }}
                                        >
                                            <CheckCircle2 size={15} />
                                        </div>
                                        <div className="min-w-0 flex flex-column justify-content-center" style={{ gap: '2px' }}>
                                            <span
                                                className="font-bold text-xs text-900 block overflow-hidden text-ellipsis white-space-nowrap"
                                                style={{ lineHeight: '1.3' }}
                                            >
                                                {activePatient?.nama_layanan || 'Layanan Pasien'}
                                            </span>
                                            <span
                                                className="text-[11px] text-teal-600 font-medium block"
                                                style={{ lineHeight: '1.2' }}
                                            >
                                                {activePatient?.nama_ruangan || namaRuangan || 'Ruangan Tindakan'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right pl-5 sm:pl-0 flex flex-column justify-content-center" style={{ gap: '2px' }}>
                                        <span className="font-bold text-xs text-500 block" style={{ lineHeight: '1.3' }}>Harga di Kasir</span>
                                        <span className="text-[10px] text-400 font-normal block" style={{ lineHeight: '1.2' }}>Tarif Layanan</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-column gap-2">
                                    {layananPasienList.map((lay: any, idx: number) => {
                                        const hrg = parseFloat(lay.harga || 0);
                                        const isKlaim = (lay.jenis || lay.jenis_layanan || '').toLowerCase().includes('klaim');
                                        return (
                                            <div
                                                key={idx}
                                                className="treatment-summary-card surface-card border-1 surface-border p-3 flex flex-column sm:flex-row sm:align-items-center justify-content-between gap-2"
                                                style={{
                                                    borderRadius: '13px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div className="flex align-items-center min-w-0" style={{ gap: '10px' }}>
                                                    <div
                                                        className="flex align-items-center justify-content-center flex-shrink-0"
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            minWidth: '28px',
                                                            minHeight: '28px',
                                                            borderRadius: '50%',
                                                            background: '#ccfbf1',
                                                            color: '#0f766e'
                                                        }}
                                                    >
                                                        <CheckCircle2 size={15} />
                                                    </div>
                                                    <div className="min-w-0 flex flex-column justify-content-center" style={{ gap: '2px' }}>
                                                        <div className="flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                                                            <span
                                                                className="font-bold text-xs text-900 block overflow-hidden text-ellipsis white-space-nowrap"
                                                                style={{ lineHeight: '1.3' }}
                                                            >
                                                                {lay.nama_layanan || lay.nama}
                                                            </span>
                                                            {lay.is_promo && (
                                                                <span
                                                                    className="text-[10px] font-extrabold bg-red-50 text-red-600 border-1 border-red-200"
                                                                    style={{
                                                                        borderRadius: '4px',
                                                                        padding: '1px 5px',
                                                                        lineHeight: 1
                                                                    }}
                                                                >
                                                                    PROMO {lay.jenis_diskon === 'persen' ? `-${lay.nilai_diskon}%` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span
                                                            className="text-[11px] text-teal-600 font-medium block"
                                                            style={{ lineHeight: '1.2' }}
                                                        >
                                                            {lay.nama_kategori || lay.nama_ruangan || namaRuangan || 'Ruangan Tindakan'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-left sm:text-right pl-5 sm:pl-0 flex flex-column justify-content-center" style={{ gap: '2px' }}>
                                                    <span className="font-black text-xs text-teal-800 block" style={{ lineHeight: '1.3' }}>
                                                        {isKlaim ? 'Klaim Paket (Rp 0)' : formatRupiah(hrg)}
                                                    </span>
                                                    <span className="text-[10px] text-500 font-normal block" style={{ lineHeight: '1.2' }}>
                                                        Tarif Layanan
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 2. PRODUK TAMBAHAN UNTUK KASIR */}
                        <div className="border-top-1 surface-border pt-3 flex-1 flex flex-column">
                            <div className="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                                <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center m-0" style={{ gap: '6px' }}>
                                    <ShoppingBag size={14} className="text-teal-600 flex-shrink-0" />
                                    <span>PRODUK TAMBAHAN UNTUK KASIR ({selectedProdukList.length})</span>
                                </label>
                                {/* Tombol Tambah/Ubah Produk dan Biaya Custom rapi satu baris tanpa tombol Kosongkan */}
                                <div className="flex align-items-center gap-2">
                                    <Button
                                        type="button"
                                        label={selectedProdukList.length > 0 ? "Ubah / Tambah Produk" : "Tambah Produk"}
                                        icon={selectedProdukList.length > 0 ? "pi pi-pencil" : "pi pi-plus"}
                                        size="small"
                                        className="text-xs font-bold py-1.5 px-3 border-round-lg bg-teal-600 text-white border-none hover:bg-teal-700 shadow-1 transition-all"
                                        disabled={isSubmitted}
                                        onClick={handleOpenProdukModal}
                                    />
                                    <Button
                                        type="button"
                                        label="Biaya Custom"
                                        icon="pi pi-plus"
                                        size="small"
                                        className="text-xs font-bold py-1.5 px-3 border-round-lg bg-teal-50 text-teal-700 border-1 border-teal-300 hover:bg-teal-100 hover:border-teal-400 shadow-none transition-all"
                                        disabled={isSubmitted}
                                        onClick={() => setShowCustomFeeModal(true)}
                                    />
                                </div>
                            </div>

                            {/* Daftar Produk Terpilih atau Empty State (Read-only / Terkunci di tampilan utama) */}
                            {selectedProdukList.length === 0 ? (
                                <div
                                    className="text-center py-4 px-3 surface-card border-1 border-dashed surface-border border-round-xl flex-1 flex flex-column align-items-center justify-content-center gap-2"
                                    style={{ minHeight: '120px' }}
                                >
                                    <div
                                        className="flex align-items-center justify-content-center"
                                        style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '50%',
                                            background: '#f1f5f9',
                                            color: '#94a3b8'
                                        }}
                                    >
                                        <ShoppingBag size={18} />
                                    </div>
                                    <span className="text-xs text-600 font-semibold">Belum ada produk tambahan</span>
                                    <Button
                                        type="button"
                                        label="Tambah Produk"
                                        icon="pi pi-plus"
                                        size="small"
                                        outlined
                                        className="text-xs font-bold mt-1 text-teal-700 border-teal-400 hover:bg-teal-50"
                                        disabled={isSubmitted}
                                        onClick={handleOpenProdukModal}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex flex-column gap-2 overflow-y-auto pr-1 custom-thin-scrollbar max-h-[220px]"
                                    style={{ maxHeight: '220px' }}
                                >
                                    {selectedProdukList.map((item) => {
                                        const subtotal = item.qty * item.harga_jual;
                                        return (
                                            <div
                                                key={item.kode_produk}
                                                className="surface-card p-2.5 border-round-xl border-1 surface-border shadow-1 hover:shadow-2 transition-all flex align-items-center justify-content-between gap-3"
                                            >
                                                {/* Thumbnail Foto Produk */}
                                                <div
                                                    className="flex-shrink-0 border-round-lg overflow-hidden border-1 surface-border flex align-items-center justify-content-center bg-slate-50"
                                                    style={{ width: '38px', height: '38px' }}
                                                >
                                                    {item.foto ? (
                                                        <img
                                                            src={item.foto}
                                                            alt={item.nama}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <ShoppingBag size={16} className="text-teal-600 opacity-60" />
                                                    )}
                                                </div>

                                                {/* Item Info (Nama, Kode & Harga Satuan) */}
                                                <div className="flex-1 min-w-0 flex flex-column justify-content-center" style={{ gap: '2px' }}>
                                                    <div className="flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                                                        <span className="font-bold text-xs text-slate-900 truncate" style={{ lineHeight: '1.3' }} title={item.nama}>
                                                            {item.nama}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono" style={{ lineHeight: 1 }}>
                                                            {item.kode_produk}
                                                        </span>
                                                        {item.is_rekomendasi_dokter && (
                                                            <span
                                                                className="text-[10px] font-bold bg-amber-50 text-amber-700 border-1 border-amber-200"
                                                                style={{ borderRadius: '4px', padding: '1px 5px', lineHeight: 1 }}
                                                            >
                                                                Resep Dokter
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium" style={{ lineHeight: '1.2' }}>
                                                        {formatRupiah(item.harga_jual)} / {item.satuan || 'pcs'}
                                                    </div>
                                                </div>

                                                {/* Status Terkunci di Tampilan Utama: Read-only Qty & Subtotal */}
                                                <div className="flex align-items-center gap-3 flex-shrink-0">
                                                    <span
                                                        className="text-[11px] font-bold text-teal-700 bg-teal-50 border-1 border-teal-200 inline-flex align-items-center justify-content-center flex-shrink-0"
                                                        style={{
                                                            height: '22px',
                                                            padding: '0 8px',
                                                            borderRadius: '6px',
                                                            whiteSpace: 'nowrap',
                                                            lineHeight: 1
                                                        }}
                                                    >
                                                        {item.qty} {item.satuan || 'pcs'}
                                                    </span>
                                                    <div className="text-right flex-shrink-0 flex flex-column justify-content-center" style={{ minWidth: '85px' }}>
                                                        <div className="font-bold text-xs text-teal-700" style={{ lineHeight: '1.3' }}>{formatRupiah(subtotal)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* TOTAL & SUBMIT BUTTON FOOTER */}
                        <div className="border-top-1 surface-border pt-3 mt-auto">
                            {/* Card Ringkasan Biaya */}
                            <div
                                className="p-3 mb-3 flex flex-column gap-2 border-1"
                                style={{
                                    borderRadius: '14px',
                                    background: '#f0fdfa',
                                    borderColor: '#99f6e4',
                                    boxShadow: '0 1px 3px rgba(13,148,136,0.08)'
                                }}
                            >
                                {/* Baris 1: Biaya Layanan */}
                                <div className="flex align-items-center justify-content-between text-xs">
                                    <span className="text-600 font-medium">
                                        Biaya Layanan ({layananPasienList.length || 1} tindakan):
                                    </span>
                                    <span className="font-bold text-teal-900">
                                        {formatRupiah(totalHargaLayanan)}
                                    </span>
                                </div>

                                {/* Baris 2: Biaya Produk Tambahan */}
                                <div className="flex align-items-center justify-content-between text-xs">
                                    <span className="text-600 font-medium">
                                        Biaya Produk Tambahan ({selectedProdukList.length} item):
                                    </span>
                                    <span className="font-bold text-teal-900">
                                        {formatRupiah(grandTotal)}
                                    </span>
                                </div>

                                {/* Baris 3: Total Biaya ke Kasir */}
                                <div
                                    className="pt-2 mt-0.5 flex align-items-center justify-content-between"
                                    style={{ borderTop: '1px dashed #99f6e4' }}
                                >
                                    <div>
                                        <span className="font-black text-sm text-teal-950 block uppercase tracking-tight">
                                            Total Biaya ke Kasir:
                                        </span>
                                        <span className="text-[10px] text-teal-700 font-medium block">
                                            Diteruskan otomatis ke tagihan kasir
                                        </span>
                                    </div>
                                    <span
                                        className="font-black text-teal-700 tracking-tight"
                                        style={{ fontSize: '1.45rem', lineHeight: '1.2' }}
                                    >
                                        {formatRupiah(totalHargaLayanan + grandTotal)}
                                    </span>
                                </div>
                            </div>

                            {/* Tombol Submit Full Width */}
                            {isSubmitted ? (
                                <div
                                    className="flex align-items-center justify-content-center gap-2 p-3 text-center shadow-sm"
                                    style={{
                                        borderRadius: '13px',
                                        background: '#ecfdf5',
                                        border: '1px solid #a7f3d0'
                                    }}
                                >
                                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                                    <span className="text-xs font-bold text-green-800">
                                        Hasil Treatment &amp; Produk Telah Disimpan ke Kasir
                                    </span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSaveClick}
                                    disabled={submitting || !activePatient}
                                    className="w-full font-bold text-xs sm:text-sm text-white flex align-items-center justify-content-center gap-2 border-none cursor-pointer py-3 px-4 shadow-2"
                                    style={{
                                        borderRadius: '13px',
                                        background: '#0d9488',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 4px 12px rgba(13,148,136,0.25)',
                                        opacity: (!activePatient || submitting) ? 0.6 : 1,
                                        cursor: (!activePatient || submitting) ? 'not-allowed' : 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!submitting && activePatient) {
                                            e.currentTarget.style.background = '#0f766e';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(13,148,136,0.35)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!submitting && activePatient) {
                                            e.currentTarget.style.background = '#0d9488';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,0.25)';
                                        }
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="lucide-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            <span>Simpan &amp; Setujui Hasil Treatment</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL KONFIRMASI SIMPAN & PERSETUJUAN TINDAKAN */}
            <Dialog
                visible={showConfirmModal}
                onHide={() => setShowConfirmModal(false)}
                closable={false}
                header={
                    <div className="flex align-items-center justify-content-between w-full">
                        <div className="flex align-items-center gap-3">
                            <div
                                className="flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    background: 'linear-gradient(135deg, #0d9488, #059669)',
                                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                                    borderRadius: '12px',
                                }}
                            >
                                <ShieldCheck size={22} className="text-white" />
                            </div>
                            <div>
                                <span className="text-base sm:text-lg font-black text-900 block" style={{ lineHeight: 1.2 }}>
                                    Persetujuan &amp; Konfirmasi Hasil Tindakan
                                </span>
                                <span className="text-xs text-500 font-medium">
                                    Verifikasi rincian hasil treatment pasien sebelum disimpan ke Kasir
                                </span>
                            </div>
                        </div>

                        {/* Tombol Close (X) dengan area klik dan hover state bulat abu muda */}
                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(false)}
                            className="flex align-items-center justify-content-center border-none bg-transparent text-500 hover:text-800 hover:surface-200 cursor-pointer p-0 flex-shrink-0"
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                transition: 'all 0.15s ease',
                            }}
                            title="Tutup dialog"
                        >
                            <X size={18} />
                        </button>
                    </div>
                }
                style={{ width: '580px', maxWidth: '95vw' }}
                contentStyle={{ maxHeight: '72vh', overflowY: 'auto' }}
                modal
                className="p-fluid"
                footer={
                    <div className="flex align-items-center gap-3 pt-3 border-top-1 surface-border w-full">
                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(false)}
                            disabled={submitting}
                            className="flex align-items-center justify-content-center gap-2 font-bold text-xs sm:text-sm text-700 surface-card border-1 surface-border py-3 px-3 cursor-pointer shadow-xs"
                            style={{
                                flex: 1,
                                borderRadius: '13px',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = '#0f172a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '';
                                e.currentTarget.style.color = '';
                            }}
                        >
                            <X size={16} className="text-500" />
                            <span>Batal</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmSubmit}
                            disabled={submitting}
                            className="flex align-items-center justify-content-center gap-2 font-bold text-xs sm:text-sm text-white py-3 px-4 border-none cursor-pointer shadow-2"
                            style={{
                                flex: 2,
                                borderRadius: '13px',
                                background: '#0d9488',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.28)',
                                opacity: submitting ? 0.7 : 1,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                if (!submitting) {
                                    e.currentTarget.style.background = '#0f766e';
                                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(13, 148, 136, 0.38)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!submitting) {
                                    e.currentTarget.style.background = '#0d9488';
                                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(13, 148, 136, 0.28)';
                                }
                            }}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={17} className="lucide-spin" />
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={17} />
                                    <span>Setuju &amp; Simpan ke Kasir</span>
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                <div className="flex flex-column gap-3 py-1 text-left custom-thin-scrollbar pr-0.5">
                    {/* PASIEN BANNER CARD */}
                    <div
                        className="p-3 border-round-2xl relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
                            border: '1.5px solid #99f6e4',
                            borderRadius: '14px',
                        }}
                    >
                        <div className="flex align-items-center justify-content-between gap-2">
                            <div>
                                <div className="flex align-items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                                        PASIEN AKTIF TINDAKAN
                                    </span>
                                    <span
                                        className="text-[10px] font-bold text-teal-800 bg-white px-2 py-0.5 border-1 border-teal-200 shadow-xs flex align-items-center gap-1"
                                        style={{ borderRadius: '9999px' }}
                                    >
                                        <User size={10} className="text-teal-600" />
                                        {activePatient?.nama_pasien || 'Pasien Baru'}
                                    </span>
                                </div>
                                <div className="text-xs text-teal-800 font-medium flex align-items-center gap-2 flex-wrap">
                                    <span>No. RM: <strong className="font-bold text-teal-950">{activePatient?.no_rm}</strong></span>
                                    <span className="text-teal-400">•</span>
                                    <span>Ruangan: <strong className="font-bold text-teal-950">{namaRuangan}</strong></span>
                                </div>
                            </div>

                            {/* Badge No. Antrean dengan border tipis putih semi-transparan */}
                            <div
                                className="text-sm font-extrabold text-white px-3 py-1.5 flex align-items-center justify-content-center shadow-1 flex-shrink-0"
                                style={{
                                    background: '#0d9488',
                                    border: '1.5px solid rgba(255, 255, 255, 0.45)',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
                                }}
                            >
                                No. #{activePatient?.nomor_antrian}
                            </div>
                        </div>
                    </div>

                    {/* RINCIAN HASIL & PRODUK CARD */}
                    <div
                        className="surface-card p-3 border-1 surface-border shadow-1 flex flex-column gap-2"
                        style={{ borderRadius: '14px' }}
                    >
                        {/* Layanan Pasien Dari Pendaftaran / Konsultasi */}
                        {layananPasienList.length > 0 && (
                            <div className="flex flex-column gap-2">
                                <div className="flex align-items-center justify-content-between text-xs">
                                    <span className="font-bold text-700 flex align-items-center gap-2">
                                        <Ticket size={15} className="text-teal-600" />
                                        Layanan Pasien ({layananPasienList.length} Tindakan)
                                    </span>
                                    <span className="font-extrabold text-teal-800">{formatRupiah(totalHargaLayanan)}</span>
                                </div>
                                <div className="flex flex-column gap-1 max-h-8rem overflow-y-auto pr-1 custom-thin-scrollbar">
                                    {layananPasienList.map((lay: any, idx: number) => {
                                        const hrg = parseFloat(lay.harga || 0);
                                        const isKlaim = (lay.jenis || lay.jenis_layanan || '').toLowerCase().includes('klaim');
                                        const isEven = idx % 2 === 1;
                                        return (
                                            <div
                                                key={idx}
                                                className={`flex align-items-center justify-content-between text-xs p-2 border-round-lg border-1 ${
                                                    isEven ? 'surface-100 border-200' : 'surface-50 surface-border'
                                                }`}
                                            >
                                                <div className="flex align-items-center gap-1.5 min-w-0">
                                                    <span className="font-medium text-800 truncate">{lay.nama_layanan || lay.nama}</span>
                                                    {lay.is_promo && (
                                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 border-round bg-red-50 text-red-600 border-1 border-red-200 flex-shrink-0">
                                                            PROMO {lay.jenis_diskon === 'persen' ? `-${lay.nilai_diskon}%` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="font-bold text-teal-700 flex-shrink-0">{isKlaim ? 'Klaim (Rp 0)' : formatRupiah(hrg)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Produk Tambahan */}
                        {selectedProdukList.length > 0 && (
                            <div className={`flex flex-column gap-2 ${layananPasienList.length > 0 ? 'mt-2 pt-2 border-top-1 surface-border' : ''}`}>
                                <div className="flex align-items-center justify-content-between text-xs">
                                    <span className="font-bold text-700 flex align-items-center gap-2">
                                        <ShoppingBag size={15} className="text-amber-600" />
                                        Produk Tambahan ({selectedProdukList.length} Item)
                                    </span>
                                    <span className="font-extrabold text-teal-700">{formatRupiah(grandTotal)}</span>
                                </div>
                                <div className="flex flex-column gap-1 max-h-8rem overflow-y-auto pr-1 custom-thin-scrollbar">
                                    {selectedProdukList.map((p, idx) => {
                                        const isEven = idx % 2 === 1;
                                        return (
                                            <div
                                                key={idx}
                                                className={`flex align-items-center justify-content-between text-xs p-2 border-round-lg border-1 ${
                                                    isEven ? 'surface-100 border-200' : 'surface-50 surface-border'
                                                }`}
                                            >
                                                <div className="flex align-items-center gap-2 min-w-0">
                                                    <span className="font-medium text-800 truncate">{p.nama}</span>
                                                    <span
                                                        className="text-[10px] font-bold text-600 surface-200 px-1.5 py-0.5 border-round flex-shrink-0"
                                                    >
                                                        {p.qty}x
                                                    </span>
                                                </div>
                                                <span className="font-bold text-teal-700 flex-shrink-0">
                                                    {formatRupiah(p.harga_jual * p.qty)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Catatan Observasi */}
                        {catatan && (
                            <div className="p-2.5 surface-50 border-round-xl border-1 surface-border text-xs mt-1">
                                <span className="font-bold text-700 block mb-1">Catatan Observasi:</span>
                                <span className="text-600 italic block border-left-3 border-teal-500 pl-2 py-0.5">&quot;{catatan}&quot;</span>
                            </div>
                        )}

                        {/* Total Keseluruhan Baris */}
                        <div
                            className="mt-2 pt-2 flex align-items-center justify-content-between"
                            style={{ borderTop: '2px dashed #99f6e4' }}
                        >
                            <div>
                                <span className="font-black text-sm text-teal-950 block uppercase tracking-tight">
                                    Total Keseluruhan:
                                </span>
                                <span className="text-[10px] text-teal-700 font-medium block">
                                    Biaya layanan &amp; produk ke Kasir
                                </span>
                            </div>
                            <span className="font-black text-lg sm:text-xl text-teal-700 tracking-tight">
                                {formatRupiah(totalHargaLayanan + grandTotal)}
                            </span>
                        </div>
                    </div>

                    {/* PERNYATAAN INFORMED CONSENT / PERSETUJUAN */}
                    <div
                        className="p-3 border-round-2xl flex align-items-start gap-3"
                        style={{
                            background: '#f0fdfa',
                            border: '1.5px solid #99f6e4',
                            borderRadius: '14px',
                        }}
                    >
                        <CheckCircle2 size={20} className="text-teal-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-extrabold text-xs text-teal-950 block mb-1">
                                Pernyataan Persetujuan Pasien (Verbal Consent)
                            </span>
                            <p className="text-xs text-teal-800 m-0 leading-relaxed font-medium">
                                Pasien/Wali telah menyetujui hasil tindakan serta daftar rincian produk yang akan diteruskan sebagai draf transaksi di Kasir.
                            </p>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* DIALOG TAMBAH BIAYA CUSTOM */}
            <Dialog
                visible={showCustomFeeModal}
                onHide={() => setShowCustomFeeModal(false)}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-plus-circle text-teal-600 text-xl" />
                        <span className="font-bold text-base text-900">Tambah Biaya / Produk Custom</span>
                    </div>
                }
                style={{ width: '420px' }}
                modal
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-700 mb-1">Nama Biaya / Produk Custom *</label>
                        <InputText
                            value={customFeeNama}
                            onChange={(e) => setCustomFeeNama(e.target.value)}
                            placeholder="Contoh: Biaya Jarum Injeksi / Alat Tambahan"
                            className="w-full p-inputtext-sm text-sm border-round-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-700 mb-1">Nominal Harga (Rp) *</label>
                        <InputNumber
                            value={customFeeHarga}
                            onValueChange={(e) => setCustomFeeHarga(e.value ?? null)}
                            mode="currency"
                            currency="IDR"
                            locale="id-ID"
                            placeholder="Masukkan nominal harga..."
                            className="w-full text-sm"
                            inputClassName="p-inputtext-sm w-full text-sm border-round-lg font-bold text-teal-700"
                        />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
                    <Button
                        label="Batal"
                        icon="pi pi-times"
                        text
                        severity="secondary"
                        onClick={() => setShowCustomFeeModal(false)}
                    />
                    <Button
                        label="Tambahkan ke Daftar"
                        icon="pi pi-check"
                        severity="success"
                        className="bg-teal-600 border-none font-bold text-sm"
                        onClick={handleAddCustomFee}
                    />
                </div>
            </Dialog>

            {/* POPUP MODAL DAFTAR PRODUK TAMBAHAN (PERSIS SEPERTI DI MENU KASIR) */}
            <Dialog
                visible={showProdukModal}
                onHide={() => setShowProdukModal(false)}
                closable={false}
                header={
                    <div className="flex align-items-center justify-content-between w-full">
                        <div className="flex align-items-center" style={{ gap: '12px' }}>
                            <div
                                className="flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    minWidth: '44px',
                                    borderRadius: '10px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #BFE3D1',
                                    color: '#0C8F62'
                                }}
                            >
                                <ShoppingBag size={22} />
                            </div>
                            <div className="flex flex-column gap-0.5">
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#1A1916', lineHeight: 1.25 }}>
                                    Pilih Produk Tambahan Kasir
                                </span>
                                <span style={{ fontSize: '12px', color: '#8A8778', fontWeight: 400 }}>
                                    Cari produk, atur kuantitas, dan lihat subtotal rincian tagihan kasir
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowProdukModal(false)}
                            className="flex align-items-center justify-content-center cursor-pointer transition-colors"
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                border: '1px solid #E3E2DC',
                                backgroundColor: '#ffffff',
                                color: '#8A8778',
                                padding: 0
                            }}
                            title="Tutup dialog"
                        >
                            <X size={16} />
                        </button>
                    </div>
                }
                style={{ width: '960px', maxWidth: '96vw', borderRadius: '16px', overflow: 'hidden' }}
                contentStyle={{ backgroundColor: '#ffffff', padding: '16px 20px', maxHeight: '78vh', overflowY: 'auto' }}
                headerStyle={{ backgroundColor: '#ffffff', borderBottom: '1px solid #EEECE4', padding: '16px 20px' }}
                modal
                className="p-fluid"
                footer={
                    <div
                        className="flex align-items-center justify-content-between w-full flex-wrap gap-2 pt-2"
                        style={{
                            backgroundColor: '#ffffff',
                            borderTop: '1px solid #EEECE4'
                        }}
                    >
                        <div className="flex align-items-center gap-1.5 text-left">
                            <span style={{ fontSize: '13px', color: '#4A473E' }}>
                                Subtotal produk ({draftTotalQty} item):
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1916' }}>
                                {formatRupiah(draftGrandTotal)}
                            </span>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowProdukModal(false)}
                                className="flex align-items-center justify-content-center gap-1.5 cursor-pointer transition-colors"
                                style={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #DAD7CC',
                                    borderRadius: '9px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#4A473E'
                                }}
                            >
                                <X size={14} />
                                <span>Batal</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmProdukModal}
                                className="flex align-items-center justify-content-center gap-1.5 cursor-pointer transition-colors"
                                style={{
                                    backgroundColor: '#0C8F62',
                                    border: 'none',
                                    borderRadius: '9px',
                                    padding: '8px 20px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#ffffff',
                                    boxShadow: '0 2px 6px rgba(12, 143, 98, 0.25)'
                                }}
                            >
                                <CheckCircle2 size={15} />
                                <span>Konfirmasi & Terapkan</span>
                            </button>
                        </div>
                    </div>
                }
            >
                <div className="grid pt-1">
                    {/* KOLOM KIRI: KATALOG PRODUK */}
                    <div className="col-12 lg:col-7 flex flex-column gap-2.5 border-bottom-1 lg:border-bottom-none lg:border-right-1 surface-border pb-3 lg:pb-0 lg:pr-3">
                        {/* Search, Filter Kategori & Refresh - 1 Baris Terpadu */}
                        <div className="flex align-items-center gap-2 mb-1">
                            {/* Search Input (flex-1) */}
                            <div className="relative flex-1" style={{ minWidth: '170px' }}>
                                <span
                                    className="absolute left-0 top-0 bottom-0 flex align-items-center pl-3 pointer-events-none text-slate-400"
                                    style={{ zIndex: 1 }}
                                >
                                    <Search size={16} />
                                </span>
                                <input
                                    type="text"
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    placeholder="Cari nama atau kode produk..."
                                    className="w-full"
                                    style={{
                                        height: '38px',
                                        padding: '0 32px 0 34px',
                                        borderRadius: '9px',
                                        border: '1px solid #DAD7CC',
                                        backgroundColor: '#ffffff',
                                        color: '#1A1916',
                                        outline: 'none',
                                        fontSize: '12px'
                                    }}
                                    autoFocus
                                />
                                {modalSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setModalSearch('')}
                                        className="absolute right-0 top-0 bottom-0 flex align-items-center pr-2.5 border-none bg-transparent text-slate-400 hover:text-slate-700 cursor-pointer"
                                        style={{ zIndex: 2 }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Filter Kategori */}
                            <div className="relative flex-shrink-0" style={{ minWidth: '145px', maxWidth: '170px' }}>
                                <select
                                    value={modalCategory}
                                    onChange={(e) => setModalCategory(e.target.value)}
                                    className="w-full cursor-pointer appearance-none"
                                    style={{
                                        height: '38px',
                                        padding: '0 28px 0 12px',
                                        borderRadius: '9px',
                                        border: modalCategory !== 'ALL' ? '1.5px solid #0C8F62' : '1px solid #DAD7CC',
                                        backgroundColor: modalCategory !== 'ALL' ? '#f0fdf4' : '#ffffff',
                                        color: modalCategory !== 'ALL' ? '#0C8F62' : '#4A473E',
                                        fontWeight: modalCategory !== 'ALL' ? 600 : 500,
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                    title="Filter berdasarkan kategori"
                                >
                                    <option value="ALL">Semua Kategori</option>
                                    {availableCategories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                                <span
                                    className="absolute right-0 top-0 bottom-0 flex align-items-center pr-2.5 pointer-events-none"
                                    style={{ color: modalCategory !== 'ALL' ? '#0C8F62' : '#8A8778' }}
                                >
                                    <ChevronDown size={14} />
                                </span>
                            </div>

                            {/* Tombol Refresh */}
                            <button
                                type="button"
                                onClick={() => fetchProdukOptions()}
                                disabled={loadingProduk}
                                className="flex align-items-center justify-content-center cursor-pointer transition-colors"
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '9px',
                                    border: '1px solid #DAD7CC',
                                    backgroundColor: '#ffffff',
                                    color: '#4A473E',
                                    flexShrink: 0
                                }}
                                title="Segarkan data produk"
                            >
                                <RotateCcw size={16} className={loadingProduk ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {/* Grid Katalog Produk (2 Kolom) */}
                        <div
                            className="overflow-y-auto pr-1 custom-thin-scrollbar"
                            style={{ height: '450px' }}
                        >
                            {loadingProduk ? (
                                <div className="flex flex-column align-items-center justify-content-center h-full py-5">
                                    <ProgressSpinner style={{ width: '28px', height: '28px' }} />
                                    <p className="text-xs text-slate-500 m-0 mt-2">Memuat daftar produk...</p>
                                </div>
                            ) : modalFilteredProduk.length === 0 ? (
                                <div className="flex flex-column align-items-center justify-content-center h-full text-center py-5">
                                    <ShoppingBag size={28} className="text-slate-300 mb-2" />
                                    <span className="text-xs text-slate-500 font-medium">Tidak ada produk yang cocok dengan pencarian / filter.</span>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                    {modalFilteredProduk.map((prod) => {
                                        const selectedQty = draftSelectedMap.get(prod.kode_produk) || 0;
                                        const isSelected = selectedQty > 0;
                                        const badgeStyle = getCategoryBadgeStyle(prod.nama_kategori);

                                        return (
                                            <div
                                                key={prod.kode_produk}
                                                onClick={() => handleDraftAddProduk(prod)}
                                                className="cursor-pointer transition-all"
                                                style={{
                                                    backgroundColor: '#ffffff',
                                                    border: isSelected ? '1.5px solid #0C8F62' : '1px solid #E3E2DC',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    boxShadow: isSelected ? '0 2px 8px rgba(12, 143, 98, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                {/* Area Gambar: 100px fixed, pure white, borderBottom 1px solid #EEECE4 */}
                                                <div
                                                    style={{
                                                        height: '100px',
                                                        backgroundColor: '#ffffff',
                                                        borderBottom: '1px solid #EEECE4',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                        padding: '6px'
                                                    }}
                                                >
                                                    {prod.foto ? (
                                                        <img
                                                            src={prod.foto}
                                                            alt={prod.nama}
                                                            style={{
                                                                maxWidth: '100%',
                                                                maxHeight: '100%',
                                                                objectFit: 'contain',
                                                                display: 'block'
                                                            }}
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="flex align-items-center justify-content-center text-slate-300">
                                                            <ShoppingBag size={28} strokeWidth={1.4} />
                                                        </div>
                                                    )}

                                                    {/* Selected Badge */}
                                                    {isSelected && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                top: '6px',
                                                                right: '6px',
                                                                backgroundColor: '#0C8F62',
                                                                color: '#ffffff',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                padding: '2px 6px',
                                                                borderRadius: '6px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '2px',
                                                                boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                                                            }}
                                                        >
                                                            <i className="pi pi-check" style={{ fontSize: '8px' }} />
                                                            <span>x{selectedQty}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info Produk (padding 10px 12px) */}
                                                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'space-between' }}>
                                                    <div>
                                                        {/* Baris 1: Nama di kiri, Badge Kategori di kanan */}
                                                        <div className="flex align-items-start justify-content-between gap-1 mb-1">
                                                            <span
                                                                style={{
                                                                    fontWeight: 600,
                                                                    fontSize: '13px',
                                                                    color: '#1A1916',
                                                                    lineHeight: 1.25,
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden'
                                                                }}
                                                                title={prod.nama}
                                                            >
                                                                {prod.nama}
                                                            </span>
                                                            {prod.nama_kategori && (
                                                                <span
                                                                    style={{
                                                                        backgroundColor: '#ffffff',
                                                                        border: `1px solid ${badgeStyle.borderColor}`,
                                                                        color: badgeStyle.color,
                                                                        fontSize: '10px',
                                                                        fontWeight: 600,
                                                                        padding: '2px 7px',
                                                                        borderRadius: '6px',
                                                                        whiteSpace: 'nowrap',
                                                                        flexShrink: 0,
                                                                        lineHeight: 1.2
                                                                    }}
                                                                >
                                                                    {prod.nama_kategori}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Baris 2: SKU */}
                                                        <div style={{ fontSize: '11px', color: '#8A8778' }}>
                                                            {prod.kode_produk}
                                                        </div>
                                                    </div>

                                                    {/* Baris 3: Harga + /pcs dan Tombol Bulat + */}
                                                    <div className="flex align-items-center justify-content-between pt-2 mt-1" style={{ borderTop: '1px solid #EEECE4' }}>
                                                        <div className="flex align-items-baseline gap-1">
                                                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#1A1916' }}>
                                                                {formatRupiah(prod.harga_jual)}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#8A8778' }}>
                                                                /{prod.satuan || 'pcs'}
                                                            </span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDraftAddProduk(prod);
                                                            }}
                                                            className="flex align-items-center justify-content-center cursor-pointer transition-transform active:scale-95"
                                                            style={{
                                                                width: '26px',
                                                                height: '26px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#0C8F62',
                                                                border: 'none',
                                                                color: '#ffffff',
                                                                flexShrink: 0,
                                                                boxShadow: '0 1px 3px rgba(12,143,98,0.3)'
                                                            }}
                                                            title="Tambah ke produk terpilih"
                                                        >
                                                            <Plus size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KOLOM KANAN: PRODUK TERPILIH */}
                    <div className="col-12 lg:col-5 flex flex-column gap-2 lg:pl-3">
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #E3E2DC',
                                borderRadius: '12px',
                                padding: '14px',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '480px'
                            }}
                        >
                            {/* Header Panel */}
                            <div>
                                <div className="flex align-items-center pb-2.5 mb-2.5" style={{ borderBottom: '1px solid #EEECE4', gap: '8px' }}>
                                    <ShoppingBag size={16} color="#0C8F62" className="flex-shrink-0" />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1916', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                                        PRODUK TERPILIH ({draftProdukList.length})
                                    </span>
                                </div>

                                {/* List Item Terpilih / Empty State */}
                                {draftProdukList.length === 0 ? (
                                    <div className="flex flex-column align-items-center justify-content-center text-center py-6" style={{ minHeight: '280px' }}>
                                        <div
                                            className="flex align-items-center justify-content-center mb-3"
                                            style={{
                                                width: '46px',
                                                height: '46px',
                                                borderRadius: '12px',
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #E3E2DC',
                                                color: '#A3A093'
                                            }}
                                        >
                                            <ShoppingBag size={22} strokeWidth={1.6} />
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1A1916', marginBottom: '4px' }}>
                                            Belum ada produk dipilih
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#8A8778', maxWidth: '240px', lineHeight: 1.4 }}>
                                            Klik ikon + pada produk di katalog kiri untuk menambahkannya ke sini.
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="flex flex-column gap-2 overflow-y-auto pr-1 custom-thin-scrollbar"
                                        style={{ maxHeight: '310px' }}
                                    >
                                        {draftProdukList.map((item) => {
                                            const itemSubtotal = item.qty * item.harga_jual;
                                            return (
                                                <div
                                                    key={item.kode_produk}
                                                    className="flex align-items-center justify-content-between gap-2 transition-all"
                                                    style={{
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #E3E2DC',
                                                        borderRadius: '10px',
                                                        padding: '8px 10px'
                                                    }}
                                                >
                                                    {/* Thumbnail Foto */}
                                                    <div
                                                        className="flex-shrink-0 flex align-items-center justify-content-center"
                                                        style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #EEECE4',
                                                            backgroundColor: '#ffffff',
                                                            overflow: 'hidden',
                                                            padding: '2px'
                                                        }}
                                                    >
                                                        {item.foto ? (
                                                            <img
                                                                src={item.foto}
                                                                alt={item.nama}
                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <ShoppingBag size={16} color="#0C8F62" style={{ opacity: 0.6 }} />
                                                        )}
                                                    </div>

                                                    {/* Info: Nama & Satuan */}
                                                    <div className="flex-1 min-w-0 flex flex-column gap-0.5 justify-content-center">
                                                        <div className="flex align-items-center gap-1.5 flex-wrap">
                                                            <span
                                                                style={{
                                                                    fontWeight: 600,
                                                                    fontSize: '12px',
                                                                    color: '#1A1916',
                                                                    lineHeight: 1.3,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: '120px'
                                                                }}
                                                                title={item.nama}
                                                            >
                                                                {item.nama}
                                                            </span>
                                                            {item.is_rekomendasi_dokter && (
                                                                <span
                                                                    style={{
                                                                        fontSize: '9px',
                                                                        fontWeight: 700,
                                                                        padding: '1px 5px',
                                                                        borderRadius: '4px',
                                                                        backgroundColor: '#FEF3C7',
                                                                        color: '#B45309',
                                                                        border: '1px solid #FDE68A'
                                                                    }}
                                                                >
                                                                    Resep
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#8A8778' }}>
                                                            {formatRupiah(item.harga_jual)} / {item.satuan || 'pcs'}
                                                        </div>
                                                    </div>

                                                    {/* Stepper Kuantitas */}
                                                    <div className="flex align-items-center gap-1 flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDraftUpdateQty(item.kode_produk, -1)}
                                                            className="flex align-items-center justify-content-center cursor-pointer transition-colors"
                                                            style={{
                                                                width: '22px',
                                                                height: '22px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #DAD7CC',
                                                                backgroundColor: '#ffffff',
                                                                color: '#4A473E',
                                                                fontSize: '12px',
                                                                fontWeight: 700
                                                            }}
                                                            title="Kurangi kuantitas"
                                                        >
                                                            −
                                                        </button>
                                                        <span
                                                            style={{
                                                                fontWeight: 700,
                                                                fontSize: '12px',
                                                                color: '#1A1916',
                                                                minWidth: '20px',
                                                                textAlign: 'center'
                                                            }}
                                                        >
                                                            {item.qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDraftUpdateQty(item.kode_produk, 1)}
                                                            className="flex align-items-center justify-content-center cursor-pointer transition-colors"
                                                            style={{
                                                                width: '22px',
                                                                height: '22px',
                                                                borderRadius: '6px',
                                                                border: 'none',
                                                                backgroundColor: '#0C8F62',
                                                                color: '#ffffff',
                                                                fontSize: '12px',
                                                                fontWeight: 700
                                                            }}
                                                            title="Tambah kuantitas"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    {/* Subtotal Item */}
                                                    <div className="text-right flex-shrink-0" style={{ minWidth: '70px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#1A1916' }}>
                                                            {formatRupiah(itemSubtotal)}
                                                        </span>
                                                    </div>

                                                    {/* Tombol Hapus */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDraftRemoveProduk(item.kode_produk)}
                                                        className="border-none bg-transparent cursor-pointer p-1 flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors flex align-items-center justify-content-center"
                                                        title="Hapus produk"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Ringkasan Bawah Panel */}
                            <div style={{ borderTop: '1px dashed #DAD7CC', paddingTop: '12px', marginTop: '12px' }}>
                                <div className="flex align-items-center justify-content-between mb-1" style={{ fontSize: '12px', color: '#4A473E' }}>
                                    <span>Total item</span>
                                    <span>{draftTotalQty} item · {draftProdukList.length} jenis</span>
                                </div>
                                <div className="flex align-items-center justify-content-between">
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1A1916' }}>Subtotal produk</span>
                                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#1A1916' }}>{formatRupiah(draftGrandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
