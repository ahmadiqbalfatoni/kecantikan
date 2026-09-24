/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File print untuk page users
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


'use client'

import PreviewCustom from "@/app/components/printComponents/previewCustom"
import { TableProps } from "../interfaces"
import { AddPageInfo } from "@/lib/tools/printTools/accPdf";
import { CustomTableParams } from "@/types/print-tools";
import autoTable from "jspdf-autotable";
import { useConfig } from "@/layout/context/configcontext";


const Print = ({
    state,
    setState,
    formik,
    getData,
    toast,
    dataRekap,
    setDataRekap
}: TableProps) => {
    const { config } = useConfig();

    const handleCustomTable = async ({ doc, marginTopInMm = 10, marginLeftInMm = 10, marginRightInMm = 10, marginBottomInMm = 10 }: CustomTableParams) => {
        // Left margin
        const pageWidth = doc.internal.pageSize.width;
        let y = marginTopInMm;
        const left = marginLeftInMm;
        const lineHeight = 6;

        const userName = state.session?.user.username || ''
        if (!Array.isArray(dataRekap.data) || dataRekap.data.length === 0) return;

        const vaData1 = dataRekap.data;

        const tableHead1 = Object.keys(vaData1[0]);
        const tableData1 = vaData1.map(row =>
            tableHead1.map(key => row[key])
        );

        autoTable(doc, {
            startY: 45 + y,
            head: [tableHead1],
            body: tableData1,
            theme: "plain",
            margin: {
                top: marginTopInMm,
                left: marginLeftInMm,
                right: marginRightInMm,
                bottom: marginBottomInMm + 10,
            },
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontSize: 8,
            },
            columnStyles: {
                ...dataRekap?.columnStyles,
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center",
            },
            didDrawPage: () => {
                AddPageInfo({ doc, userName, marginRightInMm });
            },
        });

        const finalY = doc.previousAutoTable?.finalY || y;
        y = finalY - 100;
        return y
    };

    return <>
        <PreviewCustom dataRekap={dataRekap} setDataRekap={setDataRekap} toast={toast} handleCustomTable={handleCustomTable} pdfOnly={true} companyConfig={config} />
    </>
}

export default Print