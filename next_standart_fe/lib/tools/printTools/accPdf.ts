/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk menampilkan header, footer, dan informasi halaman pada dokumen PDF menggunakan jsPDF dan autoTable.
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */

import { AddPageInfoProps, FooterProps, HeaderLaporanProps } from '@/types/print-tools';
import { formatDateSystem } from '../dateTools';
import autoTable from 'jspdf-autotable';
import { CompanyConfig } from '@/types/general';

export const HeaderLaporan = async ({ doc, marginTopInMm = 10, marginLeftInMm = 10, marginRightInMm = 10, judulLaporan, periodeLaporan, companyConfig }: HeaderLaporanProps & { companyConfig: CompanyConfig | null }): Promise<void> => {
    const pageWidth = doc.internal.pageSize.width;
    const img = companyConfig?.msLogoPerusahaan || '';
    const namaPerusahaan = companyConfig?.msNamaPerusahaan || 'Nama Perusahaan';
    const alamat = companyConfig?.msAlamatPerusahaan || 'Alamat Perusahaan';
    const telepon = companyConfig?.msTeleponPerusahaan || '-';

    const baseY = marginTopInMm + 5;
    const layout = {
        imageWidth: 18,
        imageX: marginLeftInMm + 5,
        textStartX: marginLeftInMm + 28,
        baseY,
        lineY: baseY + 19,
        titleBaseY: baseY + 31
    };

    if (img?.trim()) {
        try {
            doc.addImage(img, 'PNG', layout.imageX, baseY - 3, layout.imageWidth, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            // doc.text(img ?? '', layout.imageX, layout.baseY - 4);
        } catch (error: any) {
            console.warn('Logo gagal ditambahkan : ', error?.message);
        }
    }

    // Yang Handle Teks
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(namaPerusahaan ?? '', layout.textStartX, layout.baseY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(alamat ?? '', layout.textStartX, layout.baseY + 5);
    doc.text(`No. Telp : ${telepon ?? '-'}`, layout.textStartX, layout.baseY + 10);

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.line(marginLeftInMm, layout.lineY, pageWidth - marginRightInMm, layout.lineY);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(marginLeftInMm, layout.lineY + 1.2, pageWidth - marginRightInMm, layout.lineY + 1.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(judulLaporan, pageWidth / 2, layout.titleBaseY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(periodeLaporan, pageWidth / 2, layout.titleBaseY + 6, { align: 'center' });

    doc.setTextColor(0, 0, 0);
};

export const AddPageInfo = ({ doc, userName, marginRightInMm = 10 }: AddPageInfoProps): void => {
    const options: Intl.DateTimeFormatOptions = {
        hour12: false,
        timeZone: 'Asia/Jakarta'
    };

    const currentDate = new Date().toLocaleString('id-ID', options);
    const pageInfo = `Page ${doc.internal.getCurrentPageInfo().pageNumber}`;
    const userInfo = `${userName} | ${currentDate}`;

    const { width: pageWidth, height: pageHeight } = doc.internal.pageSize;

    const pageTextX = pageWidth - marginRightInMm;
    const pageTextY = pageHeight - 10;

    doc.setFontSize(8);
    doc.text(pageInfo, pageTextX, pageTextY, { align: 'right' });
    doc.text(userInfo, pageTextX, pageTextY + 5, { align: 'right' });
};

export const Footer = async ({ doc, marginLeft, marginTop, marginRight, paraf1, paraf2, namaPetugas1, namaPetugas2, jabatan1, jabatan2, lastY, companyConfig }: FooterProps & { companyConfig: CompanyConfig | null }) => {
    const kotaPerusahaan = companyConfig?.msKotaPerusahaan || '-';
    const namaPerusahaan = companyConfig?.msNamaPerusahaan || 'Smart-Fix';
    const today = new Date();

    const vaData = [
        [jabatan1 ? 'Mengetahui,' : 'Disetujui Oleh,', '', `${kotaPerusahaan}, ${formatDateSystem(today)}`],
        [jabatan1 || 'Petugas Verifikasi', '', namaPerusahaan],
        ['', '', ''],
        ['', '', ''],
        ['', '', ''],
        [namaPetugas1 ? `( ${namaPetugas1} )` : '( .......................................... )', '', namaPetugas2 ? `( ${namaPetugas2} )` : '( .......................................... )'],
        [namaPetugas1 ? '' : '', '', jabatan2 || '']
    ];

    const finalY = lastY ?? doc?.autoTable.previous?.finalY ?? 20;

    autoTable(doc, {
        body: vaData,
        startY: finalY + 15,
        theme: 'plain',
        margin: {
            top: marginTop,
            left: marginLeft,
            right: marginRight
        },
        styles: {
            fontSize: 9.5,
            valign: 'middle',
            textColor: [71, 85, 105],
            cellPadding: 1,
            font: 'helvetica'
        },

        columnStyles: {
            0: { cellWidth: 65, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 65, halign: 'center' }
        },
        didParseCell: (data) => {
            if (data.row.index === 5) {
                // data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [15, 23, 42];
                data.cell.styles.fontSize = 10;
            }

            if (data.row.index <= 1) {
                // data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [30, 41, 59]; // Slate-800
            }
        }
    });
};
