'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { TabCetakAntreanProps, AmbilResult } from '../interfaces';
import postData from '@/lib/axios/postData';
import { apiEndpointAmbil, apiEndpointPanggil, apiEndpointReset } from '../endpoints';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { showError, showSuccess, showWarning } from '@/lib/tools/generalTools';
import { getTzUser } from '@/lib/tools/dateTools';

interface PrinterConfig {
    isConnected: boolean;
    printerName: string;
    paperSize: '58mm' | '80mm';
    clinicName: string;
    clinicAddress: string;
}

const DEFAULT_CONFIG: PrinterConfig = {
    isConnected: true,
    printerName: 'POS-58',
    paperSize: '58mm',
    clinicName: 'KLINIK KECANTIKAN',
    clinicAddress: 'Jl. Utama No. 88 | Telp: (021) 555-0199',
};

const getStoredConfig = (): PrinterConfig => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
        const raw = localStorage.getItem('antrean_printer_config');
        if (!raw) return DEFAULT_CONFIG;
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (_) {
        return DEFAULT_CONFIG;
    }
};

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
            console.warn('SpeechSynthesis tidak tersedia');
            return;
        }
        window.speechSynthesis.cancel();

        const teks = `Nomor antrian ${noAntrian}, silakan menuju ke loket`;
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

export const TabCetakAntrean: React.FC<TabCetakAntreanProps> = ({
    state,
    setState,
    toast,
    getGridData,
}) => {
    const [loadingAmbil, setLoadingAmbil] = useState<boolean>(false);
    const [loadingPanggil, setLoadingPanggil] = useState<boolean>(false);
    const [loadingSelesai, setLoadingSelesai] = useState<boolean>(false);
    const [lastTicket, setLastTicket] = useState<AmbilResult | null>(null);
    const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'failed'>('idle');
    const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(DEFAULT_CONFIG);
    const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
    const [qzConnected, setQzConnected] = useState<boolean>(false);
    const [checkingQz, setCheckingQz] = useState<boolean>(false);

    const ticketPrintRef = useRef<HTMLDivElement>(null);

    // Hitung status nomor dari gridData
    const tersedia = state.gridData.filter((d) => d.status === 'tersedia').length;
    const diambil = state.gridData.filter((d) => d.status === 'diambil').length;
    const dipanggil = state.gridData.filter((d) => d.status === 'dipanggil').length;
    const totalAktif = state.gridData.filter((d) => d.status !== 'nonaktif').length;

    // Antrean yang sedang dipanggil saat ini di loket
    const currentDipanggil = state.gridData.find((d) => d.status === 'dipanggil');

    // Antrean berikutnya yang diambil & menunggu (FIFO)
    const takenItems = state.gridData
        .filter((d) => d.status === 'diambil')
        .sort((a, b) => {
            const numA = parseInt(a.no_antrian.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.no_antrian.replace(/\D/g, '')) || 0;
            return numA !== numB ? numA - numB : a.no_antrian.localeCompare(b.no_antrian);
        });
    const nextTakenToCall = takenItems.length > 0 ? takenItems[0] : null;

    // Load konfigurasi tersimpan
    useEffect(() => {
        setPrinterConfig(getStoredConfig());
        initQzTray();
    }, []);

    // Helper: Load script qz-tray jika belum ada
    const loadQzScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined') return resolve(false);
            if ((window as any).qz) return resolve(true);
            const existing = document.getElementById('qz-tray-script');
            if (existing) {
                existing.addEventListener('load', () => resolve(true));
                return;
            }
            const script = document.createElement('script');
            script.id = 'qz-tray-script';
            script.src = '/qz-tray.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    };

    // Inisialisasi koneksi QZ Tray
    const initQzTray = async () => {
        setCheckingQz(true);
        try {
            await loadQzScript();
            const qz = (window as any).qz;
            if (!qz) {
                setQzConnected(false);
                return;
            }

            if (!qz.websocket.isActive()) {
                await qz.websocket.connect({ retries: 1, delay: 1 });
            }

            setQzConnected(true);
            const printers = await qz.printers.find();
            if (Array.isArray(printers)) {
                setAvailablePrinters(printers);
                if (printers.length > 0 && (!printerConfig.printerName || printerConfig.printerName === 'POS-58')) {
                    setPrinterConfig((prev) => ({ ...prev, printerName: printers[0] }));
                }
            }
        } catch (_) {
            setQzConnected(false);
        } finally {
            setCheckingQz(false);
        }
    };

    const saveConfig = (newConfig: PrinterConfig) => {
        setPrinterConfig(newConfig);
        if (typeof window !== 'undefined') {
            localStorage.setItem('antrean_printer_config', JSON.stringify(newConfig));
        }
        showSuccess(toast, 'Pengaturan printer berhasil disimpan');
        setShowConfigModal(false);
    };

    // Helper: Format HTML struk tiket thermal
    const generateTicketHtml = (ticket: AmbilResult): string => {
        const paperWidth = printerConfig.paperSize === '80mm' ? '320px' : '260px';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Tiket Antrean - ${ticket.no_antrian}</title>
                <style>
                    @page { size: auto; margin: 0; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, monospace;
                        font-size: 12px;
                        color: #000;
                        background: #fff;
                        padding: 12px 8px;
                    }
                    .ticket-box {
                        max-width: ${paperWidth};
                        margin: 0 auto;
                        text-align: center;
                    }
                    .clinic-title {
                        font-size: 15px;
                        font-weight: 800;
                        letter-spacing: 0.5px;
                        margin-bottom: 2px;
                    }
                    .clinic-sub {
                        font-size: 9px;
                        color: #555;
                        margin-bottom: 8px;
                    }
                    .dashed {
                        border-top: 1px dashed #000;
                        margin: 8px 0;
                    }
                    .badge-type {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin: 4px 0;
                    }
                    .queue-number {
                        font-size: 48px;
                        font-weight: 900;
                        line-height: 1.1;
                        margin: 8px 0;
                        letter-spacing: 2px;
                    }
                    .meta-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 10px;
                        margin-bottom: 3px;
                        text-align: left;
                    }
                    .meta-label { color: #555; }
                    .meta-val { font-weight: 700; text-align: right; }
                    .footer-note {
                        font-size: 9px;
                        color: #444;
                        margin-top: 8px;
                        line-height: 1.3;
                    }
                </style>
            </head>
            <body>
                <div class="ticket-box">
                    <div class="clinic-title">🌸 ${printerConfig.clinicName || 'KLINIK KECANTIKAN'}</div>
                    <div class="clinic-sub">${printerConfig.clinicAddress || 'Pendaftaran Pasien'}</div>
                    
                    <div class="dashed"></div>
                    <div class="badge-type">TIKET ANTREAN PENDAFTARAN</div>
                    
                    <div class="queue-number">${ticket.no_antrian}</div>
                    
                    <div class="dashed"></div>
                    <div class="meta-row">
                        <span class="meta-label">Waktu Ambil:</span>
                        <span class="meta-val">${ticket.diambil_at || '-'}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Antrean di Depan:</span>
                        <span class="meta-val">${ticket.antrean_menunggu} Orang</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Tujuan Loket:</span>
                        <span class="meta-val">Pendaftaran Pasien</span>
                    </div>
                    
                    <div class="dashed"></div>
                    <div class="footer-note">
                        Silakan duduk & menunggu nomor Anda dipanggil di loket.<br/>
                        Terima kasih atas kunjungannya!
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    // Fungsi Cetak via Browser Window (Fallback Utama)
    const printViaBrowser = (ticket: AmbilResult) => {
        const html = generateTicketHtml(ticket);
        const win = window.open('', '_blank', 'width=400,height=550');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => {
                win.print();
                win.close();
            }, 350);
        }
    };

    // Fungsi Pengiriman Cetak ke QZ Tray dengan Fallback Aman
    const printReceipt = async (ticket: AmbilResult): Promise<boolean> => {
        if (!printerConfig.isConnected) {
            console.log('Printer diatur tidak aktif di konfigurasi.');
            return false;
        }

        try {
            const qz = (window as any).qz;
            if (!qz) {
                await loadQzScript();
            }

            const qzInstance = (window as any).qz;
            if (!qzInstance) {
                throw new Error('QZ Tray library tidak ditemukan');
            }

            if (!qzInstance.websocket.isActive()) {
                await qzInstance.websocket.connect({ retries: 1, delay: 1 });
            }

            const targetPrinter = printerConfig.printerName || 'POS-58';
            const config = qzInstance.configs.create(targetPrinter, {
                size: { width: printerConfig.paperSize === '80mm' ? 80 : 58 },
                margins: 0,
            });

            const htmlContent = generateTicketHtml(ticket);
            const data = [
                {
                    type: 'pixel',
                    format: 'html',
                    flavor: 'plain',
                    data: htmlContent,
                },
            ];

            await qzInstance.print(config, data);
            return true;
        } catch (error: any) {
            console.warn('QZ Tray print error (fallback aktif):', error?.message || error);
            return false;
        }
    };

    // Handler Utama: Klik "Ambil Nomor Antrean"
    const handleAmbilAntrean = async () => {
        setLoadingAmbil(true);
        setPrintStatus('printing');

        try {
            let ticketData: AmbilResult | null = null;

            // Panggil endpoint dedicated /master/antrian-awal-ambil (mengambil nomor urutan berikutnya dari pool kartu master)
            try {
                const res = await postData(apiEndpointAmbil, { tz: getTzUser() });
                if (res.data?.data) {
                    ticketData = res.data.data;
                }
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || 'Gagal mengambil nomor antrean';
                throw new Error(msg);
            }

            if (!ticketData) {
                throw new Error('Gagal memproses nomor antrean berikutnya');
            }

            setLastTicket(ticketData);

            // 2. Refresh data grid agar nomor langsung terupdate ke status "Diambil"
            await getGridData();

            // 3. Kirim perintah cetak ke thermal printer
            const printSuccess = await printReceipt(ticketData);

            if (printSuccess) {
                setPrintStatus('success');
                showSuccess(
                    toast,
                    `Nomor ${ticketData.no_antrian} berhasil diambil & struk sedang dicetak!`
                );
            } else {
                setPrintStatus('failed');
                // NON-BLOCKING: Jangan gagalkan, beritahu bahwa nomor tampil di layar
                showWarning(
                    toast,
                    `Nomor antrean ${ticketData.no_antrian} berhasil diambil. (Printer offline: nomor ditampilkan di layar)`
                );
            }
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal mengambil nomor antrean');
            setPrintStatus('idle');
        } finally {
            setLoadingAmbil(false);
        }
    };

    // Handler Cetak Ulang Tiket yang sudah diambil
    const handleCetakUlang = async () => {
        if (!lastTicket) return;

        setPrintStatus('printing');
        const printSuccess = await printReceipt(lastTicket);

        if (printSuccess) {
            setPrintStatus('success');
            showSuccess(toast, `Struk nomor ${lastTicket.no_antrian} berhasil dikirim ke printer.`);
        } else {
            setPrintStatus('failed');
            // Jika QZ Tray gagal, tawarkan print via browser dialog
            printViaBrowser(lastTicket);
            showWarning(toast, 'Mencoba mencetak melalui dialog cetak browser...');
        }
    };

    // Handler Panggil Antrean Berikutnya ke Loket
    const handlePanggilBerikutnya = async () => {
        if (currentDipanggil) {
            showWarning(
                toast,
                `Nomor antrean ${currentDipanggil.no_antrian} sedang dipanggil di loket. Selesaikan nomor tersebut terlebih dahulu sebelum memanggil antrean berikutnya.`
            );
            return;
        }

        if (!nextTakenToCall) {
            showWarning(toast, 'Tidak ada antrean yang sedang menunggu untuk dipanggil.');
            return;
        }

        setLoadingPanggil(true);
        try {
            const res = await postData(apiEndpointPanggil, {
                kode_antrian: nextTakenToCall.kode_antrian,
                aksi: 'dipanggil',
                tz: getTzUser(),
            });
            showSuccess(
                toast,
                res.data?.message || `Nomor antrean ${nextTakenToCall.no_antrian} berhasil dipanggil ke loket.`
            );
            playChime();
            speakNomor(nextTakenToCall.no_antrian);
            await getGridData();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal memanggil antrean');
        } finally {
            setLoadingPanggil(false);
        }
    };

    // Handler Selesaikan Antrean yang Sedang Dipanggil
    const handleSelesaiDipanggil = async () => {
        if (!currentDipanggil) {
            showWarning(toast, 'Tidak ada antrean yang sedang dipanggil saat ini.');
            return;
        }

        setLoadingSelesai(true);
        try {
            const res = await postData(apiEndpointPanggil, {
                kode_antrian: currentDipanggil.kode_antrian,
                aksi: 'selesai',
                tz: getTzUser(),
            });
            showSuccess(
                toast,
                res.data?.message || `Nomor antrean ${currentDipanggil.no_antrian} telah selesai dilayani.`
            );
            await getGridData();
        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || 'Gagal menyelesaikan antrean');
        } finally {
            setLoadingSelesai(false);
        }
    };

    // Handler Panggil Ulang Suara
    const handlePanggilUlangSuara = () => {
        if (!currentDipanggil) return;
        playChime();
        speakNomor(currentDipanggil.no_antrian);
        showSuccess(toast, `Panggilan suara nomor ${currentDipanggil.no_antrian} diulang.`);
    };

    // Handler Reset Seluruh Pool Antrean ke Status Tersedia
    const handleReset = () => {
        confirmDialog({
            message: (
                <div className="flex flex-column align-items-center text-center gap-3 py-2">
                    <i className="pi pi-refresh text-orange-500 text-5xl" />
                    <div>
                        <h3 className="font-bold text-xl mb-1">Reset Seluruh Antrean (Pool 01-50)?</h3>
                        <p className="text-color-secondary text-sm">
                            Seluruh nomor kartu fisik (01-50) akan dikembalikan ke status 'Tersedia' dan data transaksi sebelumnya akan dibersihkan untuk pelayanan hari ini.
                        </p>
                    </div>
                </div>
            ) as any,
            header: 'Konfirmasi Reset Pool Antrean',
            acceptLabel: 'Ya, Reset Semua',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-warning',
            rejectClassName: 'p-button-secondary p-button-outlined',
            accept: async () => {
                try {
                    const res = await postData(apiEndpointReset, { tz: getTzUser() });
                    showSuccess(toast, res.data?.message || 'Antrean berhasil direset');
                    await getGridData();
                } catch (error: any) {
                    const e = error?.response?.data || error;
                    showError(toast, e?.message || 'Terjadi Kesalahan saat reset antrean');
                }
            },
        });
    };

    return (
        <div className="card border-round-xl surface-border shadow-1 p-4">
            <ConfirmDialog />

            {/* ── Top Bar: Header & Indikator Koneksi Printer ── */}
            <div className="flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom-1 surface-border">
                <div>
                    <h3 className="text-2xl font-bold flex align-items-center gap-2 mb-1 text-900">
                        <i className="pi pi-ticket text-teal-600 text-2xl" />
                        Antrean Digital (Cetak & Panggil Loket)
                    </h3>
                    <p className="text-color-secondary text-sm m-0">
                        Cetak struk tiket fisik untuk pasien baru, panggil antrean ke loket, dan kelola alur pelayanan terintegrasi dengan kartu fisik 01-50.
                    </p>
                </div>

                {/* Aksi Kanan: Tombol Display TV, Reset Semua & Pengaturan Printer */}
                <div className="flex align-items-center gap-2 flex-wrap">
                    <Button
                        label="Display TV"
                        icon="pi pi-desktop"
                        severity="info"
                        outlined
                        size="small"
                        onClick={() => window.open('/display-antrean-pendaftaran', '_blank')}
                        title="Buka Layar Display TV Antrean di Tab Baru"
                        className="font-semibold text-xs"
                    />

                    <Button
                        label="Reset Semua"
                        icon="pi pi-refresh"
                        severity="warning"
                        outlined
                        size="small"
                        onClick={handleReset}
                        title="Reset seluruh nomor kartu fisik 01-50 ke status tersedia untuk memulai hari baru"
                        className="font-semibold text-xs"
                    />

                    <Button
                        label={
                            printerConfig.isConnected && (qzConnected || availablePrinters.length > 0)
                                ? `Printer: ${printerConfig.printerName}`
                                : 'Printer Thermal'
                        }
                        icon="pi pi-print"
                        badge={
                            printerConfig.isConnected && (qzConnected || availablePrinters.length > 0)
                                ? 'Online'
                                : 'Offline'
                        }
                        badgeClassName={
                            printerConfig.isConnected && (qzConnected || availablePrinters.length > 0)
                                ? 'bg-emerald-500 text-white font-bold text-xs'
                                : 'bg-amber-500 text-white font-bold text-xs'
                        }
                        severity={
                            printerConfig.isConnected && (qzConnected || availablePrinters.length > 0)
                                ? 'success'
                                : 'secondary'
                        }
                        outlined
                        size="small"
                        onClick={() => setShowConfigModal(true)}
                        title="Klik untuk konfigurasi printer thermal QZ Tray"
                        className="font-semibold text-xs"
                    />
                </div>
            </div>

            {/* ── Status Counter Ribbon ── */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {[
                    { color: '#22c55e', label: 'Tersedia', count: tersedia, desc: 'Nomor siap diambil' },
                    { color: '#3b82f6', label: 'Diambil / Menunggu', count: diambil, desc: 'Menunggu loket' },
                    { color: '#f59e0b', label: 'Sedang Dipanggil', count: dipanggil, desc: 'Di loket pendaftaran' },
                    { color: '#6b7280', label: 'Total Kuota Aktif', count: totalAktif, desc: 'Nomor antrean' },
                ].map((item) => (
                    <span
                        key={item.label}
                        className="flex align-items-center gap-2 px-3 py-2 border-round-lg text-sm font-semibold"
                        style={{
                            background: `${item.color}14`,
                            border: `1.5px solid ${item.color}44`,
                            color: item.color,
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                backgroundColor: item.color,
                                boxShadow: `0 1px 4px ${item.color}55`,
                                flexShrink: 0,
                            }}
                        />
                        <span>
                            {item.label}: <strong>{item.count}</strong>
                        </span>
                    </span>
                ))}
            </div>

            {/* ── KIOSK & LOKET ACTION AREA (2 KOLOM RESPONSIVE) ── */}
            <div className="grid my-2 align-items-stretch">
                {/* ── KOLOM 1: KIOSK AMBIL NOMOR ANTREAN ── */}
                <div className="col-12 lg:col-6">
                    <div
                        className="surface-card p-4 lg:p-5 border-round-2xl border-1 surface-border shadow-2 text-center flex flex-column align-items-center justify-content-between h-full"
                        style={{
                            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                            minHeight: '340px',
                        }}
                    >
                        <div className="w-full">
                            <div className="mb-2">
                                <span
                                    className="inline-flex align-items-center justify-content-center border-round-2xl shadow-2"
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '20px',
                                        background: 'linear-gradient(135deg, #0ea5e9, #0d9488)',
                                        color: '#ffffff',
                                    }}
                                >
                                    <i className="pi pi-ticket text-3xl" />
                                </span>
                            </div>

                            <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 mb-1">
                                Ambil Nomor Antrean
                            </h2>
                            <p className="text-slate-500 text-xs mb-3">
                                Klik tombol di bawah untuk mengambil nomor antrean berikutnya dan mencetak struk fisik pasien.
                            </p>
                        </div>

                        {/* Display info antrean siap cetak */}
                        <div className="w-full my-2">
                            <div className="p-3 border-round-xl border-1 border-slate-200 bg-white shadow-1 flex flex-column align-items-center gap-1">
                                <Tag
                                    value={tersedia > 0 ? "KARTU FISIK TERSEDIA" : "KARTU ANTREAN HABIS"}
                                    severity={tersedia > 0 ? "success" : "danger"}
                                    className="font-bold text-xs mb-1"
                                />
                                <div className={`text-3xl lg:text-4xl font-black tracking-wider ${tersedia > 0 ? 'text-teal-700' : 'text-red-500'}`}>
                                    {tersedia > 0 ? `${tersedia} Tersedia` : '0 Tersedia'}
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                    {tersedia > 0
                                        ? 'Nomor urutan berikutnya siap diambil & dicetak'
                                        : 'Seluruh nomor kartu fisik (01-50) sedang terpakai'}
                                </span>
                            </div>
                        </div>

                        {/* TOMBOL UTAMA AMBIL ANTREAN */}
                        <div className="w-full mt-2">
                            <Button
                                label={
                                    loadingAmbil
                                        ? 'Memproses Nomor...'
                                        : tersedia > 0
                                        ? '🎟️ AMBIL NOMOR ANTREAN'
                                        : '⚠️ SEMUA KARTU SEDANG TERPAKAI'
                                }
                                icon={loadingAmbil ? 'pi pi-spin pi-spinner' : 'pi pi-print'}
                                disabled={loadingAmbil || tersedia === 0}
                                onClick={handleAmbilAntrean}
                                className="font-black text-base lg:text-lg py-3 px-4 border-round-xl border-none shadow-3 w-full transition-all"
                                style={{
                                    background: tersedia > 0
                                        ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)'
                                        : '#94a3b8',
                                    color: '#ffffff',
                                    cursor: tersedia > 0 ? 'pointer' : 'not-allowed',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loadingAmbil && tersedia > 0) {
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                            '0 8px 20px rgba(13, 148, 136, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── KOLOM 2: KONTROL PANGGILAN & SELESAI LOKET ── */}
                <div className="col-12 lg:col-6">
                    <div
                        className="surface-card p-4 lg:p-5 border-round-2xl border-1 shadow-2 text-center flex flex-column align-items-center justify-content-between h-full"
                        style={{
                            background: currentDipanggil
                                ? 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)'
                                : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                            borderColor: currentDipanggil ? '#fde68a' : '#e2e8f0',
                            minHeight: '340px',
                        }}
                    >
                        {/* Header Kontrol Loket */}
                        <div className="w-full">
                            <div className="mb-2">
                                <span
                                    className="inline-flex align-items-center justify-content-center border-round-2xl shadow-2"
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '20px',
                                        background: currentDipanggil
                                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                            : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                        color: '#ffffff',
                                    }}
                                >
                                    <i className={`pi ${currentDipanggil ? 'pi-volume-up' : 'pi-bell'} text-3xl`} />
                                </span>
                            </div>
                            <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 mb-1">
                                Kontrol Panggilan Loket
                            </h2>
                            <p className="text-slate-500 text-xs mb-3">
                                Panggil antrean pasien ke loket dan tandai selesai saat pelayanan rampung.
                            </p>
                        </div>

                        {/* Status Aktif Loket Saat Ini */}
                        <div className="w-full my-2">
                            {currentDipanggil ? (
                                <div className="p-3 border-round-xl border-1 border-amber-300 bg-white shadow-1 flex flex-column align-items-center gap-1">
                                    <Tag value="SEDANG DILAYANI DI LOKET" severity="warning" className="font-bold text-xs mb-1" />
                                    <div className="text-4xl lg:text-5xl font-black text-amber-600 tracking-wider">
                                        {currentDipanggil.no_antrian}
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">
                                        Pasien sedang berada di loket pendaftaran
                                    </span>
                                </div>
                            ) : (
                                <div className="p-3 border-round-xl border-1 border-slate-200 bg-white shadow-1 flex flex-column align-items-center gap-1">
                                    <Tag
                                        value={nextTakenToCall ? 'SIAP DIPANGGIL' : 'LOKET KOSONG'}
                                        severity={nextTakenToCall ? 'info' : 'secondary'}
                                        className="font-bold text-xs mb-1"
                                    />
                                    <div className="text-3xl lg:text-4xl font-black text-blue-600 tracking-wider">
                                        {nextTakenToCall ? nextTakenToCall.no_antrian : '-'}
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {nextTakenToCall
                                            ? `Antrean berikutnya yang menunggu (Total ${takenItems.length} pasien)`
                                            : 'Belum ada antrean yang menunggu'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Tombol Aksi Loket (Panggil / Panggil Ulang / Selesai) */}
                        <div className="w-full mt-2">
                            {currentDipanggil ? (
                                <div className="flex gap-2 justify-content-center flex-wrap">
                                    <Button
                                        label="🔊 Panggil Ulang"
                                        icon="pi pi-volume-up"
                                        severity="warning"
                                        onClick={handlePanggilUlangSuara}
                                        className="font-bold py-3 px-3 border-round-xl shadow-2 text-sm flex-1"
                                        style={{ minWidth: '130px' }}
                                    />
                                    <Button
                                        label={loadingSelesai ? 'Menyelesaikan...' : '✅ Selesai Dilayani'}
                                        icon={loadingSelesai ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                                        severity="success"
                                        disabled={loadingSelesai}
                                        onClick={handleSelesaiDipanggil}
                                        className="font-bold py-3 px-3 border-round-xl shadow-2 text-sm flex-1"
                                        style={{ minWidth: '140px' }}
                                    />
                                </div>
                            ) : (
                                <Button
                                    label={
                                        loadingPanggil
                                            ? 'Memanggil...'
                                            : nextTakenToCall
                                            ? `📢 PANGGIL NO. ${nextTakenToCall.no_antrian}`
                                            : '📢 PANGGIL ANTREAN'
                                    }
                                    icon={loadingPanggil ? 'pi pi-spin pi-spinner' : 'pi pi-megaphone'}
                                    disabled={loadingPanggil || !nextTakenToCall}
                                    onClick={handlePanggilBerikutnya}
                                    className="font-bold text-base py-3 px-4 border-round-xl border-none shadow-3 w-full transition-all"
                                    style={{
                                        background: !nextTakenToCall
                                            ? '#94a3b8'
                                            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        color: '#ffffff',
                                        cursor: !nextTakenToCall ? 'not-allowed' : 'pointer',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loadingPanggil && nextTakenToCall) {
                                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
                                            (e.currentTarget as HTMLButtonElement).style.boxShadow =
                                                '0 8px 20px rgba(37, 99, 235, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── TAMPILAN HASIL AMBIL ANTREAN (DISPLAY & FALLBACK) ── */}
            {lastTicket && (
                <div className="grid justify-content-center mt-3 animate-fade-in">
                    <div className="col-12 lg:col-8">
                        <div
                            ref={ticketPrintRef}
                            className="p-4 border-round-2xl border-2 shadow-3 text-center"
                            style={{
                                background: '#ffffff',
                                borderColor: printStatus === 'failed' ? '#f59e0b' : '#0ea5e9',
                            }}
                        >
                            {/* Banner Status Notifikasi Cetak */}
                            <div className="flex justify-content-between align-items-center mb-3 pb-2 border-bottom-1 surface-border flex-wrap gap-2">
                                <div className="flex align-items-center gap-2">
                                    <Tag
                                        value={
                                            printStatus === 'success'
                                                ? '✓ STRUK TERCETAK'
                                                : printStatus === 'failed'
                                                ? '⚠️ MODE LAYAR (PRINTER OFFLINE)'
                                                : 'SEDANG MENCETAK...'
                                        }
                                        severity={
                                            printStatus === 'success'
                                                ? 'success'
                                                : printStatus === 'failed'
                                                ? 'warning'
                                                : 'info'
                                        }
                                        className="text-xs font-bold px-3 py-1"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">
                                        {printStatus === 'failed'
                                            ? 'Nomor tetap tersimpan aman di sistem klinik'
                                            : 'Tiket siap diberikan kepada pasien'}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        label="Cetak Ulang"
                                        icon="pi pi-refresh"
                                        size="small"
                                        severity="warning"
                                        outlined
                                        onClick={handleCetakUlang}
                                        className="text-xs font-bold py-1.5 px-3 border-round-lg"
                                    />
                                    <Button
                                        type="button"
                                        label="Print Browser"
                                        icon="pi pi-external-link"
                                        size="small"
                                        severity="secondary"
                                        outlined
                                        onClick={() => printViaBrowser(lastTicket)}
                                        className="text-xs font-bold py-1.5 px-3 border-round-lg"
                                    />
                                </div>
                            </div>

                            {/* Header Tiket */}
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                NOMOR ANTREAN PENDAFTARAN
                            </div>

                            {/* NOMOR JUMBO */}
                            <div
                                className="font-black my-2"
                                style={{
                                    fontSize: '5rem',
                                    lineHeight: 1,
                                    letterSpacing: '3px',
                                    color: '#0284c7',
                                    textShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
                                }}
                            >
                                {lastTicket.no_antrian}
                            </div>

                            {/* Info Box */}
                            <div className="surface-50 p-3 border-round-xl border-1 surface-border max-w-26rem mx-auto text-left text-xs my-3">
                                <div className="flex justify-content-between mb-1.5">
                                    <span className="text-slate-500 font-medium">Waktu Pengambilan:</span>
                                    <span className="font-bold text-slate-800">{lastTicket.diambil_at}</span>
                                </div>
                                <div className="flex justify-content-between mb-1.5">
                                    <span className="text-slate-500 font-medium">Antrean di Depan Anda:</span>
                                    <span className="font-bold text-teal-700">
                                        {lastTicket.antrean_menunggu} Orang
                                    </span>
                                </div>
                                <div className="flex justify-content-between">
                                    <span className="text-slate-500 font-medium">Tujuan Loket:</span>
                                    <span className="font-bold text-slate-800">Loket Pendaftaran Pasien</span>
                                </div>
                            </div>

                            <p className="text-slate-500 text-xs m-0">
                                Harap menunggu di ruang tunggu hingga nomor antrean Anda dipanggil oleh petugas resepsionis.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL PENGATURAN PRINTER ── */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-print text-teal-600 text-xl" />
                        <span className="font-bold text-slate-900">Pengaturan Printer Thermal & QZ Tray</span>
                    </div>
                }
                visible={showConfigModal}
                style={{ width: '520px' }}
                modal
                onHide={() => setShowConfigModal(false)}
                className="p-fluid"
            >
                <div className="flex flex-column gap-3 pt-2">
                    {/* Status Koneksi QZ Tray */}
                    <div
                        className={`p-3 border-round-xl border-1 flex align-items-center justify-content-between ${
                            qzConnected ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
                        }`}
                    >
                        <div className="flex align-items-center gap-3">
                            <i
                                className={`pi ${qzConnected ? 'pi-check-circle text-emerald-600' : 'pi-exclamation-circle text-amber-600'} text-3xl`}
                            />
                            <div>
                                <div className="font-bold text-sm text-slate-900">
                                    {qzConnected ? 'QZ Tray Terhubung' : 'QZ Tray Tidak Terhubung'}
                                </div>
                                <div className="text-xs text-slate-600">
                                    {qzConnected
                                        ? 'Layanan QZ Tray aktif dan siap mengirim cetakan thermal.'
                                        : 'Pastikan aplikasi QZ Tray berjalan di komputer untuk direct thermal print.'}
                                </div>
                            </div>
                        </div>
                        <Button
                            label="Cek Ulang"
                            icon="pi pi-refresh"
                            size="small"
                            outlined
                            loading={checkingQz}
                            onClick={initQzTray}
                            className="text-xs font-bold"
                        />
                    </div>

                    {/* Switch Aktifkan Printer */}
                    <div className="surface-50 p-3 border-round-xl border-1 surface-border flex align-items-center justify-content-between">
                        <div>
                            <div className="font-bold text-xs text-slate-900 uppercase">Aktifkan Thermal Print</div>
                            <div className="text-xs text-slate-500">Cetak otomatis struk saat tombol antrean ditekan</div>
                        </div>
                        <InputSwitch
                            checked={printerConfig.isConnected}
                            onChange={(e) =>
                                setPrinterConfig({ ...printerConfig, isConnected: Boolean(e.value) })
                            }
                        />
                    </div>

                    {/* Pilihan Printer */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Pilih Perangkat Printer Thermal
                        </label>
                        {availablePrinters.length > 0 ? (
                            <Dropdown
                                value={printerConfig.printerName}
                                options={availablePrinters.map((p) => ({ label: `🖨️ ${p}`, value: p }))}
                                onChange={(e) => setPrinterConfig({ ...printerConfig, printerName: e.value })}
                                placeholder="Pilih printer..."
                                className="p-inputtext-sm border-round-lg text-xs"
                            />
                        ) : (
                            <InputText
                                value={printerConfig.printerName}
                                onChange={(e) =>
                                    setPrinterConfig({ ...printerConfig, printerName: e.target.value })
                                }
                                placeholder="contoh: POS-58 atau Epson TM-T82"
                                className="p-inputtext-sm border-round-lg text-xs"
                            />
                        )}
                        <span className="text-[11px] text-slate-400 mt-1 block">
                            Nama driver printer sesuai yang terpasang di Windows.
                        </span>
                    </div>

                    {/* Ukuran Kertas */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Ukuran Kertas Thermal
                        </label>
                        <Dropdown
                            value={printerConfig.paperSize}
                            options={[
                                { label: '58 mm (Struk Kecil / Mini POS)', value: '58mm' },
                                { label: '80 mm (Struk Standar POS Kasir)', value: '80mm' },
                            ]}
                            onChange={(e) => setPrinterConfig({ ...printerConfig, paperSize: e.value })}
                            className="p-inputtext-sm border-round-lg text-xs"
                        />
                    </div>

                    {/* Nama Klinik di Struk */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Nama Klinik di Header Struk
                        </label>
                        <InputText
                            value={printerConfig.clinicName}
                            onChange={(e) =>
                                setPrinterConfig({ ...printerConfig, clinicName: e.target.value })
                            }
                            placeholder="KLINIK KECANTIKAN"
                            className="p-inputtext-sm border-round-lg text-xs"
                        />
                    </div>

                    {/* Alamat di Struk */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Alamat / Sub-Header Struk
                        </label>
                        <InputText
                            value={printerConfig.clinicAddress}
                            onChange={(e) =>
                                setPrinterConfig({ ...printerConfig, clinicAddress: e.target.value })
                            }
                            placeholder="Jl. Utama No. 88 | Telp: (021) 555-0199"
                            className="p-inputtext-sm border-round-lg text-xs"
                        />
                    </div>
                </div>

                {/* Footer Modal */}
                <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
                    <Button
                        type="button"
                        label="Batal"
                        icon="pi pi-times"
                        text
                        onClick={() => setShowConfigModal(false)}
                        className="text-xs font-bold"
                    />
                    <Button
                        type="button"
                        label="Simpan Pengaturan"
                        icon="pi pi-check"
                        onClick={() => saveConfig(printerConfig)}
                        className="bg-teal-600 hover:bg-teal-700 text-white border-none font-bold text-xs border-round-lg px-3"
                    />
                </div>
            </Dialog>
        </div>
    );
};

export default TabCetakAntrean;
