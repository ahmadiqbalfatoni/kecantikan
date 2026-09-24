'use client';

import PreviewCustom from '@/app/components/printComponents/previewCustom';
import { TableProps, HEADER_CONFIG } from '../interfaces';
import { AddPageInfo } from '@/lib/tools/printTools/accPdf';
import { CustomTableParams } from '@/types/print-tools';
import autoTable from 'jspdf-autotable';
import { useConfig } from '@/layout/context/configcontext';

// Peta pencarian terbalik (Reverse Map) dari HEADER_CONFIG untuk melacak properti asli dari friendly header
const REVERSE_HEADER_CONFIG = Object.entries(HEADER_CONFIG).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);

const Print = ({ state, toast, dataRekap, setDataRekap }: TableProps) => {
    const { config } = useConfig();

    const handleCustomTable = async ({ doc, marginTopInMm = 10, marginLeftInMm = 10, marginRightInMm = 10, marginBottomInMm = 10 }: CustomTableParams) => {
        const userName = state.session?.user?.username || 'System';
        let y = marginTopInMm;

        if (!Array.isArray(dataRekap.data) || dataRekap.data.length === 0) return;

        const vaData1 = dataRekap.data;

        // 1. Dapatkan properti objek baris pertama yang dikirim dari getPrintData
        const tableHead1 = Object.keys(vaData1[0]);

        // 2. Terjemahkan properti mentah menjadi Friendly Header sesuai config interface
        const tableHeadFriendly = tableHead1.map(
            (key) => HEADER_CONFIG[key as keyof typeof HEADER_CONFIG] || String(key).toUpperCase()
        );

        // 3. Ekstraksi baris data mentah ke array multidimensi
        const tableData1 = vaData1.map((row) => tableHead1.map((key) => row[key]));

        // Fungsi normalisasi untuk menentukan tipe kolom demi performansi layouting (Defensive Normalization)
        const getRawKey = (key: string): string => {
            // Jika cocok langsung di reverse map
            if (REVERSE_HEADER_CONFIG[key]) {
                return REVERSE_HEADER_CONFIG[key];
            }

            const clean = String(key).trim().toLowerCase();

            // Skenario mapping langsung nama properti
            if ([
                'no', 'kode', 'created_at', 'nama_pelanggan', 'nama_teknisi',
                'model_perangkat', 'status', 'jenis_tiket', 'total_biaya_suku_cadang',
                'total_biaya_jasa', 'subtotal', 'diskon_nominal', 'pajak_nominal',
                'grandtotal', 'status_pembayaran', 'created_by_fullname'
            ].includes(clean)) {
                return clean;
            }

            // Normalisasi substring dari Friendly Header jika fallback diperlukan
            const normalized = clean.replace(/[^a-z0-9]/g, '');

            if (normalized === 'no') return 'no';
            if (normalized.includes('tiket') || normalized.includes('kode')) return 'kode';
            if (normalized.includes('tanggal') || normalized.includes('waktu') || normalized.includes('createdat')) return 'created_at';
            if (normalized.includes('pelanggan')) return 'nama_pelanggan';
            if (normalized.includes('teknisi')) return 'nama_teknisi';
            if (normalized.includes('perangkat') || normalized.includes('model')) return 'model_perangkat';
            if (normalized.includes('statusservis') || normalized === 'status') return 'status';
            if (normalized.includes('jenistiket') || normalized.includes('jenis')) return 'jenis_tiket';

            // Keuangan & Biaya
            if (normalized.includes('sukucadang') || normalized.includes('sparepart')) return 'total_biaya_suku_cadang';
            if (normalized.includes('jasa')) return 'total_biaya_jasa';
            if (normalized.includes('subtotal')) return 'subtotal';
            if (normalized.includes('diskon') || normalized.includes('disc')) return 'diskon_nominal';
            if (normalized.includes('pajak') || normalized.includes('ppn')) return 'pajak_nominal';
            if (normalized.includes('grandtotal') || normalized.includes('total')) return 'grandtotal';

            if (normalized.includes('pembayaran') || normalized.includes('bayar')) return 'status_pembayaran';
            if (normalized.includes('kasir') || normalized.includes('penerima')) return 'created_by_fullname';

            return clean;
        };

        // Menyusun alignment dinamis per kolom berdasarkan tipe datanya
        const customColumnStyles: { [key: string]: { halign: 'center' | 'left' | 'right' } } = {};
        tableHead1.forEach((key, index) => {
            const rawKey = getRawKey(key);

            // Kolom Status, Identitas Utama, & Tanggal diposisikan Tengah (Center)
            if (
                rawKey === 'no' ||
                rawKey === 'kode' ||
                rawKey === 'created_at' ||
                rawKey === 'status' ||
                rawKey === 'jenis_tiket' ||
                rawKey === 'status_pembayaran'
            ) {
                customColumnStyles[index] = { halign: 'center' };
            }
            // Kolom Keuangan/Nominal Angka diposisikan Kanan (Right Align) untuk kemudahan kalkulasi visual
            else if (
                rawKey === 'total_biaya_suku_cadang' ||
                rawKey === 'total_biaya_jasa' ||
                rawKey === 'subtotal' ||
                rawKey === 'diskon_nominal' ||
                rawKey === 'pajak_nominal' ||
                rawKey === 'grandtotal'
            ) {
                customColumnStyles[index] = { halign: 'right' };
            }
            // Sisanya (Nama Pelanggan, Teknisi, Perangkat, dll) diposisikan Kiri (Left Align)
            else {
                customColumnStyles[index] = { halign: 'left' };
            }
        });

        // Generate autoTable PDF
        autoTable(doc, {
            startY: 45 + y,
            head: [tableHeadFriendly],
            body: tableData1,
            theme: 'grid',
            margin: {
                top: marginTopInMm,
                left: marginLeftInMm,
                right: marginRightInMm,
                bottom: marginBottomInMm + 10
            },
            styles: {
                lineColor: [220, 220, 220],
                lineWidth: 0.3,
                fillColor: [255, 255, 255],
                textColor: [30, 41, 59],
                fontSize: 8, // Ukuran teks ideal dokumen operasional servis
                cellPadding: 4.5,
                valign: 'middle'
            },
            columnStyles: {
                ...customColumnStyles,
                ...dataRekap?.columnStyles
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                halign: 'center',
                lineColor: [220, 220, 220],
                lineWidth: 0.3
            },
            alternateRowStyles: {
                fillColor: [255, 255, 255]
            },
            didDrawPage: () => {
                AddPageInfo({ doc, userName, marginRightInMm });
            }
        });

        const finalY = doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || y;
        y = finalY;

        return y;
    };

    return (
        <>
            <PreviewCustom
                dataRekap={dataRekap}
                setDataRekap={setDataRekap}
                toast={toast}
                handleCustomTable={handleCustomTable}
                pdfOnly={false}
                companyConfig={config}
            />
        </>
    );
};

export default Print;