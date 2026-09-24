'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Divider } from 'primereact/divider';
import { Dropdown } from 'primereact/dropdown';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { ColumnGroup } from 'primereact/columngroup';
import { Row } from 'primereact/row';
import { Dialog } from 'primereact/dialog';
import { useRouter } from 'next/navigation';
import postData from '@/lib/axios/postData';
import { showError, showSuccess, formatRupiah } from '@/lib/tools/generalTools';

export default function MonitoringCabangPage() {
    const router = useRouter();
    const toast = useRef<Toast>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [summary, setSummary] = useState<any>({
        total_cabang: 0,
        cabang_aktif: 0,
        total_omzet_bulan_ini: 0,
        total_omzet_hari_ini: 0,
        total_kunjungan_bulan_ini: 0,
        total_kunjungan_hari_ini: 0,
        total_pasien_terdaftar: 0,
    });
    const [branches, setBranches] = useState<any[]>([]);

    // State detail dialog
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [showDetail, setShowDetail] = useState<boolean>(false);

    // Filter controls
    const [searchVal, setSearchVal] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const fetchMonitoring = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/cabang-monitoring', {});
            if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
                setSummary(res.data.summary || {});
                setBranches(res.data.branches || []);
            } else {
                showError(toast, res?.data?.message || 'Gagal memuat monitoring cabang');
            }
        } catch (err: any) {
            showError(toast, err?.message || 'Gagal terhubung ke server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitoring();
    }, []);

    const filteredBranches = branches.filter((b) => {
        if (statusFilter && b.status !== statusFilter) return false;
        if (searchVal.trim()) {
            const q = searchVal.toLowerCase();
            const matchKode = (b.kode_cabang || '').toLowerCase().includes(q);
            const matchNama = (b.nama_cabang || '').toLowerCase().includes(q);
            const matchAlamat = (b.alamat || '').toLowerCase().includes(q);
            const matchPj = (b.pj_manager || '').toLowerCase().includes(q);
            const matchManager = (b.managers || []).some(
                (m: any) =>
                    (m.fullname || '').toLowerCase().includes(q) ||
                    (m.username || '').toLowerCase().includes(q)
            );
            return matchKode || matchNama || matchAlamat || matchPj || matchManager;
        }
        return true;
    });

    const maxOmzet = Math.max(...filteredBranches.map((b) => Number(b.omzet_bulan_ini || 0)), 1);
    const totalOmzetAll = filteredBranches.reduce((acc, curr) => acc + (Number(curr.omzet_bulan_ini) || 0), 0);

    const branchCodeBodyTemplate = (rowData: any) => {
        const handleCopy = (e: React.MouseEvent, code: string) => {
            e.stopPropagation();
            navigator.clipboard.writeText(code);
            showSuccess(toast, `Kode cabang ${code} disalin ke clipboard`);
        };

        return (
            <div className="flex align-items-center gap-2">
                <span className="font-semibold text-800">{rowData.kode_cabang}</span>
                <Button
                    icon="pi pi-copy"
                    className="p-button-rounded p-button-text p-button-secondary p-0"
                    style={{ width: '28px', height: '28px', color: '#3b82f6' }}
                    tooltip="Salin Kode"
                    tooltipOptions={{ position: 'top' }}
                    onClick={(e) => handleCopy(e, rowData.kode_cabang)}
                />
            </div>
        );
    };

    const headerTemplate = (
        <div className="flex flex-column gap-3">
            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-xl font-bold">Komparasi Kinerja Antar Cabang</span>
                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                    <Dropdown
                        value={statusFilter}
                        options={[
                            { label: 'Semua Status', value: null },
                            { label: 'Aktif', value: 'aktif' },
                            { label: 'Tidak Aktif', value: 'tidak aktif' },
                        ]}
                        onChange={(e) => setStatusFilter(e.value)}
                        placeholder="Status Cabang"
                        className="p-inputtext-sm w-11rem"
                    />

                    <span className="p-input-icon-left w-full md:w-20rem">
                        <IconField iconPosition="left">
                            <InputIcon className="pi pi-search" />
                            <InputText
                                value={searchVal}
                                className="w-full text-sm"
                                placeholder="Cari Kode, Cabang, Manager..."
                                onChange={(e) => setSearchVal(e.target.value)}
                            />
                        </IconField>
                    </span>

                    <Button
                        type="button"
                        icon="pi pi-filter-slash"
                        outlined
                        severity="danger"
                        tooltip="Reset Filter"
                        tooltipOptions={{ position: 'bottom' }}
                        onClick={() => {
                            setSearchVal('');
                            setStatusFilter(null);
                        }}
                    />
                </div>
            </div>
        </div>
    );

    const footerGroup = (
        <ColumnGroup>
            <Row>
                <Column footer="Grand Total (Semua Cabang):" colSpan={5} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                <Column footer={formatRupiah(totalOmzetAll)} footerStyle={{ fontWeight: 'bold', color: '#15803d', textAlign: 'left' }} />
                <Column footer="" />
            </Row>
        </ColumnGroup>
    );

    return (
        <div className="w-full">
            <Toast ref={toast} />

            {/* Judul Laporan */}
            <div className="flex justify-content-between items-start mb-5">
                <div className="flex flex-column">
                    <h3 className="text-2xl font-semibold flex align-items-center gap-2">
                        <i className="pi pi-chart-line text-blue-600 text-3xl"></i>
                        Laporan Perkembangan &amp; Monitoring Cabang
                    </h3>
                    <p className="text-gray-500">
                        Analisis komparasi kinerja operasional antar cabang, volume kunjungan pasien, performa finansial omzet, dan manajerial secara terpusat.
                    </p>
                </div>
            </div>

            {/* Widget Ringkasan Finansial Modern (4 KPI Cards seperti contoh_laporan) */}
            <div className="grid mb-2">
                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Omzet Konsolidasi</span>
                            <span className="text-xl font-black text-blue-700">{formatRupiah(summary.total_omzet_bulan_ini || 0)}</span>
                        </div>
                        <div className="p-3 bg-blue-50 border-round-lg">
                            <i className="pi pi-wallet text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Total Pasien</span>
                            <span className="text-xl font-black text-purple-700">{summary.total_pasien_terdaftar || 0} Pasien</span>
                        </div>
                        <div className="p-3 bg-purple-50 border-round-lg">
                            <i className="pi pi-users text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Total Kunjungan</span>
                            <span className="text-xl font-black text-red-600">{summary.total_kunjungan_bulan_ini || 0} Kunjungan</span>
                        </div>
                        <div className="p-3 bg-red-50 border-round-lg">
                            <i className="pi pi-calendar-check text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Jaringan Cabang</span>
                            <span className="text-xl font-black text-green-600">{summary.total_cabang || 0} Cabang</span>
                        </div>
                        <div className="p-3 bg-green-50 border-round-lg">
                            <i className="pi pi-building text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tombol Aksi Utama, Legend Status & DataTable */}
            <div className="card">
                <div className="flex flex-row flex-wrap items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Cetak Laporan"
                        icon="pi pi-print"
                        outlined
                        className="border-round-md"
                        onClick={() => window.print()}
                    />

                    <Divider layout="vertical" />

                    <Button
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        className="border-round-md"
                        onClick={fetchMonitoring}
                        loading={loading}
                    />
                </div>

                {/* Legend Box Status */}
                <div className="flex flex-wrap align-items-center gap-4 mb-3 p-3 surface-50 border-round-xl border-1 surface-border">
                    <span className="flex align-items-center text-xs font-bold text-500 uppercase tracking-wider mr-2">
                        <i className="pi pi-info-circle mr-2"></i> Keterangan Status Cabang:
                    </span>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-green-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Aktif Beroperasi</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-red-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Tidak Aktif</span>
                    </div>
                </div>

                <DataTable
                    value={filteredBranches}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    header={headerTemplate}
                    dataKey="kode_cabang"
                    emptyMessage="Data monitoring cabang tidak ditemukan."
                    className="p-datatable-sm"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    footerColumnGroup={footerGroup}
                >
                    {/* 1. Kolom Indikator Dot Status */}
                    <Column
                        header=""
                        align="center"
                        headerStyle={{ width: '3.5rem' }}
                        body={(row: any) => {
                            const isActive = row.status === 'aktif';
                            return (
                                <div className="flex justify-content-center align-items-center w-full">
                                    <span
                                        className={`block border-round-sm ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: '16px', height: '16px' }}
                                        title={isActive ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                                    />
                                </div>
                            );
                        }}
                    />

                    {/* 2. Kolom Kode Cabang dengan tombol Copy */}
                    <Column
                        field="kode_cabang"
                        header="Kode Cabang"
                        sortable
                        style={{ minWidth: '11rem' }}
                        body={branchCodeBodyTemplate}
                    />

                    {/* 3. Kolom Nama & Lokasi Cabang */}
                    <Column
                        field="nama_cabang"
                        header="Nama & Lokasi Cabang"
                        sortable
                        style={{ minWidth: '15rem' }}
                        body={(row: any) => (
                            <div>
                                <div className="font-semibold text-900">{row.nama_cabang}</div>
                                <div className="text-xs text-500 line-clamp-1">{row.alamat || 'Alamat belum disetel'}</div>
                            </div>
                        )}
                    />

                    {/* 4. Kolom Manager Cabang */}
                    <Column
                        field="manager"
                        header="Manager Cabang"
                        style={{ minWidth: '14rem' }}
                        body={(row: any) => {
                            const managers = row.managers || [];
                            if (managers.length === 0) {
                                return <span className="text-400 text-xs italic">Belum ada akun manager</span>;
                            }
                            return (
                                <div className="flex flex-column gap-1">
                                    {managers.map((m: any, idx: number) => (
                                        <div key={idx} className="flex align-items-center gap-1 text-xs">
                                            <i className="pi pi-user text-teal-600" />
                                            <span className="font-semibold text-900">{m.fullname}</span>
                                            <span className="text-500 font-mono">({m.username})</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        }}
                    />

                    {/* 5. Kolom Kunjungan Pasien */}
                    <Column
                        header="Kunjungan Pasien"
                        style={{ minWidth: '12rem' }}
                        body={(row: any) => (
                            <div className="text-xs">
                                <div className="flex justify-content-between gap-2">
                                    <span className="text-500">Hari Ini:</span>
                                    <span className="font-bold text-teal-600">{row.kunjungan_hari_ini || 0} Pasien</span>
                                </div>
                                <div className="flex justify-content-between gap-2">
                                    <span className="text-500">Bulan Ini:</span>
                                    <span className="font-bold text-900">{row.kunjungan_bulan_ini || 0} Pasien</span>
                                </div>
                                <div className="flex justify-content-between gap-2">
                                    <span className="text-500">Total Pasien:</span>
                                    <span className="text-900 font-semibold">{row.total_pasien || 0}</span>
                                </div>
                            </div>
                        )}
                    />

                    {/* 6. Kolom Omzet Bulan Ini */}
                    <Column
                        field="omzet_bulan_ini"
                        header="Omzet Bulan Ini"
                        sortable
                        style={{ minWidth: '15rem' }}
                        body={(row: any) => {
                            const pct = Math.round(((row.omzet_bulan_ini || 0) / maxOmzet) * 100);
                            return (
                                <div style={{ minWidth: '160px' }}>
                                    <div className="flex justify-content-between mb-1">
                                        <span className="font-bold text-green-700 text-sm">
                                            {formatRupiah(row.omzet_bulan_ini || 0)}
                                        </span>
                                        <span className="text-xs text-500">{row.transaksi_bulan_ini || 0} Trx</span>
                                    </div>
                                    <ProgressBar value={pct} showValue={false} style={{ height: '6px' }} />
                                </div>
                            );
                        }}
                    />

                    {/* 7. Kolom Aksi */}
                    <Column
                        header="Aksi"
                        align="center"
                        style={{ minWidth: '6rem', width: '6rem' }}
                        body={(row: any) => (
                            <div className="flex justify-content-center gap-2">
                                <Button
                                    icon="pi pi-eye"
                                    outlined
                                    size="small"
                                    className="border-round-md"
                                    tooltip="Detail Cabang"
                                    tooltipOptions={{ position: 'bottom' }}
                                    onClick={() => {
                                        setSelectedBranch(row);
                                        setShowDetail(true);
                                    }}
                                />
                            </div>
                        )}
                    />
                </DataTable>
            </div>

            {/* Modal Detail Monitoring Cabang */}
            <Dialog
                header={`Detail Monitoring: ${selectedBranch?.nama_cabang || ''}`}
                visible={showDetail}
                style={{ width: '560px' }}
                modal
                onHide={() => setShowDetail(false)}
                footer={
                    <div className="flex justify-content-between align-items-center pt-3 border-top-1 surface-border">
                        <Button
                            label="Buka Manajemen Cabang"
                            icon="pi pi-external-link"
                            outlined
                            size="small"
                            onClick={() => router.push('/setup/cabang')}
                        />
                        <Button
                            label="Tutup"
                            icon="pi pi-times"
                            outlined
                            severity="secondary"
                            size="small"
                            onClick={() => setShowDetail(false)}
                        />
                    </div>
                }
            >
                {selectedBranch && (
                    <div className="flex flex-column gap-3 pt-2">
                        {/* Status & Identitas */}
                        <div className="flex align-items-center justify-content-between surface-100 p-3 border-round-lg">
                            <div>
                                <span className="font-bold text-lg text-900 block">{selectedBranch.nama_cabang}</span>
                                <span className="text-xs text-500 font-mono">{selectedBranch.kode_cabang}</span>
                            </div>
                            <Tag
                                value={selectedBranch.status === 'aktif' ? 'Aktif Beroperasi' : 'Tidak Aktif'}
                                severity={selectedBranch.status === 'aktif' ? 'success' : 'danger'}
                                className="text-xs font-semibold px-2 py-1"
                            />
                        </div>

                        {/* Kontak & Lokasi */}
                        <div className="grid">
                            <div className="col-12 sm:col-6">
                                <span className="text-xs text-500 block">Penanggung Jawab (PJ)</span>
                                <span className="text-sm font-semibold text-900">{selectedBranch.pj_manager || '-'}</span>
                            </div>
                            <div className="col-12 sm:col-6">
                                <span className="text-xs text-500 block">No. Telepon / WhatsApp</span>
                                <span className="text-sm font-semibold text-900">{selectedBranch.no_telp || '-'}</span>
                            </div>
                            <div className="col-12 sm:col-6">
                                <span className="text-xs text-500 block">Email Cabang</span>
                                <span className="text-sm font-semibold text-900">{selectedBranch.email || '-'}</span>
                            </div>
                            <div className="col-12 sm:col-6">
                                <span className="text-xs text-500 block">Alamat</span>
                                <span className="text-sm font-semibold text-900">{selectedBranch.alamat || '-'}</span>
                            </div>
                        </div>

                        {/* Ringkasan Finansial */}
                        <div className="border-1 surface-border border-round-lg p-3">
                            <span className="text-xs font-bold text-700 uppercase tracking-wider block mb-2">Performa Finansial</span>
                            <div className="grid text-center">
                                <div className="col-4">
                                    <span className="text-xs text-500 block">Omzet Bulan Ini</span>
                                    <span className="text-sm font-bold text-green-700">{formatRupiah(selectedBranch.omzet_bulan_ini || 0)}</span>
                                </div>
                                <div className="col-4">
                                    <span className="text-xs text-500 block">Omzet Hari Ini</span>
                                    <span className="text-sm font-bold text-blue-700">{formatRupiah(selectedBranch.omzet_hari_ini || 0)}</span>
                                </div>
                                <div className="col-4">
                                    <span className="text-xs text-500 block">Total Transaksi</span>
                                    <span className="text-sm font-bold text-900">{selectedBranch.transaksi_bulan_ini || 0} Trx</span>
                                </div>
                            </div>
                        </div>

                        {/* Kunjungan & Pasien */}
                        <div className="border-1 surface-border border-round-lg p-3">
                            <span className="text-xs font-bold text-700 uppercase tracking-wider block mb-2">Kunjungan &amp; Basis Pasien</span>
                            <div className="grid text-center">
                                <div className="col-4">
                                    <span className="text-xs text-500 block">Kunjungan Hari Ini</span>
                                    <span className="text-sm font-bold text-teal-600">{selectedBranch.kunjungan_hari_ini || 0} Pasien</span>
                                </div>
                                <div className="col-4">
                                    <span className="text-xs text-500 block">Kunjungan Bulan Ini</span>
                                    <span className="text-sm font-bold text-900">{selectedBranch.kunjungan_bulan_ini || 0} Pasien</span>
                                </div>
                                <div className="col-4">
                                    <span className="text-xs text-500 block">Total Pasien Terdaftar</span>
                                    <span className="text-sm font-bold text-purple-700">{selectedBranch.total_pasien || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* SDM & Tim Medis */}
                        <div className="border-1 surface-border border-round-lg p-3">
                            <span className="text-xs font-bold text-700 uppercase tracking-wider block mb-2">SDM &amp; Akun Manajer</span>
                            <div className="grid mb-2">
                                <div className="col-6">
                                    <span className="text-xs text-500 block">Tenaga Medis (Dokter)</span>
                                    <span className="text-sm font-bold text-900">{selectedBranch.total_dokter || 0} Dokter</span>
                                </div>
                                <div className="col-6">
                                    <span className="text-xs text-500 block">Total Staf / Karyawan</span>
                                    <span className="text-sm font-bold text-900">{selectedBranch.total_karyawan || 0} Karyawan</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-500 block mb-1">Akun Manajer Bertugas:</span>
                                {(selectedBranch.managers || []).length > 0 ? (
                                    <div className="flex flex-column gap-1">
                                        {selectedBranch.managers.map((m: any, idx: number) => (
                                            <div key={idx} className="flex align-items-center gap-1 text-xs surface-100 p-2 border-round">
                                                <i className="pi pi-user text-teal-600 mr-1" />
                                                <span className="font-semibold text-900">{m.fullname}</span>
                                                <span className="text-500 font-mono">({m.username})</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-400 italic">Belum ada akun manajer yang ditetapkan</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
