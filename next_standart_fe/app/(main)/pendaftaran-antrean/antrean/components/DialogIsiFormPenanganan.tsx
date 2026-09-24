'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { AntrianLayananData, RuanganFormField } from './interfaces';
import { FormRuanganFotoUploader } from './FormRuanganFotoUploader';
import { RekomendasiTreatmentPanel, RekomendasiItem } from './RekomendasiTreatmentPanel';
import { DialogHasilTerbitAntrian } from './DialogHasilTerbitAntrian';

interface DialogIsiFormPenangananProps {
    visible: boolean;
    onHide: () => void;
    antrianData: AntrianLayananData | null;
    isKonsultasi?: boolean;
    toast: React.RefObject<Toast>;
    getGridData: () => void;
}

export const DialogIsiFormPenanganan: React.FC<DialogIsiFormPenangananProps> = ({
    visible,
    onHide,
    antrianData,
    isKonsultasi = false,
    toast,
    getGridData,
}) => {
    const [fields, setFields] = useState<RuanganFormField[]>([]);
    const [loadingFields, setLoadingFields] = useState<boolean>(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [catatanPetugas, setCatatanPetugas] = useState<string>('');
    const [rekomendasiItems, setRekomendasiItems] = useState<RekomendasiItem[]>([]);
    const [resepProdukDokter, setResepProdukDokter] = useState<any[]>([]);
    const [saving, setSaving] = useState<boolean>(false);

    // Form baku trx_rekam_medis_ruangan
    const [roomFormData, setRoomFormData] = useState({
        area_yang_ditangani: '',
        kondisi_kulit: 'normal',
        produk_bahan_digunakan: '',
        jumlah_satuan: '',
        catatan_tindakan: '',
        catatan_petugas: '',
        kondisi_setelah_tindakan: '',
        catatan_hasil_treatment: '',
        persetujuan_tindakan: true,
    });

    // Form header trx_rekam_medis (Anamnesis, Diagnosis, SOAP)
    const [headerRMData, setHeaderRMData] = useState({
        keluhan: '',
        durasi_keluhan: '',
        riwayat_alergi: '',
        riwayat_treatment: '',
        diagnosis: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    });

    // Control Lanjut Ke Treatment
    const [lanjutKeTindakan, setLanjutKeTindakan] = useState<boolean>(true);

    // Dropdown Petugas / Dokter State
    const [karyawanOptions, setKaryawanOptions] = useState<any[]>([]);
    const [selectedPetugas, setSelectedPetugas] = useState<string>('');

    useEffect(() => {
        loadKaryawan();
    }, []);

    useEffect(() => {
        if (visible && antrianData) {
            setCatatanPetugas(antrianData.catatan_petugas || '');
            setFormData({});
            setSelectedPetugas(antrianData.kode_karyawan || '');
            setLanjutKeTindakan(antrianData.lanjut_ke_tindakan !== 0);

            if (isKonsultasi) {
                loadPendaftaranItems();
            } else {
                setRekomendasiItems([]);
            }

            // Load rekomendasi produk dokter jika ada
            if (Array.isArray(antrianData.rekomendasi_produk_dokter) && antrianData.rekomendasi_produk_dokter.length > 0) {
                setResepProdukDokter(antrianData.rekomendasi_produk_dokter);
            } else if (antrianData.kode_kunjungan) {
                postData('/master/kunjungan-produk-rekomendasi', { kode_kunjungan: antrianData.kode_kunjungan })
                    .then((res) => setResepProdukDokter(res.data?.data || []))
                    .catch(() => setResepProdukDokter([]));
            } else {
                setResepProdukDokter([]);
            }

            // Prefill Header RM jika ada data konsultasi asal
            setHeaderRMData({
                keluhan: (antrianData as any).data_konsultasi_keluhan || '',
                durasi_keluhan: (antrianData as any).data_konsultasi_durasi_keluhan || '',
                riwayat_alergi: (antrianData as any).data_konsultasi_riwayat_alergi || '',
                riwayat_treatment: (antrianData as any).data_konsultasi_riwayat_treatment || '',
                diagnosis: (antrianData as any).data_konsultasi_diagnosis || '',
                subjective: (antrianData as any).data_konsultasi_subjective || '',
                objective: (antrianData as any).data_konsultasi_objective || '',
                assessment: (antrianData as any).data_konsultasi_assessment || '',
                plan: (antrianData as any).data_konsultasi_plan || '',
            });

            // Parse / set roomFormData baku
            setRoomFormData({
                area_yang_ditangani: '',
                kondisi_kulit: 'normal',
                produk_bahan_digunakan: '',
                jumlah_satuan: '',
                catatan_tindakan: '',
                catatan_petugas: antrianData.catatan_petugas || '',
                kondisi_setelah_tindakan: '',
                catatan_hasil_treatment: '',
                persetujuan_tindakan: true,
            });
        }
    }, [visible, antrianData, isKonsultasi]);

    const loadPendaftaranItems = async () => {
        if (!antrianData?.kode_kunjungan) return;
        try {
            const res = await postData('/master/antrian-layanan-pendaftaran-items', {
                kode_kunjungan: antrianData.kode_kunjungan,
                for_referral: true,
            });
            if (['00', '0000', 200, '200'].includes(res?.data?.status) || res?.status === 200) {
                if (res?.data?.data?.length > 0) {
                    setRekomendasiItems(res.data.data);
                } else {
                    setRekomendasiItems([]);
                }
            } else {
                setRekomendasiItems([]);
            }
        } catch (e) {
            setRekomendasiItems([]);
        }
    };

    const loadKaryawan = async () => {
        try {
            const res = await postData('/master/karyawan-data', { page: 1, perPage: 100 });
            const list = res.data?.data || [];
            const opts = list.map((k: any) => ({
                label: `${k.nama}${k.jabatan ? ` (${k.jabatan.toUpperCase()})` : ''}`,
                value: k.no_sip,
                nama: k.nama,
                jabatan: k.jabatan,
                no_sip: k.no_sip,
            }));
            setKaryawanOptions(opts);
        } catch (_) {
            // silent fail
        }
    };

    // Modal Sukses Terbit Antrean & Transaksi
    const [showHasilModal, setShowHasilModal] = useState<boolean>(false);
    const [hasilAntrianList, setHasilAntrianList] = useState<any[]>([]);
    const [hasilTransaksiDraft, setHasilTransaksiDraft] = useState<any | null>(null);
    const [hasilKodeKunjungan, setHasilKodeKunjungan] = useState<string>('');

    const executeSave = async (targetStatus?: string) => {
        if (!antrianData) return;
        setSaving(true);
        try {
            const payload: any = {
                kode_antrian_layanan: antrianData.kode_antrian_layanan,
                kode_karyawan: selectedPetugas,
                no_sip: selectedPetugas,
                hasil_form: {
                    ...roomFormData,
                    catatan_petugas: roomFormData.catatan_petugas || catatanPetugas,
                },
                header_data: headerRMData,
                lanjut_ke_tindakan: lanjutKeTindakan ? 1 : 0,
                catatan_petugas: roomFormData.catatan_petugas || catatanPetugas,
                rekomendasi_items: rekomendasiItems,
            };
            if (targetStatus) {
                payload.status_tindakan = targetStatus;
            }

            const res = await postData('/master/antrian-layanan-simpan-rekomendasi', payload);
            showSuccess(toast, res.data.message || 'Catatan & penanganan berhasil disimpan');
            getGridData();
            onHide();

            const antrianBaru = res.data?.data?.antrian_layanan_baru || [];
            const trxDraft = res.data?.data?.transaksi_draft || null;
            const kodeKunjungan = res.data?.data?.kode_kunjungan || '';

            if (antrianBaru.length > 0 || trxDraft) {
                setHasilAntrianList(antrianBaru);
                setHasilTransaksiDraft(trxDraft);
                setHasilKodeKunjungan(kodeKunjungan);
                setShowHasilModal(true);
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan catatan & penanganan');
        } finally {
            setSaving(false);
        }
    };

    // State Konfirmasi Simpan
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [targetStatusToSave, setTargetStatusToSave] = useState<string | undefined>(undefined);

    const handleSave = (targetStatus?: string) => {
        if (!antrianData) return;

        if (!selectedPetugas) {
            showError(toast, 'Petugas / Dokter Penanggung Jawab wajib dipilih!');
            return;
        }

        if (isKonsultasi && lanjutKeTindakan) {
            const unavailableService = rekomendasiItems.find(
                (item) => ['layanan', 'paket_layanan'].includes(item.jenis) && (item.is_petugas_available === false || Boolean(item.is_not_started_today) || Boolean(item.is_past_today))
            );
            if (unavailableService) {
                showError(
                    toast,
                    unavailableService.alasan_tidak_tersedia ||
                        `Tidak dapat melanjutkan tindakan ke ruangan "${unavailableService.nama_ruangan || 'tujuan'}" karena jadwal shift petugas belum dimulai atau telah berakhir.`
                );
                return;
            }
        }

        setTargetStatusToSave(targetStatus);
        setShowConfirmModal(true);
    };

    const handleConfirmAccept = () => {
        setShowConfirmModal(false);
        executeSave(targetStatusToSave);
    };

    if (!antrianData) return null;

    const dataKonsul = antrianData as any;
    const hasDataKonsul = !!(dataKonsul.kode_antrian_asal || dataKonsul.data_konsultasi_keluhan || dataKonsul.data_konsultasi_diagnosis);

    return (
        <>
            <Dialog
                header={
                    <div className="flex align-items-center gap-3">
                        <span className="text-2xl font-black text-teal-800 bg-teal-100 px-3 py-1 border-round-lg">
                            #{antrianData.nomor_antrian}
                        </span>
                        <div>
                            <span className="text-xl font-bold block">{antrianData.nama_pasien || 'Pasien'}</span>
                            <span className="text-xs text-500 font-normal">
                                RM: {antrianData.no_rm} | Ruangan: {antrianData.nama_ruangan || antrianData.kode_ruangan} | Layanan: {antrianData.nama_layanan}
                            </span>
                        </div>
                    </div>
                }
                visible={visible && !showHasilModal}
                style={{ width: '750px' }}
                modal
                onHide={onHide}
                className="p-fluid"
            >
                <div className="p-3 bg-teal-50 border-round-xl mb-4 border-1 border-teal-200 flex align-items-center justify-content-between">
                    <div>
                        <span className="text-xs text-teal-700 block font-semibold">Status Penanganan Pasien</span>
                        <Tag
                            value={(antrianData.status || 'menunggu').toUpperCase()}
                            severity={antrianData.status === 'dipanggil' ? 'warning' : 'info'}
                            className="text-xs font-bold mt-1"
                        />
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-500 block">Jam Datang</span>
                        <span className="text-sm font-bold text-700">{antrianData.jam_datang || '-'}</span>
                    </div>
                </div>

                {/* DISPLAY FORM / DATA HASIL KONSULTASI DI RUANG TINDAKAN (JIKA HASIL KONSULTASI) */}
                {!isKonsultasi && hasDataKonsul && (
                    <div className="p-4 bg-blue-50/70 border-round-xl mb-2 border-1 border-blue-200 surface-card shadow-1">
                        <div className="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 border-blue-200">
                            <i className="pi pi-file-edit text-blue-600 text-lg" />
                            <span className="font-extrabold text-blue-900 text-sm">FORM HASIL KONSULTASI DOKTER (DARI SESI KONSULTASI)</span>
                        </div>
                        <div className="grid text-xs">
                            <div className="col-12 md:col-6 mb-2">
                                <span className="font-semibold text-color-secondary block mb-0.5">Keluhan Utama:</span>
                                <span className="font-bold text-blue-900 text-sm block">{dataKonsul.data_konsultasi_keluhan || '-'}</span>
                            </div>
                            <div className="col-12 md:col-6 mb-2">
                                <span className="font-semibold text-color-secondary block mb-0.5">Riwayat Alergi:</span>
                                <span className="font-bold text-red-600 text-sm block">{dataKonsul.data_konsultasi_riwayat_alergi || 'Tidak Ada'}</span>
                            </div>
                            <div className="col-12 md:col-6 mb-2">
                                <span className="font-semibold text-color-secondary block mb-0.5">Diagnosis Dokter:</span>
                                <span className="font-bold text-blue-900 text-sm block">{dataKonsul.data_konsultasi_diagnosis || '-'}</span>
                            </div>
                            <div className="col-12 md:col-6 mb-2">
                                <span className="font-semibold text-color-secondary block mb-0.5">Rencana Penanganan (SOAP Plan):</span>
                                <span className="font-bold text-blue-900 text-sm block">{dataKonsul.data_konsultasi_plan || dataKonsul.data_konsultasi_assessment || '-'}</span>
                            </div>


                        </div>
                    </div>
                )}

                <div className="flex flex-column gap-4">
                    {/* SECTION PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP) */}
                    <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
                        <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
                            <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                <i className="pi pi-user text-teal-600 text-sm" />
                                PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP)
                            </label>
                            <span className="text-[10px] text-500 font-semibold">Tersimpan berdasar No. SIP</span>
                        </div>
                        <div className="p-fluid">
                            <Dropdown
                                value={selectedPetugas}
                                options={karyawanOptions}
                                onChange={(e) => setSelectedPetugas(e.value)}
                                placeholder="-- Pilih Nama Petugas / Dokter --"
                                filter
                                filterBy="label,value,nama"
                                showClear
                                className="w-full text-sm border-round-md shadow-1 bg-white"
                                valueTemplate={(option) => {
                                    if (option) {
                                        return (
                                            <div className="flex align-items-center gap-2">
                                                <span className="font-bold text-teal-900">{option.nama || option.label}</span>
                                                {option.value && (
                                                    <span className="text-xs text-500 font-normal">(No. SIP: {option.value})</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    return <span>-- Pilih Nama Petugas / Dokter --</span>;
                                }}
                                itemTemplate={(option) => (
                                    <div className="flex align-items-center justify-content-between py-1">
                                        <div>
                                            <span className="font-bold text-teal-900 block text-sm">{option.nama || option.label}</span>
                                            <span className="text-xs text-500 block">No. SIP: {option.value}</span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* IF RUANG TINDAKAN: DISPLAY FORM HASIL KONSULTASI & PRODUK DOKTER (READ-ONLY) */}
                    {!isKonsultasi && (antrianData?.kode_antrian_asal || (antrianData as any)?.data_konsultasi_diagnosis || (antrianData as any)?.data_konsultasi_keluhan || resepProdukDokter.length > 0) && (
                        <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3">
                            {((antrianData as any)?.data_konsultasi_keluhan || (antrianData as any)?.data_konsultasi_diagnosis || (antrianData as any)?.data_konsultasi_plan) && (
                                <div>
                                    <label className="block text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border flex align-items-center gap-2">
                                        <i className="pi pi-file-edit text-teal-600" />
                                        FORM HASIL KONSULTASI DOKTER (DARI SESI KONSULTASI)
                                    </label>
                                    <div className="grid text-xs">
                                        <div className="col-12 md:col-6 mb-2">
                                            <span className="font-semibold text-color-secondary block mb-1">Keluhan Utama:</span>
                                            <span className="font-bold text-900 text-sm block">{(antrianData as any)?.data_konsultasi_keluhan || '-'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-2">
                                            <span className="font-semibold text-color-secondary block mb-1">Riwayat Alergi:</span>
                                            <span className="font-bold text-red-600 text-sm block">{(antrianData as any)?.data_konsultasi_riwayat_alergi || 'Tidak Ada'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-2">
                                            <span className="font-semibold text-color-secondary block mb-1">Diagnosis Dokter:</span>
                                            <span className="font-bold text-900 text-sm block">{(antrianData as any)?.data_konsultasi_diagnosis || '-'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-2">
                                            <span className="font-semibold text-color-secondary block mb-1">Rencana Penanganan (SOAP Plan):</span>
                                            <span className="font-bold text-900 text-sm block">{(antrianData as any)?.data_konsultasi_plan || (antrianData as any)?.data_konsultasi_assessment || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {resepProdukDokter.length > 0 && (
                                <div className={((antrianData as any)?.data_konsultasi_keluhan || (antrianData as any)?.data_konsultasi_diagnosis) ? "border-top-1 surface-border pt-2" : ""}>
                                    <div className="flex align-items-center justify-content-between mb-2">
                                        <label className="text-xs font-bold text-amber-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                            <i className="pi pi-shopping-bag text-amber-600" />
                                            PRODUK &amp; RESEP PILIHAN DOKTER KONSULTASI
                                        </label>
                                        <Tag value={`${resepProdukDokter.length} Produk`} severity="warning" className="text-[10px] font-bold" />
                                    </div>
                                    <div className="grid">
                                        {resepProdukDokter.map((prod: any, idx: number) => {
                                            const hrg = parseFloat(prod.harga || prod.harga_jual || 0);
                                            const qty = parseInt(prod.qty || 1, 10);
                                            return (
                                                <div key={idx} className="col-12 md:col-6 mb-2">
                                                    <div className="p-2 border-round-lg border-1 border-amber-200 bg-amber-50/50 flex align-items-center justify-content-between gap-2 text-xs">
                                                        <div className="min-w-0 pr-1">
                                                            <span className="font-bold text-900 block truncate" title={prod.nama_produk || prod.nama}>
                                                                {prod.nama_produk || prod.nama}
                                                            </span>
                                                            <span className="text-[11px] text-600 block">
                                                                {prod.kode_produk} • {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(hrg)}
                                                            </span>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <span className="bg-amber-600 text-white font-bold text-[11px] px-2 py-0.5 border-round">
                                                                {qty} {prod.satuan || 'pcs'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* IF KONSULTASI: HEADER RM & ANAMNESIS & DIAGNOSIS & CONTROL LANJUT KE TREATMENT */}
                    {isKonsultasi && (
                        <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3">
                            <div>
                                <label className="block text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                    1. ANAMNESIS &amp; RIWAYAT PASIEN (REKAM MEDIS)
                                </label>
                                <div className="grid formgrid p-fluid">
                                    <div className="col-12 md:col-6 mb-2">
                                        <label className="block text-xs font-semibold mb-1">Keluhan Utama</label>
                                        <InputTextarea
                                            value={headerRMData.keluhan}
                                            onChange={(e) => setHeaderRMData({ ...headerRMData, keluhan: e.target.value })}
                                            rows={2}
                                            placeholder="Keluhan utama pasien saat ini..."
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 mb-2">
                                        <label className="block text-xs font-semibold mb-1">Durasi Keluhan</label>
                                        <InputText
                                            value={headerRMData.durasi_keluhan}
                                            onChange={(e) => setHeaderRMData({ ...headerRMData, durasi_keluhan: e.target.value })}
                                            placeholder="Misal: 2 minggu, 1 bulan..."
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 mb-2">
                                        <label className="block text-xs font-semibold mb-1">Riwayat Alergi Pasien</label>
                                        <InputTextarea
                                            value={headerRMData.riwayat_alergi}
                                            onChange={(e) => setHeaderRMData({ ...headerRMData, riwayat_alergi: e.target.value })}
                                            rows={2}
                                            placeholder="Riwayat alergi (obat, klorin, kosmetik)..."
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 mb-2">
                                        <label className="block text-xs font-semibold mb-1">Riwayat Treatment Sebelumnya</label>
                                        <InputTextarea
                                            value={headerRMData.riwayat_treatment}
                                            onChange={(e) => setHeaderRMData({ ...headerRMData, riwayat_treatment: e.target.value })}
                                            rows={2}
                                            placeholder="Perawatan kulit/klinik yang pernah dikunjungi..."
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                    2. DIAGNOSIS DOKTER &amp; SOAP MEDIS
                                </label>
                                <div className="grid formgrid p-fluid">
                                    <div className="col-12 md:col-6 mb-2">
                                        <label className="block text-xs font-semibold mb-1">Diagnosis Dokter</label>
                                        <InputText
                                            value={headerRMData.diagnosis}
                                            onChange={(e) => setHeaderRMData({ ...headerRMData, diagnosis: e.target.value })}
                                            placeholder="Diagnosis medis..."
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 mb-2">
                                        <label className="block text-xs font-semibold mb-1">SOAP (Plan / Perencanaan)</label>
                                        <InputText
                                            value={headerRMData.plan}
                                            onChange={(e) => setHeaderRMData({ ...headerRMData, plan: e.target.value })}
                                            placeholder="Rencana penanganan / treatment..."
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* KONTROL UI: LANJUT KE TREATMENT? */}
                            <div className="p-3 surface-100 border-round-lg border-1 surface-border flex align-items-center justify-content-between">
                                <div>
                                    <span className="font-bold text-sm text-900 block">Lanjut ke Treatment Sesi Ini?</span>
                                    <span className="text-xs text-500">Jika Ya, sistem otomatis menerbitkan antrean di ruang tindakan pasien tanpa daftar ulang.</span>
                                </div>
                                <div className="flex align-items-center gap-3">
                                    <div className="flex align-items-center gap-1">
                                        <Checkbox
                                            inputId="lanjut_ya"
                                            checked={lanjutKeTindakan}
                                            onChange={(e) => setLanjutKeTindakan(true)}
                                        />
                                        <label htmlFor="lanjut_ya" className="text-sm font-bold text-teal-800 cursor-pointer">Ya (Lanjut Treatment)</label>
                                    </div>
                                    <div className="flex align-items-center gap-1">
                                        <Checkbox
                                            inputId="lanjut_tidak"
                                            checked={!lanjutKeTindakan}
                                            onChange={(e) => setLanjutKeTindakan(false)}
                                        />
                                        <label htmlFor="lanjut_tidak" className="text-sm font-bold text-500 cursor-pointer">Tidak</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FORM HANYA MUNCUL DI KONSULTASI / REMOVED FROM TREATMENT ROOM */}
                    {isKonsultasi && (
                        <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
                            <label className="block text-xs font-bold text-700 uppercase tracking-wider mb-3 pb-2 border-bottom-1 surface-border flex align-items-center justify-content-between">
                                <span>FORM PENANGANAN RUANGAN ({antrianData.nama_ruangan || antrianData.kode_ruangan})</span>
                                <Tag value="Form Baku Ruangan" severity="success" className="text-[10px]" />
                            </label>

                            <div className="grid formgrid p-fluid text-sm">
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold text-700 mb-1">Area Yang Ditangani</label>
                                    <InputText
                                        value={roomFormData.area_yang_ditangani}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, area_yang_ditangani: e.target.value })}
                                        placeholder="Area penanganan (misal: Wajah, Leher, Dahi)"
                                        className="w-full text-sm shadow-1 border-round-md"
                                    />
                                </div>

                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold text-700 mb-1">Kondisi Kulit Saat Ini</label>
                                    <Dropdown
                                        value={roomFormData.kondisi_kulit}
                                        options={[
                                            { label: 'Normal', value: 'normal' },
                                            { label: 'Kering', value: 'kering' },
                                            { label: 'Berminyak', value: 'berminyak' },
                                            { label: 'Kombinasi', value: 'kombinasi' },
                                            { label: 'Sensitif', value: 'sensitif' },
                                        ]}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, kondisi_kulit: e.value })}
                                        placeholder="Pilih kondisi kulit"
                                        className="w-full text-sm shadow-1 border-round-md"
                                    />
                                </div>

                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold text-700 mb-1">Produk / Bahan Yang Digunakan</label>
                                    <InputTextarea
                                        value={roomFormData.produk_bahan_digunakan}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, produk_bahan_digunakan: e.target.value })}
                                        rows={2}
                                        placeholder="Nama produk/bahan yang dipakai..."
                                        className="w-full text-sm shadow-1 border-round-md"
                                    />
                                </div>

                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold text-700 mb-1">Jumlah / Satuan (Opsional)</label>
                                    <InputText
                                        value={roomFormData.jumlah_satuan}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, jumlah_satuan: e.target.value })}
                                        placeholder="Satuan / Dosis (opsional)"
                                        className="w-full text-sm shadow-1 border-round-md"
                                    />
                                </div>

                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold text-700 mb-1">Catatan Tindakan / Prosedur</label>
                                    <InputTextarea
                                        value={roomFormData.catatan_tindakan}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, catatan_tindakan: e.target.value })}
                                        rows={3}
                                        placeholder="Detail prosedur tindakan..."
                                        className="w-full text-sm shadow-1 border-round-md"
                                    />
                                </div>

                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold text-700 mb-1">Kondisi / Reaksi Setelah Tindakan</label>
                                    <InputTextarea
                                        value={roomFormData.kondisi_setelah_tindakan}
                                        onChange={(e) => setRoomFormData({ ...roomFormData, kondisi_setelah_tindakan: e.target.value })}
                                        rows={3}
                                        placeholder="Kondisi pasien setelah tindakan..."
                                        className="w-full text-sm shadow-1 border-round-md"
                                    />
                                </div>

                                <div className="col-12 mb-2">
                                    <div className="flex align-items-center gap-2 p-3 surface-card border-1 surface-border border-round-md">
                                        <Checkbox
                                            inputId="persetujuan_chk"
                                            checked={roomFormData.persetujuan_tindakan}
                                            onChange={(e) => setRoomFormData({ ...roomFormData, persetujuan_tindakan: Boolean(e.checked) })}
                                        />
                                        <label htmlFor="persetujuan_chk" className="text-xs text-700 font-bold cursor-pointer">
                                            Persetujuan Tindakan: Pasien telah memberikan persetujuan untuk tindakan medis/treatment ini.
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isKonsultasi && lanjutKeTindakan && (
                        <RekomendasiTreatmentPanel
                            toast={toast}
                            selectedItems={rekomendasiItems}
                            onChangeSelectedItems={setRekomendasiItems}
                            kodeCabang={(antrianData as any)?.kode_cabang}
                        />
                    )}

                    <div className="surface-card p-3 border-round-xl border-1 surface-border">
                        <label className="block text-xs font-bold mb-2 text-800 flex align-items-center gap-2">
                            <i className="pi pi-pencil text-teal-600" />
                            Catatan Petugas / Catatan Hasil Treatment
                        </label>
                        <InputTextarea
                            value={catatanPetugas}
                            onChange={(e) => {
                                setCatatanPetugas(e.target.value);
                                setRoomFormData({ ...roomFormData, catatan_petugas: e.target.value });
                            }}
                            rows={3}
                            placeholder="Tuliskan catatan hasil tindakan atau observasi pasien..."
                            className="w-full text-sm shadow-1 border-round-md"
                        />
                    </div>
                </div>

                <div className="flex align-items-center justify-content-between gap-2 mt-4 pt-3 border-top-1 surface-border">
                    <Button label="Tutup" outlined severity="secondary" onClick={onHide} size="small" />

                    <div className="flex gap-2">
                        <Button
                            label="Simpan Form"
                            icon="pi pi-save"
                            outlined
                            severity="info"
                            loading={saving}
                            onClick={() => handleSave()}
                            size="small"
                        />

                        <Button
                            label={
                                isKonsultasi
                                    ? lanjutKeTindakan
                                        ? 'Simpan Konsultasi & Lanjut ke Treatment'
                                        : 'Simpan & Selesaikan Konsultasi'
                                    : 'Simpan & Selesaikan Tindakan'
                            }
                            icon="pi pi-check-circle"
                            severity="success"
                            loading={saving}
                            onClick={() => handleSave('selesai')}
                            size="small"
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                visible={showConfirmModal && !showHasilModal}
                onHide={() => setShowConfirmModal(false)}
                header={isKonsultasi ? "Konfirmasi Sesi Konsultasi Dokter" : "Konfirmasi Penanganan Ruang Tindakan"}
                style={{ width: '480px' }}
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Batal"
                            icon="pi pi-times"
                            className="p-button-outlined p-button-secondary text-xs"
                            onClick={() => setShowConfirmModal(false)}
                        />
                        <Button
                            label={
                                isKonsultasi
                                    ? lanjutKeTindakan
                                        ? "Ya, Simpan & Terbitkan Antrean Treatment"
                                        : "Ya, Selesaikan Konsultasi"
                                    : "Ya, Simpan & Selesaikan Tindakan"
                            }
                            icon="pi pi-check"
                            className="p-button-success font-bold text-xs"
                            onClick={handleConfirmAccept}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 py-1 text-left">
                    <div className="p-3 border-round-xl" style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4' }}>
                        <span className="text-[10px] font-bold uppercase block" style={{ color: '#0d9488' }}>Pasien Aktif</span>
                        <span className="font-extrabold text-sm block" style={{ color: '#134e4a' }}>{antrianData?.nama_pasien || 'Pasien'}</span>
                        <span className="text-xs" style={{ color: '#0f766e' }}>No. RM: {antrianData?.no_rm} | Ruangan: {antrianData?.nama_ruangan || antrianData?.kode_ruangan}</span>
                    </div>

                    <div className="flex flex-column gap-2">
                        {rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).length > 0 && (
                            <div className="p-3 border-round-xl text-xs" style={{ background: '#f0fdfa', border: '1.5px solid #5eead4' }}>
                                <span className="font-bold block mb-1" style={{ color: '#0f766e' }}>
                                    <i className="pi pi-ticket mr-1" />
                                    Menerbitkan {rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).length} Nomor Antrean Layanan:
                                </span>
                                <span className="font-semibold" style={{ color: '#115e59' }}>{rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).map((l) => l.nama).join(', ')}</span>
                            </div>
                        )}

                        {rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).length > 0 && (
                            <div className="p-3 border-round-xl text-xs" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
                                <span className="font-bold block mb-1" style={{ color: '#b45309' }}>
                                    <i className="pi pi-shopping-bag mr-1" />
                                    Memasukkan {rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).length} Produk ke Draf Transaksi Kasir:
                                </span>
                                <span className="font-semibold" style={{ color: '#78350f' }}>{rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).map((p) => `${p.nama} (${p.qty || 1}x)`).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-700 m-0">
                        {isKonsultasi
                            ? lanjutKeTindakan
                                ? "Apakah Anda yakin ingin menyelesaikan sesi konsultasi dan menerbitkan antrean di ruang tindakan untuk pasien ini?"
                                : "Apakah Anda yakin ingin menyimpan dan menyelesaikan sesi konsultasi pasien ini?"
                            : "Apakah Anda yakin ingin menyimpan hasil penanganan dan menyelesaikan tindakan di ruangan ini?"
                        }
                    </p>
                </div>
            </Dialog>

            <DialogHasilTerbitAntrian
                visible={showHasilModal}
                onHide={() => {
                    setShowHasilModal(false);
                    onHide();
                }}
                pasienNama={antrianData.nama_pasien}
                noRm={antrianData.no_rm}
                kodeKunjungan={hasilKodeKunjungan}
                antrianList={hasilAntrianList}
                transaksiDraft={hasilTransaksiDraft}
            />
        </>
    );
};
