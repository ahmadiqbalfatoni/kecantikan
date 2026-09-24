//  Yang Handle PRINT
export interface AccPdfProps {
    doc: jsPDF;
}

//  Untuk Header Laporan
export interface HeaderLaporanProps extends AccPdfProps {
    marginTopInMm: number;
    marginLeftInMm?: number;
    marginRightInMm?: number;
    judulLaporan: string;
    periodeLaporan: string;
}

// Untuk Halaman Laporan
export interface AddPageInfoProps extends AccPdfProps {
    userName: string;
    marginRightInMm: number;
}

//  Untuk Footer Laporan
export interface FooterProps extends AccPdfProps {
    marginLeft: number;
    marginTop: number;
    marginRight: number;
    paraf1: string;
    paraf2: string;
    namaPetugas1: string;
    namaPetugas2: string;
    jabatan1: string;
    jabatan2: string;
    lastY?: number;
}

// Untuk XLSX
export interface XLSXProps<T> {
    data: T[];
    fileName: string;
    removeFields?: (keyof T)[];
}

// Untuk Ukuran Kertas
export type PaperSize = 'A4' | 'Letter' | 'Legal';

// Untuk Orientasi Kertas
export type Orientation = 'portrait' | 'landscape';

// Untuk Menampilkan Halaman Pengaturan Kertas
export interface PrintPageSettingProps {
    adjustDialog: boolean;
    setAdjustDialog: (value: boolean) => void;
    handleAdjust: (data: PrintPageSettingState) => void;
    handleExcel?: (data: PrintPageSettingState) => void;
}

// Untuk Menampung Data Pengaturan Kertas
export interface PrintPageSettingState {
    marginTop: number;
    marginBottom: number;
    marginRight: number;
    marginLeft: number;
    paperWidth: number;
    betweenCells: number;
    paddingTop: number;

    paperSize: PaperSize;
    orientation: Orientation;

    signature1?: string;
    signature2?: string;
    officerName1?: string;
    officerName2?: string;
    position1?: string;
    position2?: string;
}

// Untuk Menampilkan PDF
export interface PDFViewerProps {
    pdfUrl: string;
    paperSize: PaperSize;
    fileName: string;
}

//  Untuk Menampung Data PDF
export interface PDFViewerState {
    numPages: number;
    currentPage: number;
    pageWidth: number;
    pageHeight: number;
    scale: number;
}

export interface DataRekap {
    data: Record<string, any> | any[];
    dataTotals?: Record<string, any>;
    totalData: number;
    head: any[];
    load: boolean;
    columnStyles: Record<string, any>;
    show: boolean;
    adjust: boolean;
    fileName: string;
    judul1: string;
    judul2: string;
}

export interface PreviewCustomProps {
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    toast: any;
    handleCustomTable: Function;
    disableHeader?: boolean;
    disableFooter?: boolean;
    pdfOnly?: boolean;
}

export interface PrintState {
    adjustDialog: boolean;
    jsPdfPreviewOpen: boolean;
    loadingPreview: boolean;
    pdfUrl: string;
}

type CustomTableParams = {
    doc: jsPDF;
    marginTopInMm?: number;
    marginLeftInMm?: number;
    marginRightInMm?: number;
    marginBottomInMm?: number;
};

export interface TransformOptions {
    headerMap?: Record<string, string>;
    customFormatters?: Record<string, (value: any) => any>;
    excludeKeys?: string[];
    includeKeys?: string[];
}
