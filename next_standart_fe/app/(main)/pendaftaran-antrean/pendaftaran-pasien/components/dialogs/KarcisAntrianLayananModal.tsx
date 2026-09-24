'use client';

import React, { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

interface AntrianLayananItem {
  kode_antrian_layanan: string;
  kode_kunjungan: string;
  jenis_layanan: string;
  kode_layanan: string;
  nomor_antrian: string;
  status: string;
  nama_layanan?: string;
  harga?: number;
  kode_ruangan?: string;
  nama_ruangan?: string;
  details?: any[];
  detail_items?: any[];
}

interface TicketLayananData {
  kode_kunjungan: string;
  no_rm: string;
  nama_pasien: string;
  nomor_antrian_awal?: string;
  antrian_layanan: AntrianLayananItem[];
}

interface Props {
  visible: boolean;
  onHide: () => void;
  data: TicketLayananData | null;
}

export const KarcisAntrianLayananModal: React.FC<Props> = ({ visible, onHide, data }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Karcis Antrian Layanan - ${data.nama_pasien || ''}</title>
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
              .patient-info table {
                width: 100%;
              }
              .patient-info td {
                padding: 2px 0;
              }
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
          <Button
            label="Cetak Karcis Layanan"
            icon="pi pi-print"
            className="p-button-success font-bold"
            onClick={handlePrint}
          />
        </div>
      }
    >
      <div className="flex flex-column align-items-center text-center p-1">
        <div
          ref={printRef}
          className="surface-card p-4 border-round-xl border-1 surface-border shadow-2 w-full text-center"
        >
          <div className="header border-bottom-1 surface-border pb-2 mb-3">
            <h3 className="m-0 text-xl font-bold text-blue-600">KLINIK KECANTIKAN</h3>
            <p className="m-0 text-xs text-color-secondary">ANTREAN TERAPI & LAYANAN</p>
          </div>

          <div className="surface-100 p-3 border-round text-left text-xs surface-border mb-3">
            <div className="flex justify-content-between mb-1">
              <span className="text-500">Nama Pasien:</span>
              <span className="font-bold text-900">{data.nama_pasien}</span>
            </div>
            <div className="flex justify-content-between mb-1">
              <span className="text-500">No. RM:</span>
              <span className="font-semibold text-800">{data.no_rm}</span>
            </div>
            <div className="flex justify-content-between mb-1">
              <span className="text-500">Kode Kunjungan:</span>
              <span className="font-semibold text-700">{data.kode_kunjungan}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-500">Antrean Awal:</span>
              <span className="font-extrabold text-blue-700">{data.nomor_antrian_awal || '-'}</span>
            </div>
          </div>

          <div className="text-xs font-semibold text-600 mb-2 text-left">
            DAFTAR ANTREAN LAYANAN & PAKET ({data.antrian_layanan.length}):
          </div>

          <div className="flex flex-column gap-2 text-left">
            {data.antrian_layanan.map((item, idx) => {
              const jenisVal = item.jenis_layanan || (item.details && item.details[0]?.jenis_layanan) || (item.detail_items && item.detail_items[0]?.jenis_layanan) || 'layanan';
              const namaVal = item.nama_layanan || (item.details && item.details.map((d: any) => d.nama_layanan).join(', ')) || (item.detail_items && item.detail_items.map((d: any) => d.nama_layanan || d.nama).join(', ')) || item.kode_layanan || '-';

              return (
                <div
                  key={idx}
                  className="surface-50 p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between"
                >
                  <div>
                    <div className="flex align-items-center gap-2 mb-1 flex-wrap">
                      <Tag
                        value={(jenisVal || 'layanan').toUpperCase()}
                        severity={jenisVal === 'paket' ? 'warning' : 'info'}
                        className="text-xs font-bold"
                      />
                      <Tag
                        value={item.nama_ruangan ? `${item.kode_ruangan ? item.kode_ruangan + ' - ' : ''}${item.nama_ruangan}` : (item.kode_ruangan || 'Ruang Treatment')}
                        severity="success"
                        className="text-xs font-semibold"
                      />
                      <span className="text-xs text-500">{item.kode_antrian_layanan}</span>
                    </div>
                    <div className="font-bold text-900 text-sm">{namaVal}</div>
                    {item.harga !== undefined && (
                      <div className="text-xs text-blue-600 font-medium">{formatRupiah(item.harga)}</div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-500 block">No. Antrian</span>
                    <span className="text-3xl font-extrabold text-blue-600">{item.nomor_antrian}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-xs text-400 border-top-1 surface-border pt-2">
            Harap menunggu hingga nomor antrian layanan dipanggil oleh terapis / kasir. Terima kasih!
          </div>
        </div>
      </div>
    </Dialog>
  );
};
