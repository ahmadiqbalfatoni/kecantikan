'use client';

import React, { useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { TableAntrianLayananProps, AntrianLayananData } from './interfaces';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiEndpointPanggil, apiEndpointData } from './endpoints';
import { getTzUser } from '@/lib/tools/dateTools';

export const TableAntrianLayanan = ({
    state,
    setState,
    toast,
    getData,
    getGridData,
    onLazyLoad,
}: TableAntrianLayananProps) => {

    // Auto-refresh interval (Setiap 10 detik jika autoRefresh aktif)
    useEffect(() => {
        if (!state.autoRefresh) return;
        const interval = setInterval(() => {
            getData(apiEndpointData);
            getGridData();
        }, 10000);
        return () => clearInterval(interval);
    }, [state.autoRefresh, getData, getGridData]);

    const handleUbahStatus = (row: AntrianLayananData, aksi: string, label: string) => {
        // Validation: Block completing status if Form Penanganan Pasien has not been saved
        if (aksi === 'selesai' && !row.hasil_form) {
            showError(toast, 'Selesaikan Tindakan tidak dapat diklik! Harap isi dan simpan Form Penanganan Pasien serta Hasil Treatment terlebih dahulu.');
            return;
        }

        confirmDialog({
            message: `Apakah Anda yakin ingin mengubah status antrean ${row.nomor_antrian} (${row.nama_pasien}) menjadi '${label}'?`,
            header: 'Konfirmasi Perubahan Status',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Lanjutkan',
            rejectLabel: 'Batal',
            acceptClassName: aksi === 'batal' ? 'p-button-danger' : 'p-button-primary',
            accept: async () => {
                setState((p) => ({ ...p, load: true }));
                try {
                    const res = await postData(apiEndpointPanggil, {
                        kode_antrian_layanan: row.kode_antrian_layanan,
                        aksi,
                        tz: getTzUser(),
                    });
                    showSuccess(toast, res.data?.message || 'Berhasil mengubah status antrean');
                    await getData(apiEndpointData);
                    await getGridData();
                } catch (error: any) {
                    const e = error?.response?.data || error;
                    showError(toast, e?.message || 'Terjadi kesalahan saat mengupdate status');
                } finally {
                    setState((p) => ({ ...p, load: false }));
                }
            },
        });
    };

    const jenisBodyTemplate = (row: AntrianLayananData) => {
        if (row.jenis_layanan === 'paket') {
            return <Tag value="📦 Paket" style={{ background: '#9333ea', color: '#fff' }} className="px-2 py-1 text-xs font-bold" />;
        }
        return <Tag value="💆 Layanan" severity="info" className="px-2 py-1 text-xs font-bold" />;
    };

    const statusBodyTemplate = (row: AntrianLayananData) => {
        switch (row.status) {
            case 'menunggu':
                return <Tag value="⏳ Menunggu" severity="warning" className="px-3 py-1 text-xs" />;
            case 'dipanggil':
                return <Tag value="📢 Dipanggil" severity="info" className="px-3 py-1 text-xs" />;
            case 'selesai':
                return <Tag value="✅ Selesai" severity="success" className="px-3 py-1 text-xs" />;
            case 'batal':
                return <Tag value="❌ Batal" severity="danger" className="px-3 py-1 text-xs" />;
            default:
                return <Tag value={row.status} severity="secondary" className="px-3 py-1 text-xs" />;
        }
    };

    const actionBodyTemplate = (row: AntrianLayananData) => {
        return (
            <div className="flex gap-2 align-items-center">
                {row.status === 'menunggu' && (
                    <Button
                        label="Panggil"
                        icon="pi pi-bell"
                        size="small"
                        onClick={() => handleUbahStatus(row, 'dipanggil', 'Dipanggil')}
                        tooltip="Panggil ke Ruangan"
                        tooltipOptions={{ position: 'top' }}
                    />
                )}
                {row.status === 'dipanggil' && (
                    <Button
                        label="Selesai"
                        icon="pi pi-check"
                        size="small"
                        severity="success"
                        onClick={() => handleUbahStatus(row, 'selesai', 'Selesai')}
                        tooltip="Tandai Selesai Treatment"
                        tooltipOptions={{ position: 'top' }}
                    />
                )}
                {row.status !== 'batal' && row.status !== 'selesai' && (
                    <Button
                        icon="pi pi-times"
                        size="small"
                        severity="danger"
                        outlined
                        onClick={() => handleUbahStatus(row, 'batal', 'Batal')}
                        tooltip="Batalkan Antrean"
                        tooltipOptions={{ position: 'top' }}
                    />
                )}
            </div>
        );
    };

    const jenisOptions = [
        { label: 'Semua Jenis', value: '' },
        { label: '💆 Layanan', value: 'layanan' },
        { label: '📦 Paket', value: 'paket' },
    ];

    return (
        <div className="card shadow-1 border-round-xl p-4">
            <ConfirmDialog />

            {/* Header Control Toolbar */}
            <div className="flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div className="flex align-items-center gap-3 flex-wrap">
                    <span className="p-input-icon-left">
                        <i className="pi pi-search" />
                        <InputText
                            value={state.keyword}
                            onChange={(e) => setState((p) => ({ ...p, keyword: e.target.value, page: 1 }))}
                            placeholder="Cari antrean, nama, RM..."
                            className="p-inputtext-sm w-15rem md:w-18rem"
                        />
                    </span>

                    <Dropdown
                        value={state.filterJenis || ''}
                        options={jenisOptions}
                        onChange={(e) => setState((p) => ({ ...p, filterJenis: e.value, page: 1 }))}
                        placeholder="Filter Jenis"
                        className="p-inputtext-sm w-12rem"
                    />

                    {state.keyword && (
                        <Button
                            icon="pi pi-times"
                            className="p-button-text p-button-secondary p-button-sm"
                            onClick={() => setState((p) => ({ ...p, keyword: '' }))}
                        />
                    )}
                </div>

                <div className="flex align-items-center gap-3">
                    <div className="flex align-items-center gap-2 surface-100 px-3 py-2 border-round-lg">
                        <InputSwitch
                            checked={state.autoRefresh}
                            onChange={(e) => setState((p) => ({ ...p, autoRefresh: !!e.value }))}
                        />
                        <span className="text-sm font-semibold text-700">
                            Auto-Refresh (10s)
                        </span>
                    </div>

                    <Button
                        icon="pi pi-refresh"
                        label="Refresh Manual"
                        size="small"
                        severity="secondary"
                        outlined
                        onClick={() => {
                            getData(apiEndpointData);
                            getGridData();
                        }}
                        loading={state.load}
                    />
                </div>
            </div>

            {/* DataTable Data Antrean Layanan */}
            <DataTable
                value={state.data}
                loading={state.load}
                lazy
                paginator
                first={state.first}
                rows={state.rows}
                totalRecords={state.totalData}
                onPage={onLazyLoad}
                onSort={onLazyLoad}
                sortField={state.sortField}
                sortOrder={state.sortOrder === 'asc' ? 1 : -1}
                rowsPerPageOptions={[5, 10, 20, 50]}
                responsiveLayout="scroll"
                className="p-datatable-sm p-datatable-gridlines"
                emptyMessage="Tidak ada data antrean layanan hari ini."
            >
                <Column field="nomor_antrian" header="No. Antrean" sortable style={{ width: '100px', textAlign: 'center' }} body={(r) => <strong className="text-blue-700 text-base">{r.nomor_antrian}</strong>} />
                <Column field="jenis_layanan" header="Jenis" sortable style={{ width: '120px' }} body={jenisBodyTemplate} />
                <Column field="kode_antrian_layanan" header="Kode Antrean" sortable style={{ width: '160px' }} />
                <Column field="kode_kunjungan" header="Kode Kunjungan" sortable style={{ width: '160px' }} />
                <Column field="no_rm" header="No. RM" sortable style={{ width: '130px' }} />
                <Column field="nama_pasien" header="Nama Pasien" sortable body={(r) => <strong>{r.nama_pasien || '-'}</strong>} />
                <Column field="nama_layanan" header="Layanan / Treatment" sortable body={(r) => <span className="text-blue-800 font-semibold">{r.nama_layanan || '-'}</span>} />
                <Column field="nama_ruangan" header="Ruangan" body={(r) => <Tag value={r.nama_ruangan ? `${r.kode_ruangan ? r.kode_ruangan + ' - ' : ''}${r.nama_ruangan}` : (r.kode_ruangan || '-')} severity="success" className="text-xs font-semibold" />} />
                <Column field="nama_petugas" header="Petugas Examiner" sortable body={(r) => r.nama_petugas ? <span className="font-semibold text-teal-800">{r.nama_petugas}</span> : <span className="text-400 italic">-</span>} />
                <Column field="jam_datang" header="Jam Datang" sortable style={{ width: '120px' }} />
                <Column field="status" header="Status" sortable style={{ width: '130px' }} body={statusBodyTemplate} />
                <Column header="Aksi" style={{ width: '180px' }} body={actionBodyTemplate} />
            </DataTable>
        </div>
    );
};
