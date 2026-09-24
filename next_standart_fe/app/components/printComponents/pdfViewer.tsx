'use client'

import { PaperSize, PDFViewerProps, PDFViewerState } from "@/types/print-tools";
import { Button } from "primereact/button";
import { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

export default function PDFViewer({
    pdfUrl, paperSize, fileName
}: PDFViewerProps) {

    const [state, setState] = useState<PDFViewerState>({
        numPages: 0,
        currentPage: 1,
        pageWidth: 0,
        pageHeight: 0,
        scale: 1,
    });

    const handleFirstPage = () => setState((p) => ({ ...p, currentPage: 1 }))

    const handlePrevPage = () =>
        setState(p => ({
            ...p,
            currentPage: p.currentPage > 1 ? p.currentPage - 1 : p.currentPage
        }));

    const handleNextPage = () =>
        setState((p) => ({
            ...p,
            currentPage:
                p.currentPage < p.numPages ? p.currentPage + 1 : p.currentPage,
        }));

    const handleLastPage = () =>
        setState((p) => ({
            ...p,
            currentPage: p.numPages,
        }));

    const handleZoomIn = () =>
        setState((p) => ({
            ...p,
            scale: Math.min(2, +(p.scale + 0.1).toFixed(2))
        }))

    const handleZoomOut = () =>
        setState((p) => ({
            ...p,
            scale: Math.max(0.5, +(p.scale - 0.1).toFixed(2)),
        }));

    const handleDownloadPDF = () => {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `${fileName}.pdf`;
        link.click();
    };

    const handlePrint = () => {
        pdfUrl && window.open(pdfUrl, "_blank");
    };

    useEffect(() => {
        if (!pdfUrl) return;

        const loadPdf = async () => {
            try {
                const pdf = await pdfjs.getDocument({ url: pdfUrl }).promise;

                const numPages = pdf.numPages;
                const mmToPx = 3.7795275591;

                const sizes: Record<PaperSize, { w: number; h: number }> = {
                    A4: { w: 210, h: 297 },
                    Letter: { w: 216, h: 279 },
                    Legal: { w: 216, h: 356 },
                };

                const { w, h } = sizes[paperSize];

                setState((p) => ({
                    ...p,
                    numPages,
                    pageWidth: w * mmToPx,
                    pageHeight: h * mmToPx,
                }));
            } catch (err) {
                console.error("Error loading PDF:", err);
            }
        };

        loadPdf();
    }, [pdfUrl, paperSize]);

    return (
        <>
            <div
                style={{
                    // display: 'flex',
                    backgroundColor: '#f0f0f0',
                    padding: '10px',
                    borderRadius: '5px',
                    boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.3)',
                    position: 'sticky',
                    top: '0',
                    zIndex: '1000',
                    width: '100%',
                }}
            >
                <Button style={{ margin: '3px' }} icon="pi pi-angle-double-left" onClick={handleFirstPage} disabled={state.currentPage === 1} />
                <Button style={{ margin: '3px' }} icon="pi pi-angle-left" onClick={handlePrevPage} disabled={state.currentPage === 1} />
                <Button style={{ margin: '3px' }} icon="pi pi-search-plus" onClick={handleZoomIn} disabled={state.scale >= 2} />
                <Button style={{ margin: '3px' }} icon="pi pi-search-minus" onClick={handleZoomOut} disabled={state.scale <= 0.5} />
                <Button style={{ margin: '3px' }} icon="pi pi-angle-right" onClick={handleNextPage} disabled={state.currentPage === state.numPages} />
                <Button style={{ margin: '3px' }} icon="pi pi-angle-double-right" onClick={handleLastPage} disabled={state.currentPage === state.numPages} />
                <Button style={{ margin: '3px' }} icon="pi pi-download" onClick={handleDownloadPDF} />
                <Button style={{ margin: '3px' }} icon="pi pi-print" onClick={handlePrint} />
            </div>

            <div style={{ overflow: 'auto', height: '59vh', display: 'flex', paddingTop: '10%', justifyContent: 'center', alignItems: 'center' }}>
                <div className="pdf-canvas" style={{ background: 'lightgray', marginTop: '640px', padding: '10px' }}>
                    <div className="pdf-frame" style={{ border: 'none', padding: '0px', maxWidth: '100%', maxHeight: '100%' }}></div>
                    <Document file={pdfUrl}>
                        <Page
                            pageNumber={state.currentPage}
                            width={state.pageWidth}
                            height={state.pageHeight}
                            scale={state.scale}
                        />
                    </Document>
                </div>
            </div>
            <div
                className="pdf-page-info"
                style={{
                    textAlign: 'center',
                    marginTop: '10px',
                    color: 'gray',
                    fontSize: '12px'
                }}
            >
                Page {state.currentPage} of {state.numPages}
            </div>
        </>
    )
}
