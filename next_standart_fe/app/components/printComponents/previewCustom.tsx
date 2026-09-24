import { Dialog } from 'primereact/dialog';
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { Footer, HeaderLaporan } from '@/lib/tools/printTools/accPdf';
import { exportToXLSX } from '@/lib/tools/printTools/exportToXLSX';
import PrintPageSetting from './printPageSetting';
import { PaperSize, PreviewCustomProps, PrintPageSettingState } from '@/types/print-tools';
import dynamic from 'next/dynamic';
import PrintPageSettingWithoutExcel from './printPageSettingWithoutExcel';
import { CompanyConfig } from '@/types/general';
// import PDFViewer from '@/app/components/printComponents/pdfViewer'
const PDFViewer = dynamic(() => import('@/app/components/printComponents/pdfViewer'), { ssr: false });

export default function PreviewCustom({ dataRekap, setDataRekap, toast, handleCustomTable, disableHeader, disableFooter, pdfOnly, companyConfig }: PreviewCustomProps & { companyConfig: CompanyConfig | null }) {
    const [state, setState] = useState({
        adjustDialog: false,
        jsPdfPreviewOpen: false,
        loadingPreview: false,
        pdfUrl: '',
        paperSize: 'A4' as PaperSize
    });

    const openAdjustDialog = () => {
        if (!dataRekap?.data || Object.keys(dataRekap?.data).length === 0) {
            toast.current.show({
                severity: 'error',
                summary: 'Error Message',
                detail: 'Data Masih Kosong',
                life: 3000
            });

            setDataRekap((p) => ({ ...p, show: false, adjust: false }));
            return;
        }

        setState((p) => ({ ...p, adjustDialog: true }));
    };

    useEffect(() => {
        if (dataRekap?.show && dataRekap?.adjust) {
            openAdjustDialog();
        }
    }, [dataRekap?.show, dataRekap?.adjust]);

    useEffect(() => {
        setDataRekap((p) => ({
            ...p,
            show: state.adjustDialog,
            adjust: state.adjustDialog
        }));
    }, [state.adjustDialog]);

    useEffect(() => {
        setDataRekap((p) => ({ ...p, load: state.loadingPreview }));
    }, [state.loadingPreview]);

    const exportPDF = async (adjust: PrintPageSettingState) => {
        setState((p) => ({ ...p, loadingPreview: true, paperSize: adjust.paperSize }));

        try {
            const rekapPDF = Array.isArray(dataRekap?.data) ? structuredClone(dataRekap.data) : [];

            const marginLeftInMm = +adjust.marginLeft;
            const marginTopInMm = +adjust.marginTop;
            const marginRightInMm = +adjust.marginRight;

            const doc = new jsPDF({
                orientation: adjust?.orientation,
                unit: 'mm',
                format: adjust?.paperSize,
                putOnlyUsedFonts: true
            });

            if (!rekapPDF.length) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                doc.text('Data Kosong', doc.internal.pageSize.width / 2, 60 + marginTopInMm - 10, { align: 'center' });
            }

            // HEADER
            if (!disableHeader) {
                await HeaderLaporan({
                    doc,
                    marginTopInMm,
                    judulLaporan: dataRekap?.judul1,
                    periodeLaporan: dataRekap?.judul2,
                    companyConfig: companyConfig
                });
            }

            // TABLE
            const lastY = await handleCustomTable({
                doc,
                marginTopInMm,
                marginLeftInMm,
                marginRightInMm
            });

            // FOOTER
            if (!disableFooter) {
                await Footer({
                    doc,
                    marginLeft: marginLeftInMm,
                    marginTop: marginTopInMm,
                    marginRight: marginRightInMm,
                    paraf1: adjust?.signature1 || '',
                    paraf2: adjust?.signature2 || '',
                    namaPetugas1: adjust?.officerName1 || '',
                    namaPetugas2: adjust?.officerName2 || '',
                    jabatan1: adjust?.position1 || '',
                    jabatan2: adjust?.position2 || '',
                    lastY,
                    companyConfig: companyConfig
                });
            }

            // PREVIEW PDF
            const pdfDataUrl = doc.output('datauristring');
            setState((p) => ({
                ...p,
                pdfUrl: pdfDataUrl,
                jsPdfPreviewOpen: true,
                paperSize: adjust.paperSize
            }));
        } catch (error: any) {
            console.log(error);
            toast.current.show({
                severity: 'error',
                summary: 'Error Message',
                detail: error.message || 'Terjadi Kesalahan',
                life: 3000
            });
        } finally {
            setState((p) => ({ ...p, loadingPreview: false }));
        }
    };

    // -------------------------------------------------------------
    // HANDLE EXPORT EXCEL
    // -------------------------------------------------------------
    const exportExcel = () => {
        if (!Array.isArray(dataRekap?.data)) {
            console.error('Data bukan array, export dibatalkan');
            return;
        }
        exportToXLSX({
            data: dataRekap.data,
            fileName: `${dataRekap.fileName}.xlsx`
        });
    };

    // -------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------
    return (
        <>
            {pdfOnly ? (
                <PrintPageSettingWithoutExcel adjustDialog={state.adjustDialog} setAdjustDialog={(v) => setState((p) => ({ ...p, adjustDialog: v }))} handleAdjust={exportPDF} />
            ) : (
                <PrintPageSetting adjustDialog={state.adjustDialog} setAdjustDialog={(v) => setState((p) => ({ ...p, adjustDialog: v }))} handleAdjust={exportPDF} handleExcel={exportExcel} />
            )}

            <Dialog visible={state.jsPdfPreviewOpen} onHide={() => setState((p) => ({ ...p, jsPdfPreviewOpen: false }))} modal style={{ width: '90%', height: '100%' }} header="PDF Preview">
                <div className="p-dialog-content">
                    <PDFViewer pdfUrl={state.pdfUrl} paperSize={state.paperSize} fileName={dataRekap?.fileName} />
                </div>
            </Dialog>
        </>
    );
}
