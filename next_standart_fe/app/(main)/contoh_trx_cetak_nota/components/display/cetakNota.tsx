import React from 'react';
import { InitValue } from '../interfaces';

interface CetakNotaProps {
    data: InitValue | null;
}

const CetakNota = React.forwardRef<HTMLDivElement, CetakNotaProps>(({ data }, ref) => {
    if (!data) return null;

    return (
        <div ref={ref} className="p-5 text-gray-900 bg-white" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {/* Header Nota */}
            <div className="flex justify-content-between border-bottom-2 border-900 pb-3 mb-4">
                <div>
                    <h3 className="text-xl font-bold tracking-wide uppercase m-0">Bukti Pengiriman Barang (Mutasi)</h3>
                    <span className="text-gray-600 text-xs">Internal Warehouse Transfer Slip</span>
                </div>
                <div className="text-right">
                    <span className="font-bold text-base block">{data.faktur}</span>
                    <span className="text-xs text-gray-500">Tanggal: {data.tanggal_transaksi.toString()}</span>
                </div>
            </div>

            {/* Informasi Metadata Dokumen */}
            <div className="grid mb-4 leading-relaxed">
                <div className="col-6 flex flex-column gap-1">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gudang Asal (Pengirim)</span>
                    <span className="text-sm font-bold">{data.dari_gudang} - {data.dari_gudang_nama || 'Gudang Asal'}</span>
                    <span className="text-xs text-gray-600">Diserahkan oleh: {data.dikirim_oleh_nama || data.dikirim_oleh || '-'}</span>
                </div>
                <div className="col-6 flex flex-column gap-1 text-right">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gudang Tujuan (Penerima)</span>
                    <span className="text-sm font-bold">{data.ke_gudang} - {data.ke_gudang_nama || 'Gudang Tujuan'}</span>
                    <span className="text-xs text-gray-600">Penerima: {data.diterima_oleh_nama || data.diterima_oleh || '-'}</span>
                </div>
            </div>

            {/* Tabel Detail Item Rincian */}
            <table className="w-full text-left border-collapse border-top-2 border-bottom-2 border-900 mb-5">
                <thead>
                    <tr className="border-bottom-1 border-900 font-bold text-xs uppercase tracking-wider">
                        <th className="py-2 text-center" style={{ width: '5%' }}>No</th>
                        <th className="py-2" style={{ width: '20%' }}>Barcode</th>
                        <th className="py-2" style={{ width: '50%' }}>Nama Barang / Deskripsi</th>
                        <th className="py-2 text-right" style={{ width: '15%' }}>Qty Kirim</th>
                        <th className="py-2 text-center" style={{ width: '10%' }}>Satuan</th>
                    </tr>
                </thead>
                <tbody>
                    {(data.detail || []).map((item, idx) => (
                        <tr key={item.barcode || idx} className="border-bottom-1 border-100 text-xs">
                            <td className="py-2 text-center">{idx + 1}</td>
                            <td className="py-2 font-semibold">{item.barcode}</td>
                            <td className="py-2">{item.nama_barang}</td>
                            <td className="py-2 text-right font-bold">{item.qty_kirim?.toLocaleString('id-ID')}</td>
                            <td className="py-2 text-center uppercase">{item.satuan}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Kolom Tanda Tangan */}
            <div className="grid mt-8 text-center leading-relaxed pt-4">
                <div className="col-4 flex flex-column justify-content-between h-8rem">
                    <span className="text-xs font-semibold uppercase tracking-wider">Diserahkan Oleh,</span>
                    <span className="font-bold border-bottom-1 border-300 pb-1 mx-4">
                        ( {data.dikirim_oleh_nama || '................'} )
                    </span>
                </div>
                <div className="col-4 flex flex-column justify-content-between h-8rem">
                    <span className="text-xs font-semibold uppercase tracking-wider">Diterima Oleh,</span>
                    <span className="font-bold border-bottom-1 border-300 pb-1 mx-4">
                        ( {data.diterima_oleh_nama || '................'} )
                    </span>
                </div>
                <div className="col-4 flex flex-column justify-content-between h-8rem">
                    <span className="text-xs font-semibold uppercase tracking-wider">Operator Sistem,</span>
                    <span className="font-bold border-bottom-1 border-300 pb-1 mx-4">
                        ( ........................ )
                    </span>
                </div>
            </div>
        </div>
    );
});

CetakNota.displayName = 'CetakNota';
export default CetakNota;