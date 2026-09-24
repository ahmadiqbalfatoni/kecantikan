'use client';

import React, { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

interface AntrianLayananBaru {
  kode_antrian_layanan: string;
  nomor_antrian: string;
  nama_layanan?: string;
  kode_layanan?: string;
  nama_ruangan?: string;
  kode_ruangan?: string;
  jenis_layanan?: string;
  harga?: number;
  status: string;
}

interface TransaksiDraft {
  kode_transaksi: string;
  total_bayar: number;
  jumlah_produk: number;
}

interface DialogHasilTerbitAntrianProps {
  visible: boolean;
  onHide: () => void;
  pasienNama?: string;
  noRm?: string;
  kodeKunjungan?: string;
  antrianList?: AntrianLayananBaru[];
  transaksiDraft?: TransaksiDraft | null;
}

export const DialogHasilTerbitAntrian: React.FC<DialogHasilTerbitAntrianProps> = ({
  visible,
  onHide,
  pasienNama = 'Pasien',
  noRm = '-',
  kodeKunjungan = '-',
  antrianList = [],
  transaksiDraft = null,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Karcis Antrian Layanan - ${pasienNama}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 16px;
                background: #fff;
                color: #000;
              }
              .ticket-container {
                width: 300px;
                margin: 0 auto;
                border: 2px dashed #333;
                padding: 16px;
                border-radius: 8px;
                text-align: center;
              }
              .header {
                border-bottom: 1px solid #ddd;
                padding-bottom: 8px;
                margin-bottom: 12px;
              }
              .header h2 {
                margin: 0;
                font-size: 18px;
                color: #1e3a8a;
              }
              .header p {
                margin: 2px 0 0 0;
                font-size: 11px;
                color: #666;
              }
              .patient-info {
                font-size: 12px;
                text-align: left;
                background: #f8fafc;
                padding: 8px;
                border-radius: 6px;
                margin-bottom: 12px;
              }
              .patient-info table { width: 100%; }
              .patient-info td { padding: 2px 0; }
              .item-box {
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 8px;
                margin-bottom: 8px;
                text-align: left;
              }
              .item-box .queue-num {
                font-size: 24px;
                font-weight: 800;
                color: #2563eb;
                float: right;
              }
              .item-box .item-title {
                font-size: 13px;
                font-weight: 700;
                color: #1e293b;
              }
              .item-box .item-type {
                font-size: 10px;
                color: #64748b;
                text-transform: uppercase;
              }
              .footer {
                margin-top: 16px;
                font-size: 10px;
                color: #9ca3af;
                border-top: 1px solid #eee;
                padding-top: 8px;
              }
              @media print {
                body { padding: 0; }
                .ticket-container { border: none; width: 100%; }
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              ${content}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header="Nomor Antrian Layanan Diterbitkan"
      style={{ width: '480px' }}
      modal
      className="p-fluid"
      footer={
        <div className="flex justify-content-end gap-2">
          <Button
            label="Selesai"
            icon="pi pi-check"
            className="p-button-outlined p-button-secondary"
            onClick={onHide}
          />
          {antrianList.length > 0 && (
            <Button
              label="Cetak Karcis Layanan"
              icon="pi pi-print"
              className="p-button-success font-bold"
              onClick={handlePrint}
            />
          )}
        </div>
      }
    >
      <div className="flex flex-column align-items-center text-center p-1">
        <div
          ref={printRef}
          className="surface-card p-4 border-round-xl border-1 surface-border shadow-2 w-full text-center"
        >
          {/* KLINIK HEADER */}
          <div className="header border-bottom-1 surface-border pb-2 mb-3">
            <h3 className="m-0 text-xl font-bold text-blue-600">KLINIK KECANTIKAN</h3>
            <p className="m-0 text-xs text-color-secondary">ANTRIAN TERAPI &amp; LAYANAN</p>
          </div>

          {/* PATIENT INFO */}
          <div className="surface-100 p-3 border-round text-left text-xs surface-border mb-3">
            <div className="flex justify-content-between mb-1">
              <span className="text-500">Nama Pasien:</span>
              <span className="font-bold text-900">{pasienNama}</span>
            </div>
            <div className="flex justify-content-between mb-1">
              <span className="text-500">No. RM:</span>
              <span className="font-semibold text-800">{noRm}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-500">Kode Kunjungan:</span>
              <span className="font-semibold text-700">{kodeKunjungan}</span>
            </div>
          </div>

          {/* ANTRIAN LAYANAN LIST */}
          {antrianList.length > 0 && (
            <>
              <div className="text-xs font-semibold text-600 mb-2 text-left">
                DAFTAR ANTRIAN LAYANAN &amp; PAKET ({antrianList.length}):
              </div>

              <div className="flex flex-column gap-2 text-left">
                {antrianList.map((item, idx) => (
                  <div
                    key={item.kode_antrian_layanan || idx}
                    className="surface-50 p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between"
                  >
                    <div>
                      <div className="flex align-items-center gap-2 mb-1 flex-wrap">
                        <Tag
                          value={(item.jenis_layanan || 'layanan').toUpperCase()}
                          severity={item.jenis_layanan === 'paket' ? 'warning' : 'info'}
                          className="text-xs font-bold"
                        />
                        <Tag
                          value={
                            item.nama_ruangan
                              ? `${item.kode_ruangan ? item.kode_ruangan + ' - ' : ''}${item.nama_ruangan}`
                              : item.kode_ruangan || 'Ruang Treatment'
                          }
                          severity="success"
                          className="text-xs font-semibold"
                        />
                        <span className="text-xs text-500">{item.kode_antrian_layanan}</span>
                      </div>
                      <div className="font-bold text-900 text-sm">{item.nama_layanan || item.kode_layanan}</div>
                      {item.harga !== undefined && item.harga > 0 && (
                        <div className="text-xs text-blue-600 font-medium">{formatRupiah(item.harga)}</div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-500 block">No. Antrian</span>
                      <span className="text-3xl font-extrabold text-blue-600">{item.nomor_antrian}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* DRAFT TRANSAKSI */}
          {transaksiDraft && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-600 mb-2 text-left">DRAF TRANSAKSI KASIR:</div>
              <div className="surface-50 p-3 border-round-lg border-1 border-yellow-300 flex align-items-center justify-content-between">
                <div className="text-left">
                  <span className="text-xs text-500 block">Kode Transaksi</span>
                  <span className="font-bold text-900 text-sm">{transaksiDraft.kode_transaksi}</span>
                  <span className="text-xs text-600 block mt-1">{transaksiDraft.jumlah_produk} item produk</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-500 block">Estimasi Total</span>
                  <span className="font-extrabold text-yellow-700 text-base">{formatRupiah(transaksiDraft.total_bayar)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-400 border-top-1 surface-border pt-2">
            Harap menunggu hingga nomor antrian layanan dipanggil oleh terapis / kasir. Terima kasih!
          </div>
        </div>
      </div>
    </Dialog>
  );
};
