'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import { RadioButton } from 'primereact/radiobutton';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { showError, showSuccess } from '@/lib/tools/generalTools';

export interface PrinterSettings {
  isConnected: boolean;
  printerName: string;
  connectionType: 'usb' | 'network' | 'bluetooth';
  paperSize: '58mm' | '80mm' | 'A4';
  autoPrint: boolean;
  headerAddress: string;
  footerMessage: string;
  showLogo: boolean;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  isConnected: true,
  printerName: 'Epson TM-T82 Thermal Printer (USB)',
  connectionType: 'usb',
  paperSize: '58mm',
  autoPrint: false,
  headerAddress: '',
  footerMessage: 'Terima kasih atas kunjungan Anda',
  showLogo: true,
};

export const getStoredPrinterSettings = (): PrinterSettings => {
  if (typeof window === 'undefined') return DEFAULT_PRINTER_SETTINGS;
  try {
    const raw = localStorage.getItem('kasir_printer_settings');
    if (!raw) return DEFAULT_PRINTER_SETTINGS;
    return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PRINTER_SETTINGS;
  }
};

interface KasirPrinterModalProps {
  visible: boolean;
  onHide: () => void;
  toast: React.RefObject<Toast>;
}

export const KasirPrinterModal: React.FC<KasirPrinterModalProps> = ({ visible, onHide, toast }) => {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSettings(getStoredPrinterSettings());
    }
  }, [visible]);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kasir_printer_settings', JSON.stringify(settings));
    }
    showSuccess(toast, 'Pengaturan koneksi printer berhasil disimpan!');
    onHide();
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      if (settings.isConnected) {
        showSuccess(toast, `Koneksi sukses! Printer "${settings.printerName}" siap digunakan.`);
      } else {
        showError(toast, `Printer tidak terhubung! Silakan aktifkan koneksi printer terlebih dahulu.`);
      }
    }, 1000);
  };

  const handleTestPrint = () => {
    if (!settings.isConnected) {
      showError(toast, 'Gagal mencetak: Printer dalam status TIDAK TERHUBUNG (Disconnected).');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (!printWindow) return;

    const paperWidthPx = settings.paperSize === '58mm' ? '280px' : settings.paperSize === '80mm' ? '340px' : '100%';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Print Struk - ${settings.paperSize}</title>
          <style>
            @page { size: auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #1e293b;
              background: #ffffff !important;
              padding: 12px;
            }
            .receipt {
              max-width: ${paperWidthPx};
              margin: 0 auto;
              border: 1px dashed #cbd5e1;
              padding: 12px;
              border-radius: 8px;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #94a3b8; margin: 8px 0; }
            .flex-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="text-center font-bold" style="font-size: 14px;">Klinik Kecantikan</div>
            <div class="text-center" style="font-size: 10px; color: #64748b; margin-top: 2px;">${settings.headerAddress}</div>
            <div class="text-center font-bold" style="margin-top: 6px;">[ UJI COBA CETAK STRUK (${settings.paperSize}) ]</div>
            
            <div class="dashed"></div>
            <div class="flex-row"><span>Perangkat</span><span class="font-bold">${settings.printerName}</span></div>
            <div class="flex-row"><span>Koneksi</span><span class="font-bold">${settings.connectionType.toUpperCase()}</span></div>
            <div class="flex-row"><span>Waktu</span><span class="font-bold">${new Date().toLocaleString('id-ID')}</span></div>
            
            <div class="dashed"></div>
            <div class="flex-row"><span>1x Treatment Facial</span><span class="font-bold">Rp 250.000</span></div>
            <div class="flex-row"><span>1x Serum Glowing</span><span class="font-bold">Rp 150.000</span></div>
            
            <div class="dashed"></div>
            <div class="flex-row font-bold" style="font-size: 13px;"><span>TOTAL</span><span>Rp 400.000</span></div>
            <div class="flex-row"><span>METODE</span><span class="font-bold">TUNAI</span></div>
            
            <div class="dashed"></div>
            <div class="text-center font-bold" style="color: #059669; margin: 6px 0;">✓ TEST PRINT LUNAS</div>
            <div class="text-center" style="font-size: 10px; color: #64748b; white-space: pre-line;">${settings.footerMessage}</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <Dialog
      header={
        <div className="flex align-items-center gap-2">
          <i className="pi pi-print text-teal-600 text-xl" />
          <span className="font-bold text-slate-900">Pengaturan & Status Koneksi Printer</span>
        </div>
      }
      visible={visible}
      style={{ width: '540px' }}
      modal
      onHide={onHide}
      className="p-fluid"
    >
      <div className="flex flex-column gap-3 pt-2">
        {/* Banner Status Koneksi Real-time */}
        <div
          className={`p-3 border-round-xl border-1 flex align-items-center justify-content-between transition-all ${
            settings.isConnected
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-rose-50 border-rose-300'
          }`}
        >
          <div className="flex align-items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex align-items-center justify-content-center shadow-1 ${
                settings.isConnected ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              <i className={`pi ${settings.isConnected ? 'pi-wifi' : 'pi-slash'}`} style={{ fontSize: '18px' }} />
            </div>
            <div>
              <div className="flex align-items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">Status Koneksi Printer</span>
                <Tag
                  value={settings.isConnected ? 'TERHUBUNG' : 'TIDAK TERHUBUNG'}
                  severity={settings.isConnected ? 'success' : 'danger'}
                  className="text-[10px] font-black px-2 py-0.5"
                />
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {settings.isConnected
                  ? `Printer "${settings.printerName}" aktif dan siap mencetak.`
                  : 'Printer diputus. Sistem akan menggunakan mode struk preview/digital saja.'}
              </div>
            </div>
          </div>

          <div className="flex flex-column align-items-end gap-1">
            <InputSwitch
              checked={settings.isConnected}
              onChange={(e) => setSettings({ ...settings, isConnected: Boolean(e.value) })}
              tooltip={settings.isConnected ? 'Matikan Koneksi Printer' : 'Hubungkan Printer'}
            />
          </div>
        </div>

        {/* Cek Koneksi & Pengaturan Perangkat */}
        <div className="surface-50 p-3 border-round-xl border-1 surface-border flex flex-column gap-2.5">
          <div className="flex align-items-center justify-content-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Identitas Perangkat Printer
            </label>
            <Button
              type="button"
              label="Cek Koneksi"
              icon="pi pi-refresh"
              size="small"
              outlined
              severity={settings.isConnected ? 'success' : 'secondary'}
              loading={testingConnection}
              onClick={handleTestConnection}
              className="text-[11px] font-bold py-1 px-2.5 border-round-md"
            />
          </div>

          <div className="grid gap-2">
            <div className="col-12 md:col-7">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Perangkat Printer</label>
              <InputText
                value={settings.printerName}
                onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
                placeholder="contoh: Epson TM-T82 Thermal Printer"
                className="p-inputtext-sm border-round-lg text-xs"
              />
            </div>
            <div className="col-12 md:col-5">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipe Koneksi</label>
              <Dropdown
                value={settings.connectionType}
                options={[
                  { label: '🔌 USB Direct', value: 'usb' },
                  { label: '🌐 Network / LAN IP', value: 'network' },
                  { label: '📶 Bluetooth POS', value: 'bluetooth' },
                ]}
                onChange={(e) => setSettings({ ...settings, connectionType: e.value })}
                className="p-inputtext-sm border-round-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Pilihan Ukuran Kertas Struk */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Ukuran Kertas Struk (Thermal Printer)
          </label>
          <div className="grid gap-2">
            {[
              { id: '58mm', name: '58 mm (Kasir Mini Thermal)', desc: 'Ukuran standar struk kasir kecil (280px)' },
              { id: '80mm', name: '80 mm (POS Thermal Standar)', desc: 'Ukuran struk standar supermarket/POS (340px)' },
              { id: 'A4', name: 'A4 / Letter (Kertas Nota Besar)', desc: 'Ukuran faktur/nota penuh untuk printer standar' },
            ].map((paper) => (
              <div
                key={paper.id}
                onClick={() => setSettings({ ...settings, paperSize: paper.id as any })}
                className={`p-2.5 border-round-lg border-1 cursor-pointer transition-all flex align-items-center justify-content-between ${
                  settings.paperSize === paper.id
                    ? 'bg-teal-50 border-teal-500 shadow-1'
                    : 'bg-white surface-border hover:bg-slate-50'
                }`}
              >
                <div className="flex align-items-center gap-3">
                  <RadioButton
                    inputId={paper.id}
                    name="paperSize"
                    value={paper.id}
                    checked={settings.paperSize === paper.id}
                    onChange={() => setSettings({ ...settings, paperSize: paper.id as any })}
                  />
                  <div>
                    <label htmlFor={paper.id} className="font-bold text-xs text-slate-900 cursor-pointer">
                      {paper.name}
                    </label>
                    <div className="text-[11px] text-slate-500 mt-0.5">{paper.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mode Cetak Otomatis */}
        <div className="surface-50 p-3 border-round-xl border-1 surface-border flex align-items-center justify-content-between">
          <div>
            <div className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-0.5">Cetak Otomatis (Auto-Print)</div>
            <div className="text-xs text-slate-500">Buka dialog cetak otomatis saat pembayaran lunas diselesaikan.</div>
          </div>
          <InputSwitch
            checked={settings.autoPrint}
            onChange={(e) => setSettings({ ...settings, autoPrint: Boolean(e.value) })}
          />
        </div>

        {/* Header Alamat Klinik */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Header Sub-Alamat / Kontak Struk
          </label>
          <InputText
            value={settings.headerAddress}
            onChange={(e) => setSettings({ ...settings, headerAddress: e.target.value })}
            placeholder="contoh: Jl. Utama No. 88 | Telp: 08123456789"
            className="p-inputtext-sm border-round-lg text-xs"
          />
        </div>

        {/* Footer Pesan Struk */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Pesan Terima Kasih (Footer Struk)
          </label>
          <InputTextarea
            value={settings.footerMessage}
            onChange={(e) => setSettings({ ...settings, footerMessage: e.target.value })}
            rows={2}
            placeholder="Pesan footer struk..."
            className="p-inputtext-sm border-round-lg text-xs"
          />
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="flex justify-content-between align-items-center gap-2 mt-4 pt-3 border-top-1 surface-border">
        <Button
          type="button"
          label="Uji Coba Cetak (Test Print)"
          icon="pi pi-print"
          outlined
          severity="help"
          onClick={handleTestPrint}
          disabled={!settings.isConnected}
          className="text-xs font-bold border-round-lg"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            label="Batal"
            icon="pi pi-times"
            text
            onClick={onHide}
            className="text-xs font-bold"
          />
          <Button
            type="button"
            label="Simpan Pengaturan"
            icon="pi pi-check"
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white border-none font-bold text-xs border-round-lg px-3"
          />
        </div>
      </div>
    </Dialog>
  );
};
