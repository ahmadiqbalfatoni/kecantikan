'use client';

import { Button } from 'primereact/button';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { GridPanggilProps, TableData } from '../interfaces';
import postData from '@/lib/axios/postData';
import { showError, showSuccess, showWarning } from '@/lib/tools/generalTools';
import { apiEndpointPanggil, apiEndpointReset } from '../endpoints';
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
            gain.gain.linearRampToValueAtTime(0.45, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    } catch (_) {
        console.warn('AudioContext tidak tersedia');
    }
};

// ─── TTS: Text to Speech Bahasa Indonesia ───────────────────────────────────
const speakNomor = (noAntrian: string) => {
    try {
        if (!('speechSynthesis' in window)) {
            console.warn('SpeechSynthesis tidak tersedia di browser ini');
            return;
        }
        window.speechSynthesis.cancel();

        const teks = `Nomor antrian ${noAntrian}, silakan menuju ke loket`;
        const utter = new SpeechSynthesisUtterance(teks);
        utter.lang = 'id-ID';
        utter.rate = 0.85;
        utter.pitch = 1.05;
        utter.volume = 1;

        // Tunggu voices tersedia
        const speak = () => {
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find(
                (v) => v.lang === 'id-ID' || v.lang.startsWith('id')
            );
            if (idVoice) utter.voice = idVoice;
            window.speechSynthesis.speak(utter);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setTimeout(speak, 900); // delay setelah chime
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                setTimeout(speak, 900);
            };
        }
    } catch (_) {
        console.warn('SpeechSynthesis error');
    }
};

// ─── Konfigurasi tampilan per status ────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    bg: string; border: string; color: string;
    shadow: string; cursor: string; label: string;
}> = {
    tersedia: {
        bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
        border: '#22c55e', color: '#15803d',
        shadow: '0 2px 8px rgba(34,197,94,0.3)', cursor: 'pointer', label: ''
    },
    diambil: {
        bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
        border: '#3b82f6', color: '#1d4ed8',
        shadow: '0 2px 8px rgba(59,130,246,0.3)', cursor: 'pointer', label: '📋'
    },
    dipanggil: {
        bg: 'linear-gradient(135deg,#fef9c3,#fde68a)',
        border: '#f59e0b', color: '#b45309',
        shadow: '0 2px 8px rgba(245,158,11,0.3)', cursor: 'pointer', label: '📢'
    },
    selesai: {
        bg: 'linear-gradient(135deg,#f3f4f6,#e5e7eb)',
        border: '#9ca3af', color: '#6b7280',
        shadow: 'none', cursor: 'not-allowed', label: '✅'
    },
    nonaktif: {
        bg: '#f9fafb',
        border: '#e5e7eb', color: '#d1d5db',
        shadow: 'none', cursor: 'not-allowed', label: '🚫'
    },
};

// Aksi berikutnya berdasarkan status
const NEXT_AKSI: Record<string, { aksi: string; label: string; pesan: string } | null> = {
    tersedia:  { aksi: 'diambil',   label: 'Tandai Diambil',  pesan: 'Pasien mengambil nomor ini?' },
    diambil:   { aksi: 'dipanggil', label: 'Panggil ke Loket', pesan: 'Panggil nomor antrian ini ke loket?' },
    dipanggil: { aksi: 'selesai',   label: 'Selesai Dilayani', pesan: 'Tandai antrian ini selesai dilayani?' },
    selesai:   null,
    nonaktif:  null,
};

const GridPanggil = ({ state, setState, toast, getGridData }: GridPanggilProps) => {
    const tersedia   = state.gridData.filter((d) => d.status === 'tersedia').length;
    const diambil    = state.gridData.filter((d) => d.status === 'diambil').length;
    const dipanggil  = state.gridData.filter((d) => d.status === 'dipanggil').length;
    const aktif      = state.gridData.filter((d) => d.status !== 'nonaktif');
    const currentDipanggil = state.gridData.find((d) => d.status === 'dipanggil');

    // Urutkan nomor yang diambil (FIFO)
    const takenItems = state.gridData
        .filter((d) => d.status === 'diambil')
        .sort((a, b) => {
            const numA = parseInt(a.no_antrian.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.no_antrian.replace(/\D/g, '')) || 0;
            return numA !== numB ? numA - numB : a.no_antrian.localeCompare(b.no_antrian);
        });
    const nextTakenToCall = takenItems.length > 0 ? takenItems[0] : null;

    // Urutkan nomor yang tersedia (FIFO)
    const availableItems = state.gridData
        .filter((d) => d.status === 'tersedia')
        .sort((a, b) => {
            const numA = parseInt(a.no_antrian.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.no_antrian.replace(/\D/g, '')) || 0;
            return numA !== numB ? numA - numB : a.no_antrian.localeCompare(b.no_antrian);
        });
    const nextAvailableToTake = availableItems.length > 0 ? availableItems[0] : null;

    const handleAksi = (item: TableData) => {
        const next = NEXT_AKSI[item.status];
        if (!next) return;

        // Validasi: Cegah memanggil antrean baru jika masih ada antrean lain yang sedang dipanggil di loket
        if (next.aksi === 'dipanggil' && currentDipanggil && currentDipanggil.kode_antrian !== item.kode_antrian) {
            showWarning(
                toast,
                `Nomor antrean ${currentDipanggil.no_antrian} sedang dipanggil di loket dan belum diselesaikan. Harap selesaikan nomor ${currentDipanggil.no_antrian} terlebih dahulu sebelum memanggil antrean berikutnya.`
            );
            return;
        }

        confirmDialog({
            message: (
                <div className="flex flex-column align-items-center text-center gap-3 py-2">
                    <i className="pi pi-bell text-blue-500 text-5xl" />
                    <div>
                        <h3 className="font-bold text-xl mb-1">Nomor {item.no_antrian} — {next.label}</h3>
                        <p className="text-color-secondary text-sm">{next.pesan}</p>
                    </div>
                </div>
            ) as any,
            header: 'Konfirmasi Aksi Antrian',
            acceptLabel: next.label,
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-primary',
            rejectClassName: 'p-button-secondary p-button-outlined',
            accept: async () => {
                setState((p) => ({ ...p, loadGrid: true }));
                try {
                    const res = await postData(apiEndpointPanggil, {
                        kode_antrian: item.kode_antrian,
                        aksi: next.aksi,
                        tz: getTzUser(),
                    });
                    showSuccess(toast, res.data?.message || 'Berhasil');

                    // Hanya mainkan suara saat dipanggil ke loket
                    if (next.aksi === 'dipanggil') {
                        playChime();
                        speakNomor(item.no_antrian);
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
                        <h3 className="font-bold text-xl mb-1">Reset Semua Antrian?</h3>
                        <p className="text-color-secondary text-sm">
                            Semua nomor yang diambil/dipanggil akan dikembalikan ke tersedia.
                        </p>
                    </div>
                </div>
            ) as any,
            header: 'Konfirmasi Reset',
            acceptLabel: 'Ya, Reset',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-warning',
            rejectClassName: 'p-button-secondary p-button-outlined',
            accept: async () => {
                setState((p) => ({ ...p, loadGrid: true }));
                try {
                    const res = await postData(apiEndpointReset, { tz: getTzUser() });
                    showSuccess(toast, res.data?.message || 'Antrian berhasil direset');
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

    return (
        <div className="card">
            <ConfirmDialog />

            {/* Header */}
            <div className="flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
                <div>
                    <h3 className="text-2xl font-semibold flex align-items-center gap-2 mb-1">
                        <i className="pi pi-bell text-blue-600 text-2xl" />
                        Antrean Manual
                    </h3>
                    <p className="text-color-secondary text-sm">
                        Klik nomor sesuai kartu pasien untuk mengubah statusnya. Panggilan antrean berjalan sesuai urutan.
                    </p>
                </div>
                <div className="flex align-items-center gap-2 flex-wrap">
                    <Button
                        label="Display TV"
                        icon="pi pi-desktop"
                        severity="info"
                        outlined
                        size="small"
                        onClick={() => window.open('/display-antrean-pendaftaran', '_blank')}
                        title="Buka Layar Display TV Antrean di Tab Baru"
                        className="font-bold text-xs"
                    />
                    <Button
                        label="Reset Semua"
                        icon="pi pi-refresh"
                        severity="warning"
                        outlined
                        size="small"
                        onClick={handleReset}
                        loading={state.loadGrid}
                    />
                </div>
            </div>

            {/* Counter */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {[
                    { color: '#22c55e', label: 'Tersedia',  count: tersedia   },
                    { color: '#3b82f6', label: 'Diambil',   count: diambil    },
                    { color: '#f59e0b', label: 'Dipanggil', count: dipanggil  },
                    { color: '#6b7280', label: 'Total Aktif', count: aktif.length },
                ].map((item) => (
                    <span
                        key={item.label}
                        className="flex align-items-center gap-2 px-3 py-2 border-round-lg text-sm font-semibold"
                        style={{
                            background: `${item.color}18`,
                            border: `1.5px solid ${item.color}55`,
                            color: item.color,
                        }}
                    >
                        <span style={{
                            display: 'inline-block',
                            width: '14px', height: '14px',
                            borderRadius: '4px',
                            backgroundColor: item.color,
                            boxShadow: `0 1px 4px ${item.color}55`,
                            flexShrink: 0,
                        }} />
                        {item.label}: <strong>{item.count}</strong>
                    </span>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap align-items-center gap-3 mb-4 px-2 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                <span className="flex align-items-center gap-1">
                    <i className="pi pi-info-circle" />
                    <span className="font-semibold">KETERANGAN STATUS:</span>
                </span>
                {[
                    { color: '#22c55e', label: 'Tersedia = klik tandai diambil'  },
                    { color: '#3b82f6', label: 'Diambil = klik panggil ke loket' },
                    { color: '#f59e0b', label: 'Dipanggil = klik selesai'        },
                    { color: '#94a3b8', label: 'Selesai = tidak dapat diklik'    },
                    { color: '#ef4444', label: 'Nonaktif'                         },
                ].map((s) => (
                    <span key={s.label} className="flex align-items-center gap-1">
                        <span style={{
                            display: 'inline-block',
                            width: '12px', height: '12px',
                            borderRadius: '3px',
                            backgroundColor: s.color,
                            boxShadow: `0 1px 3px ${s.color}55`,
                            flexShrink: 0,
                        }} />
                        {s.label}
                    </span>
                ))}
            </div>

            {/* Banner Antrean Aktif di Loket */}
            {currentDipanggil && (
                <div className="p-3 mb-4 border-round-xl border-1 border-amber-300 bg-amber-50 flex align-items-center justify-content-between flex-wrap gap-3 shadow-1">
                    <div className="flex align-items-center gap-3">
                        <span className="text-3xl">📢</span>
                        <div>
                            <div className="font-bold text-base text-amber-900">
                                Sedang Melayani Nomor: <span className="text-xl text-amber-900 underline font-black">{currentDipanggil.no_antrian}</span> di Loket
                            </div>
                            <div className="text-xs text-amber-700 mt-0.5">
                                Selesaikan antrean nomor ini terlebih dahulu sebelum dapat memanggil antrean berikutnya.
                            </div>
                        </div>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <Button
                            label="Panggil Ulang"
                            icon="pi pi-volume-up"
                            severity="warning"
                            size="small"
                            onClick={() => {
                                playChime();
                                speakNomor(currentDipanggil.no_antrian);
                            }}
                            className="font-bold text-xs"
                        />
                        <Button
                            label="Tandai Selesai"
                            icon="pi pi-check"
                            severity="success"
                            size="small"
                            onClick={() => handleAksi(currentDipanggil)}
                            className="font-bold text-xs"
                        />
                    </div>
                </div>
            )}

            {/* Grid Tombol */}
            {state.loadGrid ? (
                <div className="flex justify-content-center align-items-center py-6">
                    <i className="pi pi-spinner pi-spin text-4xl text-blue-500" />
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: '12px',
                    }}
                >
                    {aktif.map((item) => {
                        const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.nonaktif;
                        const nextAksi = NEXT_AKSI[item.status]?.aksi;
                        const isDipanggil = item.status === 'dipanggil';
                        const isDiambil = item.status === 'diambil';

                        // Aturan Kunci: Jika sedang ada antrean lain dipanggil, antrean diambil lainnya tidak dapat dipanggil
                        const isCallingOther = !!currentDipanggil && currentDipanggil.kode_antrian !== item.kode_antrian;
                        const isDipanggilBlocked = isCallingOther && nextAksi === 'dipanggil';

                        const isNextInLine = !currentDipanggil && isDiambil && nextTakenToCall?.kode_antrian === item.kode_antrian;
                        const canClick = !!NEXT_AKSI[item.status] && !isDipanggilBlocked;

                        let badgeText = cfg.label;
                        if (isDipanggilBlocked) {
                            badgeText = '🔒 Tunggu';
                        } else if (isNextInLine) {
                            badgeText = '⭐ Panggil';
                        }

                        let tooltipText = `No. ${item.no_antrian} — ${item.status}`;
                        if (isDipanggilBlocked) {
                            tooltipText = `No. ${item.no_antrian} (Selesaikan No. ${currentDipanggil?.no_antrian} terlebih dahulu)`;
                        }

                        return (
                            <div
                                key={item.kode_antrian}
                                style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                            >
                                {/* Kartu nomor utama */}
                                <button
                                    onClick={() => handleAksi(item)}
                                    disabled={!canClick}
                                    title={tooltipText}
                                    style={{
                                        height: '84px',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        borderRadius: '12px',
                                        border: isNextInLine
                                            ? '2.5px solid #2563eb'
                                            : `2px solid ${isDipanggilBlocked ? '#cbd5e1' : cfg.border}`,
                                        background: isDipanggilBlocked ? '#f1f5f9' : cfg.bg,
                                        color: isDipanggilBlocked ? '#94a3b8' : isNextInLine ? '#1d4ed8' : cfg.color,
                                        cursor: isDipanggilBlocked ? 'not-allowed' : cfg.cursor,
                                        opacity: isDipanggilBlocked ? 0.75 : 1,
                                        transition: 'all 0.18s ease',
                                        boxShadow: isNextInLine
                                            ? '0 0 12px rgba(37,99,235,0.45)'
                                            : isDipanggilBlocked
                                            ? 'none'
                                            : cfg.shadow,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                        width: '100%',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (canClick && !isDipanggilBlocked) {
                                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.07)';
                                            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 18px ${cfg.border}66`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = isNextInLine
                                            ? '0 0 12px rgba(37,99,235,0.45)'
                                            : isDipanggilBlocked
                                            ? 'none'
                                            : cfg.shadow;
                                    }}
                                >
                                    <span style={{ lineHeight: 1 }}>{item.no_antrian}</span>
                                    {badgeText && (
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                fontWeight: isNextInLine ? '800' : '600',
                                                color: isNextInLine ? '#1d4ed8' : isDipanggilBlocked ? '#94a3b8' : 'inherit',
                                                opacity: isDipanggilBlocked ? 0.9 : 0.95,
                                            }}
                                        >
                                            {badgeText}
                                        </span>
                                    )}
                                </button>

                                {/* Tombol Panggil Ulang — hanya tampil saat dipanggil */}
                                {isDipanggil && (
                                    <button
                                        onClick={() => {
                                            playChime();
                                            speakNomor(item.no_antrian);
                                        }}
                                        title={`Panggil ulang nomor ${item.no_antrian}`}
                                        style={{
                                            padding: '4px 0',
                                            fontSize: '0.7rem',
                                            fontWeight: '600',
                                            borderRadius: '8px',
                                            border: '1.5px solid #f59e0b',
                                            background: '#fffbeb',
                                            color: '#b45309',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background = '#fef3c7';
                                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(245,158,11,0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.background = '#fffbeb';
                                            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                        }}
                                    >
                                        🔁 Panggil Ulang
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GridPanggil;
