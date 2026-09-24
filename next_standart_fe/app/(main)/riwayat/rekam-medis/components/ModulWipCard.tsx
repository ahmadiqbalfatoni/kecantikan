'use client';

import React, { useState } from 'react';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import {
  LaporanHeader,
  LaporanSummaryCards,
  LaporanActionBar,
  LaporanTableHeaderFilter,
  SummaryCardItem,
} from './LaporanStandardHeader';

interface ModulWipCardProps {
  moduleName: string;
  onBackToActive: () => void;
}

const getModuleConfig = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('membership')) {
    return {
      icon: 'pi pi-id-card',
      summary: [
        { label: 'Total Membership', value: '0 Member', icon: 'pi pi-id-card', color: 'blue' as const },
        { label: 'Member Aktif', value: '0 Pasien', icon: 'pi pi-check-circle', color: 'green' as const },
        { label: 'Poin Diterbitkan', value: '0 Pts', icon: 'pi pi-star', color: 'purple' as const },
        { label: 'Masa Berlaku Habis', value: '0 Member', icon: 'pi pi-clock', color: 'red' as const },
      ],
      columns: ['Kode Member', 'No. RM', 'Nama Pasien', 'Level Tier', 'Tanggal Gabung', 'Total Poin', 'Status'],
    };
  }
  if (lower.includes('appointment')) {
    return {
      icon: 'pi pi-calendar-plus',
      summary: [
        { label: 'Total Appointment', value: '0 Booking', icon: 'pi pi-calendar', color: 'blue' as const },
        { label: 'Appointment Terkonfirmasi', value: '0 Selesai', icon: 'pi pi-check-circle', color: 'green' as const },
        { label: 'Menunggu Jadwal', value: '0 Antrean', icon: 'pi pi-clock', color: 'amber' as const },
        { label: 'Batal / Reschedule', value: '0 Batal', icon: 'pi pi-times-circle', color: 'red' as const },
      ],
      columns: ['Kode Booking', 'Nama Pasien', 'Dokter Tujuan', 'Jadwal Konsultasi', 'Layanan', 'Status'],
    };
  }
  if (lower.includes('komisi')) {
    return {
      icon: 'pi pi-percentage',
      summary: [
        { label: 'Total Komisi', value: 'Rp 0', icon: 'pi pi-wallet', color: 'blue' as const },
        { label: 'Komisi Dokter', value: 'Rp 0', icon: 'pi pi-heart', color: 'purple' as const },
        { label: 'Komisi Beautician', value: 'Rp 0', icon: 'pi pi-star', color: 'green' as const },
        { label: 'Belum Dicairkan', value: 'Rp 0', icon: 'pi pi-clock', color: 'amber' as const },
      ],
      columns: ['Kode Petugas', 'Nama Tenaga Medis', 'Peran', 'Total Tindakan', 'Nilai Omzet', 'Nominal Komisi'],
    };
  }
  if (lower.includes('stok opname') || lower.includes('opname')) {
    return {
      icon: 'pi pi-check-square',
      summary: [
        { label: 'Total Item Dihitung', value: '0 Item', icon: 'pi pi-box', color: 'blue' as const },
        { label: 'Stok Sesuai', value: '0 Item', icon: 'pi pi-check-circle', color: 'green' as const },
        { label: 'Selisih Lebih', value: '0 Item', icon: 'pi pi-arrow-up-right', color: 'amber' as const },
        { label: 'Selisih Kurang', value: '0 Item', icon: 'pi pi-arrow-down-right', color: 'red' as const },
      ],
      columns: ['Kode Produk', 'Nama Produk', 'Stok Sistem', 'Stok Fisik', 'Selisih Unit', 'Keterangan'],
    };
  }
  if (lower.includes('pembelian')) {
    return {
      icon: 'pi pi-truck',
      summary: [
        { label: 'Total PO Pembelian', value: '0 Transaksi', icon: 'pi pi-shopping-bag', color: 'blue' as const },
        { label: 'Barang Diterima', value: '0 Faktur', icon: 'pi pi-check-circle', color: 'green' as const },
        { label: 'Total Tagihan PO', value: 'Rp 0', icon: 'pi pi-wallet', color: 'purple' as const },
        { label: 'Menunggu Supplier', value: '0 PO', icon: 'pi pi-clock', color: 'amber' as const },
      ],
      columns: ['No. Faktur PO', 'Tanggal Pembelian', 'Nama Supplier', 'Total Item', 'Nilai Tagihan', 'Status'],
    };
  }
  if (lower.includes('expired')) {
    return {
      icon: 'pi pi-exclamation-triangle',
      summary: [
        { label: 'Total Produk Expired', value: '0 Item', icon: 'pi pi-exclamation-triangle', color: 'red' as const },
        { label: 'Kadaluarsa < 30 Hari', value: '0 Item', icon: 'pi pi-clock', color: 'amber' as const },
        { label: 'Kadaluarsa < 90 Hari', value: '0 Item', icon: 'pi pi-info-circle', color: 'blue' as const },
        { label: 'Estimasi Kerugian', value: 'Rp 0', icon: 'pi pi-wallet', color: 'purple' as const },
      ],
      columns: ['Kode Produk', 'Nama Obat / Skincare', 'No. Batch', 'Tanggal Kadaluarsa', 'Sisa Stok', 'Status'],
    };
  }
  if (lower.includes('deposit')) {
    return {
      icon: 'pi pi-money-bill',
      summary: [
        { label: 'Total Saldo Deposit', value: 'Rp 0', icon: 'pi pi-wallet', color: 'green' as const },
        { label: 'Pasien Memiliki Saldo', value: '0 Pasien', icon: 'pi pi-users', color: 'blue' as const },
        { label: 'Top-up Bulan Ini', value: 'Rp 0', icon: 'pi pi-arrow-up-right', color: 'purple' as const },
        { label: 'Pemakaian Deposit', value: 'Rp 0', icon: 'pi pi-arrow-down-right', color: 'amber' as const },
      ],
      columns: ['Kode Kunjungan', 'No. RM', 'Nama Pasien', 'Saldo Terakhir', 'Riwayat Trx', 'Status'],
    };
  }
  // Default CRM
  return {
    icon: 'pi pi-comments',
    summary: [
      { label: 'Total Interaksi CRM', value: '0 Pasien', icon: 'pi pi-comments', color: 'blue' as const },
      { label: 'Pesan Terkirim', value: '0 Notifikasi', icon: 'pi pi-check-circle', color: 'green' as const },
      { label: 'Pasien Ulang Tahun', value: '0 Pasien', icon: 'pi pi-heart', color: 'purple' as const },
      { label: 'Follow-up Treatment', value: '0 Pasien', icon: 'pi pi-clock', color: 'amber' as const },
    ],
    columns: ['No. RM', 'Nama Pasien', 'Tipe Follow-up', 'Tanggal Terakhir', 'Kanal Komunikasi', 'Status'],
  };
};

export const ModulWipCard: React.FC<ModulWipCardProps> = ({
  moduleName,
  onBackToActive,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [tglDari, setTglDari] = useState<Date | null>(null);
  const [tglSampai, setTglSampai] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const config = getModuleConfig(moduleName);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 400);
  };

  return (
    <>
      <LaporanHeader
        icon={config.icon}
        title={moduleName}
        subtitle={`Analisis data, pencatatan rekapitulasi, dan monitoring performansi operasional ${moduleName.toLowerCase()}.`}
      />

      <LaporanSummaryCards items={config.summary} />

      <div className="card">
        <LaporanActionBar
          onPrint={() => {}}
          onExport={() => {}}
          onRefresh={handleRefresh}
          loadingRefresh={loading}
        />

        <div className="p-3 mb-3 border-round-xl border-1 border-blue-200 bg-blue-50 flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="flex align-items-center gap-2">
            <i className="pi pi-info-circle text-blue-600 text-lg" />
            <span className="text-xs md:text-sm text-blue-900 font-medium">
              Integrasi database dan alur bisnis untuk modul <strong>{moduleName}</strong> sedang dalam tahap penyelarasan sistem.
            </span>
          </div>
          <Button
            label="Beralih ke Laporan Penjualan"
            icon="pi pi-shopping-cart"
            size="small"
            outlined
            severity="info"
            className="text-xs font-semibold"
            onClick={onBackToActive}
          />
        </div>

        <DataTable
          value={[]}
          loading={loading}
          scrollable
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          emptyMessage={`Data ${moduleName} Belum Ditemukan`}
          className="p-datatable-sm"
          header={
            <LaporanTableHeaderFilter
              tanggalAwal={tglDari}
              setTanggalAwal={setTglDari}
              tanggalAkhir={tglSampai}
              setTanggalAkhir={setTglSampai}
              searchVal={searchVal}
              setSearchVal={setSearchVal}
              onReset={() => {
                setTglDari(null);
                setTglSampai(null);
                setSearchVal('');
              }}
              searchPlaceholder={`Cari data ${moduleName.toLowerCase()}...`}
            />
          }
        >
          <Column header="#" body={(_, opt) => opt.rowIndex + 1} style={{ width: '3.5rem', textAlign: 'center' }} />
          {config.columns.map((colName, idx) => (
            <Column key={idx} header={colName} style={{ minWidth: '11rem' }} />
          ))}
        </DataTable>
      </div>
    </>
  );
};

export default ModulWipCard;
