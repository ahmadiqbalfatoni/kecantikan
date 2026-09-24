'use client';

import PreviewCustom from '@/app/components/printComponents/previewCustom';
import { TableProps } from '../interfaces';
import { AddPageInfo } from '@/lib/tools/printTools/accPdf';
import { CustomTableParams } from '@/types/print-tools';
import autoTable from 'jspdf-autotable';
import { useConfig } from '@/layout/context/configcontext';

const Print = ({ state, setState, formik, getData, toast, dataRekap, setDataRekap }: TableProps) => {
    const { config } = useConfig();
    const handleCustomTable = async ({ doc, marginTopInMm = 10, marginLeftInMm = 10, marginRightInMm = 10, marginBottomInMm = 10 }: CustomTableParams) => {
        const pageWidth = doc.internal.pageSize.width;
        let y = marginTopInMm;

        const userName = state.session?.user.username || '';
        if (!Array.isArray(dataRekap.data) || dataRekap.data.length === 0) return;

        const vaData1 = dataRekap.data;

        const tableHead1 = Object.keys(vaData1[0]);
        const tableData1 = vaData1.map((row) => tableHead1.map((key) => row[key]));

        autoTable(doc, {
            startY: 43 + y,
            head: [tableHead1],
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
                fontSize: 8.5,
                cellPadding: 4,
                valign: 'middle'
            },
            columnStyles: {
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

        // Jika ada ttd
        const finalY = doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || y;
        y = finalY;

        // const finalY = doc.previousAutoTable?.finalY || y;
        // y = finalY - 100;
        return y;
    };

    return (
        <>
            <PreviewCustom dataRekap={dataRekap} setDataRekap={setDataRekap} toast={toast} handleCustomTable={handleCustomTable} pdfOnly={false} companyConfig={config} />
        </>
    );
};

export default Print;
