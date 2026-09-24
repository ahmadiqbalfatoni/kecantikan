/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk mengekspor data ke format XLSX menggunakan ExcelJS
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

import { XLSXProps } from '@/types/print-tools';
import ExcelJS from 'exceljs';

export const exportToXLSX = async <T>({ data, fileName, removeFields = ['File' as keyof T] }: XLSXProps<T>): Promise<void> => {
    try {
        if (!data || data.length === 0) {
            console.log('Data kosong');
            return;
        }

        const cleanedData = data.map((row) => {
            const copy = { ...row };
            removeFields.forEach((f) => {
                delete copy[f];
            });
            return copy;
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        const headers = Object.keys(cleanedData[0] as Record<string, any>);
        const rows = cleanedData.map((row: any) => headers.map((header) => row[header] ?? ''));

        worksheet.addTable({
            name: 'DataKategori',
            ref: 'A1',
            headerRow: true,
            totalsRow: false,
            style: {
                theme: 'TableStyleLight9',
                showRowStripes: true
            },
            columns: headers.map((header) => ({
                name: header,
                filterButton: true
            })),
            rows: rows
        });

        headers.forEach((header, index) => {
            const column = worksheet.getColumn(index + 1);
            let maxLen = header.length;

            cleanedData.forEach((row: any) => {
                const cellValue = row[header];
                if (cellValue !== undefined && cellValue !== null) {
                    const cellLen = cellValue.toString().length;
                    if (cellLen > maxLen) {
                        maxLen = cellLen;
                    }
                }
            });

            column.width = maxLen + 4;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const downloadUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

        document.body.appendChild(anchor);
        anchor.click();

        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error ExcelJS: ', error);
    }
};
