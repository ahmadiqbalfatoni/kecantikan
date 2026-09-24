'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import type { BayarResult, CartItem } from '../page';
import { getStoredPrinterSettings } from './KasirPrinterModal';
import { useConfig } from '@/layout/context/configcontext';

const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatAngka = (val: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);

const METODE_LABEL: Record<string, string> = {
  tunai: '💵 Tunai',
  debit: '💳 Debit',
  kredit: '💳 Kredit',
  qris: '📱 QRIS',
  transfer: '🏦 Transfer',
};

interface KasirStrukModalProps {
  visible: boolean;
  result: BayarResult | null;
  onHide: () => void;
}

export const KasirStrukModal: React.FC<KasirStrukModalProps> = ({ visible, result, onHide }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const printerSettings = getStoredPrinterSettings();
  const { config } = useConfig();
  const [logoError, setLogoError] = useState(false);

  // Profil klinik diambil secara dinamis dari database sistem (config)
  const clinicName = config?.msNamaPerusahaan?.trim() || 'Klinik Kecantikan';
  const clinicAddress = config?.msAlamatPerusahaan?.trim() || '';
  const clinicPhone = config?.msTeleponPerusahaan?.trim() || '';
  const logoUrl = config?.msLogoPerusahaan?.trim() || '';

  // Footer message: bersihkan dari emoji dan gunakan dari profil klinik sistem jika ada
  const rawFooter = config?.msCatatanKasir?.trim() || printerSettings.footerMessage || 'Terima kasih atas kunjungan Anda';
  const footerMsg = rawFooter.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

  const paperWidthPx =
    printerSettings.paperSize === '58mm' ? '280px' : printerSettings.paperSize === '80mm' ? '340px' : '100%';

  useEffect(() => {
    if (visible) {
      setLogoError(false);
    }
  }, [visible, logoUrl]);

  React.useEffect(() => {
    if (visible && result && printerSettings.autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, result]);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;

    // Ambil semua tag style & link stylesheet agar CSS PrimeFlex/Tailwind terbawa ke popup cetak
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    const printWindow = window.open('', '_blank', 'width=450,height=750');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Transaksi ${result?.kode_transaksi}</title>
          ${styleTags}
          <style>
            @page { size: auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              line-height: 1.4;
              color: #000000 !important;
              background: #ffffff !important;
              padding: 8px;
            }
            .receipt-print-wrapper {
              max-width: ${paperWidthPx};
              margin: 0 auto;
            }
            /* Hilangkan border & shadow kartu saat dicetak */
            .receipt-print-wrapper > div {
              box-shadow: none !important;
              border: none !important;
              padding: 0 4px !important;
              max-width: 100% !important;
            }
            .receipt-clinic-name {
              font-size: 18px !important;
              font-weight: 700 !important;
              line-height: 1.3 !important;
            }
            .receipt-clinic-meta {
              font-size: 12px !important;
              font-weight: 400 !important;
              line-height: 1.3 !important;
            }
            .receipt-title {
              font-size: 13px !important;
              font-weight: 700 !important;
              line-height: 1.4 !important;
            }
            .receipt-grid-header {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) 28px 64px 74px !important;
              column-gap: 4px !important;
              font-size: 11px !important;
              line-height: 1.4 !important;
              font-weight: 600 !important;
              text-transform: uppercase !important;
              border-bottom: 1px dashed #000000 !important;
              border-top: none !important;
              border-left: none !important;
              border-right: none !important;
              outline: none !important;
              font-family: 'Courier New', Courier, monospace !important;
            }
            .receipt-grid-row {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) 28px 64px 74px !important;
              column-gap: 4px !important;
              font-size: 13px !important;
              line-height: 1.4 !important;
              font-family: 'Courier New', Courier, monospace !important;
            }
            .receipt-body-text {
              font-size: 13px !important;
              line-height: 1.4 !important;
              font-family: 'Courier New', Courier, monospace !important;
            }
            .receipt-total-large {
              font-size: 16px !important;
              font-weight: 700 !important;
              line-height: 1.4 !important;
            }
            .receipt-tabular {
              font-variant-numeric: tabular-nums !important;
            }
            .receipt-lunas-badge {
              font-size: 12px !important;
              font-weight: 700 !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
              background: transparent !important;
            }
            .receipt-footer {
              font-size: 13px !important;
              line-height: 1.4 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              font-family: 'Courier New', Courier, monospace !important;
            }
            th, td {
              font-variant-numeric: tabular-nums !important;
            }
            .flex { display: flex !important; }
            .flex-column { flex-direction: column !important; }
            .justify-content-between { justify-content: space-between !important; }
            .justify-content-center { justify-content: center !important; }
            .align-items-center { align-items: center !important; }
            .align-items-start { align-items: flex-start !important; }
            .flex-1 { flex: 1 !important; }
            .flex-shrink-0 { flex-shrink: 0 !important; }
            .font-normal { font-weight: 400 !important; }
            .font-medium { font-weight: 500 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-bold { font-weight: 700 !important; }
            .font-black { font-weight: 900 !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .border-top-1 { border-top: 1px solid #000000 !important; }
            .border-bottom-1 { border-bottom: 1px solid #000000 !important; }
            .border-dashed { border-style: dashed !important; }
            @media print {
              * { color: #000000 !important; }
              .receipt-discount-text, .receipt-total-text, .receipt-item-discount { color: #000000 !important; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-print-wrapper">
            ${el.innerHTML}
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

  if (!result) return null;

  const now = new Date();
  const tanggalStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const jamStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(':', '.');
  const waktuStr = `${tanggalStr}, ${jamStr}`;

  const totalSubtotal = result.total_harga !== undefined && result.total_harga > 0
    ? result.total_harga
    : (result.items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const totalDiskon = result.total_diskon !== undefined
    ? result.total_diskon
    : (result.items || []).reduce((sum, item) => sum + (item.diskon || 0), 0);

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      showHeader={false}
      style={{ width: '460px', borderRadius: '20px', overflow: 'hidden' }}
      contentStyle={{ padding: 0, borderRadius: '20px' }}
    >
      {/* Top Banner Header */}
      <div style={{ background: '#0d9488', padding: '24px 16px', textAlign: 'center', color: '#ffffff', position: 'relative' }}>
        <button
          onClick={onHide}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            opacity: 0.8,
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '18px',
            lineHeight: 1,
          }}
          title="Tutup Modal"
        >
          <i className="pi pi-times" />
        </button>

        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.2)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 10px'
        }}>
          <i className="pi pi-check-circle text-white" style={{ fontSize: '28px' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 4px 0', color: '#ffffff' }}>Pembayaran Berhasil!</h3>
        <p style={{ fontSize: '13px', margin: 0, opacity: 0.85, fontFamily: 'monospace' }}>{result.kode_transaksi}</p>
      </div>

      {/* Paper Receipt Preview Body */}
      <div className="p-4 surface-ground max-h-[55vh] overflow-y-auto">
        <div
          ref={printRef}
          style={{
            maxWidth: '380px',
            margin: '0 auto',
            padding: '18px 14px',
            boxSizing: 'border-box',
          }}
          className="bg-white border-round-xl border-1 surface-border shadow-2 text-slate-800 font-mono"
        >
          {/* Receipt Brand Header */}
          <div className="text-center mb-3">
            {logoUrl && !logoError && (
              <div className="flex justify-content-center mb-2">
                <img
                  src={logoUrl}
                  alt={clinicName}
                  style={{
                    maxHeight: '44px',
                    maxWidth: '140px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            <div className="receipt-clinic-name font-bold text-slate-900 tracking-tight" style={{ fontSize: '18px', lineHeight: '1.3' }}>
              {clinicName}
            </div>
            {clinicAddress && (
              <div className="receipt-clinic-meta text-slate-500 font-normal leading-tight mt-1" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                {clinicAddress}
              </div>
            )}
            {clinicPhone && (
              <div className="receipt-clinic-meta text-slate-500 font-normal leading-tight mt-0.5" style={{ fontSize: '12px', lineHeight: '1.3' }}>
                Telp: {clinicPhone}
              </div>
            )}
            <div className="receipt-title text-slate-600 font-bold uppercase tracking-wider mt-2.5" style={{ fontSize: '13px', lineHeight: '1.4' }}>
              STRUK TRANSAKSI
            </div>
          </div>

          <div className="border-top-1 border-dashed surface-border my-2.5" />

          {/* Meta Info */}
          <div className="receipt-body-text flex flex-column gap-1.5 my-2" style={{ fontSize: '13px', lineHeight: '1.4' }}>
            <div className="flex justify-content-between">
              <span className="text-slate-500 font-normal">No. Transaksi</span>
              <span className="font-bold text-slate-900">{result.kode_transaksi}</span>
            </div>
            <div className="flex justify-content-between">
              <span className="text-slate-500 font-normal">Pasien</span>
              <span className="font-semibold text-slate-800">{result.nama_pasien || '-'}</span>
            </div>
            {result.no_rm && (
              <div className="flex justify-content-between">
                <span className="text-slate-500 font-normal">No. RM</span>
                <span className="font-semibold text-slate-800">{result.no_rm}</span>
              </div>
            )}
            <div className="flex justify-content-between">
              <span className="text-slate-500 font-normal">Waktu</span>
              <span className="font-semibold text-slate-800">{waktuStr}</span>
            </div>
          </div>

          <div className="border-top-1 border-dashed surface-border my-2.5" />

          {/* Header Kolom (Gaya Minimarket: ITEM | QTY | HARGA | JUMLAH) */}
          <div
            className="receipt-grid-header text-slate-500 font-semibold tracking-wider uppercase pb-1 mb-1.5"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 28px 64px 74px',
              columnGap: '4px',
              fontSize: '11px',
              lineHeight: '1.4',
              alignItems: 'center',
              borderBottom: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ textAlign: 'left', minWidth: 0 }}>Item</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>Qty</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>Harga</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>Jumlah</div>
          </div>

          {/* Cart Item Details (Gaya Minimarket: Item, Qty, Harga, Jumlah) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', margin: '3px 0' }}>
            {(result.items || []).map((item: CartItem, i: number) => {
              const itemDisc = parseFloat(String(item.diskon || 0));
              const hasDiscount = itemDisc > 0;

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {/* Baris Utama Item */}
                  <div
                    className="receipt-grid-row text-slate-900"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 28px 64px 74px',
                      columnGap: '4px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      className="font-medium"
                      style={{
                        textAlign: 'left',
                        minWidth: 0,
                        wordBreak: 'normal',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {item.nama}
                    </div>
                    <div
                      className="text-slate-700 font-normal"
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.qty}
                    </div>
                    <div
                      className="text-slate-700 font-normal"
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatAngka(item.harga_satuan)}
                    </div>
                    <div
                      className="font-medium"
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatAngka(item.subtotal)}
                    </div>
                  </div>

                  {/* Baris Diskon Per Item di bawah nama item */}
                  {hasDiscount && (
                    <div
                      className="receipt-grid-row text-slate-500 font-normal"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) 28px 64px 74px',
                        columnGap: '4px',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          gridColumn: '1 / 4',
                          textAlign: 'left',
                          minWidth: 0,
                        }}
                      >
                        Diskon
                      </div>
                      <div
                        style={{
                          gridColumn: '4 / 5',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        -{formatAngka(itemDisc)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-top-1 border-dashed surface-border my-2.5" />

          {/* Financial Totals */}
          <div className="receipt-body-text flex flex-column gap-1.5 my-2" style={{ fontSize: '13px', lineHeight: '1.4' }}>
            <div className="flex justify-content-between font-normal">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-800 receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatRupiah(totalSubtotal)}
              </span>
            </div>

            {totalDiskon > 0 && (
              <div className="flex justify-content-between font-normal text-emerald-700 receipt-discount-text">
                <span>Voucher Diskon</span>
                <span className="receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  -{formatRupiah(totalDiskon)}
                </span>
              </div>
            )}

            {result.dp_nominal != null && result.dp_nominal > 0 ? (
              <>
                <div className="flex justify-content-between text-slate-600 font-normal">
                  <span>Total Biaya</span>
                  <span className="text-slate-800 receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(result.total_bayar)}
                  </span>
                </div>
                <div className="flex justify-content-between text-teal-700 font-normal">
                  <span>Uang Muka (DP {result.metode_pembayaran_dp ? result.metode_pembayaran_dp.toUpperCase() : 'Terbayar'})</span>
                  <span className="receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    -{formatRupiah(result.dp_nominal)}
                  </span>
                </div>
                <div className="border-top-1 border-dashed surface-border my-1" />
                <div className="receipt-total-large flex justify-content-between font-bold text-slate-900 pt-0.5" style={{ fontSize: '16px', lineHeight: '1.4' }}>
                  <span>Sisa Pelunasan</span>
                  <span className="text-teal-700 receipt-total-text receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(result.sisa_bayar !== undefined ? result.sisa_bayar : Math.max(0, result.total_bayar - result.dp_nominal))}
                  </span>
                </div>
              </>
            ) : (
              <div className="receipt-total-large flex justify-content-between font-bold text-slate-900 pt-1 border-top-1 border-slate-200 mt-0.5" style={{ fontSize: '16px', lineHeight: '1.4' }}>
                <span>TOTAL BAYAR</span>
                <span className="text-teal-700 receipt-total-text receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(result.total_bayar)}
                </span>
              </div>
            )}
          </div>

          <div className="border-top-1 border-dashed surface-border my-2.5" />

          {/* Payment Method details */}
          <div className="receipt-body-text flex flex-column gap-1.5 my-2" style={{ fontSize: '13px', lineHeight: '1.4' }}>
            <div className="flex justify-content-between">
              <span className="text-slate-600 font-normal">Metode</span>
              <span className="font-semibold text-slate-800">{METODE_LABEL[result.metode_bayar] || result.metode_bayar}</span>
            </div>
            {result.metode_bayar === 'tunai' && (
              <>
                <div className="flex justify-content-between">
                  <span className="text-slate-600 font-normal">Dibayar</span>
                  <span className="font-semibold text-slate-800 receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(result.nominal_bayar)}
                  </span>
                </div>
                <div className="flex justify-content-between">
                  <span className="text-slate-600 font-normal">Kembalian</span>
                  <span className="font-semibold text-slate-800 receipt-tabular" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(result.kembalian)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Lunas Status Badge */}
          <div className="my-2.5 text-center">
            <span
              className="receipt-lunas-badge inline-block py-1 px-3 border-1 border-emerald-300 text-emerald-800 font-bold tracking-wider uppercase bg-emerald-50 border-round-md"
              style={{ fontSize: '12px', lineHeight: '1.4' }}
            >
              ✓ LUNAS
            </span>
          </div>

          {/* Footer message */}
          {footerMsg && (
            <div
              className="receipt-footer text-center text-slate-400 mt-2 whitespace-pre-line"
              style={{ fontSize: '13px', lineHeight: '1.4' }}
            >
              {footerMsg}
            </div>
          )}
        </div>
      </div>

      {/* Modal Actions Footer */}
      <div className="p-3 bg-white border-top-1 surface-border flex gap-2">
        <Button
          label="Cetak Struk"
          icon="pi pi-print"
          onClick={handlePrint}
          className="flex-1 font-bold text-xs bg-teal-600 hover:bg-teal-700 border-none border-round-lg text-white shadow-2 py-2.5"
        />
        <Button
          label="Tutup"
          icon="pi pi-times"
          outlined
          severity="secondary"
          onClick={onHide}
          className="flex-1 font-bold text-xs border-round-lg py-2.5"
        />
      </div>
    </Dialog>
  );
};
