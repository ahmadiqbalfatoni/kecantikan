'use client';

import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { GridPanggilLayananProps, AntrianLayananData } from './interfaces';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiEndpointPanggil, apiEndpointReset } from './endpoints';
import { getTzUser } from '@/lib/tools/dateTools';

// ─── Audio: Chime 2 nada ────────────────────────────────────────────────────
const playChime = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25]; // C5 → E5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.4;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.45, t + 0.05);
            gain.gain.linearRampToValueAtTime(0, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    } catch (_) {
        console.warn('AudioContext tidak tersedia');
    }
};

// ─── TTS: Text to Speech Bahasa Indonesia ───────────────────────────────────
const speakNomorLayanan = (noAntrian: string, namaPasien?: string, namaLayanan?: string) => {
    try {
        if (!('speechSynthesis' in window)) {
            console.warn('SpeechSynthesis tidak tersedia di browser ini');
            return;
        }
        window.speechSynthesis.cancel();

        let teks = `Nomor antrian ${noAntrian}`;
        if (namaPasien && namaPasien !== '-') {
            teks += `, ${namaPasien}`;
        }
        if (namaLayanan && namaLayanan !== '-') {
            teks += `, silakan menuju ke ruang layanan ${namaLayanan}`;
        } else {
            teks += `, silakan menuju ke ruang layanan`;
        }

        const utter = new SpeechSynthesisUtterance(teks);
        utter.lang = 'id-ID';
        utter.rate = 0.85;
        utter.pitch = 1.05;
        utter.volume = 1;

        const speak = () => {
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find(
                (v) => v.lang === 'id-ID' || v.lang.startsWith('id')
            );
            if (idVoice) utter.voice = idVoice;
            window.speechSynthesis.speak(utter);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setTimeout(speak, 900);
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                setTimeout(speak, 900);
            };
        }
    } catch (_) {
        console.warn('SpeechSynthesis error');
    }
};

// ─── Konfigurasi Tampilan Card Status ───────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    bg: string; border: string; color: string;
    shadow: string; cursor: string; label: string;
}> = {
    menunggu: {
        bg: 'linear-gradient(135deg, #fef9c3, #fde68a)',
        border: '#f59e0b', color: '#92400e',
        shadow: '0 4px 12px rgba(245,158,11,0.25)', cursor: 'pointer', label: '⏳ Menunggu'
    },
    dipanggil: {
        bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
        border: '#2563eb', color: '#1e40af',
        shadow: '0 4px 14px rgba(37,99,235,0.35)', cursor: 'pointer', label: '📢 Dipanggil'
    },
    selesai: {
        bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
        border: '#16a34a', color: '#14532d',
        shadow: '0 2px 6px rgba(22,163,74,0.15)', cursor: 'not-allowed', label: '✅ Selesai'
    },
    batal: {
        bg: 'linear-gradient(135deg, #fee2e2, #fca5a5)',
        border: '#dc2626', color: '#7f1d1d',
        shadow: 'none', cursor: 'not-allowed', label: '❌ Batal'
    },
};

// Aksi berikutnya berdasarkan status
const NEXT_AKSI: Record<string, { aksi: string; label: string; pesan: string } | null> = {
    menunggu:  { aksi: 'dipanggil', label: 'Panggil ke Ruangan', pesan: 'Panggil pasien ini ke ruang layanan?' },
    dipanggil: { aksi: 'selesai',   label: 'Tandai Selesai',    pesan: 'Tandai antrian layanan ini telah selesai dilayani?' },
    selesai:   null,
    batal:     null,
};

export const GridPanggilLayanan = ({
    state,
    setState,
    toast,
    getGridData,
    mode = 'all',
}: GridPanggilLayananProps) => {
    // Dropdown Selection Filter State for each panel
    const [selectedLayanan, setSelectedLayanan] = useState<string>('');
    const [selectedPaket, setSelectedPaket] = useState<string>('');

    // Filter items per panel berdasarkan jenis_layanan dari database
    const allLayananItems = state.gridData.filter((d) => d.jenis_layanan === 'layanan');
    const allPaketItems   = state.gridData.filter((d) => d.jenis_layanan === 'paket');

    // Dynamic Dropdown options for Panel 1 (Layanan)
    const uniqueLayananNames = Array.from(
        new Set(allLayananItems.map((d) => d.nama_layanan).filter(Boolean))
    );
    const optionsLayanan = [
        { label: 'Semua Jenis Layanan', value: '' },
        ...uniqueLayananNames.map((name) => ({ label: name, value: name })),
    ];

    // Dynamic Dropdown options for Panel 2 (Paket)
    const uniquePaketNames = Array.from(
        new Set(allPaketItems.map((d) => d.nama_layanan).filter(Boolean))
    );
    const optionsPaket = [
        { label: 'Semua Jenis Paket Treatment', value: '' },
        ...uniquePaketNames.map((name) => ({ label: name, value: name })),
    ];

    // Filtered items per dropdown selection
    const layananItems = allLayananItems.filter(
        (d) => !selectedLayanan || d.nama_layanan === selectedLayanan
    );
    const paketItems = allPaketItems.filter(
        (d) => !selectedPaket || d.nama_layanan === selectedPaket
    );

    // Hitung counter independen Panel 1 (Layanan)
    const mLayanan = layananItems.filter((d) => d.status === 'menunggu').length;
    const pLayanan = layananItems.filter((d) => d.status === 'dipanggil').length;
    const sLayanan = layananItems.filter((d) => d.status === 'selesai').length;
    const bLayanan = layananItems.filter((d) => d.status === 'batal').length;

    // Hitung counter independen Panel 2 (Paket)
    const mPaket = paketItems.filter((d) => d.status === 'menunggu').length;
    const pPaket = paketItems.filter((d) => d.status === 'dipanggil').length;
    const sPaket = paketItems.filter((d) => d.status === 'selesai').length;
    const bPaket = paketItems.filter((d) => d.status === 'batal').length;

    const handleAksi = (item: AntrianLayananData) => {
        const next = NEXT_AKSI[item.status];
        if (!next) return;

        // Validation: Block completing status if Form Penanganan Pasien has not been saved
        if (next.aksi === 'selesai' && !item.hasil_form) {
            showError(toast, 'Selesaikan Tindakan tidak dapat diklik! Harap isi dan simpan Form Penanganan Pasien serta Hasil Treatment terlebih dahulu.');
            return;
        }

        confirmDialog({
            message: (
                <div className="flex flex-column align-items-center text-center gap-3 py-2">
                    <i className="pi pi-bell text-blue-500 text-5xl" />
                    <div>
                        <h3 className="font-bold text-xl mb-1">Antrean {item.nomor_antrian} — {item.nama_pasien}</h3>
                        <p className="text-blue-700 font-semibold mb-2">{item.nama_layanan}</p>
                        <p className="text-color-secondary text-sm">{next.pesan}</p>
                    </div>
                </div>
            ) as any,
            header: 'Konfirmasi Aksi Antrean Layanan',
            acceptLabel: next.label,
            rejectLabel: 'Batal',
            acceptClassName: next.aksi === 'dipanggil' ? 'p-button-primary' : 'p-button-success',
            rejectClassName: 'p-button-secondary p-button-outlined',
            accept: async () => {
                setState((p) => ({ ...p, loadGrid: true }));
                try {
                    const res = await postData(apiEndpointPanggil, {
                        kode_antrian_layanan: item.kode_antrian_layanan,
                        aksi: next.aksi,
                        tz: getTzUser(),
                    });
                    showSuccess(toast, res.data?.message || 'Berhasil mengupdate status antrean');

                    if (next.aksi === 'dipanggil') {
                        playChime();
                        speakNomorLayanan(item.nomor_antrian, item.nama_pasien, item.nama_layanan);
                    }

                    await getGridData();
                } catch (error: any) {
                    const e = error?.response?.data || error;
                    showError(toast, e?.message || 'Terjadi Kesalahan');
                } finally {
                    setState((p) => ({ ...p, loadGrid: false }));
                }
            },
        });
    };

    const handleReset = () => {
        confirmDialog({
            message: (
                <div className="flex flex-column align-items-center text-center gap-3 py-2">
                    <i className="pi pi-refresh text-orange-500 text-5xl" />
                    <div>
                        <h3 className="font-bold text-xl mb-1">Reset Antrean Layanan Hari Ini?</h3>
                        <p className="text-color-secondary text-sm">
                            Seluruh status antrean layanan & paket pasien hari ini akan dikembalikan ke status &quot;Menunggu&quot;.
                        </p>
                    </div>
                </div>
            ) as any,
            header: 'Konfirmasi Reset Antrean',
            acceptLabel: 'Ya, Reset Semua',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-warning',
            rejectClassName: 'p-button-secondary p-button-outlined',
            accept: async () => {
                setState((p) => ({ ...p, loadGrid: true }));
                try {
                    const res = await postData(apiEndpointReset, { tz: getTzUser() });
                    showSuccess(toast, res.data?.message || 'Antrean layanan berhasil direset');
                    await getGridData();
                } catch (error: any) {
                    const e = error?.response?.data || error;
                    showError(toast, e?.message || 'Terjadi Kesalahan');
                } finally {
                    setState((p) => ({ ...p, loadGrid: false }));
                }
            },
        });
    };

    const renderCardGrid = (items: AntrianLayananData[], isPaket: boolean) => {
        if (items.length === 0) {
            return (
                <div className="text-center py-5 text-color-secondary border-1 border-dashed border-round-lg surface-50">
                    <i className="pi pi-inbox text-4xl mb-2 text-400" />
                    <p className="font-semibold text-sm mb-0">Tidak Ada {isPaket ? 'Antrean Paket Treatment' : 'Antrean Layanan'} Sesuai Filter</p>
                </div>
            );
        }

        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '14px',
                }}
            >
                {items.map((item) => {
                    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.menunggu;
                    const canClick = !!NEXT_AKSI[item.status];
                    const isDipanggil = item.status === 'dipanggil';

                    return (
                        <div
                            key={item.kode_antrian_layanan}
                            style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                        >
                            <button
                                onClick={() => handleAksi(item)}
                                disabled={!canClick}
                                title={`No. ${item.nomor_antrian} — ${item.nama_pasien} (${item.nama_layanan})`}
                                style={{
                                    minHeight: '145px',
                                    borderRadius: '14px',
                                    border: `2px solid ${cfg.border}`,
                                    background: cfg.bg,
                                    color: cfg.color,
                                    cursor: cfg.cursor,
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: cfg.shadow,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '12px 10px',
                                    textAlign: 'center',
                                    width: '100%',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={(e) => {
                                    if (canClick) {
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 20px ${cfg.border}55`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = cfg.shadow;
                                }}
                            >
                                <div className="text-3xl font-black mb-1" style={{ lineHeight: 1 }}>
                                    {item.nomor_antrian}
                                </div>
                                <div className="text-xs font-bold text-truncate w-full px-1 mb-1" title={item.nama_pasien}>
                                    {item.nama_pasien || '-'}
                                </div>

                                {/* BADGE NAMA LAYANAN / PAKET */}
                                <div
                                    className="text-xs font-semibold px-2 py-1 border-round-md mb-1 text-truncate w-full"
                                    style={{
                                        background: 'rgba(255,255,255,0.85)',
                                        color: cfg.color,
                                        border: `1px solid ${cfg.border}44`,
                                    }}
                                    title={item.nama_layanan}
                                >
                                    {isPaket ? '📦 ' : '💆 '} {item.nama_layanan || '-'}
                                </div>

                                <div
                                    className="text-xs font-bold text-truncate w-full mb-1"
                                    style={{
                                        fontSize: '0.68rem',
                                        color: '#0f766e',
                                        background: 'rgba(204, 251, 241, 0.9)',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                    }}
                                    title={`Ruangan: ${item.nama_ruangan || item.kode_ruangan || '-'}`}
                                >
                                    🏠 {item.nama_ruangan ? `${item.kode_ruangan ? item.kode_ruangan + ' - ' : ''}${item.nama_ruangan}` : (item.kode_ruangan || 'Ruang Treatment')}
                                </div>

                                {item.nama_petugas && (
                                    <div
                                        className="text-xs font-bold text-truncate w-full mb-1"
                                        style={{
                                            fontSize: '0.68rem',
                                            color: '#1e3a8a',
                                            background: 'rgba(219, 234, 254, 0.9)',
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                        }}
                                        title={`Petugas: ${item.nama_petugas}`}
                                    >
                                        👤 {item.nama_petugas}
                                    </div>
                                )}

                                {/* Informasi Tambahan Sesi untuk Paket */}
                                {isPaket && (
                                    <div className="mb-1">
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 'bold',
                                                padding: '1px 6px',
                                                borderRadius: '8px',
                                                background: 'rgba(147, 51, 234, 0.15)',
                                                color: '#7e22ce',
                                                border: '1px solid rgba(147, 51, 234, 0.3)',
                                            }}
                                        >
                                            📦 {item.jumlah_sesi_paket ? `${item.jumlah_sesi_paket} Sesi` : 'Paket Treatment'}
                                        </span>
                                    </div>
                                )}

                                <div className="mt-1">
                                    <span
                                        style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: 'rgba(255,255,255,0.75)',
                                            color: cfg.color,
                                            border: `1px solid ${cfg.border}44`,
                                        }}
                                    >
                                        {cfg.label}
                                    </span>
                                </div>
                            </button>

                            {/* Tombol Panggil Ulang Suara */}
                            {isDipanggil && (
                                <button
                                    onClick={() => {
                                        playChime();
                                        speakNomorLayanan(item.nomor_antrian, item.nama_pasien, item.nama_layanan);
                                    }}
                                    title={`Panggil ulang antrean ${item.nomor_antrian}`}
                                    style={{
                                        padding: '6px 0',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        borderRadius: '8px',
                                        border: '1.5px solid #2563eb',
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = '#dbeafe';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                    }}
                                >
                                    🔁 Panggil Ulang Suara
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderLayananPanel = () => (
        <div className="card shadow-1 border-round-xl p-4 mb-0 border-top-3 border-blue-500">
            <div className="flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
                <div className="flex align-items-center gap-3 flex-wrap">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-heart-fill text-blue-600 text-xl" />
                        <h4 className="text-xl font-bold text-900 m-0">Panel Antrean Layanan</h4>
                    </div>
                    <Dropdown
                        value={selectedLayanan}
                        options={optionsLayanan}
                        onChange={(e) => setSelectedLayanan(e.value || '')}
                        placeholder="Filter Jenis Layanan"
                        className="p-inputtext-sm w-16rem"
                        showClear
                    />
                </div>
                <div className="flex gap-2 flex-wrap align-items-center">
                    {[
                        { color: '#f59e0b', label: 'Menunggu',  count: mLayanan   },
                        { color: '#3b82f6', label: 'Dipanggil', count: pLayanan   },
                        { color: '#22c55e', label: 'Selesai',   count: sLayanan   },
                        { color: '#ef4444', label: 'Batal',     count: bLayanan   },
                        { color: '#6b7280', label: 'Total',     count: layananItems.length },
                    ].map((item) => (
                        <span
                            key={item.label}
                            className="flex align-items-center gap-2 px-3 py-2 border-round-lg text-xs font-semibold"
                            style={{
                                background: `${item.color}18`,
                                border: `1.5px solid ${item.color}55`,
                                color: item.color,
                            }}
                        >
                            <span style={{
                                display: 'inline-block',
                                width: '12px', height: '12px',
                                borderRadius: '3px',
                                backgroundColor: item.color,
                                boxShadow: `0 1px 3px ${item.color}55`,
                                flexShrink: 0,
                            }} />
                            {item.label}: <strong>{item.count}</strong>
                        </span>
                    ))}
                </div>
            </div>

            {state.loadGrid ? (
                <div className="flex justify-content-center align-items-center py-5">
                    <i className="pi pi-spinner pi-spin text-3xl text-blue-500" />
                </div>
            ) : (
                renderCardGrid(layananItems, false)
            )}
        </div>
    );

    const renderPaketPanel = () => (
        <div className="card shadow-1 border-round-xl p-4 mb-0 border-top-3 border-purple-500">
            <div className="flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
                <div className="flex align-items-center gap-3 flex-wrap">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-box text-purple-600 text-xl" />
                        <h4 className="text-xl font-bold text-900 m-0">Panel Antrean Paket Treatment</h4>
                    </div>
                    <Dropdown
                        value={selectedPaket}
                        options={optionsPaket}
                        onChange={(e) => setSelectedPaket(e.value || '')}
                        placeholder="Filter Jenis Paket"
                        className="p-inputtext-sm w-18rem"
                        showClear
                    />
                </div>
                <div className="flex gap-2 flex-wrap align-items-center">
                    {[
                        { color: '#f59e0b', label: 'Menunggu',  count: mPaket   },
                        { color: '#3b82f6', label: 'Dipanggil', count: pPaket   },
                        { color: '#22c55e', label: 'Selesai',   count: sPaket   },
                        { color: '#ef4444', label: 'Batal',     count: bPaket   },
                        { color: '#6b7280', label: 'Total',     count: paketItems.length },
                    ].map((item) => (
                        <span
                            key={item.label}
                            className="flex align-items-center gap-2 px-3 py-2 border-round-lg text-xs font-semibold"
                            style={{
                                background: `${item.color}18`,
                                border: `1.5px solid ${item.color}55`,
                                color: item.color,
                            }}
                        >
                            <span style={{
                                display: 'inline-block',
                                width: '12px', height: '12px',
                                borderRadius: '3px',
                                backgroundColor: item.color,
                                boxShadow: `0 1px 3px ${item.color}55`,
                                flexShrink: 0,
                            }} />
                            {item.label}: <strong>{item.count}</strong>
                        </span>
                    ))}
                </div>
            </div>

            {state.loadGrid ? (
                <div className="flex justify-content-center align-items-center py-5">
                    <i className="pi pi-spinner pi-spin text-3xl text-purple-500" />
                </div>
            ) : (
                renderCardGrid(paketItems, true)
            )}
        </div>
    );

    return (
        <div className="flex flex-column gap-4">
            <ConfirmDialog />

            {/* TOP GLOBAL TOOLBAR */}
            <div className="card shadow-1 border-round-xl p-4 mb-0">
                <div className="flex justify-content-between align-items-start flex-wrap gap-3">
                    <div>
                        <h3 className="text-2xl font-bold flex align-items-center gap-2 mb-1 text-900">
                            <i className="pi pi-bell text-blue-600 text-2xl" />
                            {mode === 'layanan'
                                ? 'Panggil Antrean Layanan Pasien'
                                : mode === 'paket'
                                ? 'Panggil Antrean Paket Treatment Pasien'
                                : 'Panggil Antrean Layanan & Paket Pasien'}
                        </h3>
                        <p className="text-color-secondary text-sm m-0">
                            Pilih jenis pada filter dropdown atau klik nomor antrean untuk memanggil pasien ke ruangan tindakan.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            label="Refresh Data"
                            icon="pi pi-refresh"
                            severity="secondary"
                            outlined
                            size="small"
                            onClick={() => getGridData()}
                            loading={state.loadGrid}
                        />
                        <Button
                            label="Reset Antrean"
                            icon="pi pi-history"
                            severity="warning"
                            outlined
                            size="small"
                            onClick={handleReset}
                            loading={state.loadGrid}
                        />
                    </div>
                </div>
            </div>

            {/* RENDER BASED ON MODE */}
            {mode === 'layanan' && renderLayananPanel()}
            {mode === 'paket' && renderPaketPanel()}
            {mode === 'all' && (
                <>
                    {renderLayananPanel()}
                    {renderPaketPanel()}
                </>
            )}
        </div>
    );
};
