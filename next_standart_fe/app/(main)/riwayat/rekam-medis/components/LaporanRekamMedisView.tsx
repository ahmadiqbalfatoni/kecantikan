'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';
import { exportToXLSX } from '@/lib/tools/printTools/exportToXLSX';
import { formatDateIndo } from './LaporanViews';
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

interface Petugas {
  nama: string;
  jabatan: string;
}

interface RekamMedisData {
  keluhan_utama?: string;
  diagnosa?: string;
  tindakan?: string;
  resep_obat?: string;
  catatan_fisik?: string;
  dokter_penanggung_jawab?: Petugas;
}

interface DetailLayanan {
  kode_antrian_layanan: string;
  nama_layanan: string;
  nama_ruangan: string;
  status: string;
  petugas?: Petugas;
  rekam_medis?: RekamMedisData;
  daftar_petugas?: any[];
  terapis_pendamping?: any[];
}

interface KunjunganRecord {
  kode_kunjungan: string;
  no_rm: string;
  nama_pasien: string;
  tanggal_kunjungan: string;
  jam_datang: string;
  status_kunjungan: string;
  layanan: DetailLayanan[];
  dokter_nama?: string;
  dokter_jabatan?: string;
}

export const LaporanRekamMedisView: React.FC = () => {
  const toast = useRef<Toast>(null);
  const [searchVal, setSearchVal] = useState('');
  const [tanggalDari, setTanggalDari] = useState<Date | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tanggalSampai, setTanggalSampai] = useState<Date | null>(() => new Date());
  const [selectedDokter, setSelectedDokter] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [optionsDokter, setOptionsDokter] = useState<any[]>([]);
  const [optionsStatus, setOptionsStatus] = useState<any[]>([
    { label: 'Berlangsung / Antre', value: 'berlangsung' },
    { label: 'Selesai', value: 'selesai' },
  ]);
  const [records, setRecords] = useState<KunjunganRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [expandedRMRows, setExpandedRMRows] = useState<any>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await postData('/master/laporan/options', {});
        if (res?.data?.data?.dokter) {
          setOptionsDokter(res.data.data.dokter);
        }
      } catch (_) {}
    };
    loadOptions();
  }, []);

  const fetchRekamMedis = async (
    pKeyword?: string,
    pTglDari?: Date | null,
    pTglSampai?: Date | null,
    pDokter?: string | null,
    pStatus?: string[]
  ) => {
    const targetKeyword = pKeyword !== undefined ? pKeyword : searchVal;
    const targetTglDari = pTglDari !== undefined ? pTglDari : tanggalDari;
    const targetTglSampai = pTglSampai !== undefined ? pTglSampai : tanggalSampai;
    const targetDokter = pDokter !== undefined ? pDokter : selectedDokter;
    const targetStatus = pStatus !== undefined ? pStatus : selectedStatus;

    setLoadingRecords(true);
    try {
      const formatDateParam = (d: Date | null) => {
        if (!d) return undefined;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const payload: any = {
        keyword: targetKeyword || undefined,
        perPage: 100,
        tanggal_dari: formatDateParam(targetTglDari),
        tanggal_sampai: formatDateParam(targetTglSampai),
        kode_dokter: targetDokter || undefined,
        status: targetStatus.length > 0 ? targetStatus : undefined,
      };

      const res = await postData('/master/pasien-rekam-medis', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        const dataList: KunjunganRecord[] = res.data.data || [];
        setRecords(dataList);
        setTotalRecords(res.data.total_data || dataList.length);
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat rekam medis');
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchRekamMedis();
  }, [tanggalDari, tanggalSampai]);

  const getDokterDisplay = (rec: KunjunganRecord) => {
    const dokNama =
      rec.dokter_nama ||
      rec.layanan?.find((l) => l.rekam_medis?.dokter_penanggung_jawab?.nama)?.rekam_medis?.dokter_penanggung_jawab?.nama ||
      rec.layanan?.find((l) => l.petugas?.nama)?.petugas?.nama;
    const dokJabatan =
      rec.dokter_jabatan ||
      rec.layanan?.find((l) => l.rekam_medis?.dokter_penanggung_jawab?.jabatan)?.rekam_medis?.dokter_penanggung_jawab?.jabatan ||
      rec.layanan?.find((l) => l.petugas?.jabatan)?.petugas?.jabatan;

    if (!dokNama) return '-';
    return dokJabatan ? `${dokNama} — ${dokJabatan}` : dokNama;
  };

  const handleCetakLaporanRM = () => {
    if (records.length === 0) {
      showError(toast, 'Tidak ada data rekam medis untuk dicetak');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showError(toast, 'Gagal membuka jendela cetak. Mohon izinkan popup browser.');
      return;
    }

    const tglMulaiStr = tanggalDari ? formatDateIndo(tanggalDari.toISOString()) : 'Semua Tanggal';
    const tglSelesaiStr = tanggalSampai ? formatDateIndo(tanggalSampai.toISOString()) : 'Semua Tanggal';
    const periodeStr = `${tglMulaiStr} s.d ${tglSelesaiStr}`;

    const tableRowsHtml = records
      .map(
        (rec, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${rec.nama_pasien || '-'}</strong></td>
          <td>${getDokterDisplay(rec)}</td>
          <td style="text-align: center;">${rec.no_rm || '-'}</td>
          <td style="text-align: center;">${rec.kode_kunjungan}</td>
          <td>${formatDateIndo(rec.tanggal_kunjungan)} (${rec.jam_datang} WIB)</td>
          <td style="text-align: center;">${rec.layanan?.length || 0} Sesi</td>
          <td style="text-align: center; font-weight: bold; text-transform: uppercase;">${rec.status_kunjungan}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Rekam Medis Pasien</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #047857; padding-bottom: 10px; }
            .header h2 { margin: 0; color: #047857; font-size: 18px; }
            .header h3 { margin: 4px 0 0 0; font-size: 14px; color: #334155; }
            .header p { margin: 4px 0 0 0; color: #64748b; font-size: 11px; }
            .summary-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
            .summary-item { font-size: 12px; }
            .summary-item label { color: #64748b; display: block; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .summary-item span { font-weight: bold; font-size: 14px; color: #047857; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; }
            th { background-color: #f1f5f9; color: #0f172a; text-transform: uppercase; font-size: 10px; font-weight: bold; }
            .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #94a3b8; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>KLINIK KECANTIKAN</h2>
            <h3>LAPORAN REKAM MEDIS PASIEN</h3>
            <p>Periode Laporan: ${periodeStr}</p>
          </div>

          <div class="summary-box">
            <div class="summary-item">
              <label>Total Kunjungan</label>
              <span>${records.length} Kunjungan</span>
            </div>
            <div class="summary-item">
              <label>Waktu Cetak</label>
              <span style="color: #334155; font-size: 12px;">${new Date().toLocaleString('id-ID')}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nama Pasien</th>
                <th>Dokter/Petugas</th>
                <th>No. RM</th>
                <th>Kode Kunjungan</th>
                <th>Tanggal &amp; Jam</th>
                <th>Sesi Treatment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Dicetak otomatis oleh Sistem Klinik Kecantikan pada ${new Date().toLocaleString('id-ID')}
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExportExcelRM = async () => {
    if (records.length === 0) {
      showError(toast, 'Tidak ada data rekam medis untuk diexport');
      return;
    }

    const exportData = records.map((rec, idx) => ({
      No: idx + 1,
      'Kode Kunjungan': rec.kode_kunjungan,
      'No. RM': rec.no_rm,
      'Nama Pasien': rec.nama_pasien,
      'Dokter/Petugas': getDokterDisplay(rec),
      Tanggal: formatDateIndo(rec.tanggal_kunjungan),
      'Jam Datang': `${rec.jam_datang} WIB`,
      'Status Kunjungan': String(rec.status_kunjungan || '').toUpperCase(),
      'Jumlah Sesi Treatment': rec.layanan?.length || 0,
    }));

    const fileName = `Laporan_Rekam_Medis_${new Date().toISOString().slice(0, 10)}`;
    await exportToXLSX({ data: exportData, fileName });
  };

  const getStatusAntrianSeverity = (status: string) => {
    switch (status) {
      case 'selesai':
        return 'success';
      case 'berlangsung':
      case 'dipanggil':
        return 'info';
      case 'menunggu':
        return 'warning';
      case 'batal':
        return 'danger';
      default:
        return 'info';
    }
  };

  const rowExpansionTemplate = (record: KunjunganRecord) => (
    <div className="p-3 bg-gray-50 border-round-lg border-1 surface-border my-1">
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
        Rincian SOAP &amp; Sesi Treatment (Kunjungan: {record.kode_kunjungan})
      </span>
      {(!record.layanan || record.layanan.length === 0) ? (
        <div className="text-xs text-gray-400 italic py-1">Tidak ada catatan treatment pada kunjungan ini.</div>
      ) : (
        record.layanan.map((item, lIdx) => {
          const rm = item.rekam_medis;
          return (
            <div key={lIdx} className="bg-white p-3 border-round-lg border-1 surface-border mb-2">
              <div className="flex align-items-center justify-content-between mb-2">
                <div className="flex align-items-center gap-2">
                  <i className="pi pi-building text-blue-600" />
                  <span className="font-bold text-sm text-gray-800">{item.nama_ruangan}</span>
                  <Tag value={item.status?.toUpperCase()} severity={getStatusAntrianSeverity(item.status)} className="text-[10px]" />
                </div>
                <span className="text-xs text-gray-500 font-medium">{item.nama_layanan}</span>
              </div>
              {rm && (
                <div className="grid text-xs text-gray-700 mt-2">
                  {rm.keluhan_utama && (
                    <div className="col-12 md:col-6 mb-1">
                      <span className="font-bold text-gray-500 block uppercase text-[10px]">Keluhan Utama:</span>
                      <span>{rm.keluhan_utama}</span>
                    </div>
                  )}
                  {rm.diagnosa && (
                    <div className="col-12 md:col-6 mb-1">
                      <span className="font-bold text-gray-500 block uppercase text-[10px]">Diagnosa Medis:</span>
                      <span className="text-blue-700 font-medium">{rm.diagnosa}</span>
                    </div>
                  )}
                  {rm.tindakan && (
                    <div className="col-12 md:col-6 mb-1">
                      <span className="font-bold text-gray-500 block uppercase text-[10px]">Tindakan Dilakukan:</span>
                      <span>{rm.tindakan}</span>
                    </div>
                  )}
                  {rm.resep_obat && (
                    <div className="col-12 md:col-6 mb-1">
                      <span className="font-bold text-gray-500 block uppercase text-[10px]">Resep Obat:</span>
                      <span className="text-emerald-700 font-medium">{rm.resep_obat}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const summaryCards: SummaryCardItem[] = [
    { label: 'Total Rekam Medis', value: `${records.length} Berkas`, icon: 'pi pi-file-medical', color: 'blue' },
    { label: 'Kunjungan Selesai', value: `${records.filter((r) => r.status_kunjungan === 'selesai').length} Selesai`, icon: 'pi pi-check-circle', color: 'green' },
    { label: 'Pasien Unik Diperiksa', value: `${new Set(records.map((r) => r.no_rm).filter(Boolean)).size} Pasien`, icon: 'pi pi-users', color: 'purple' },
    { label: 'Sesi Layanan Klinis', value: `${records.reduce((acc, curr) => acc + (curr.layanan?.length || 0), 0)} Sesi`, icon: 'pi pi-sparkles', color: 'amber' },
  ];

  return (
    <>
      <Toast ref={toast} />

      <LaporanHeader
        icon="pi pi-file-medical"
        title="Laporan RME (Rekam Medis Elektronik)"
        subtitle="Riwayat klinis pasien, catatan anamnesa SOAP, diagnosa medis dokter, dan histori tindakan perawatan."
      />

      <LaporanSummaryCards items={summaryCards} />

      <div className="card">
        <LaporanActionBar
          onPrint={handleCetakLaporanRM}
          onExport={handleExportExcelRM}
          onRefresh={() => fetchRekamMedis()}
          loadingRefresh={loadingRecords}
        />

        <LaporanLegendBox
          items={[
            { label: 'Selesai', color: '#22c55e' },
            { label: 'Berlangsung / Dipanggil', color: '#0284c7' },
            { label: 'Menunggu', color: '#eab308' },
            { label: 'Batal', color: '#ef4444' },
          ]}
        />

        <DataTable
          value={records}
          loading={loadingRecords}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50, 100]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          emptyMessage="Data Laporan Rekam Medis Tidak Ditemukan"
          className="p-datatable-sm"
          expandedRows={expandedRMRows}
          onRowToggle={(e) => setExpandedRMRows(e.data)}
          rowExpansionTemplate={rowExpansionTemplate}
          dataKey="kode_kunjungan"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tanggalDari}
              setTanggalAwal={(d) => setTanggalDari(d)}
              tanggalAkhir={tanggalSampai}
              setTanggalAkhir={(d) => setTanggalSampai(d)}
              searchVal={searchVal}
              setSearchVal={setSearchVal}
              onSearchKeyDown={(e) => e.key === 'Enter' && fetchRekamMedis()}
              isFiltered={Boolean(selectedDokter || selectedStatus.length > 0)}
              onReset={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setTanggalDari(firstDay);
                setTanggalSampai(now);
                setSearchVal('');
                setSelectedDokter(null);
                setSelectedStatus([]);
                fetchRekamMedis('', firstDay, now, null, []);
              }}
              searchPlaceholder="Cari Pasien, No RM, Diagnosa..."
              filterOverlay={(close) => (
                <LaporanFilterPopup
                  title="Filter Laporan RME / Rekam Medis"
                  onClose={close}
                  onApply={() => fetchRekamMedis()}
                  onReset={() => {
                    setSelectedDokter(null);
                    setSelectedStatus([]);
                    fetchRekamMedis(undefined, undefined, undefined, null, []);
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
                    <label className="font-semibold text-xs text-700 block mb-2">Dokter Pemeriksa</label>
                    <Dropdown
                      value={selectedDokter}
                      options={optionsDokter}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Semua Dokter"
                      filter
                      showClear
                      filterPlaceholder="Cari Nama Dokter..."
                      className="w-full text-sm"
                      onChange={(e) => setSelectedDokter(e.value || null)}
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
              const isSuccess = r.status_kunjungan === 'selesai';
              const isProcess = r.status_kunjungan === 'berlangsung' || r.status_kunjungan === 'dipanggil';
              const color = isSuccess ? '#22c55e' : isProcess ? '#0284c7' : '#eab308';
              return (
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px',
                    backgroundColor: color,
                    boxShadow: `0 1px 3px ${color}55`,
                  }}
                  title={`Status: ${r.status_kunjungan}`}
                />
              );
            }}
          />
          <Column field="kode_kunjungan" header="Kode Kunjungan" sortable className="font-semibold text-800 font-mono" style={{ minWidth: '11rem' }} />
          <Column field="no_rm" header="No. RM" sortable className="font-semibold text-gray-700" style={{ minWidth: '9rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" sortable className="font-bold text-gray-800" style={{ minWidth: '13rem' }} />
          <Column
            header="Dokter/Petugas"
            style={{ minWidth: '14rem' }}
            body={(r: KunjunganRecord) => {
              const display = getDokterDisplay(r);
              if (display === '-') return <span className="text-gray-400 italic text-xs">-</span>;
              return (
                <span className="text-xs font-semibold text-gray-800">
                  {display}
                </span>
              );
            }}
          />
          <Column
            field="tanggal_kunjungan"
            header="Tanggal &amp; Waktu"
            body={(r) => `${formatDateIndo(r.tanggal_kunjungan)} (${r.jam_datang || '-'})`}
            style={{ minWidth: '12rem' }}
          />
          <Column
            header="Sesi Treatment"
            align="center"
            body={(r) => `${r.layanan?.length || 0} Sesi`}
            style={{ minWidth: '9rem' }}
          />
        </DataTable>
      </div>
    </>
  );
};
