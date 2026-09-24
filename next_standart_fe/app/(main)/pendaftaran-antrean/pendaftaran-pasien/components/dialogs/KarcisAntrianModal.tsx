'use client';

import React, { useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

interface TicketData {
  no_rm?: string;
  nama?: string;
  nik?: string;
  no_hp?: string;
  kode_kunjungan?: string;
  nomor_antrian?: string;
  kode_antrian?: string;
  tanggal_kunjungan?: string;
  jam_datang?: string;
}

interface Props {
  visible: boolean;
  onHide: () => void;
  data: TicketData | null;
}

export const KarcisAntrianModal: React.FC<Props> = ({ visible, onHide, data }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Karcis Antrian - ${data.nomor_antrian || ''}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: #fff;
                color: #000;
              }
              .ticket-container {
                width: 280px;
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
              .queue-num {
                font-size: 56px;
                font-weight: 800;
                color: #2563eb;
                margin: 8px 0;
                line-height: 1;
              }
              .queue-code {
                font-size: 12px;
                color: #4b5563;
                font-weight: 600;
                margin-bottom: 12px;
              }
              .info-table {
                width: 100%;
                font-size: 12px;
                text-align: left;
                border-top: 1px solid #ddd;
                padding-top: 8px;
                margin-top: 8px;
              }
              .info-table td {
                padding: 3px 0;
              }
              .info-table td.label {
                color: #6b7280;
                width: 40%;
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
      header="Pendaftaran Berhasil - Karcis Antrian"
      style={{ width: '420px' }}
      modal
      className="p-fluid"
      footer={
        <div className="flex justify-content-end gap-2">
          <Button
            label="Tutup"
            icon="pi pi-times"
            className="p-button-outlined p-button-secondary"
            onClick={onHide}
          />
          <Button
            label="Cetak Karcis"
            icon="pi pi-print"
            className="p-button-success"
            onClick={handlePrint}
          />
        </div>
      }
    >
      <div className="flex flex-column align-items-center text-center p-2">
        <div
          ref={printRef}
          className="surface-card p-4 border-round-xl border-1 surface-border shadow-2 w-full text-center"
        >
          <div className="header border-bottom-1 surface-border pb-2 mb-3">
            <h3 className="m-0 text-xl font-bold text-blue-600">KLINIK KECANTIKAN</h3>
            <p className="m-0 text-xs text-color-secondary">STANDART WO</p>
          </div>

          <div className="text-sm font-semibold text-600 mb-1">NOMOR ANTREAN</div>
          <div className="text-6xl font-extrabold text-blue-600 my-2" style={{ letterSpacing: '2px' }}>
            {data.nomor_antrian || '-'}
          </div>
          <div className="text-xs text-500 font-medium mb-3">
            Kode: {data.kode_antrian || '-'}
          </div>

          <div className="surface-100 p-3 border-round text-left text-xs surface-border">
            <div className="flex justify-content-between mb-1">
              <span className="text-500">No. RM:</span>
              <span className="font-bold text-900">{data.no_rm || '-'}</span>
            </div>
            <div className="flex justify-content-between mb-1">
              <span className="text-500">Nama Pasien:</span>
              <span className="font-bold text-900 text-right">{data.nama || '-'}</span>
            </div>
            <div className="flex justify-content-between mb-1">
              <span className="text-500">Kode Kunjungan:</span>
              <span className="font-semibold text-700">{data.kode_kunjungan || '-'}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-500">Tanggal / Jam:</span>
              <span className="text-700">{data.tanggal_kunjungan || '-'} {data.jam_datang || ''}</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-400">
            Harap simpan karcis ini hingga nomor dipanggil. Terima kasih!
          </div>
        </div>
      </div>
    </Dialog>
  );
};
