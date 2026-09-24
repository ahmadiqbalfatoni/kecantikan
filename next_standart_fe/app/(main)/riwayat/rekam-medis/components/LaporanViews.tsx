'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import { Row } from 'primereact/row';
import { Dialog } from 'primereact/dialog';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { exportToXLSX } from '@/lib/tools/printTools/exportToXLSX';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';
import {
  LaporanHeader,
  LaporanSummaryCards,
  LaporanActionBar,
  LaporanLegendBox,
  LaporanTableHeaderFilter,
  LaporanFilterPopup,
  SummaryCardItem,
} from './LaporanStandardHeader';

export const formatRupiah = (num: any) => {
  const val = typeof num === 'number' ? num : parseFloat(num || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number.isFinite(val) ? val : 0);
};

export const formatDateIndo = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (_) {
    return dateStr;
  }
};

const StatusSquare = ({
  color,
  active,
  tooltip,
}: {
  color?: string;
  active?: boolean;
  tooltip?: string;
}) => {
  const bg = color || (active ? '#22c55e' : '#ef4444');
  return (
    <span
      style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        backgroundColor: bg,
        boxShadow: `0 1px 3px ${bg}55`,
      }}
      title={tooltip || (active ? 'Aktif' : 'Tidak Aktif')}
    />
  );
};

const printHtmlTable = (
  title: string,
  columns: string[],
  rowsHtml: string,
  summaryHtml?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
          .header h2 { margin: 0; color: #0284c7; font-size: 18px; }
          .header h3 { margin: 4px 0 0 0; font-size: 14px; color: #334155; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px; font-size: 11px; }
          th { background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; font-weight: bold; }
          .summary { margin-top: 20px; }
          @media print {
            body { margin: 10mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>KLINIK KECANTIKAN</h2>
          <h3>${title.toUpperCase()}</h3>
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        </div>
        ${summaryHtml || ''}
        <table>
          <thead>
            <tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/* =========================================================================
   1. LAPORAN PENJUALAN VIEW
   ========================================================================= */
export const LaporanPenjualanView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tglDari, setTglDari] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tglSampai, setTglSampai] = useState<Date | null>(() => new Date());
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedMetode, setSelectedMetode] = useState<string | null>(null);
  const [optionsStatus, setOptionsStatus] = useState<any[]>([
    { label: 'Lunas', value: 'lunas' },
    { label: 'Draft / Pending', value: 'draft' },
    { label: 'Batal', value: 'batal' },
  ]);
  const [optionsMetode, setOptionsMetode] = useState<any[]>([
    { label: 'Tunai', value: 'tunai' },
    { label: 'QRIS', value: 'qris' },
    { label: 'Debit', value: 'debit' },
    { label: 'Kredit', value: 'kredit' },
    { label: 'Transfer', value: 'transfer' },
  ]);
  const [summary, setSummary] = useState<any>({});
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await postData('/master/laporan/options', {});
        if (res?.data?.data) {
          if (res.data.data.status_penjualan) setOptionsStatus(res.data.data.status_penjualan);
          if (res.data.data.metode_bayar) setOptionsMetode(res.data.data.metode_bayar);
        }
      } catch (_) {}
    };
    loadOptions();
  }, []);

  const fetchData = async (
    overrideStatus?: string[],
    overrideMetode?: string | null,
    overrideTglDari?: Date | null,
    overrideTglSampai?: Date | null,
    overrideKeyword?: string
  ) => {
    setLoading(true);
    try {
      const activeStatus = overrideStatus !== undefined ? overrideStatus : selectedStatus;
      const activeMetode = overrideMetode !== undefined ? overrideMetode : selectedMetode;
      const activeTglDari = overrideTglDari !== undefined ? overrideTglDari : tglDari;
      const activeTglSampai = overrideTglSampai !== undefined ? overrideTglSampai : tglSampai;
      const activeKeyword = overrideKeyword !== undefined ? overrideKeyword : keyword;

      const payload: any = {
        keyword: activeKeyword || undefined,
        status: activeStatus.length > 0 ? activeStatus : undefined,
        metode_bayar: activeMetode || undefined,
        tanggal_dari: activeTglDari ? activeTglDari.toISOString().slice(0, 10) : null,
        tanggal_sampai: activeTglSampai ? activeTglSampai.toISOString().slice(0, 10) : null,
        perPage: 100,
      };
      const res = await postData('/master/laporan/penjualan', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat data penjualan');
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tglDari, tglSampai]);

  const handlePrint = () => {
    const cols = ['#', 'Kode Trx', 'Tgl', 'Pasien', 'No. RM', 'Metode', 'Total Bayar', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_transaksi}</strong></td>
        <td>${formatDateIndo(r.tanggal_transaksi)}</td>
        <td>${r.nama_pasien || 'Umum'}</td>
        <td style="text-align: center">${r.no_rm || '-'}</td>
        <td style="text-align: center; text-transform: uppercase">${r.metode_bayar}</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.total_bayar)}</td>
        <td style="text-align: center; text-transform: uppercase">${r.status}</td>
      </tr>
    `
      )
      .join('');
    const sumHtml = `
      <div style="display: flex; justify-content: space-around; background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
        <div><strong>Total Transaksi:</strong> ${summary.total_transaksi || 0} Data</div>
        <div><strong>Total Omzet Bersih:</strong> ${formatRupiah(summary.total_omzet || 0)}</div>
        <div><strong>Nilai Bruto:</strong> ${formatRupiah(summary.total_bruto || 0)}</div>
        <div><strong>Total Diskon:</strong> ${formatRupiah(summary.total_diskon || 0)}</div>
      </div>
    `;
    printHtmlTable('Laporan Penjualan', cols, rows, sumHtml);
  };

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Transaksi': r.kode_transaksi,
      Tanggal: formatDateIndo(r.tanggal_transaksi),
      Pasien: r.nama_pasien || 'Umum',
      'No. RM': r.no_rm || '-',
      'Metode Bayar': String(r.metode_bayar || '').toUpperCase(),
      'Total Bruto (Rp)': r.total_harga,
      'Total Diskon (Rp)': r.total_diskon,
      'Total Bayar (Rp)': r.total_bayar,
      Status: String(r.status || '').toUpperCase(),
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Penjualan_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const rowExpansionTemplate = (tr: any) => {
    const items = tr.items || [];
    const itemCount = items.length;

    if (itemCount === 0) {
      return (
        <div
          className="w-full my-2 p-3 border-round-xl border-1 surface-border bg-white text-xs text-500 italic shadow-1 fadein animation-duration-200"
          style={{ width: '100%', maxWidth: 'none' }}
        >
          Tidak ada rincian item untuk transaksi ini.
        </div>
      );
    }

    return (
      <div
        className="w-full my-2 border-round-xl border-1 surface-border bg-white p-3 shadow-1 fadein animation-duration-200"
        style={{
          width: '100%',
          maxWidth: 'none',
        }}
      >
        {/* Header Rincian Transaksi */}
        <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
          <div className="flex align-items-center gap-2">
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="pi pi-receipt text-sm font-bold" />
            </div>
            <span className="text-xs font-bold text-800 uppercase tracking-wider">
              RINCIAN ITEM TRANSAKSI ({itemCount} {itemCount > 1 ? 'ITEMS' : 'ITEM'})
            </span>
          </div>
          {tr.total_bayar !== undefined && (
            <div className="flex align-items-baseline gap-1.5 text-xs">
              <span className="text-500 font-medium">Total:</span>
              <span className="font-black text-sm text-emerald-700">
                {formatRupiah(tr.total_bayar)}
              </span>
            </div>
          )}
        </div>

        {/* Inner Card: Full-Width List Item Transaksi (Model Panel Kasir) */}
        <div className="surface-card border-round-lg border-1 surface-border overflow-hidden">
          {items.map((it: any, idx: number) => (
            <div
              key={idx}
              className={`p-3 flex align-items-center justify-content-between gap-3 hover:surface-50 transition-colors ${
                idx < items.length - 1 ? 'border-bottom-1 surface-border' : ''
              }`}
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="font-bold text-sm text-900 mb-1 line-height-2">
                  {it.item_nama}
                </div>
                <div className="text-xs text-500 flex align-items-center gap-2 flex-wrap">
                  <span>
                    {it.qty}x @ {formatRupiah(it.harga_satuan)}
                  </span>
                  {it.diskon > 0 && (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 border-round-md">
                      Diskon -{formatRupiah(it.diskon)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-black text-sm text-emerald-700 block">
                  {formatRupiah(it.subtotal)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Transaksi', value: `${summary.total_transaksi || 0} Trx`, icon: 'pi pi-receipt', color: 'blue' },
    { label: 'Total Omzet Bersih', value: formatRupiah(summary.total_omzet || 0), icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Total Nilai Bruto', value: formatRupiah(summary.total_bruto || 0), icon: 'pi pi-wallet', color: 'purple' },
    { label: 'Total Diskon Diberikan', value: formatRupiah(summary.total_diskon || 0), icon: 'pi pi-percentage', color: 'red' },
  ];

  const footerGroup = (
    <ColumnGroup>
      <Row>
        <Column footer="Grand Total (Semua Halaman):" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
        <Column footer={formatRupiah(summary.total_bruto || 0)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
        <Column footer={summary.total_diskon ? `- ${formatRupiah(summary.total_diskon)}` : 'Rp 0'} footerStyle={{ fontWeight: 'bold', textAlign: 'right', color: '#dc2626' }} />
        <Column footer={formatRupiah(summary.total_omzet || 0)} footerStyle={{ fontWeight: 'bold', textAlign: 'right', color: '#047857' }} />
        <Column footer="" colSpan={1} />
      </Row>
    </ColumnGroup>
  );

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-shopping-cart"
        title="Laporan Penjualan"
        subtitle="Analisis data transaksi penjualan klinik, rincian pembayaran, pendapatan kotor, diskon, dan omzet bersih kasir."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Lunas / Selesai', color: '#22c55e' },
            { label: 'Draft / Menunggu', color: '#eab308' },
            { label: 'Batal / Cancelled', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Penjualan Tidak Ditemukan"
          className="p-datatable-sm"
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={rowExpansionTemplate}
          dataKey="id"
          rowClassName={(rowData) => {
            const isExpanded = Array.isArray(expandedRows)
              ? expandedRows.some((r: any) => r.id === rowData.id)
              : Boolean(expandedRows && expandedRows[rowData.id]);
            return isExpanded ? 'surface-50' : '';
          }}
          footerColumnGroup={footerGroup}
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tglDari}
              setTanggalAwal={(d) => setTglDari(d)}
              tanggalAkhir={tglSampai}
              setTanggalAkhir={(d) => setTglSampai(d)}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={selectedStatus.length > 0 || Boolean(selectedMetode)}
              onReset={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setTglDari(firstDay);
                setTglSampai(now);
                setKeyword('');
                setSelectedStatus([]);
                setSelectedMetode(null);
                fetchData([], null, firstDay, now, '');
              }}
              searchPlaceholder="Cari Kode Trx, Pasien, No RM..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Penjualan"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus([]);
                    setSelectedMetode(null);
                    fetchData([], null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Transaksi</label>
                    <MultiSelect
                      value={selectedStatus}
                      options={optionsStatus}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status Transaksi"
                      display="chip"
                      selectAll={true}
                      showSelectAll={true}
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || [])}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Metode Pembayaran</label>
                    <Dropdown
                      value={selectedMetode}
                      options={optionsMetode}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Metode Bayar"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedMetode(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column expander style={{ width: '3rem' }} />
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isSuccess = r.status === 'lunas' || r.status === 'selesai';
              const isDraft = r.status === 'draft' || r.status === 'pending';
              const color = isSuccess ? '#22c55e' : isDraft ? '#eab308' : '#ef4444';
              return <StatusSquare color={color} tooltip={`Status: ${r.status}`} />;
            }}
          />
          <Column
            field="kode_transaksi"
            header="Kode Transaksi"
            sortable
            body={(r) => (
              <div className="flex align-items-center gap-2">
                <span className="font-semibold text-800 font-mono">{r.kode_transaksi}</span>
                <Button
                  icon="pi pi-copy"
                  className="p-button-rounded p-button-text p-button-secondary p-0"
                  style={{ width: '24px', height: '24px', color: '#3b82f6' }}
                  tooltip="Salin Kode"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(r.kode_transaksi);
                    showSuccess(toast, `Kode transaksi ${r.kode_transaksi} disalin`);
                  }}
                />
              </div>
            )}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="tanggal_transaksi"
            header="Tanggal"
            sortable
            body={(r) => formatDateIndo(r.tanggal_transaksi)}
            style={{ minWidth: '9rem' }}
          />
          <Column
            field="nama_pasien"
            header="Pasien"
            sortable
            body={(r) => (
              <div>
                <div className="font-semibold text-gray-800">{r.nama_pasien || 'Umum'}</div>
                <div className="text-xs text-gray-500">{r.no_rm || '-'}</div>
              </div>
            )}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="metode_bayar"
            header="Metode"
            align="center"
            body={(r) => (
              <Tag
                value={String(r.metode_bayar || 'TUNAI').toUpperCase()}
                severity="info"
                className="text-xs font-semibold px-2 py-0.5"
              />
            )}
            style={{ minWidth: '8rem' }}
          />
          <Column
            field="total_harga"
            header="Nilai Bruto"
            align="right"
            body={(r) => formatRupiah(r.total_harga)}
            style={{ minWidth: '9rem' }}
          />
          <Column
            field="total_diskon"
            header="Diskon"
            align="right"
            body={(r) => (r.total_diskon > 0 ? `-${formatRupiah(r.total_diskon)}` : 'Rp 0')}
            style={{ minWidth: '8rem', color: '#dc2626' }}
          />
          <Column
            field="total_bayar"
            header="Total Bersih"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-green-600">{formatRupiah(r.total_bayar)}</span>}
            style={{ minWidth: '10rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   2. LAPORAN TREATMENT VIEW
   ========================================================================= */
export const LaporanTreatmentView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tglDari, setTglDari] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tglSampai, setTglSampai] = useState<Date | null>(() => new Date());
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPetugas, setSelectedPetugas] = useState<string | null>(null);
  const [selectedRuangan, setSelectedRuangan] = useState<string | null>(null);

  const [optionsStatus, setOptionsStatus] = useState<any[]>([
    { label: 'Menunggu', value: 'menunggu' },
    { label: 'Dipanggil', value: 'dipanggil' },
    { label: 'Selesai', value: 'selesai' },
    { label: 'Batal', value: 'batal' },
  ]);
  const [optionsPetugas, setOptionsPetugas] = useState<any[]>([]);
  const [optionsRuangan, setOptionsRuangan] = useState<any[]>([]);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await postData('/master/laporan/options', {});
        if (res?.data?.data) {
          if (res.data.data.status_treatment) setOptionsStatus(res.data.data.status_treatment);
          if (res.data.data.petugas) setOptionsPetugas(res.data.data.petugas);
          if (res.data.data.ruangan) setOptionsRuangan(res.data.data.ruangan);
        }
      } catch (_) {}
    };
    loadOptions();
  }, []);

  const fetchData = async (
    overrideStatus?: string[],
    overridePetugas?: string | null,
    overrideRuangan?: string | null,
    overrideTglDari?: Date | null,
    overrideTglSampai?: Date | null,
    overrideKeyword?: string
  ) => {
    setLoading(true);
    try {
      const activeStatus = overrideStatus !== undefined ? overrideStatus : selectedStatus;
      const activePetugas = overridePetugas !== undefined ? overridePetugas : selectedPetugas;
      const activeRuangan = overrideRuangan !== undefined ? overrideRuangan : selectedRuangan;
      const activeTglDari = overrideTglDari !== undefined ? overrideTglDari : tglDari;
      const activeTglSampai = overrideTglSampai !== undefined ? overrideTglSampai : tglSampai;
      const activeKeyword = overrideKeyword !== undefined ? overrideKeyword : keyword;

      const payload: any = {
        keyword: activeKeyword || undefined,
        status: activeStatus.length > 0 ? activeStatus : undefined,
        kode_karyawan: activePetugas || undefined,
        kode_ruangan: activeRuangan || undefined,
        tanggal_dari: activeTglDari ? activeTglDari.toISOString().slice(0, 10) : null,
        tanggal_sampai: activeTglSampai ? activeTglSampai.toISOString().slice(0, 10) : null,
        perPage: 100,
      };
      const res = await postData('/master/laporan/treatment', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data treatment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tglDari, tglSampai]);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Antrean': r.kode_antrian_layanan,
      Pasien: r.nama_pasien || '-',
      'No. RM': r.no_rm || '-',
      Treatment: r.nama_treatment || '-',
      Ruangan: r.nama_ruangan || '-',
      'Petugas / Dokter': r.nama_petugas || '-',
      Status: String(r.status || '').toUpperCase(),
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Treatment_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Pasien', 'No. RM', 'Layanan Treatment', 'Ruangan', 'Petugas', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_antrian_layanan}</strong></td>
        <td>${r.nama_pasien || '-'}</td>
        <td style="text-align: center">${r.no_rm || '-'}</td>
        <td>${r.nama_treatment || '-'}</td>
        <td>${r.nama_ruangan || '-'}</td>
        <td>${r.nama_petugas || '-'}</td>
        <td style="text-align: center">${String(r.status || '').toUpperCase()}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Treatment & Tindakan', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Sesi Treatment', value: `${data.length} Sesi`, icon: 'pi pi-sparkles', color: 'blue' },
    { label: 'Treatment Selesai', value: `${data.filter((d) => d.status === 'selesai').length} Selesai`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Ruangan Perawatan', value: `${new Set(data.map((d) => d.nama_ruangan).filter(Boolean)).size} Ruangan`, icon: 'pi pi-building', color: 'purple' },
    { label: 'Dalam Antrean / Proses', value: `${data.filter((d) => d.status !== 'selesai').length} Pasien`, icon: 'pi pi-clock', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-sparkles"
        title="Laporan Treatment"
        subtitle="Monitoring pelaksanaan sesi treatment pasien, antrean ruangan perawatan, dan performansi dokter/terapis."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Selesai', color: '#22c55e' },
            { label: 'Berlangsung / Pengerjaan', color: '#0284c7' },
            { label: 'Menunggu / Pending', color: '#eab308' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Treatment Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tglDari}
              setTanggalAwal={(d) => setTglDari(d)}
              tanggalAkhir={tglSampai}
              setTanggalAkhir={(d) => setTglSampai(d)}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={selectedStatus.length > 0 || Boolean(selectedPetugas) || Boolean(selectedRuangan)}
              onReset={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setTglDari(firstDay);
                setTglSampai(now);
                setKeyword('');
                setSelectedStatus([]);
                setSelectedPetugas(null);
                setSelectedRuangan(null);
                fetchData([], null, null, firstDay, now, '');
              }}
              searchPlaceholder="Cari Antrean, Pasien, Treatment, Petugas..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Treatment"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus([]);
                    setSelectedPetugas(null);
                    setSelectedRuangan(null);
                    fetchData([], null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Treatment</label>
                    <MultiSelect
                      value={selectedStatus}
                      options={optionsStatus}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status Treatment"
                      display="chip"
                      selectAll={true}
                      showSelectAll={true}
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || [])}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Petugas / Dokter / Terapis</label>
                    <Dropdown
                      value={selectedPetugas}
                      options={optionsPetugas}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Petugas"
                      filter
                      showClear
                      filterPlaceholder="Cari Nama Petugas..."
                      className="w-full text-sm"
                      onChange={(e) => setSelectedPetugas(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Ruangan Layanan</label>
                    <Dropdown
                      value={selectedRuangan}
                      options={optionsRuangan}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Ruangan"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedRuangan(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isSuccess = r.status === 'selesai';
              const isProcess = r.status === 'berlangsung' || r.status === 'pengerjaan';
              const color = isSuccess ? '#22c55e' : isProcess ? '#0284c7' : '#eab308';
              return <StatusSquare color={color} tooltip={`Status: ${r.status}`} />;
            }}
          />
          <Column field="kode_antrian_layanan" header="Kode Antrean" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '11rem' }} />
          <Column
            field="nama_pasien"
            header="Pasien"
            sortable
            body={(r) => (
              <div>
                <div className="font-semibold text-gray-800">{r.nama_pasien || '-'}</div>
                <div className="text-xs text-gray-500">{r.no_rm}</div>
              </div>
            )}
            style={{ minWidth: '12rem' }}
          />
          <Column field="nama_treatment" header="Layanan / Tindakan" className="font-medium text-emerald-800" style={{ minWidth: '12rem' }} />
          <Column field="nama_ruangan" header="Ruangan" style={{ minWidth: '9rem' }} />
          <Column
            field="nama_petugas"
            header="Petugas / Dokter"
            body={(r) => (
              <div>
                <div className="font-medium text-gray-800">{r.nama_petugas || '-'}</div>
                <div className="text-xs text-purple-700 uppercase font-semibold">{r.jabatan_petugas || ''}</div>
              </div>
            )}
            style={{ minWidth: '12rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   3. LAPORAN PRODUK VIEW
   ========================================================================= */
export const LaporanProdukView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
  const [selectedStatusStok, setSelectedStatusStok] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [optionsKategori, setOptionsKategori] = useState<any[]>([]);
  const toast = useRef<Toast>(null);

  const optionsStatusStok = [
    { label: 'Semua Level Stok', value: '' },
    { label: 'Stok Aman', value: 'aman' },
    { label: 'Stok Menipis', value: 'menipis' },
    { label: 'Stok Habis (Kosong)', value: 'habis' },
  ];

  const optionsStatusProduk = [
    { label: 'Semua Status', value: '' },
    { label: 'Aktif', value: 'aktif' },
    { label: 'Nonaktif', value: 'nonaktif' },
  ];

  const fetchOptions = async () => {
    try {
      const res = await postData('/master/laporan/options', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setOptionsKategori(res.data.data?.kategori_produk || []);
      }
    } catch (_) {}
  };

  const fetchData = async (
    sKat = selectedKategori,
    sStok = selectedStatusStok,
    sStatus = selectedStatus,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword };
      if (sKat) payload.kode_kategori_produk = sKat;
      if (sStok) payload.status_stok = sStok;
      if (sStatus) payload.status = sStatus;
      const res = await postData('/master/laporan/produk', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Produk': r.kode_produk,
      'Nama Produk': r.nama_produk,
      Kategori: r.nama_kategori || '-',
      'Stok Sisa': r.stok_tersedia,
      'Harga Beli': r.harga_beli,
      'Harga Jual': r.harga_jual,
      'Total Terjual (Qty)': r.total_terjual,
      'Total Pendapatan (Rp)': r.total_pendapatan,
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Produk_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Nama Produk', 'Kategori', 'Sisa Stok', 'Harga', 'Terjual', 'Omzet'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_produk}</strong></td>
        <td>${r.nama_produk}</td>
        <td>${r.nama_kategori || '-'}</td>
        <td style="text-align: center">${r.stok_tersedia} ${r.satuan || ''}</td>
        <td style="text-align: right">${formatRupiah(r.harga_jual)}</td>
        <td style="text-align: center; font-weight: bold">${r.total_terjual}</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.total_pendapatan)}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Penjualan & Performa Produk', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Qty Terjual', value: `${summary.total_terjual || 0} Item`, icon: 'pi pi-shopping-bag', color: 'green' },
    { label: 'Total Omzet Produk', value: formatRupiah(summary.total_omzet || 0), icon: 'pi pi-chart-line', color: 'blue' },
    { label: 'Total Varian Produk', value: `${summary.total_produk || data.length} Produk`, icon: 'pi pi-box', color: 'purple' },
    { label: 'Stok Menipis / Kritis', value: `${data.filter((d) => d.stok_tersedia <= (d.stok_minimum || 5)).length} Produk`, icon: 'pi pi-exclamation-triangle', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-box"
        title="Laporan Produk"
        subtitle="Analisis pergerakan stok, volume penjualan skincare & obat, dan performansi omzet produk klinik."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Aktif / Stok Aman', color: '#22c55e' },
            { label: 'Stok Menipis', color: '#eab308' },
            { label: 'Stok Habis / Nonaktif', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Produk Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedKategori || selectedStatusStok || selectedStatus)}
              onReset={() => {
                setKeyword('');
                setSelectedKategori(null);
                setSelectedStatusStok(null);
                setSelectedStatus(null);
                fetchData(null, null, null, '');
              }}
              searchPlaceholder="Cari Kode Produk, Nama, Kategori..."
              filterOverlay={(closePopup) => (
                <LaporanFilterPopup
                  title="Filter Laporan Produk"
                  onClose={closePopup}
                  onApply={() => {
                    fetchData(selectedKategori, selectedStatusStok, selectedStatus);
                    closePopup();
                  }}
                  onReset={() => {
                    setSelectedKategori(null);
                    setSelectedStatusStok(null);
                    setSelectedStatus(null);
                    fetchData(null, null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Kategori Produk</label>
                    <Dropdown
                      value={selectedKategori}
                      options={optionsKategori}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Kategori Produk"
                      filter
                      showClear
                      filterPlaceholder="Cari Kategori..."
                      className="w-full text-sm"
                      onChange={(e) => setSelectedKategori(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Level Stok Produk</label>
                    <Dropdown
                      value={selectedStatusStok}
                      options={optionsStatusStok}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Level Stok"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatusStok(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Produk</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusProduk}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isHabis = r.stok_tersedia <= 0 || r.status === 'nonaktif';
              const isMenipis = r.stok_tersedia <= r.stok_minimum;
              const color = isHabis ? '#ef4444' : isMenipis ? '#eab308' : '#22c55e';
              return <StatusSquare color={color} tooltip={isHabis ? 'Stok Habis' : isMenipis ? 'Stok Menipis' : 'Aktif / Aman'} />;
            }}
          />
          <Column field="kode_produk" header="Kode" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_produk" header="Nama Produk" sortable className="font-semibold text-gray-800" style={{ minWidth: '14rem' }} />
          <Column field="nama_kategori" header="Kategori" body={(r) => r.nama_kategori || '-'} style={{ minWidth: '9rem' }} />
          <Column
            field="stok_tersedia"
            header="Sisa Stok"
            align="center"
            body={(r) => (
              <span className={r.stok_tersedia <= r.stok_minimum ? 'text-red-600 font-bold' : 'text-gray-800'}>
                {r.stok_tersedia} {r.satuan || ''}
              </span>
            )}
            style={{ minWidth: '8rem' }}
          />
          <Column field="harga_jual" header="Harga Satuan" align="right" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_jual)}</span>} style={{ minWidth: '9rem' }} />
          <Column
            field="total_terjual"
            header="Qty Terjual"
            sortable
            align="center"
            body={(r) => <span className="font-bold text-blue-700">{r.total_terjual}</span>}
            style={{ minWidth: '8rem' }}
          />
          <Column
            field="total_pendapatan"
            header="Total Omzet"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_pendapatan)}</span>}
            style={{ minWidth: '10rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   4. LAPORAN PAKET VIEW
   ========================================================================= */
export const LaporanPaketView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const [selectedPaket, setSelectedPaket] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState<boolean>(false);
  const toast = useRef<Toast>(null);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedRuangan, setSelectedRuangan] = useState<string | null>(null);
  const [selectedTipe, setSelectedTipe] = useState<string | null>(null);
  const [optionsRuangan, setOptionsRuangan] = useState<any[]>([]);

  const optionsStatusPaket = [
    { label: 'Semua Status', value: '' },
    { label: 'Aktif', value: 'aktif' },
    { label: 'Nonaktif', value: 'nonaktif' },
  ];

  const optionsTipePaket = [
    { label: 'Semua Tipe', value: '' },
    { label: 'Beauty Treatment', value: 'BEAUTY TREATMENT' },
    { label: 'Clinic Treatment', value: 'CLINIC TREATMENT' },
  ];

  const fetchOptions = async () => {
    try {
      const res = await postData('/master/laporan/options', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setOptionsRuangan(res.data.data?.ruangan || []);
      }
    } catch (_) {}
  };

  const fetchData = async (
    kw = keyword,
    sStatus = selectedStatus,
    sRuangan = selectedRuangan,
    sTipe = selectedTipe
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword };
      if (sStatus) payload.status = sStatus;
      if (sRuangan) payload.kode_ruangan = sRuangan;
      if (sTipe) payload.tipe = sTipe;
      const res = await postData('/master/laporan/paket', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data paket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchData();
  }, []);

  const toggleRowExpansion = (paket: any) => {
    let _expandedRows: any = { ...expandedRows };
    if (_expandedRows[paket.kode_paket_layanan]) {
      delete _expandedRows[paket.kode_paket_layanan];
    } else {
      _expandedRows[paket.kode_paket_layanan] = true;
    }
    setExpandedRows(_expandedRows);
  };

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Paket': r.kode_paket_layanan,
      'Nama Paket': r.nama || r.nama_paket,
      'Tipe Paket': r.tipe || 'BEAUTY TREATMENT',
      Ruangan: r.nama_ruangan || '-',
      'Jumlah Layanan': r.details?.length || 0,
      'Harga Paket (Rp)': r.harga_paket,
      'Masa Berlaku': r.is_selamanya ? 'Selamanya' : `${r.masa_berlaku_hari} Hari`,
      Status: r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Paket_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Nama Paket', 'Tipe', 'Ruangan', 'Layanan', 'Harga', 'Masa Berlaku', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_paket_layanan}</strong></td>
        <td>${r.nama || r.nama_paket}</td>
        <td>${r.tipe || 'BEAUTY TREATMENT'}</td>
        <td>${r.nama_ruangan || '-'}</td>
        <td style="text-align: center">${r.details?.length || 0} Item</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.harga_paket)}</td>
        <td style="text-align: center">${r.is_selamanya ? 'Selamanya' : `${r.masa_berlaku_hari || 0} Hari`}</td>
        <td style="text-align: center">${r.status === 'aktif' ? 'AKTIF' : 'NONAKTIF'}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Paket Treatment', cols, rows);
  };

  const rowExpansionTemplate = (pkt: any) => (
    <div className="p-3 bg-gray-50 border-round-lg border-1 surface-border my-1">
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
        Rincian Layanan Dalam Paket ({pkt.details?.length || 0} Layanan)
      </span>
      {(!pkt.details || pkt.details.length === 0) ? (
        <div className="text-xs text-gray-400 italic py-1">Tidak ada rincian layanan dalam paket ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse bg-white border-round-lg overflow-hidden border-1 surface-border">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px]">
                <th className="p-2">#</th>
                <th className="p-2">Kode Layanan</th>
                <th className="p-2">Nama Layanan</th>
                <th className="p-2 text-center">Jumlah Sesi</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {pkt.details.map((dItem: any, dIdx: number) => (
                <tr key={dIdx} className="border-bottom-1 surface-border hover:bg-gray-50">
                  <td className="p-2 text-gray-500 font-medium">{dIdx + 1}</td>
                  <td className="p-2 font-mono text-gray-600 font-semibold">{dItem.kode_layanan || '-'}</td>
                  <td className="p-2 font-bold text-gray-800">{dItem.nama_layanan}</td>
                  <td className="p-2 text-center font-bold text-purple-700">{dItem.jumlah_sesi} Sesi</td>
                  <td className="p-2 text-center">
                    <Tag
                      value={dItem.status_layanan === 'nonaktif' ? 'NONAKTIF' : 'AKTIF'}
                      severity={dItem.status_layanan === 'nonaktif' ? 'danger' : 'success'}
                      className="text-[10px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Paket Terdaftar', value: `${data.length} Paket`, icon: 'pi pi-tags', color: 'blue' },
    { label: 'Paket Aktif', value: `${data.filter((d) => d.status === 'aktif').length} Aktif`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Paket Masa Selamanya', value: `${data.filter((d) => d.is_selamanya).length} Paket`, icon: 'pi pi-infinity', color: 'purple' },
    { label: 'Paket Nonaktif', value: `${data.filter((d) => d.status === 'nonaktif').length} Nonaktif`, icon: 'pi pi-ban', color: 'red' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-tags"
        title="Laporan Paket"
        subtitle="Daftar paket bundling treatment kecantikan, komposisi multi-sesi layanan, dan periode masa berlaku."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Aktif', color: '#22c55e' },
            { label: 'Tidak Aktif', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Paket Tidak Ditemukan"
          className="p-datatable-sm"
          expandedRows={expandedRows}
          onRowToggle={(e) => setExpandedRows(e.data)}
          rowExpansionTemplate={rowExpansionTemplate}
          dataKey="kode_paket_layanan"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedStatus || selectedRuangan || selectedTipe)}
              onReset={() => {
                setKeyword('');
                setSelectedStatus(null);
                setSelectedRuangan(null);
                setSelectedTipe(null);
                fetchData('', null, null, null);
              }}
              searchPlaceholder="Cari Kode Paket, Nama Paket..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Paket"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus(null);
                    setSelectedRuangan(null);
                    setSelectedTipe(null);
                    fetchData(undefined, null, null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Paket</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusPaket}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Ruangan Layanan</label>
                    <Dropdown
                      value={selectedRuangan}
                      options={optionsRuangan}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Ruangan"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedRuangan(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Tipe Paket</label>
                    <Dropdown
                      value={selectedTipe}
                      options={optionsTipePaket}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Tipe"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedTipe(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column expander style={{ width: '3rem' }} />
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => (
              <StatusSquare
                color={r.status === 'aktif' ? '#22c55e' : '#ef4444'}
                tooltip={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
              />
            )}
          />
          <Column field="kode_paket_layanan" header="Kode Paket" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '10rem' }} />
          <Column field="nama" header="Nama Paket" sortable className="font-semibold text-gray-800" style={{ minWidth: '14rem' }} />
          <Column
            field="tipe"
            header="Tipe Paket"
            sortable
            body={(r) => {
              const val = r.tipe || 'BEAUTY TREATMENT';
              let severity: 'danger' | 'info' | 'success' | 'warning' = 'info';
              if (val === 'MEDICAL TREATMENT') severity = 'danger';
              else if (val === 'SERVICE TREATMENT') severity = 'success';
              return <Tag value={val} severity={severity} className="text-xs px-2 py-0.5" />;
            }}
            style={{ minWidth: '10rem' }}
          />
          <Column
            field="nama_ruangan"
            header="Ruangan"
            body={(r) => r.nama_ruangan || '-'}
            style={{ minWidth: '9rem' }}
          />
          <Column
            header="Rincian"
            body={(r) => (
              <Button
                label={`Lihat (${r.details?.length || 0})`}
                icon="pi pi-eye"
                text
                size="small"
                className="p-button-sm text-primary font-semibold p-1"
                onClick={() => toggleRowExpansion(r)}
              />
            )}
            style={{ minWidth: '7rem' }}
          />
          <Column
            field="harga_paket"
            header="Harga Paket"
            align="right"
            body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_paket)}</span>}
            style={{ minWidth: '9rem' }}
          />
          <Column
            field="masa_berlaku_hari"
            header="Masa Berlaku"
            align="center"
            body={(r) =>
              Boolean(r.is_selamanya) ? (
                <Tag value="Selamanya" severity="success" icon="pi pi-infinity" className="text-xs" />
              ) : (
                `${r.masa_berlaku_hari || 0} Hari`
              )
            }
            style={{ minWidth: '8rem' }}
          />
        </DataTable>
      </div>

      <Dialog
        header={`Rincian Paket: ${selectedPaket?.nama || selectedPaket?.nama_paket || ''}`}
        visible={showDetailDialog}
        style={{ width: '500px' }}
        onHide={() => setShowDetailDialog(false)}
      >
        <div className="flex flex-column gap-3">
          <div className="surface-ground p-3 border-round-lg">
            <div className="text-sm font-bold text-gray-800">{selectedPaket?.nama || selectedPaket?.nama_paket}</div>
            <div className="text-xs text-gray-500 mt-1">Ruangan: {selectedPaket?.nama_ruangan || '-'}</div>
            <div className="text-sm font-bold text-green-600 mt-1">Harga: {formatRupiah(selectedPaket?.harga_paket)}</div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

/* =========================================================================
   5. LAPORAN PASIEN VIEW
   ========================================================================= */
export const LaporanPasienView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsGender = [
    { label: 'Semua Gender', value: '' },
    { label: 'Laki-laki (L)', value: 'L' },
    { label: 'Perempuan (P)', value: 'P' },
  ];

  const optionsStatusPasien = [
    { label: 'Semua Status', value: '' },
    { label: 'Aktif', value: 'aktif' },
    { label: 'Tidak Aktif', value: 'nonaktif' },
  ];

  const fetchData = async (
    kw = keyword,
    sGender = selectedGender,
    sStatus = selectedStatus
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword, perPage: 100 };
      if (sGender) payload.jenis_kelamin = sGender;
      if (sStatus) payload.status = sStatus;
      const res = await postData('/master/laporan/pasien', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data pasien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'No. RM': r.no_rm,
      'Nama Pasien': r.nama,
      Gender: r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      'No. HP': r.no_hp || '-',
      'Kota/Kabupaten': r.kota_kabupaten || '-',
      'Total Kunjungan': r.total_kunjungan,
      'Akumulasi Transaksi': r.total_transaksi,
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Pasien_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'No. RM', 'Nama Pasien', 'Gender', 'No. HP', 'Kota/Kab', 'Kunjungan', 'Total Belanja'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.no_rm}</strong></td>
        <td>${r.nama}</td>
        <td style="text-align: center">${r.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
        <td>${r.no_hp || '-'}</td>
        <td>${r.kota_kabupaten || '-'}</td>
        <td style="text-align: center; font-weight: bold">${r.total_kunjungan}x</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.total_transaksi)}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Pasien', cols, rows);
  };

  const totalAkumulasi = data.reduce((acc, curr) => acc + (parseFloat(curr.total_transaksi) || 0), 0);

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Pasien Terdaftar', value: `${data.length} Pasien`, icon: 'pi pi-users', color: 'blue' },
    { label: 'Pasien Perempuan', value: `${data.filter((d) => d.jenis_kelamin === 'P').length} Pasien`, icon: 'pi pi-heart', color: 'purple' },
    { label: 'Pasien Laki-laki', value: `${data.filter((d) => d.jenis_kelamin === 'L').length} Pasien`, icon: 'pi pi-user', color: 'green' },
    { label: 'Akumulasi Belanja Pasien', value: formatRupiah(totalAkumulasi), icon: 'pi pi-wallet', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-users"
        title="Laporan Pasien"
        subtitle="Data pertumbuhan pasien, demografi, riwayat kunjungan, dan akumulasi belanja pasien klinik."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Aktif', color: '#22c55e' },
            { label: 'Tidak Aktif', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Pasien Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedGender || selectedStatus)}
              onReset={() => {
                setKeyword('');
                setSelectedGender(null);
                setSelectedStatus(null);
                fetchData('', null, null);
              }}
              searchPlaceholder="Cari No RM, Nama Pasien, Kontak..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Pasien"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedGender(null);
                    setSelectedStatus(null);
                    fetchData(undefined, null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Jenis Kelamin</label>
                    <Dropdown
                      value={selectedGender}
                      options={optionsGender}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Gender"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedGender(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Pasien</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusPasien}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => (
              <StatusSquare
                color={r.status === 'aktif' || !r.status ? '#22c55e' : '#ef4444'}
                tooltip={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
              />
            )}
          />
          <Column field="no_rm" header="No. RM" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama" header="Nama Pasien" sortable className="font-semibold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column field="jenis_kelamin" header="Gender" body={(r) => (r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan')} style={{ minWidth: '8rem' }} />
          <Column field="no_hp" header="No. HP" style={{ minWidth: '10rem' }} />
          <Column field="kota_kabupaten" header="Kota/Kab" body={(r) => r.kota_kabupaten || '-'} style={{ minWidth: '9rem' }} />
          <Column
            field="total_kunjungan"
            header="Frekuensi Kunjungan"
            sortable
            align="center"
            body={(r) => <span className="font-bold text-blue-700">{r.total_kunjungan}x</span>}
            style={{ minWidth: '10rem' }}
          />
          <Column
            field="total_transaksi"
            header="Akumulasi Belanja"
            sortable
            align="right"
            body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.total_transaksi)}</span>}
            style={{ minWidth: '11rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   6. LAPORAN KUNJUNGAN VIEW
   ========================================================================= */
export const LaporanKunjunganView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tglDari, setTglDari] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tglSampai, setTglSampai] = useState<Date | null>(() => new Date());
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedRuangan, setSelectedRuangan] = useState<string | null>(null);

  const [optionsStatus, setOptionsStatus] = useState<any[]>([
    { label: 'Berlangsung', value: 'berlangsung' },
    { label: 'Selesai', value: 'selesai' },
    { label: 'Batal', value: 'batal' },
  ]);
  const [optionsRuangan, setOptionsRuangan] = useState<any[]>([]);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await postData('/master/laporan/options', {});
        if (res?.data?.data) {
          if (res.data.data.status_kunjungan) setOptionsStatus(res.data.data.status_kunjungan);
          if (res.data.data.ruangan) setOptionsRuangan(res.data.data.ruangan);
        }
      } catch (_) {}
    };
    loadOptions();
  }, []);

  const fetchData = async (
    overrideStatus?: string[],
    overrideRuangan?: string | null,
    overrideTglDari?: Date | null,
    overrideTglSampai?: Date | null,
    overrideKeyword?: string
  ) => {
    setLoading(true);
    try {
      const activeStatus = overrideStatus !== undefined ? overrideStatus : selectedStatus;
      const activeRuangan = overrideRuangan !== undefined ? overrideRuangan : selectedRuangan;
      const activeTglDari = overrideTglDari !== undefined ? overrideTglDari : tglDari;
      const activeTglSampai = overrideTglSampai !== undefined ? overrideTglSampai : tglSampai;
      const activeKeyword = overrideKeyword !== undefined ? overrideKeyword : keyword;

      const payload: any = {
        keyword: activeKeyword || undefined,
        status: activeStatus.length > 0 ? activeStatus : undefined,
        kode_ruangan: activeRuangan || undefined,
        tanggal_dari: activeTglDari ? activeTglDari.toISOString().slice(0, 10) : null,
        tanggal_sampai: activeTglSampai ? activeTglSampai.toISOString().slice(0, 10) : null,
        perPage: 100,
      };
      const res = await postData('/master/laporan/kunjungan', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data kunjungan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tglDari, tglSampai]);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Kunjungan': r.kode_kunjungan,
      'Nama Pasien': r.nama_pasien,
      'No. RM': r.no_rm,
      'Waktu Kunjungan': `${formatDateIndo(r.tanggal_kunjungan)} (${r.jam_datang || '-'} WIB)`,
      'Sesi Pelayanan': `${r.total_antrian_layanan || 0} Sesi`,
      Status: String(r.status_kunjungan || '').toUpperCase(),
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Kunjungan_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Pasien', 'No. RM', 'Waktu Datang', 'Sesi Pelayanan', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_kunjungan}</strong></td>
        <td>${r.nama_pasien}</td>
        <td style="text-align: center">${r.no_rm}</td>
        <td>${formatDateIndo(r.tanggal_kunjungan)} (${r.jam_datang || '-'})</td>
        <td style="text-align: center">${r.total_antrian_layanan || 0} Sesi</td>
        <td style="text-align: center">${String(r.status_kunjungan || '').toUpperCase()}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Kunjungan Pasien', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Kunjungan', value: `${data.length} Pasien`, icon: 'pi pi-calendar', color: 'blue' },
    { label: 'Kunjungan Selesai', value: `${data.filter((d) => d.status_kunjungan === 'selesai').length} Selesai`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Sedang Berlangsung', value: `${data.filter((d) => d.status_kunjungan === 'berlangsung').length} Pasien`, icon: 'pi pi-clock', color: 'purple' },
    { label: 'Total Sesi Pelayanan', value: `${data.reduce((acc, curr) => acc + (curr.total_antrian_layanan || 0), 0)} Sesi`, icon: 'pi pi-building', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-calendar"
        title="Laporan Kunjungan"
        subtitle="Rekapitulasi log kunjungan pasien harian, alur antrean poli/ruangan, dan status pelayanan klinik."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Selesai', color: '#22c55e' },
            { label: 'Berlangsung', color: '#0284c7' },
            { label: 'Menunggu', color: '#eab308' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Kunjungan Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tglDari}
              setTanggalAwal={(d) => setTglDari(d)}
              tanggalAkhir={tglSampai}
              setTanggalAkhir={(d) => setTglSampai(d)}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={selectedStatus.length > 0 || Boolean(selectedRuangan)}
              onReset={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setTglDari(firstDay);
                setTglSampai(now);
                setKeyword('');
                setSelectedStatus([]);
                setSelectedRuangan(null);
                fetchData([], null, firstDay, now, '');
              }}
              searchPlaceholder="Cari Kode Kunjungan, Pasien, No RM..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Kunjungan"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus([]);
                    setSelectedRuangan(null);
                    fetchData([], null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Kunjungan</label>
                    <MultiSelect
                      value={selectedStatus}
                      options={optionsStatus}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status Kunjungan"
                      display="chip"
                      selectAll={true}
                      showSelectAll={true}
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || [])}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Ruangan Tujuan</label>
                    <Dropdown
                      value={selectedRuangan}
                      options={optionsRuangan}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Ruangan"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedRuangan(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isSuccess = r.status_kunjungan === 'selesai';
              const isProcess = r.status_kunjungan === 'berlangsung';
              const color = isSuccess ? '#22c55e' : isProcess ? '#0284c7' : '#eab308';
              return <StatusSquare color={color} tooltip={`Status: ${r.status_kunjungan}`} />;
            }}
          />
          <Column field="kode_kunjungan" header="Kode Kunjungan" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '11rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" sortable className="font-semibold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column field="no_rm" header="No. RM" style={{ minWidth: '8rem' }} />
          <Column
            field="tanggal_kunjungan"
            header="Waktu Datang"
            body={(r) => `${formatDateIndo(r.tanggal_kunjungan)} (${r.jam_datang || '-'} WIB)`}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="total_antrian_layanan"
            header="Sesi Ruangan"
            align="center"
            body={(r) => `${r.total_antrian_layanan || 0} Sesi`}
            style={{ minWidth: '8rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   7. LAPORAN DOKTER VIEW
   ========================================================================= */
export const LaporanDokterView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsStatusDokter = [
    { label: 'Semua Status', value: '' },
    { label: 'Aktif', value: 'aktif' },
    { label: 'Tidak Aktif', value: 'nonaktif' },
  ];

  const fetchData = async (sStatus = selectedStatus, kw = keyword) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword };
      if (sStatus) payload.status = sStatus;
      const res = await postData('/master/laporan/dokter', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data dokter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Karyawan': r.kode_karyawan,
      'Nama Dokter': r.nama_dokter,
      'No. SIP': r.no_sip || '-',
      Kontak: r.no_hp || '-',
      'Konsultasi & RM': r.total_konsultasi_rm,
      'Tindakan Medis': r.total_tindakan_layanan,
      Status: r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Dokter_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Nama Dokter', 'No. SIP', 'Kontak', 'Konsultasi RM', 'Tindakan', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_karyawan}</strong></td>
        <td>${r.nama_dokter}</td>
        <td>${r.no_sip || '-'}</td>
        <td>${r.no_hp || '-'}</td>
        <td style="text-align: center; font-weight: bold">${r.total_konsultasi_rm} Pasien</td>
        <td style="text-align: center; font-weight: bold">${r.total_tindakan_layanan} Sesi</td>
        <td style="text-align: center">${r.status || 'Aktif'}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Kinerja Dokter', cols, rows);
  };

  const filteredData = keyword.trim()
    ? data.filter(
        (d) =>
          d.nama_dokter?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.kode_karyawan?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.no_sip?.toLowerCase().includes(keyword.toLowerCase())
      )
    : data;

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Dokter', value: `${data.length} Dokter`, icon: 'pi pi-user-plus', color: 'blue' },
    { label: 'Dokter Aktif', value: `${data.filter((d) => d.status === 'aktif' || !d.status).length} Aktif`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Total Konsultasi RM', value: `${data.reduce((acc, curr) => acc + (curr.total_konsultasi_rm || 0), 0)} Pasien`, icon: 'pi pi-file-medical', color: 'purple' },
    { label: 'Total Tindakan Medis', value: `${data.reduce((acc, curr) => acc + (curr.total_tindakan_layanan || 0), 0)} Sesi`, icon: 'pi pi-sparkles', color: 'indigo' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-heart"
        title="Laporan Dokter"
        subtitle="Evaluasi aktivitas konsultasi klinis, penanganan rekam medis pasien, dan performansi tindakan medis dokter."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Aktif', color: '#22c55e' },
            { label: 'Tidak Aktif', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={filteredData}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Dokter Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedStatus)}
              onReset={() => {
                setKeyword('');
                setSelectedStatus(null);
                fetchData(null, '');
              }}
              searchPlaceholder="Cari Dokter, SIP, Kontak..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Dokter"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus(null);
                    fetchData(null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Dokter</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusDokter}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => <StatusSquare active={r.status === 'aktif'} tooltip={`Status: ${r.status || 'Aktif'}`} />}
          />
          <Column field="kode_karyawan" header="Kode" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_dokter" header="Nama Dokter" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column field="no_sip" header="No. SIP" body={(r) => r.no_sip || '-'} style={{ minWidth: '11rem' }} />
          <Column field="no_hp" header="Kontak" style={{ minWidth: '10rem' }} />
          <Column
            field="total_konsultasi_rm"
            header="Konsultasi &amp; Rekam Medis"
            align="center"
            body={(r) => <span className="font-bold text-emerald-700">{r.total_konsultasi_rm} Pasien</span>}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="total_tindakan_layanan"
            header="Tindakan Medis"
            align="center"
            body={(r) => <span className="font-bold text-purple-700">{r.total_tindakan_layanan} Sesi</span>}
            style={{ minWidth: '11rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   8. LAPORAN BEAUTICIAN VIEW
   ========================================================================= */
export const LaporanBeauticianView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedJabatan, setSelectedJabatan] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsJabatan = [
    { label: 'Semua Jabatan', value: '' },
    { label: 'Beautician', value: 'beautician' },
    { label: 'Terapis', value: 'terapis' },
    { label: 'Perawat', value: 'perawat' },
  ];

  const optionsStatusBeautician = [
    { label: 'Semua Status', value: '' },
    { label: 'Aktif', value: 'aktif' },
    { label: 'Tidak Aktif', value: 'nonaktif' },
  ];

  const fetchData = async (
    sJabatan = selectedJabatan,
    sStatus = selectedStatus,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword };
      if (sJabatan) payload.jabatan = sJabatan;
      if (sStatus) payload.status = sStatus;
      const res = await postData('/master/laporan/beautician', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data beautician');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Karyawan': r.kode_karyawan,
      'Nama Petugas': r.nama_beautician,
      Jabatan: r.jabatan,
      Kontak: r.no_hp || '-',
      'Treatment Ditangani': r.total_treatment_ditangani,
      'Sesi Ruangan': r.total_sesi_ruangan,
      Status: r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Beautician_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Nama Beautician', 'Jabatan', 'Kontak', 'Treatment Ditangani', 'Sesi Ruangan'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_karyawan}</strong></td>
        <td>${r.nama_beautician}</td>
        <td>${r.jabatan || '-'}</td>
        <td>${r.no_hp || '-'}</td>
        <td style="text-align: center; font-weight: bold">${r.total_treatment_ditangani} Tindakan</td>
        <td style="text-align: center; font-weight: bold">${r.total_sesi_ruangan} Sesi</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Kinerja Beautician & Terapis', cols, rows);
  };

  const filteredData = keyword.trim()
    ? data.filter(
        (d) =>
          d.nama_beautician?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.kode_karyawan?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.jabatan?.toLowerCase().includes(keyword.toLowerCase())
      )
    : data;

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Beautician', value: `${data.length} Terapis`, icon: 'pi pi-users', color: 'blue' },
    { label: 'Terapis Aktif', value: `${data.filter((d) => d.status === 'aktif' || !d.status).length} Aktif`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Total Treatment Ditangani', value: `${data.reduce((acc, curr) => acc + (curr.total_treatment_ditangani || 0), 0)} Tindakan`, icon: 'pi pi-sparkles', color: 'purple' },
    { label: 'Total Sesi Ruangan', value: `${data.reduce((acc, curr) => acc + (curr.total_sesi_ruangan || 0), 0)} Sesi`, icon: 'pi pi-building', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-star"
        title="Laporan Beautician"
        subtitle="Monitoring aktivitas perawatan kecantikan, penanganan sesi tindakan estetika, dan kinerja terapis klinik."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Aktif', color: '#22c55e' },
            { label: 'Tidak Aktif', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={filteredData}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Beautician Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedJabatan || selectedStatus)}
              onReset={() => {
                setKeyword('');
                setSelectedJabatan(null);
                setSelectedStatus(null);
                fetchData(null, null, '');
              }}
              searchPlaceholder="Cari Beautician, Jabatan..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Beautician"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedJabatan(null);
                    setSelectedStatus(null);
                    fetchData(null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Jabatan Petugas</label>
                    <Dropdown
                      value={selectedJabatan}
                      options={optionsJabatan}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Jabatan"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedJabatan(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Petugas</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusBeautician}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => <StatusSquare active={r.status === 'aktif'} tooltip={`Status: ${r.status || 'Aktif'}`} />}
          />
          <Column field="kode_karyawan" header="Kode" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_beautician" header="Nama Petugas" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column
            field="jabatan"
            header="Jabatan"
            body={(r) => <Tag value={String(r.jabatan || '').toUpperCase()} severity="info" className="text-xs" />}
            style={{ minWidth: '9rem' }}
          />
          <Column field="no_hp" header="Kontak" style={{ minWidth: '10rem' }} />
          <Column
            field="total_treatment_ditangani"
            header="Treatment Ditangani"
            align="center"
            body={(r) => <span className="font-bold text-emerald-700">{r.total_treatment_ditangani} Tindakan</span>}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="total_sesi_ruangan"
            header="Log Ruangan Treatment"
            align="center"
            body={(r) => <span className="font-bold text-purple-700">{r.total_sesi_ruangan} Sesi</span>}
            style={{ minWidth: '12rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   9. LAPORAN INVENTORY VIEW
   ========================================================================= */
export const LaporanInventoryView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
  const [selectedStatusStok, setSelectedStatusStok] = useState<string | null>(null);
  const [optionsKategori, setOptionsKategori] = useState<any[]>([]);
  const toast = useRef<Toast>(null);

  const optionsStatusStok = [
    { label: 'Semua Level Stok', value: '' },
    { label: 'Stok Aman', value: 'aman' },
    { label: 'Stok Menipis', value: 'menipis' },
    { label: 'Stok Habis (Kosong)', value: 'habis' },
  ];

  const fetchOptions = async () => {
    try {
      const res = await postData('/master/laporan/options', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setOptionsKategori(res.data.data?.kategori_produk || []);
      }
    } catch (_) {}
  };

  const fetchData = async (
    sKat = selectedKategori,
    sStok = selectedStatusStok,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword };
      if (sKat) payload.kode_kategori_produk = sKat;
      if (sStok) payload.status_stok = sStok;
      const res = await postData('/master/laporan/inventory', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Produk': r.kode_produk,
      'Nama Produk': r.nama_produk,
      Kategori: r.nama_kategori || '-',
      'Sisa Stok': `${r.stok_tersedia} ${r.satuan || ''}`,
      'Harga Beli': r.harga_beli,
      'Harga Jual': r.harga_jual,
      'Total Nilai Aset': r.total_nilai_aset_beli,
      Status: r.stok_tersedia <= 0 ? 'HABIS' : r.stok_tersedia <= r.stok_minimum ? 'MENIPIS' : 'AMAN',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Inventory_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Nama Produk', 'Kategori', 'Sisa Stok', 'Harga Beli', 'Harga Jual', 'Nilai Aset', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_produk}</strong></td>
        <td>${r.nama_produk}</td>
        <td>${r.nama_kategori || '-'}</td>
        <td style="text-align: center">${r.stok_tersedia} ${r.satuan || ''}</td>
        <td style="text-align: right">${formatRupiah(r.harga_beli)}</td>
        <td style="text-align: right">${formatRupiah(r.harga_jual)}</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.total_nilai_aset_beli)}</td>
        <td style="text-align: center">${r.stok_tersedia <= 0 ? 'HABIS' : r.stok_tersedia <= r.stok_minimum ? 'MENIPIS' : 'AMAN'}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Status Persediaan Stok (Inventory)', cols, rows);
  };

  const filteredData = keyword.trim()
    ? data.filter(
        (d) =>
          d.nama_produk?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.kode_produk?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.nama_kategori?.toLowerCase().includes(keyword.toLowerCase())
      )
    : data;

  const summaryCards: SummaryCardItem[] = [
    { label: 'Nilai Aset (Harga Beli)', value: formatRupiah(summary.total_aset_beli || 0), icon: 'pi pi-wallet', color: 'blue' },
    { label: 'Estimasi Nilai Jual', value: formatRupiah(summary.total_aset_jual || 0), icon: 'pi pi-chart-line', color: 'green' },
    { label: 'Peringatan Stok Menipis', value: `${summary.produk_menipis || 0} Produk`, icon: 'pi pi-exclamation-triangle', color: 'amber' },
    { label: 'Stok Habis (Kosong)', value: `${data.filter((d) => d.stok_tersedia <= 0).length} Produk`, icon: 'pi pi-times-circle', color: 'red' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-database"
        title="Laporan Inventory"
        subtitle="Monitoring status persediaan stok produk gudang klinik, valuasi aset beli/jual, dan pemantauan level stok aman."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Stok Aman', color: '#22c55e' },
            { label: 'Stok Menipis', color: '#eab308' },
            { label: 'Stok Habis', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={filteredData}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Inventory Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedKategori || selectedStatusStok)}
              onReset={() => {
                setKeyword('');
                setSelectedKategori(null);
                setSelectedStatusStok(null);
                fetchData(null, null, '');
              }}
              searchPlaceholder="Cari Produk, Kode, Kategori..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Inventory"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedKategori(null);
                    setSelectedStatusStok(null);
                    fetchData(null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Kategori Produk</label>
                    <Dropdown
                      value={selectedKategori}
                      options={optionsKategori}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Kategori"
                      filter
                      showClear
                      filterPlaceholder="Cari Kategori..."
                      className="w-full text-sm"
                      onChange={(e) => setSelectedKategori(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Level Persediaan Stok</label>
                    <Dropdown
                      value={selectedStatusStok}
                      options={optionsStatusStok}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Level Stok"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatusStok(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isHabis = r.stok_tersedia <= 0;
              const isMenipis = r.stok_tersedia <= r.stok_minimum;
              const color = isHabis ? '#ef4444' : isMenipis ? '#eab308' : '#22c55e';
              return <StatusSquare color={color} tooltip={isHabis ? 'Stok Habis' : isMenipis ? 'Stok Menipis' : 'Stok Aman'} />;
            }}
          />
          <Column field="kode_produk" header="Kode" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_produk" header="Nama Produk" sortable className="font-semibold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column field="nama_kategori" header="Kategori" body={(r) => r.nama_kategori || '-'} style={{ minWidth: '9rem' }} />
          <Column
            field="stok_tersedia"
            header="Sisa Stok"
            align="center"
            body={(r) => (
              <span className={r.stok_tersedia <= r.stok_minimum ? 'text-red-600 font-bold' : 'text-gray-800'}>
                {r.stok_tersedia} {r.satuan}
              </span>
            )}
            style={{ minWidth: '8rem' }}
          />
          <Column field="harga_beli" header="Harga Beli" align="right" body={(r) => formatRupiah(r.harga_beli)} style={{ minWidth: '9rem' }} />
          <Column field="harga_jual" header="Harga Jual" align="right" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_jual)}</span>} style={{ minWidth: '9rem' }} />
          <Column
            field="total_nilai_aset_beli"
            header="Nilai Aset"
            align="right"
            body={(r) => <span className="font-bold text-blue-700">{formatRupiah(r.total_nilai_aset_beli)}</span>}
            style={{ minWidth: '10rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   10. LAPORAN VOUCHER VIEW
   ========================================================================= */
export const LaporanVoucherView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedJenisDiskon, setSelectedJenisDiskon] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsStatusVoucher = [
    { label: 'Semua Status', value: '' },
    { label: 'Aktif', value: 'aktif' },
    { label: 'Tidak Aktif / Nonaktif', value: 'nonaktif' },
  ];

  const optionsJenisDiskon = [
    { label: 'Semua Jenis Diskon', value: '' },
    { label: 'Persentase (%)', value: 'persen' },
    { label: 'Nominal Tetap (Rp)', value: 'nominal' },
  ];

  const fetchData = async (
    sStatus = selectedStatus,
    sJenis = selectedJenisDiskon,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw !== undefined ? kw : keyword };
      if (sStatus) payload.status = sStatus;
      if (sJenis) payload.jenis_diskon = sJenis;
      const res = await postData('/master/laporan/voucher', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data voucher');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Promo': r.kode_promo,
      'Nama Promo': r.nama_promo,
      'Nilai Diskon': r.jenis_diskon === 'persen' ? `${parseFloat(r.nilai_diskon)}%` : r.nilai_diskon,
      'Mulai Berlaku': formatDateIndo(r.tanggal_mulai),
      'Selesai Berlaku': formatDateIndo(r.tanggal_selesai),
      'Item Terkait': `${r.total_item_terkait} Item`,
      Status: String(r.status || '').toUpperCase(),
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Voucher_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode', 'Nama Promo', 'Diskon', 'Periode Berlaku', 'Item Terkait', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_promo}</strong></td>
        <td>${r.nama_promo}</td>
        <td style="text-align: right; font-weight: bold">${r.jenis_diskon === 'persen' ? `${parseFloat(r.nilai_diskon)}%` : formatRupiah(r.nilai_diskon)}</td>
        <td>${formatDateIndo(r.tanggal_mulai)} s.d ${formatDateIndo(r.tanggal_selesai)}</td>
        <td style="text-align: center">${r.total_item_terkait} Item</td>
        <td style="text-align: center">${String(r.status || '').toUpperCase()}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Voucher & Program Promo', cols, rows);
  };

  const filteredData = keyword.trim()
    ? data.filter(
        (d) =>
          d.nama_promo?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.kode_promo?.toLowerCase().includes(keyword.toLowerCase())
      )
    : data;

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Voucher Promo', value: `${data.length} Program`, icon: 'pi pi-ticket', color: 'blue' },
    { label: 'Promo Aktif', value: `${data.filter((d) => d.status === 'aktif').length} Aktif`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Promo Persentase', value: `${data.filter((d) => d.jenis_diskon === 'persen').length} Program`, icon: 'pi pi-percentage', color: 'purple' },
    { label: 'Promo Nominal Tetap', value: `${data.filter((d) => d.jenis_diskon !== 'persen').length} Program`, icon: 'pi pi-money-bill', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-ticket"
        title="Laporan Voucher"
        subtitle="Monitoring program diskon promosi, kuota voucher, masa berlaku promo, dan efektivitas marketing klinik."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Aktif', color: '#22c55e' },
            { label: 'Tidak Aktif / Nonaktif', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={filteredData}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Voucher Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              isFiltered={Boolean(selectedStatus || selectedJenisDiskon)}
              onReset={() => {
                setKeyword('');
                setSelectedStatus(null);
                setSelectedJenisDiskon(null);
                fetchData(null, null, '');
              }}
              searchPlaceholder="Cari Nama Promo, Kode..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Voucher"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus(null);
                    setSelectedJenisDiskon(null);
                    fetchData(null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Voucher</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusVoucher}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Jenis Potongan Diskon</label>
                    <Dropdown
                      value={selectedJenisDiskon}
                      options={optionsJenisDiskon}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Jenis Diskon"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedJenisDiskon(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => <StatusSquare active={r.status === 'aktif'} tooltip={`Status: ${r.status || 'Aktif'}`} />}
          />
          <Column field="kode_promo" header="Kode Promo" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_promo" header="Nama Program Promo" sortable className="font-semibold text-gray-800" style={{ minWidth: '14rem' }} />
          <Column
            field="nilai_diskon"
            header="Besaran Diskon"
            align="right"
            body={(r) => (
              <span className="font-bold text-rose-700">
                {r.jenis_diskon === 'persen' ? `${parseFloat(r.nilai_diskon)}%` : formatRupiah(r.nilai_diskon)}
              </span>
            )}
            style={{ minWidth: '10rem' }}
          />
          <Column
            header="Periode Berlaku"
            body={(r) => `${formatDateIndo(r.tanggal_mulai)} s.d ${formatDateIndo(r.tanggal_selesai)}`}
            style={{ minWidth: '13rem' }}
          />
          <Column
            field="total_item_terkait"
            header="Item Promo"
            align="center"
            body={(r) => `${r.total_item_terkait} Item`}
            style={{ minWidth: '8rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   11. LAPORAN KEUANGAN VIEW
   ========================================================================= */
export const LaporanKeuanganView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState<Date | null>(() => new Date());
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedMetode, setSelectedMetode] = useState<string | null>(null);
  const [optionsStatus, setOptionsStatus] = useState<any[]>([]);
  const [optionsMetode, setOptionsMetode] = useState<any[]>([]);
  const toast = useRef<Toast>(null);

  const fetchOptions = async () => {
    try {
      const res = await postData('/master/laporan/options', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setOptionsStatus(res.data.data?.status_penjualan || []);
        setOptionsMetode(res.data.data?.metode_bayar || []);
      }
    } catch (_) {}
  };

  const fetchData = async (
    sStatus = selectedStatus,
    sMetode = selectedMetode,
    start = startDate,
    end = endDate
  ) => {
    setLoading(true);
    try {
      const payload: any = {};
      if (start) {
        payload.tanggal_dari = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      }
      if (end) {
        payload.tanggal_sampai = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      }
      if (sStatus && sStatus.length > 0) {
        payload.status = sStatus;
      }
      if (sMetode) {
        payload.metode_bayar = sMetode;
      }
      const res = await postData('/master/laporan/keuangan', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchData();
  }, [startDate, endDate]);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      Tanggal: formatDateIndo(r.tanggal),
      'Jumlah Transaksi': r.jumlah_transaksi,
      'Total Bruto (Rp)': r.total_bruto,
      'Total Diskon (Rp)': r.total_diskon,
      'Total Netto (Rp)': r.total_netto,
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Tanggal', 'Jumlah Transaksi', 'Omzet Bruto', 'Potongan Diskon', 'Penerimaan Bersih (Netto)'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td>${formatDateIndo(r.tanggal)}</td>
        <td style="text-align: center">${r.jumlah_transaksi} Trx</td>
        <td style="text-align: right">${formatRupiah(r.total_bruto)}</td>
        <td style="text-align: right; color: #dc2626">${r.total_diskon > 0 ? `-${formatRupiah(r.total_diskon)}` : 'Rp 0'}</td>
        <td style="text-align: right; font-weight: bold; color: #047857">${formatRupiah(r.total_netto)}</td>
      </tr>
    `
      )
      .join('');
    const sumHtml = `
      <div style="display: flex; justify-content: space-around; background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
        <div><strong>Total Penerimaan Bersih:</strong> ${formatRupiah(summary.total_netto || 0)}</div>
        <div><strong>Total Omzet Bruto:</strong> ${formatRupiah(summary.total_bruto || 0)}</div>
        <div><strong>Total Diskon:</strong> ${formatRupiah(summary.total_diskon || 0)}</div>
      </div>
    `;
    printHtmlTable('Laporan Keuangan & Mutasi Kas Harian', cols, rows, sumHtml);
  };

  const filteredData = keyword.trim()
    ? data.filter((d) => String(d.tanggal).includes(keyword))
    : data;

  const summaryCards: SummaryCardItem[] = [
    { label: 'Penerimaan Bersih (Netto)', value: formatRupiah(summary.total_netto || 0), icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Total Omzet Bruto', value: formatRupiah(summary.total_bruto || 0), icon: 'pi pi-wallet', color: 'blue' },
    { label: 'Potongan Diskon Diberikan', value: formatRupiah(summary.total_diskon || 0), icon: 'pi pi-percentage', color: 'red' },
    { label: 'Rata-rata Harian Netto', value: formatRupiah(data.length > 0 ? (summary.total_netto || 0) / data.length : 0), icon: 'pi pi-receipt', color: 'purple' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-wallet"
        title="Laporan Keuangan"
        subtitle="Rekapitulasi arus kas masuk, mutasi omzet bruto, potongan diskon, dan komposisi penerimaan kas harian klinik."
      />

      <LaporanSummaryCards items={summaryCards} />

      {/* BREAKDOWN METODE BAYAR */}
      {summary.breakdown_metode && summary.breakdown_metode.length > 0 && (
        <div className="mb-3">
          <div className="flex align-items-center justify-content-between mb-2">
            <span className="text-xs font-bold text-700 uppercase tracking-wider flex align-items-center gap-2">
              <i className="pi pi-credit-card text-primary text-sm" />
              Komposisi Penerimaan Kas &amp; Bank Berdasarkan Metode Bayar
            </span>
            <span className="text-xs text-500 font-semibold">
              {summary.breakdown_metode.length} Saluran Pembayaran
            </span>
          </div>
          <div className="grid">
            {summary.breakdown_metode.map((m: any, idx: number) => {
              const getMetodeStyle = (metode: string) => {
                const lower = (metode || '').toLowerCase();
                if (lower.includes('tunai') || lower.includes('cash')) {
                  return { colorText: 'text-green-700', bg: 'bg-green-50', icon: 'pi pi-money-bill text-green-600' };
                }
                if (lower.includes('qris')) {
                  return { colorText: 'text-purple-700', bg: 'bg-purple-50', icon: 'pi pi-qrcode text-purple-600' };
                }
                if (lower.includes('debit')) {
                  return { colorText: 'text-blue-700', bg: 'bg-blue-50', icon: 'pi pi-credit-card text-blue-600' };
                }
                if (lower.includes('transfer')) {
                  return { colorText: 'text-indigo-700', bg: 'bg-indigo-50', icon: 'pi pi-send text-indigo-600' };
                }
                if (lower.includes('kredit')) {
                  return { colorText: 'text-red-700', bg: 'bg-red-50', icon: 'pi pi-id-card text-red-600' };
                }
                return { colorText: 'text-teal-700', bg: 'bg-teal-50', icon: 'pi pi-wallet text-teal-600' };
              };
              const mStyle = getMetodeStyle(m.metode_bayar);

              return (
                <div key={idx} className="col-12 sm:col-6 lg:col-3">
                  <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                    <div className="flex flex-column gap-1">
                      <span className="text-xs font-bold text-500 uppercase tracking-wider">
                        {m.metode_bayar}
                      </span>
                      <span className={`text-xl font-black ${mStyle.colorText}`}>
                        {formatRupiah(m.total_nominal)}
                      </span>
                      <span className="text-xs text-500 font-medium">
                        {m.jumlah_transaksi} Transaksi
                      </span>
                    </div>
                    <div className={`p-3 ${mStyle.bg} border-round-lg`}>
                      <i className={`${mStyle.icon} text-xl`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={fetchData}
          loadingRefresh={loading}
        />

        <DataTable
          value={filteredData}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Keuangan Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onReset={() => {
                setKeyword('');
                setSelectedStatus([]);
                setSelectedMetode(null);
                fetchData([], null);
              }}
              searchPlaceholder="Cari Tanggal (YYYY-MM-DD)..."
              tanggalAwal={startDate}
              setTanggalAwal={setStartDate}
              tanggalAkhir={endDate}
              setTanggalAkhir={setEndDate}
              filterOverlay={(closePopup) => (
                <LaporanFilterPopup
                  onClose={closePopup}
                  onApply={() => {
                    fetchData(selectedStatus, selectedMetode);
                    closePopup();
                  }}
                  onReset={() => {
                    setSelectedStatus([]);
                    setSelectedMetode(null);
                    fetchData([], null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Transaksi</label>
                    <MultiSelect
                      value={selectedStatus}
                      options={optionsStatus}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      display="chip"
                      selectAll={true}
                      showSelectAll={true}
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || [])}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Metode Pembayaran</label>
                    <Dropdown
                      value={selectedMetode}
                      options={optionsMetode}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Metode"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedMetode(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column header="#" body={(_, opt) => opt.rowIndex + 1} style={{ width: '3.5rem', textAlign: 'center' }} />
          <Column field="tanggal" header="Tanggal" sortable body={(r) => formatDateIndo(r.tanggal)} className="font-semibold" style={{ minWidth: '10rem' }} />
          <Column field="jumlah_transaksi" header="Jumlah Transaksi" sortable align="center" body={(r) => `${r.jumlah_transaksi} Trx`} style={{ minWidth: '9rem' }} />
          <Column field="total_bruto" header="Omzet Bruto" align="right" body={(r) => formatRupiah(r.total_bruto)} style={{ minWidth: '10rem' }} />
          <Column
            field="total_diskon"
            header="Diskon"
            align="right"
            body={(r) => (r.total_diskon > 0 ? `-${formatRupiah(r.total_diskon)}` : 'Rp 0')}
            style={{ minWidth: '9rem', color: '#dc2626' }}
          />
          <Column
            field="total_netto"
            header="Penerimaan Bersih"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_netto)}</span>}
            style={{ minWidth: '11rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   12. LAPORAN APPOINTMENT VIEW
   ========================================================================= */
export const LaporanAppointmentView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tanggalAwal, setTanggalAwal] = useState<Date | null>(null);
  const [tanggalAkhir, setTanggalAkhir] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsStatusAppointment = [
    { label: 'Semua Status', value: '' },
    { label: 'Dikonfirmasi', value: 'dikonfirmasi' },
    { label: 'Menunggu Jadwal', value: 'menunggu' },
    { label: 'Selesai', value: 'selesai' },
    { label: 'Dibatalkan', value: 'batal' },
    { label: 'Tidak Hadir', value: 'tidak_hadir' },
  ];

  const getStatusSeverity = (st?: string) => {
    switch (st?.toLowerCase()) {
      case 'selesai':
      case 'dikonfirmasi':
        return 'success';
      case 'menunggu':
      case 'pending':
        return 'warning';
      case 'batal':
      case 'dibatalkan':
      case 'tidak_hadir':
        return 'danger';
      default:
        return 'info';
    }
  };

  const fetchData = async (
    tAwal = tanggalAwal,
    tAkhir = tanggalAkhir,
    sStatus = selectedStatus,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = {
        keyword: kw !== undefined ? kw : keyword,
        perPage: 100,
      };
      if (tAwal) payload.tanggal_dari = tAwal.toISOString().slice(0, 10);
      if (tAkhir) payload.tanggal_sampai = tAkhir.toISOString().slice(0, 10);
      if (sStatus) payload.status = sStatus;

      const res = await postData('/master/laporan/appointment', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data appointment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Booking': r.kode_booking,
      'Nama Pasien': r.nama_pasien || '-',
      'No. RM': r.no_rm,
      'Dokter Tujuan': r.dokter_tujuan || '-',
      'Jadwal Konsultasi': `${formatDateIndo(r.tanggal_booking)} (${String(r.jam_booking || '').slice(0, 5)} WIB)`,
      Layanan: r.nama_layanan || '-',
      Status: r.status?.toUpperCase() || '-',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Appointment_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode Booking', 'Nama Pasien', 'Dokter Tujuan', 'Jadwal Konsultasi', 'Layanan', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_booking}</strong></td>
        <td>${r.nama_pasien || '-'}</td>
        <td>${r.dokter_tujuan || '-'}</td>
        <td>${formatDateIndo(r.tanggal_booking)} (${String(r.jam_booking || '').slice(0, 5)} WIB)</td>
        <td>${r.nama_layanan || '-'}</td>
        <td style="text-align: center; font-weight: bold; text-transform: uppercase;">${r.status || '-'}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Appointment & Booking', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Appointment', value: `${summary.total_appointment ?? data.length} Booking`, icon: 'pi pi-calendar', color: 'blue' },
    { label: 'Appointment Terkonfirmasi', value: `${summary.terkonfirmasi ?? data.filter((d) => ['dikonfirmasi', 'selesai'].includes(d.status)).length} Selesai`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Menunggu Jadwal', value: `${summary.menunggu ?? data.filter((d) => ['menunggu', 'pending'].includes(d.status)).length} Antrean`, icon: 'pi pi-clock', color: 'amber' },
    { label: 'Batal / Tidak Hadir', value: `${summary.batal ?? data.filter((d) => ['batal', 'dibatalkan', 'tidak_hadir'].includes(d.status)).length} Batal`, icon: 'pi pi-times-circle', color: 'red' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-calendar-plus"
        title="Laporan Appointment & Booking"
        subtitle="Data riwayat booking konsultasi, jadwal appointment pasien, status reservasi, dan dokter penanggung jawab."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Selesai / Dikonfirmasi', color: '#22c55e' },
            { label: 'Menunggu Jadwal', color: '#eab308' },
            { label: 'Batal / Tidak Hadir', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Data Laporan Appointment Belum Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tanggalAwal}
              setTanggalAwal={setTanggalAwal}
              tanggalAkhir={tanggalAkhir}
              setTanggalAkhir={setTanggalAkhir}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData(tanggalAwal, tanggalAkhir, selectedStatus, keyword)}
              isFiltered={Boolean(tanggalAwal || tanggalAkhir || selectedStatus)}
              onReset={() => {
                setTanggalAwal(null);
                setTanggalAkhir(null);
                setKeyword('');
                setSelectedStatus(null);
                fetchData(null, null, null, '');
              }}
              searchPlaceholder="Cari Kode Booking, Pasien, Dokter..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Appointment"
                  onClose={close}
                  onApply={() => fetchData(tanggalAwal, tanggalAkhir, selectedStatus, keyword)}
                  onReset={() => {
                    setSelectedStatus(null);
                    fetchData(tanggalAwal, tanggalAkhir, null, keyword);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Appointment</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusAppointment}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const st = (r.status || '').toLowerCase();
              const isSuccess = st === 'selesai' || st === 'dikonfirmasi';
              const isPending = st === 'menunggu' || st === 'pending';
              const color = isSuccess ? '#22c55e' : isPending ? '#eab308' : '#ef4444';
              const tip = isSuccess ? 'Selesai / Dikonfirmasi' : isPending ? 'Menunggu Jadwal' : 'Batal / Tidak Hadir';
              return <StatusSquare color={color} tooltip={tip} />;
            }}
          />
          <Column field="kode_booking" header="Kode Booking" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '11rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column
            field="dokter_tujuan"
            header="Dokter Tujuan"
            sortable
            body={(r) => (
              <span className={r.dokter_tujuan && r.dokter_tujuan !== '-' ? 'font-medium text-teal-800' : 'text-gray-400 italic'}>
                {r.dokter_tujuan || '-'}
              </span>
            )}
            style={{ minWidth: '13rem' }}
          />
          <Column
            field="tanggal_booking"
            header="Jadwal Konsultasi"
            sortable
            body={(r) => `${formatDateIndo(r.tanggal_booking)} (${String(r.jam_booking || '').slice(0, 5)} WIB)`}
            style={{ minWidth: '13rem' }}
          />
          <Column field="nama_layanan" header="Layanan" sortable style={{ minWidth: '14rem' }} />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   13. LAPORAN STOK OPNAME VIEW
   ========================================================================= */
export const LaporanStokOpnameView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tanggalAwal, setTanggalAwal] = useState<Date | null>(null);
  const [tanggalAkhir, setTanggalAkhir] = useState<Date | null>(null);
  const [selectedJenis, setSelectedJenis] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsJenisMovement = [
    { label: 'Semua Pergerakan', value: '' },
    { label: 'Penyesuaian (Opname)', value: 'penyesuaian' },
    { label: 'Stok Masuk', value: 'masuk' },
    { label: 'Stok Keluar', value: 'keluar' },
  ];

  const fetchData = async (
    tAwal = tanggalAwal,
    tAkhir = tanggalAkhir,
    sJenis = selectedJenis,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = {
        keyword: kw !== undefined ? kw : keyword,
        perPage: 100,
      };
      if (tAwal) payload.tanggal_dari = tAwal.toISOString().slice(0, 10);
      if (tAkhir) payload.tanggal_sampai = tAkhir.toISOString().slice(0, 10);
      if (sJenis) payload.jenis_movement = sJenis;

      const res = await postData('/master/laporan/stok-opname', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data stok opname');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Produk': r.kode_produk,
      'Nama Produk': r.nama_produk || '-',
      'Stok Sistem': r.stok_sebelum,
      'Stok Fisik': r.stok_sesudah,
      'Selisih Unit': r.qty,
      Keterangan: r.referensi || r.jenis_movement || '-',
      Tanggal: formatDateIndo(r.tanggal),
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Stok_Opname_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode Produk', 'Nama Produk', 'Stok Sistem', 'Stok Fisik', 'Selisih Unit', 'Keterangan'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_produk}</strong></td>
        <td>${r.nama_produk || '-'}</td>
        <td style="text-align: center">${r.stok_sebelum}</td>
        <td style="text-align: center">${r.stok_sesudah}</td>
        <td style="text-align: center; font-weight: bold; color: ${r.stok_sesudah >= r.stok_sebelum ? '#059669' : '#dc2626'}">
          ${r.stok_sesudah >= r.stok_sebelum ? `+${r.qty}` : `-${r.qty}`}
        </td>
        <td>${r.referensi || r.jenis_movement || '-'}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Stok Opname & Penyesuaian', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Item Dihitung', value: `${summary.total_item ?? data.length} Item`, icon: 'pi pi-box', color: 'blue' },
    { label: 'Stok Sesuai', value: `${summary.stok_sesuai ?? data.filter((d) => d.stok_sebelum === d.stok_sesudah).length} Item`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Selisih Lebih', value: `${summary.selisih_lebih ?? data.filter((d) => d.stok_sesudah > d.stok_sebelum).length} Item`, icon: 'pi pi-arrow-up-right', color: 'amber' },
    { label: 'Selisih Kurang', value: `${summary.selisih_kurang ?? data.filter((d) => d.stok_sesudah < d.stok_sebelum).length} Item`, icon: 'pi pi-arrow-down-right', color: 'red' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-check-square"
        title="Laporan Stok Opname & Penyesuaian"
        subtitle="Pencatatan pergerakan stok, hasil opname fisik, selisih stok sistem vs fisik, dan log mutasi inventori produk."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Sesuai / Balance', color: '#22c55e' },
            { label: 'Surplus / Masuk', color: '#0284c7' },
            { label: 'Selisih Kurang', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Data Laporan Stok Opname Belum Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tanggalAwal}
              setTanggalAwal={setTanggalAwal}
              tanggalAkhir={tanggalAkhir}
              setTanggalAkhir={setTanggalAkhir}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData(tanggalAwal, tanggalAkhir, selectedJenis, keyword)}
              isFiltered={Boolean(tanggalAwal || tanggalAkhir || selectedJenis)}
              onReset={() => {
                setTanggalAwal(null);
                setTanggalAkhir(null);
                setKeyword('');
                setSelectedJenis(null);
                fetchData(null, null, null, '');
              }}
              searchPlaceholder="Cari Kode Produk, Nama Produk, Referensi..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Stok Opname"
                  onClose={close}
                  onApply={() => fetchData(tanggalAwal, tanggalAkhir, selectedJenis, keyword)}
                  onReset={() => {
                    setSelectedJenis(null);
                    fetchData(tanggalAwal, tanggalAkhir, null, keyword);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Jenis Movement</label>
                    <Dropdown
                      value={selectedJenis}
                      options={optionsJenisMovement}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Pergerakan"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedJenis(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isDiff = r.stok_sesudah !== r.stok_sebelum;
              const isPositive = r.stok_sesudah > r.stok_sebelum || (r.jenis_movement === 'masuk' && r.qty > 0);
              const color = !isDiff ? '#22c55e' : isPositive ? '#0284c7' : '#ef4444';
              const tip = !isDiff ? 'Sesuai' : isPositive ? 'Surplus' : 'Selisih Kurang';
              return <StatusSquare color={color} tooltip={tip} />;
            }}
          />
          <Column field="kode_produk" header="Kode Produk" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_produk" header="Nama Produk" sortable className="font-bold text-gray-800" style={{ minWidth: '14rem' }} />
          <Column field="stok_sebelum" header="Stok Sistem" sortable align="center" style={{ minWidth: '8rem' }} />
          <Column field="stok_sesudah" header="Stok Fisik" sortable align="center" style={{ minWidth: '8rem' }} />
          <Column
            field="qty"
            header="Selisih Unit"
            sortable
            align="center"
            body={(r) => {
              const isDiff = r.stok_sesudah !== r.stok_sebelum;
              const isPositive = r.stok_sesudah > r.stok_sebelum || (r.jenis_movement === 'masuk' && r.qty > 0);
              const color = isDiff ? (isPositive ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold') : 'text-gray-600';
              const sign = isDiff ? (isPositive ? '+' : '-') : '';
              return <span className={color}>{sign}{Math.abs(r.qty)} Unit</span>;
            }}
            style={{ minWidth: '9rem' }}
          />
          <Column field="referensi" header="Keterangan" body={(r) => r.referensi || r.jenis_movement || '-'} style={{ minWidth: '12rem' }} />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   14. LAPORAN PEMBELIAN VIEW
   ========================================================================= */
export const LaporanPembelianView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tanggalAwal, setTanggalAwal] = useState<Date | null>(null);
  const [tanggalAkhir, setTanggalAkhir] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  const optionsStatusPO = [
    { label: 'Semua Status PO', value: '' },
    { label: 'Diterima', value: 'diterima' },
    { label: 'Dikirim', value: 'dikirim' },
    { label: 'Draft / Menunggu', value: 'draft' },
    { label: 'Batal', value: 'batal' },
  ];

  const getStatusSeverity = (st?: string) => {
    switch (st?.toLowerCase()) {
      case 'diterima':
        return 'success';
      case 'dikirim':
        return 'info';
      case 'draft':
      case 'menunggu':
        return 'warning';
      case 'batal':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const fetchData = async (
    tAwal = tanggalAwal,
    tAkhir = tanggalAkhir,
    sStatus = selectedStatus,
    kw = keyword
  ) => {
    setLoading(true);
    try {
      const payload: any = {
        keyword: kw !== undefined ? kw : keyword,
        perPage: 100,
      };
      if (tAwal) payload.tanggal_dari = tAwal.toISOString().slice(0, 10);
      if (tAkhir) payload.tanggal_sampai = tAkhir.toISOString().slice(0, 10);
      if (sStatus) payload.status = sStatus;

      const res = await postData('/master/laporan/pembelian', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data pembelian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'No. Faktur PO': r.kode_po,
      'Tanggal Pembelian': formatDateIndo(r.tanggal_po),
      'Nama Supplier': r.nama_supplier || '-',
      'Total Item': r.total_item,
      'Nilai Tagihan': r.total_po,
      Status: r.status?.toUpperCase() || '-',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Pembelian_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'No. Faktur PO', 'Tanggal Pembelian', 'Nama Supplier', 'Total Item', 'Nilai Tagihan', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_po}</strong></td>
        <td>${formatDateIndo(r.tanggal_po)}</td>
        <td>${r.nama_supplier || '-'}</td>
        <td style="text-align: center">${r.total_item} Item</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.total_po)}</td>
        <td style="text-align: center; font-weight: bold; text-transform: uppercase;">${r.status || '-'}</td>
      </tr>
    `
      )
      .join('');
    printHtmlTable('Laporan Pembelian (Purchase Order)', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total PO Pembelian', value: `${summary.total_po ?? data.length} Transaksi`, icon: 'pi pi-shopping-bag', color: 'blue' },
    { label: 'Barang Diterima', value: `${summary.barang_diterima ?? data.filter((d) => d.status === 'diterima').length} Faktur`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Total Tagihan PO', value: formatRupiah(summary.total_tagihan_po ?? data.reduce((acc, c) => acc + (parseFloat(c.total_po) || 0), 0)), icon: 'pi pi-wallet', color: 'purple' },
    { label: 'Menunggu Supplier', value: `${summary.menunggu_supplier ?? data.filter((d) => ['draft', 'dikirim', 'menunggu'].includes(d.status)).length} PO`, icon: 'pi pi-clock', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-truck"
        title="Laporan Pembelian (Purchase Order)"
        subtitle="Rekapitulasi pengadaan barang ke supplier, status penerimaan pesanan, dan nilai tagihan purchase order."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />

        <LaporanLegendBox
          items={[
            { label: 'Diterima', color: '#22c55e' },
            { label: 'Dikirim', color: '#0284c7' },
            { label: 'Draft / Menunggu', color: '#eab308' },
            { label: 'Batal', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Data Laporan Pembelian Belum Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tanggalAwal}
              setTanggalAwal={setTanggalAwal}
              tanggalAkhir={tanggalAkhir}
              setTanggalAkhir={setTanggalAkhir}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData(tanggalAwal, tanggalAkhir, selectedStatus, keyword)}
              isFiltered={Boolean(tanggalAwal || tanggalAkhir || selectedStatus)}
              onReset={() => {
                setTanggalAwal(null);
                setTanggalAkhir(null);
                setKeyword('');
                setSelectedStatus(null);
                fetchData(null, null, null, '');
              }}
              searchPlaceholder="Cari No. Faktur PO, Supplier..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Pembelian"
                  onClose={close}
                  onApply={() => fetchData(tanggalAwal, tanggalAkhir, selectedStatus, keyword)}
                  onReset={() => {
                    setSelectedStatus(null);
                    fetchData(tanggalAwal, tanggalAkhir, null, keyword);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status PO</label>
                    <Dropdown
                      value={selectedStatus}
                      options={optionsStatusPO}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Status"
                      showClear
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const st = (r.status || '').toLowerCase();
              const color = st === 'diterima' ? '#22c55e' : st === 'dikirim' ? '#0284c7' : (st === 'draft' || st === 'menunggu') ? '#eab308' : '#ef4444';
              return <StatusSquare color={color} tooltip={`Status: ${r.status || '-'}`} />;
            }}
          />
          <Column field="kode_po" header="No. Faktur PO" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '12rem' }} />
          <Column
            field="tanggal_po"
            header="Tanggal Pembelian"
            sortable
            body={(r) => formatDateIndo(r.tanggal_po)}
            style={{ minWidth: '11rem' }}
          />
          <Column field="nama_supplier" header="Nama Supplier" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column
            field="total_item"
            header="Total Item"
            sortable
            align="center"
            body={(r) => <span className="font-medium text-gray-700">{r.total_item} Item</span>}
            style={{ minWidth: '8rem' }}
          />
          <Column
            field="total_po"
            header="Nilai Tagihan"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_po)}</span>}
            style={{ minWidth: '11rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   16. LAPORAN MEMBERSHIP VIEW
   ========================================================================= */
export const LaporanMembershipView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [optionsLevel, setOptionsLevel] = useState<any[]>([
    { label: 'Semua Level Tier', value: '' },
    { label: 'Silver', value: 'LVL-001' },
    { label: 'Gold', value: 'LVL-002' },
    { label: 'Platinum', value: 'LVL-003' },
    { label: 'Non-Member', value: 'non_member' },
  ]);
  const [summary, setSummary] = useState({ total_pasien: 0, member_aktif: 0, akumulasi_poin: 0, non_member: 0 });
  const toast = useRef<Toast>(null);

  const fetchData = async (kw = keyword, sLvl = selectedLevel, sSt = selectedStatus) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw, perPage: 100 };
      if (sLvl) payload.kode_level = sLvl;
      if (sSt) payload.status = sSt;
      const res = await postData('/master/laporan/membership', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data membership');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Member': r.no_rm,
      'No. RM': r.no_rm,
      'Nama Pasien': r.nama_pasien,
      'Level Tier': r.nama_level,
      'Tanggal Gabung': r.tanggal_gabung_membership ? formatDateIndo(r.tanggal_gabung_membership) : '-',
      'Total Poin': r.total_poin || 0,
      Status: r.status === 'aktif' ? 'Aktif' : 'Nonaktif',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Membership_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode Member', 'No. RM', 'Nama Pasien', 'Level Tier', 'Tanggal Gabung', 'Total Poin', 'Status'];
    const rows = data
      .map(
        (r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td style="text-align: center; font-family: monospace;">${r.no_rm || '-'}</td>
          <td style="text-align: center; font-family: monospace;">${r.no_rm || '-'}</td>
          <td><strong>${r.nama_pasien || '-'}</strong></td>
          <td style="text-align: center;">${r.nama_level || '-'}</td>
          <td style="text-align: center;">${r.tanggal_gabung_membership ? formatDateIndo(r.tanggal_gabung_membership) : '-'}</td>
          <td style="text-align: right; font-weight: bold;">${new Intl.NumberFormat('id-ID').format(r.total_poin || 0)}</td>
          <td style="text-align: center; text-transform: uppercase;">${r.status || '-'}</td>
        </tr>
      `
      )
      .join('');
    printHtmlTable('Laporan Membership Pasien', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Pasien Terdaftar', value: `${summary.total_pasien || data.length} Pasien`, icon: 'pi pi-users', color: 'blue' },
    { label: 'Member Aktif', value: `${summary.member_aktif} Member`, icon: 'pi pi-id-card', color: 'green' },
    { label: 'Akumulasi Poin Loyalitas', value: `${new Intl.NumberFormat('id-ID').format(summary.akumulasi_poin || 0)} Poin`, icon: 'pi pi-star-fill', color: 'amber' },
    { label: 'Non-Member / Reguler', value: `${summary.non_member} Pasien`, icon: 'pi pi-user-minus', color: 'purple' },
  ];

  const getTierSeverity = (tier: string): 'info' | 'warning' | 'secondary' | 'contrast' => {
    const t = String(tier || '').toLowerCase();
    if (t.includes('platinum')) return 'contrast';
    if (t.includes('gold')) return 'warning';
    if (t.includes('silver')) return 'info';
    return 'secondary';
  };

  return (
    <>
      <Toast ref={toast} />
      <LaporanHeader
        icon="pi pi-id-card"
        title="Laporan Membership & Loyalty Poin"
        subtitle="Daftar keanggotaan pasien, tingkatan level membership tier, tanggal bergabung, dan perolehan poin loyalitas."
      />
      <LaporanSummaryCards items={summaryCards} />
      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />
        <LaporanLegendBox
          items={[
            { label: 'Member Aktif', color: '#22c55e' },
            { label: 'Nonaktif', color: '#ef4444' },
          ]}
        />
        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Data Laporan Membership Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              searchPlaceholder="Cari Nama Pasien, No RM, Tier..."
              isFiltered={Boolean(selectedLevel || selectedStatus)}
              onReset={() => {
                setKeyword('');
                setSelectedLevel(null);
                setSelectedStatus(null);
                fetchData('', null, null);
              }}
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Membership"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedLevel(null);
                    setSelectedStatus(null);
                    fetchData(keyword, null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Level Membership</label>
                    <Dropdown
                      value={selectedLevel}
                      options={optionsLevel}
                      placeholder="Semua Level Tier"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedLevel(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Pasien</label>
                    <Dropdown
                      value={selectedStatus}
                      options={[
                        { label: 'Semua Status', value: '' },
                        { label: 'Aktif', value: 'aktif' },
                        { label: 'Nonaktif', value: 'nonaktif' },
                      ]}
                      placeholder="Semua Status Pasien"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => (
              <StatusSquare
                active={r.status === 'aktif' || !r.status}
                tooltip={r.status === 'aktif' || !r.status ? 'Member Aktif' : 'Nonaktif'}
              />
            )}
          />
          <Column field="no_rm" header="Kode Member" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '10rem' }} />
          <Column field="no_rm" header="No. RM" sortable className="font-semibold text-gray-700 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column
            field="nama_level"
            header="Level Tier"
            sortable
            align="center"
            body={(r) => <Tag value={r.nama_level || 'Non-Member'} severity={getTierSeverity(r.nama_level)} className="text-xs font-semibold px-2 py-1" />}
            style={{ minWidth: '10rem' }}
          />
          <Column
            field="tanggal_gabung_membership"
            header="Tanggal Gabung"
            sortable
            body={(r) => (r.tanggal_gabung_membership ? formatDateIndo(r.tanggal_gabung_membership) : <span className="text-gray-400 italic text-xs">-</span>)}
            style={{ minWidth: '11rem' }}
          />
          <Column
            field="total_poin"
            header="Total Poin"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-amber-600 flex align-items-center justify-content-end gap-1"><i className="pi pi-star-fill text-xs" />{new Intl.NumberFormat('id-ID').format(r.total_poin || 0)}</span>}
            style={{ minWidth: '9rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   17. LAPORAN KOMISI VIEW
   ========================================================================= */
export const LaporanKomisiView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tanggalDari, setTanggalDari] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tanggalSampai, setTanggalSampai] = useState<Date | null>(() => new Date());
  const [selectedStatusPencairan, setSelectedStatusPencairan] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total_tindakan: 0, total_omzet: 0, total_komisi: 0, komisi_dicairkan: 0 });
  const toast = useRef<Toast>(null);

  const fetchData = async (
    kw = keyword,
    tDari = tanggalDari,
    tSampai = tanggalSampai,
    sCair = selectedStatusPencairan
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw, perPage: 100 };
      if (tDari) payload.tanggal_dari = tDari.toISOString().slice(0, 10);
      if (tSampai) payload.tanggal_sampai = tSampai.toISOString().slice(0, 10);
      if (sCair) payload.status_pencairan = sCair;
      const res = await postData('/master/laporan/komisi', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data komisi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tanggalDari, tanggalSampai]);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Petugas': r.kode_karyawan,
      'Nama Tenaga Medis': r.nama_tenaga_medis,
      Peran: r.peran,
      'Total Tindakan': r.total_tindakan,
      'Nilai Omzet': r.nilai_omzet,
      'Nominal Komisi': r.nominal_komisi,
      'Status Pencairan': r.status_pencairan === 'sudah_dicairkan' ? 'Sudah Dicairkan' : 'Belum Dicairkan',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Komisi_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode Petugas', 'Nama Tenaga Medis', 'Peran', 'Total Tindakan', 'Nilai Omzet', 'Nominal Komisi', 'Status Pencairan'];
    const rows = data
      .map(
        (r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td style="text-align: center; font-family: monospace;">${r.kode_karyawan}</td>
          <td><strong>${r.nama_tenaga_medis || '-'}</strong></td>
          <td style="text-align: center;">${r.peran || '-'}</td>
          <td style="text-align: center;">${r.total_tindakan} Tindakan</td>
          <td style="text-align: right;">${formatRupiah(r.nilai_omzet)}</td>
          <td style="text-align: right; font-weight: bold; color: #047857;">${formatRupiah(r.nominal_komisi)}</td>
          <td style="text-align: center; text-transform: uppercase;">${r.status_pencairan || '-'}</td>
        </tr>
      `
      )
      .join('');
    printHtmlTable('Laporan Komisi Tenaga Medis', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Tindakan Medis', value: `${summary.total_tindakan} Tindakan`, icon: 'pi pi-check-circle', color: 'blue' },
    { label: 'Total Nilai Omzet', value: formatRupiah(summary.total_omzet), icon: 'pi pi-dollar', color: 'green' },
    { label: 'Total Estimasi Komisi', value: formatRupiah(summary.total_komisi), icon: 'pi pi-percentage', color: 'amber' },
    { label: 'Komisi Sudah Dicairkan', value: formatRupiah(summary.komisi_dicairkan), icon: 'pi pi-wallet', color: 'purple' },
  ];

  return (
    <>
      <Toast ref={toast} />
      <LaporanHeader
        icon="pi pi-percentage"
        title="Laporan Komisi & Fee Tenaga Medis"
        subtitle="Perolehan komisi dokter, terapis, dan tenaga medis berdasarkan tindakan pelayanan klinis yang terlaksana."
      />
      <LaporanSummaryCards items={summaryCards} />
      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />
        <LaporanLegendBox
          items={[
            { label: 'Sudah Dicairkan', color: '#22c55e' },
            { label: 'Belum Dicairkan', color: '#eab308' },
          ]}
        />
        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Belum ada data transaksi komisi tenaga medis."
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tanggalDari}
              setTanggalAwal={(d) => setTanggalDari(d)}
              tanggalAkhir={tanggalSampai}
              setTanggalAkhir={(d) => setTanggalSampai(d)}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              searchPlaceholder="Cari Nama Petugas, Peran..."
              isFiltered={Boolean(selectedStatusPencairan)}
              onReset={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setTanggalDari(firstDay);
                setTanggalSampai(now);
                setKeyword('');
                setSelectedStatusPencairan(null);
                fetchData('', firstDay, now, null);
              }}
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Komisi"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatusPencairan(null);
                    fetchData(keyword, tanggalDari, tanggalSampai, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Pencairan Komisi</label>
                    <Dropdown
                      value={selectedStatusPencairan}
                      options={[
                        { label: 'Semua Status', value: '' },
                        { label: 'Belum Dicairkan', value: 'belum_dicairkan' },
                        { label: 'Sudah Dicairkan', value: 'sudah_dicairkan' },
                      ]}
                      placeholder="Semua Status Pencairan"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatusPencairan(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isDicairkan = r.status_pencairan === 'sudah_dicairkan';
              const color = isDicairkan ? '#22c55e' : '#eab308';
              return <StatusSquare color={color} tooltip={isDicairkan ? 'Sudah Dicairkan' : 'Belum Dicairkan'} />;
            }}
          />
          <Column field="kode_karyawan" header="Kode Petugas" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_tenaga_medis" header="Nama Tenaga Medis" sortable className="font-bold text-gray-800" style={{ minWidth: '14rem' }} />
          <Column
            field="peran"
            header="Peran"
            sortable
            body={(r) => <Tag value={String(r.peran || 'STAFF').toUpperCase()} severity="info" className="text-xs" />}
            style={{ minWidth: '9rem' }}
          />
          <Column
            field="total_tindakan"
            header="Total Tindakan"
            sortable
            align="center"
            body={(r) => <span className="font-semibold text-gray-700">{r.total_tindakan} Tindakan</span>}
            style={{ minWidth: '9rem' }}
          />
          <Column
            field="nilai_omzet"
            header="Nilai Omzet"
            sortable
            align="right"
            body={(r) => <span className="text-gray-700">{formatRupiah(r.nilai_omzet)}</span>}
            style={{ minWidth: '11rem' }}
          />
          <Column
            field="nominal_komisi"
            header="Nominal Komisi"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.nominal_komisi)}</span>}
            style={{ minWidth: '11rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   18. LAPORAN EXPIRED VIEW
   ========================================================================= */
export const LaporanExpiredView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedStatusExpired, setSelectedStatusExpired] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total_produk: 0, kritis: 0, perhatian: 0, aman: 0, belum_diisi: 0 });
  const toast = useRef<Toast>(null);

  const fetchData = async (kw = keyword, sExp = selectedStatusExpired) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw, perPage: 100 };
      if (sExp) payload.status_expired = sExp;
      const res = await postData('/master/laporan/expired', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data expired');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Produk': r.kode_produk,
      'Nama Obat/Skincare': r.nama_produk,
      'No. Batch': r.no_batch || '-',
      'Tanggal Kadaluarsa': r.tanggal_kadaluarsa ? formatDateIndo(r.tanggal_kadaluarsa) : '-',
      'Sisa Stok': `${r.stok_tersedia} ${r.satuan || ''}`,
      'Status Kadaluarsa':
        r.status_expired === 'kritis'
          ? 'Kritis (<30 Hari)'
          : r.status_expired === 'perhatian'
          ? 'Perhatian (<90 Hari)'
          : r.status_expired === 'aman'
          ? 'Aman'
          : 'Belum Diisi',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Expired_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'Kode Produk', 'Nama Obat/Skincare', 'No. Batch', 'Tgl Kadaluarsa', 'Sisa Stok', 'Status'];
    const rows = data
      .map(
        (r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td style="text-align: center; font-family: monospace;">${r.kode_produk}</td>
          <td><strong>${r.nama_produk}</strong></td>
          <td style="text-align: center;">${r.no_batch || '-'}</td>
          <td style="text-align: center;">${r.tanggal_kadaluarsa ? formatDateIndo(r.tanggal_kadaluarsa) : '-'}</td>
          <td style="text-align: center;">${r.stok_tersedia} ${r.satuan || ''}</td>
          <td style="text-align: center; font-weight: bold;">${String(r.status_expired || '-').toUpperCase()}</td>
        </tr>
      `
      )
      .join('');
    printHtmlTable('Laporan Kadaluarsa (Expired) Obat & Skincare', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Produk Dipantau', value: `${summary.total_produk || data.length} Produk`, icon: 'pi pi-box', color: 'blue' },
    { label: 'Kritis (<30 Hari)', value: `${summary.kritis} Produk`, icon: 'pi pi-exclamation-circle', color: 'red' },
    { label: 'Perhatian (<90 Hari)', value: `${summary.perhatian} Produk`, icon: 'pi pi-clock', color: 'amber' },
    { label: 'Stok Aman', value: `${summary.aman} Produk`, icon: 'pi pi-shield', color: 'green' },
  ];

  const renderStatusTag = (r: any) => {
    switch (r.status_expired) {
      case 'kritis':
        return (
          <Tag
            value={r.sisa_hari !== null && r.sisa_hari <= 0 ? 'EXPIRED' : `KRITIS (${r.sisa_hari ?? '<30'} HARI)`}
            severity="danger"
            className="text-xs font-bold"
          />
        );
      case 'perhatian':
        return <Tag value={`PERHATIAN (${r.sisa_hari ?? '<90'} HARI)`} severity="warning" className="text-xs font-semibold" />;
      case 'aman':
        return <Tag value="AMAN" severity="success" className="text-xs" />;
      default:
        return <Tag value="BELUM DIISI" severity="secondary" className="text-xs" />;
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <LaporanHeader
        icon="pi pi-calendar-times"
        title="Laporan Kadaluarsa (Expired) Produk & Skincare"
        subtitle="Monitoring masa simpan batch obat, krim racikan, dan produk skincare untuk mencegah penggunaan produk kadaluarsa."
      />
      <LaporanSummaryCards items={summaryCards} />
      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />
        <LaporanLegendBox
          items={[
            { label: 'Kritis (<30 Hari)', color: '#ef4444' },
            { label: 'Perhatian (<90 Hari)', color: '#eab308' },
            { label: 'Aman', color: '#22c55e' },
            { label: 'Belum Diisi', color: '#94a3b8' },
          ]}
        />
        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Data Laporan Expired Tidak Ditemukan"
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              searchPlaceholder="Cari Produk, No Batch..."
              isFiltered={Boolean(selectedStatusExpired)}
              onReset={() => {
                setKeyword('');
                setSelectedStatusExpired(null);
                fetchData('', null);
              }}
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Status Kadaluarsa"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatusExpired(null);
                    fetchData(keyword, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Kadaluarsa</label>
                    <Dropdown
                      value={selectedStatusExpired}
                      options={[
                        { label: 'Semua Status', value: '' },
                        { label: 'Kritis (< 30 Hari)', value: 'kritis' },
                        { label: 'Perhatian (< 90 Hari)', value: 'perhatian' },
                        { label: 'Aman (>= 90 Hari)', value: 'aman' },
                        { label: 'Belum Diisi No. Batch/Tgl', value: 'belum_diisi' },
                      ]}
                      placeholder="Semua Status Kadaluarsa"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatusExpired(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const color =
                r.status_expired === 'kritis'
                  ? '#ef4444'
                  : r.status_expired === 'perhatian'
                  ? '#eab308'
                  : r.status_expired === 'aman'
                  ? '#22c55e'
                  : '#94a3b8';
              const tip =
                r.status_expired === 'kritis'
                  ? (r.sisa_hari !== null && r.sisa_hari <= 0 ? 'Expired' : `Kritis (${r.sisa_hari ?? '<30'} Hari)`)
                  : r.status_expired === 'perhatian'
                  ? `Perhatian (${r.sisa_hari ?? '<90'} Hari)`
                  : r.status_expired === 'aman'
                  ? 'Aman'
                  : 'Belum Diisi';
              return <StatusSquare color={color} tooltip={tip} />;
            }}
          />
          <Column field="kode_produk" header="Kode Produk" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_produk" header="Nama Obat / Skincare" sortable className="font-bold text-gray-800" style={{ minWidth: '15rem' }} />
          <Column
            field="no_batch"
            header="No. Batch"
            sortable
            body={(r) => r.no_batch ? <span className="font-mono text-gray-700 font-semibold">{r.no_batch}</span> : <span className="text-gray-400 italic text-xs">-</span>}
            style={{ minWidth: '10rem' }}
          />
          <Column
            field="tanggal_kadaluarsa"
            header="Tanggal Kadaluarsa"
            sortable
            body={(r) => r.tanggal_kadaluarsa ? formatDateIndo(r.tanggal_kadaluarsa) : <span className="text-gray-400 italic text-xs">-</span>}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="stok_tersedia"
            header="Sisa Stok"
            sortable
            align="center"
            body={(r) => <span className="font-bold text-gray-700">{r.stok_tersedia} {r.satuan || ''}</span>}
            style={{ minWidth: '8rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   19. LAPORAN DEPOSIT VIEW
   ========================================================================= */
export const LaporanDepositView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total_pasien: 0, total_saldo: 0, total_riwayat: 0 });
  const toast = useRef<Toast>(null);

  const fetchData = async (kw = keyword, sStat = selectedStatus) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw, perPage: 100 };
      if (sStat) payload.status = sStat;
      const res = await postData('/master/laporan/deposit', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data deposit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'No. RM': r.no_rm,
      'Nama Pasien': r.nama_pasien,
      'Saldo Terakhir': r.saldo_deposit || 0,
      'Riwayat Trx': `${r.total_riwayat || 0} kali`,
      Status: r.status_deposit === 'aktif' ? 'Aktif' : 'Nonaktif',
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_Deposit_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'No. RM', 'Nama Pasien', 'Saldo Terakhir', 'Riwayat Trx', 'Status'];
    const rows = data
      .map(
        (r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td style="text-align: center; font-family: monospace;">${r.no_rm}</td>
          <td><strong>${r.nama_pasien || '-'}</strong></td>
          <td style="text-align: right; font-weight: bold; color: #047857;">${formatRupiah(r.saldo_deposit)}</td>
          <td style="text-align: center;">${r.total_riwayat || 0} Kali</td>
          <td style="text-align: center; text-transform: uppercase;">${r.status_deposit || '-'}</td>
        </tr>
      `
      )
      .join('');
    printHtmlTable('Laporan Deposit Pasien', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Pasien Pemilik Deposit', value: `${summary.total_pasien} Pasien`, icon: 'pi pi-users', color: 'blue' },
    { label: 'Total Saldo Mengendap', value: formatRupiah(summary.total_saldo), icon: 'pi pi-wallet', color: 'green' },
    { label: 'Total Riwayat Transaksi', value: `${summary.total_riwayat} Transaksi`, icon: 'pi pi-history', color: 'purple' },
  ];

  return (
    <>
      <Toast ref={toast} />
      <LaporanHeader
        icon="pi pi-wallet"
        title="Laporan Saldo Deposit Pasien"
        subtitle="Saldo uang muka (deposit) mengendap, riwayat mutasi saldo, dan status akun deposit per pasien klinik."
      />
      <LaporanSummaryCards items={summaryCards} />
      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />
        <LaporanLegendBox
          items={[
            { label: 'Saldo Aktif (> Rp 0)', color: '#22c55e' },
            { label: 'Kosong / Nonaktif', color: '#94a3b8' },
          ]}
        />
        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Belum ada data deposit pasien."
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              searchPlaceholder="Cari Nama Pasien, No RM..."
              isFiltered={Boolean(selectedStatus)}
              onReset={() => {
                setKeyword('');
                setSelectedStatus(null);
                fetchData('', null);
              }}
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan Deposit"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedStatus(null);
                    fetchData(keyword, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Saldo</label>
                    <Dropdown
                      value={selectedStatus}
                      options={[
                        { label: 'Semua Status', value: '' },
                        { label: 'Aktif (> Rp 0)', value: 'aktif' },
                        { label: 'Nonaktif / Saldo Nol', value: 'nonaktif' },
                      ]}
                      placeholder="Semua Status Saldo"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const isActive = r.status_deposit === 'aktif' && parseFloat(r.saldo_deposit || 0) > 0;
              const color = isActive ? '#22c55e' : '#94a3b8';
              return <StatusSquare color={color} tooltip={isActive ? 'Saldo Aktif' : 'Kosong / Nonaktif'} />;
            }}
          />
          <Column field="no_rm" header="Kode Kunjungan / No. RM" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '12rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" sortable className="font-bold text-gray-800" style={{ minWidth: '14rem' }} />
          <Column
            field="saldo_deposit"
            header="Saldo Terakhir"
            sortable
            align="right"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.saldo_deposit)}</span>}
            style={{ minWidth: '11rem' }}
          />
          <Column
            field="total_riwayat"
            header="Riwayat Trx"
            sortable
            align="center"
            body={(r) => <span className="font-semibold text-gray-700">{r.total_riwayat || 0} Kali Transaksi</span>}
            style={{ minWidth: '10rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

/* =========================================================================
   20. LAPORAN CRM VIEW
   ========================================================================= */
export const LaporanCrmView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tanggalDari, setTanggalDari] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tanggalSampai, setTanggalSampai] = useState<Date | null>(() => new Date());
  const [selectedTipe, setSelectedTipe] = useState<string | null>(null);
  const [selectedKanal, setSelectedKanal] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total_interaksi: 0, terkirim: 0, pending: 0, gagal: 0 });
  const toast = useRef<Toast>(null);

  const fetchData = async (
    kw = keyword,
    tDari = tanggalDari,
    tSampai = tanggalSampai,
    sTipe = selectedTipe,
    sKanal = selectedKanal,
    sStat = selectedStatus
  ) => {
    setLoading(true);
    try {
      const payload: any = { keyword: kw, perPage: 100 };
      if (tDari) payload.tanggal_dari = tDari.toISOString().slice(0, 10);
      if (tSampai) payload.tanggal_sampai = tSampai.toISOString().slice(0, 10);
      if (sTipe) payload.tipe_followup = sTipe;
      if (sKanal) payload.kanal_komunikasi = sKanal;
      if (sStat) payload.status = sStat;
      const res = await postData('/master/laporan/crm', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data CRM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tanggalDari, tanggalSampai]);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'No. RM': r.no_rm,
      'Nama Pasien': r.nama_pasien,
      'Tipe Follow-up': String(r.tipe_followup || '').replace(/_/g, ' ').toUpperCase(),
      'Tanggal Terakhir': r.tanggal_kirim ? formatDateIndo(r.tanggal_kirim) : '-',
      'Kanal Komunikasi': String(r.kanal_komunikasi || '').toUpperCase(),
      Status: String(r.status || '').toUpperCase(),
    }));
    await exportToXLSX({
      data: exportData,
      fileName: `Laporan_CRM_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handlePrint = () => {
    const cols = ['#', 'No. RM', 'Nama Pasien', 'Tipe Follow-up', 'Tanggal Terakhir', 'Kanal Komunikasi', 'Status'];
    const rows = data
      .map(
        (r, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td style="text-align: center; font-family: monospace;">${r.no_rm}</td>
          <td><strong>${r.nama_pasien || '-'}</strong></td>
          <td>${String(r.tipe_followup || '-').replace(/_/g, ' ').toUpperCase()}</td>
          <td style="text-align: center;">${r.tanggal_kirim ? formatDateIndo(r.tanggal_kirim) : '-'}</td>
          <td style="text-align: center;">${String(r.kanal_komunikasi || '-').toUpperCase()}</td>
          <td style="text-align: center; font-weight: bold;">${String(r.status || '-').toUpperCase()}</td>
        </tr>
      `
      )
      .join('');
    printHtmlTable('Laporan CRM & Interaksi Pasien', cols, rows);
  };

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Interaksi CRM', value: `${summary.total_interaksi} Interaksi`, icon: 'pi pi-comments', color: 'blue' },
    { label: 'Pesan Terkirim', value: `${summary.terkirim} Terkirim`, icon: 'pi pi-send', color: 'green' },
    { label: 'Pending / Menunggu', value: `${summary.pending} Pending`, icon: 'pi pi-hourglass', color: 'amber' },
    { label: 'Gagal Terkirim', value: `${summary.gagal} Gagal`, icon: 'pi pi-times-circle', color: 'red' },
  ];

  const getStatusSeverity = (status: string) => {
    switch (status) {
      case 'terkirim':
        return 'success';
      case 'pending':
        return 'warning';
      case 'gagal':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <LaporanHeader
        icon="pi pi-comments"
        title="Laporan CRM & Follow-Up Pasien"
        subtitle="Monitoring interaksi komunikasi, ucapan ulang tahun, follow-up hasil treatment, dan reminder kunjungan pasien."
      />
      <LaporanSummaryCards items={summaryCards} />
      <div className="card">
        <LaporanActionBar
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={() => fetchData()}
          loadingRefresh={loading}
        />
        <LaporanLegendBox
          items={[
            { label: 'Terkirim', color: '#22c55e' },
            { label: 'Pending', color: '#eab308' },
            { label: 'Gagal', color: '#ef4444' },
          ]}
        />
        <DataTable
          value={data}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage="Belum ada data riwayat CRM / follow-up pasien."
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tanggalDari}
              setTanggalAwal={(d) => setTanggalDari(d)}
              tanggalAkhir={tanggalSampai}
              setTanggalAkhir={(d) => setTanggalSampai(d)}
              searchVal={keyword}
              setSearchVal={setKeyword}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchData()}
              searchPlaceholder="Cari Nama Pasien, No RM, Pesan..."
              isFiltered={Boolean(selectedTipe || selectedKanal || selectedStatus)}
              onReset={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setTanggalDari(firstDay);
                setTanggalSampai(now);
                setKeyword('');
                setSelectedTipe(null);
                setSelectedKanal(null);
                setSelectedStatus(null);
                fetchData('', firstDay, now, null, null, null);
              }}
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan CRM"
                  onClose={close}
                  onApply={() => fetchData()}
                  onReset={() => {
                    setSelectedTipe(null);
                    setSelectedKanal(null);
                    setSelectedStatus(null);
                    fetchData(keyword, tanggalDari, tanggalSampai, null, null, null);
                  }}
                >
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Tipe Follow-up</label>
                    <Dropdown
                      value={selectedTipe}
                      options={[
                        { label: 'Semua Tipe', value: '' },
                        { label: 'Ucapan Ulang Tahun', value: 'ucapan_ulang_tahun' },
                        { label: 'Follow Up Treatment', value: 'follow_up_treatment' },
                        { label: 'Reminder Kunjungan', value: 'reminder_kunjungan' },
                        { label: 'Lainnya', value: 'lainnya' },
                      ]}
                      placeholder="Semua Tipe"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedTipe(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Kanal Komunikasi</label>
                    <Dropdown
                      value={selectedKanal}
                      options={[
                        { label: 'Semua Kanal', value: '' },
                        { label: 'WhatsApp', value: 'whatsapp' },
                        { label: 'SMS', value: 'sms' },
                        { label: 'Email', value: 'email' },
                        { label: 'Telepon', value: 'telepon' },
                      ]}
                      placeholder="Semua Kanal"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedKanal(e.value || null)}
                    />
                  </div>
                  <div className="field col-12 mb-3">
                    <label className="font-semibold text-xs text-700 block mb-2">Status Pengiriman</label>
                    <Dropdown
                      value={selectedStatus}
                      options={[
                        { label: 'Semua Status', value: '' },
                        { label: 'Terkirim', value: 'terkirim' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Gagal', value: 'gagal' },
                      ]}
                      placeholder="Semua Status"
                      className="w-full text-sm"
                      onChange={(e) => setSelectedStatus(e.value || null)}
                    />
                  </div>
                </LaporanFilterPopup>
              )}
            />
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3.5rem' }}
            align="center"
            body={(r) => {
              const st = (r.status || '').toLowerCase();
              const color = st === 'terkirim' ? '#22c55e' : st === 'pending' ? '#eab308' : '#ef4444';
              return <StatusSquare color={color} tooltip={`Status: ${r.status || '-'}`} />;
            }}
          />
          <Column field="no_rm" header="No. RM" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '9rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column
            field="tipe_followup"
            header="Tipe Follow-up"
            sortable
            body={(r) => <Tag value={String(r.tipe_followup || 'LAINNYA').replace(/_/g, ' ').toUpperCase()} severity="info" className="text-xs" />}
            style={{ minWidth: '12rem' }}
          />
          <Column
            field="tanggal_kirim"
            header="Tanggal Terakhir"
            sortable
            body={(r) => (r.tanggal_kirim ? formatDateIndo(r.tanggal_kirim) : <span className="text-gray-400 italic text-xs">-</span>)}
            style={{ minWidth: '11rem' }}
          />
          <Column
            field="kanal_komunikasi"
            header="Kanal Komunikasi"
            sortable
            align="center"
            body={(r) => (
              <span className="font-semibold text-xs text-gray-700 flex align-items-center justify-content-center gap-1">
                <i className={r.kanal_komunikasi === 'whatsapp' ? 'pi pi-whatsapp text-green-600' : 'pi pi-comment'} />
                {String(r.kanal_komunikasi || '').toUpperCase()}
              </span>
            )}
            style={{ minWidth: '11rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};

