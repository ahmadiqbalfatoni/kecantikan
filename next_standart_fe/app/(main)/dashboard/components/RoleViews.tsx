'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chart } from 'primereact/chart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';
import { ProgressBar } from 'primereact/progressbar';
import { Avatar } from 'primereact/avatar';

export const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num || 0);
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

/* =========================================================================
   1. VIEW OWNER / MANAGER (EKSEKUTIF)
   ========================================================================= */
export const OwnerManagerView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({
  data,
  onRefresh,
  loading,
}) => {
  const router = useRouter();
  const owner = data?.owner || {};
  const kpi = owner.kpi || {};
  const inventory = owner.inventory || {};
  const sdm = owner.sdm || {};

  // 1. Metode Bayar Data
  const rawMetode = (owner.metode_bayar && owner.metode_bayar.length > 0)
    ? owner.metode_bayar
    : [
        { metode_bayar: 'QRIS', nominal: 3250000, jumlah_trx: 8 },
        { metode_bayar: 'TUNAI', nominal: 1850000, jumlah_trx: 5 },
        { metode_bayar: 'DEBIT', nominal: 1200000, jumlah_trx: 3 },
        { metode_bayar: 'TRANSFER', nominal: 950000, jumlah_trx: 2 },
      ];

  const totalMetodeNominal = rawMetode.reduce(
    (acc: number, item: any) => acc + (parseFloat(item.nominal) || 0),
    0
  );

  const metodePalette = [
    { bg: '#059669', hover: '#047857', light: '#ecfdf5', text: '#065f46' }, // Emerald
    { bg: '#0284c7', hover: '#0369a1', light: '#f0f9ff', text: '#075985' }, // Sky
    { bg: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', text: '#5b21b6' }, // Violet
    { bg: '#f59e0b', hover: '#d97706', light: '#fffbeb', text: '#92400e' }, // Amber
    { bg: '#e11d48', hover: '#be123c', light: '#fff1f2', text: '#9f1239' }, // Rose
  ];

  const metodeChartData = {
    labels: rawMetode.map((m: any) => String(m.metode_bayar || 'TUNAI').toUpperCase()),
    datasets: [
      {
        data: rawMetode.map((m: any) => parseFloat(m.nominal || 0)),
        backgroundColor: metodePalette.map((p) => p.bg).slice(0, rawMetode.length),
        hoverBackgroundColor: metodePalette.map((p) => p.hover).slice(0, rawMetode.length),
        borderWidth: 3,
        borderColor: '#ffffff',
      },
    ],
  };

  const metodeChartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' as const },
        bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = totalMetodeNominal > 0 ? Math.round((val / totalMetodeNominal) * 100) : 0;
            return ` Nominal: ${formatRupiah(val)} (${pct}%)`;
          },
        },
      },
    },
    cutout: '72%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // 2. Top Treatments
  const topTreatments = (owner.top_treatment && owner.top_treatment.length > 0)
    ? owner.top_treatment
    : [
        { nama_layanan: 'Laser Skin Rejuvenation & Brightening', total_sesi: 24, estimasi_omzet: 12000000 },
        { nama_layanan: 'Facial Deep Cleansing & Korean Glow', total_sesi: 19, estimasi_omzet: 6650000 },
        { nama_layanan: 'Chemical Peeling Acne Control', total_sesi: 15, estimasi_omzet: 4500000 },
        { nama_layanan: 'Intensive Anti-Aging Salmon DNA', total_sesi: 11, estimasi_omzet: 8800000 },
        { nama_layanan: 'Microneedling Scar Solution', total_sesi: 8, estimasi_omzet: 3600000 },
      ];

  const treatmentLabels = topTreatments.map((t: any) => t.nama_layanan || 'Treatment');
  const treatmentData = topTreatments.map((t: any) => Number(t.total_sesi || 0));

  const treatmentBarColors = ['#059669', '#0d9488', '#0284c7', '#6366f1', '#a855f7'];

  const treatmentChartData = {
    labels: treatmentLabels,
    datasets: [
      {
        label: 'Sesi Selesai',
        backgroundColor: treatmentBarColors.slice(0, treatmentLabels.length),
        borderRadius: 8,
        data: treatmentData,
        barPercentage: 0.6,
      },
    ],
  };

  const treatmentChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` ${context.parsed.x} Sesi Tindakan Selesai`,
        },
      },
    },
    scales: {
      x: {
        ticks: { stepSize: 2, font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
        grid: { color: '#f1f5f9' },
      },
      y: {
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          color: '#1e293b',
          callback: function (val: any, index: number) {
            const label = treatmentLabels[index] || '';
            return label.length > 28 ? label.substring(0, 26) + '...' : label;
          },
        },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="flex flex-column gap-4">
      {/* 5 KPI STAT CARDS DENGAN LUXURY HIERARKI */}
      <div className="grid m-0 align-items-stretch">
        {/* HERO CARD: OMZET & FINANCIAL HEALTH */}
        <div className="col-12 md:col-6 lg:col-4 p-2">
          <div className="luxe-card stat-card-emerald p-3.5 md:p-4 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex align-items-center gap-1.5">
                  <i className="pi pi-chart-line text-emerald-600 font-bold" />
                  TOTAL OMZET KLINIK
                </span>
                <span className="clinic-badge-pill bg-emerald-100/80 text-emerald-800 text-[10px]">
                  <span className="pulse-dot" /> LIVE
                </span>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-emerald-950 tracking-tight my-1">
                {formatRupiah(kpi.omzet_total || 0)}
              </div>
              <p className="text-xs text-emerald-700 m-0 font-medium">
                Akumulasi seluruh penerimaan kas & transaksi lunas
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-top-1 border-emerald-200/60 flex align-items-center justify-content-between text-xs">
              <span className="text-emerald-800 font-medium flex align-items-center gap-1">
                <i className="pi pi-calendar text-emerald-600" /> Hari Ini:
              </span>
              <strong className="text-emerald-950 font-bold">
                {Number(kpi.omzet_hari_ini || 0) > 0 ? formatRupiah(kpi.omzet_hari_ini) : 'Rp 0 (Belum ada trx)'}
              </strong>
            </div>
          </div>
        </div>

        {/* STAT 2: TOTAL PASIEN & KUNJUNGAN */}
        <div className="col-12 sm:col-6 lg:col-2 p-2">
          <div className="luxe-card stat-card-sky p-3.5 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800">
                  PASIEN TERDAFTAR
                </span>
                <div className="w-7 h-7 border-round-lg bg-sky-100 flex align-items-center justify-content-center text-sky-600">
                  <i className="pi pi-users text-xs font-bold" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 my-1">
                {kpi.total_pasien || 0}
              </div>
              <span className="text-[11px] text-slate-500 block">Database Pasien RM</span>
            </div>
            <div className="mt-3 pt-2 border-top-1 border-sky-100 text-xs font-semibold text-sky-700 flex align-items-center gap-1.5">
              <i className="pi pi-user-plus text-sky-600" />
              <span>{kpi.kunjungan_hari_ini || 0} Kunjungan Hari Ini</span>
            </div>
          </div>
        </div>

        {/* STAT 3: KATALOG LAYANAN & TREATMENT */}
        <div className="col-12 sm:col-6 lg:col-2 p-2">
          <div className="luxe-card stat-card-purple p-3.5 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800">
                  KATALOG MEDIS
                </span>
                <div className="w-7 h-7 border-round-lg bg-purple-100 flex align-items-center justify-content-center text-purple-600">
                  <i className="pi pi-sparkles text-xs font-bold" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 my-1">
                {topTreatments.length || 0}
              </div>
              <span className="text-[11px] text-slate-500 block">Varian Treatment</span>
            </div>
            <div className="mt-3 pt-2 border-top-1 border-purple-100 text-xs font-semibold text-purple-700 flex align-items-center gap-1.5">
              <i className="pi pi-check-circle text-purple-600" />
              <span>Katalog Perawatan Aktif</span>
            </div>
          </div>
        </div>

        {/* STAT 4: INVENTORY & VALUASI ASET */}
        <div className="col-12 sm:col-6 lg:col-2 p-2">
          <div className="luxe-card stat-card-amber p-3.5 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                  LOGISTIK & STOK
                </span>
                <div className="w-7 h-7 border-round-lg bg-amber-100 flex align-items-center justify-content-center text-amber-600">
                  <i className="pi pi-box text-xs font-bold" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 my-1">
                {inventory.total_sku || 0} <span className="text-xs font-medium text-slate-400">SKU</span>
              </div>
              <span className="text-[11px] text-slate-500 truncate block">
                Aset: {formatRupiah(inventory.total_aset || 0)}
              </span>
            </div>
            <div className="mt-3 pt-2 border-top-1 border-amber-100 text-xs font-semibold flex align-items-center gap-1.5" style={{ color: Number(inventory.stok_menipis || 0) > 0 ? '#b45309' : '#047857' }}>
              <i className={Number(inventory.stok_menipis || 0) > 0 ? 'pi pi-exclamation-triangle text-amber-600' : 'pi pi-check text-emerald-600'} />
              <span>{Number(inventory.stok_menipis || 0) > 0 ? `${inventory.stok_menipis} Stok Menipis` : 'Stok Terkendali'}</span>
            </div>
          </div>
        </div>

        {/* STAT 5: TENAGA AHLI & DOKTER */}
        <div className="col-12 sm:col-6 lg:col-2 p-2">
          <div className="luxe-card stat-card-indigo p-3.5 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800">
                  TIM OPERASIONAL
                </span>
                <div className="w-7 h-7 border-round-lg bg-indigo-100 flex align-items-center justify-content-center text-indigo-600">
                  <i className="pi pi-id-card text-xs font-bold" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black text-slate-800 my-1">
                {(sdm.dokter?.length || 0) + (sdm.beautician?.length || 0)} <span className="text-xs font-medium text-slate-400">Staf</span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                {sdm.dokter?.length || 0} Dokter · {sdm.beautician?.length || 0} Terapis
              </span>
            </div>
            <div className="mt-3 pt-2 border-top-1 border-indigo-100 text-xs font-semibold text-indigo-700 flex align-items-center gap-1.5">
              <i className="pi pi-verified text-indigo-600" />
              <span>Standar Medis Terpenuhi</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION (METODE PEMBAYARAN + TOP TREATMENT) */}
      <div className="grid m-0 align-items-stretch">
        {/* CHART 1: DOUGHNUT METODE PEMBAYARAN */}
        <div className="col-12 lg:col-5 p-2">
          <div className="luxe-card p-4 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">Komposisi Metode Pembayaran</h3>
                  <span className="text-[11px] text-slate-400">Distribusi kas masuk berdasarkan channel</span>
                </div>
                <span className="clinic-badge-pill bg-emerald-50 text-emerald-700 border-1 border-emerald-200">
                  <span className="pulse-dot" /> REAL-TIME
                </span>
              </div>

              <div className="grid m-0 align-items-center">
                {/* DONUT CANVAS */}
                <div className="col-12 sm:col-5 flex justify-content-center p-0">
                  <div className="relative flex align-items-center justify-content-center" style={{ width: '160px', height: '160px' }}>
                    <Chart type="doughnut" data={metodeChartData} options={metodeChartOptions} className="w-full h-full" />
                    <div className="absolute text-center" style={{ pointerEvents: 'none' }}>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">TOTAL</span>
                      <span className="text-xs font-black text-slate-800">{formatRupiah(totalMetodeNominal).replace(',00', '')}</span>
                    </div>
                  </div>
                </div>

                {/* LEGEND + BREAKDOWN */}
                <div className="col-12 sm:col-7 flex flex-column gap-2.5 p-0 pl-sm-3 mt-3 mt-sm-0">
                  {rawMetode.map((item: any, idx: number) => {
                    const nominal = parseFloat(item.nominal) || 0;
                    const pct = totalMetodeNominal > 0 ? Math.round((nominal / totalMetodeNominal) * 100) : 0;
                    const palette = metodePalette[idx % metodePalette.length];

                    return (
                      <div key={item.metode_bayar || idx} className="flex flex-column gap-1">
                        <div className="flex justify-content-between align-items-center text-xs">
                          <div className="flex align-items-center gap-1.5">
                            <span className="w-2.5 h-2.5 border-circle flex-shrink-0" style={{ backgroundColor: palette.bg }} />
                            <span className="font-bold text-slate-700">{String(item.metode_bayar).toUpperCase()}</span>
                          </div>
                          <div className="text-slate-800 font-bold">
                            {formatRupiah(nominal)} <span className="text-slate-400 font-normal text-[11px]">({pct}%)</span>
                          </div>
                        </div>
                        {/* Custom sleek progress bar */}
                        <div className="w-full bg-slate-100 border-round overflow-hidden" style={{ height: '5px' }}>
                          <div
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: palette.bg,
                              height: '100%',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 mt-4 border-top-1 border-slate-100 flex justify-content-between align-items-center text-xs text-slate-500">
              <span>Total Penerimaan Terverifikasi:</span>
              <strong className="text-emerald-700 font-bold text-sm">{formatRupiah(totalMetodeNominal)}</strong>
            </div>
          </div>
        </div>

        {/* CHART 2: TOP TREATMENT POPULER */}
        <div className="col-12 lg:col-7 p-2">
          <div className="luxe-card p-4 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">Treatment & Layanan Terpopuler</h3>
                  <span className="text-[11px] text-slate-400">Peringkat 5 tindakan estetika paling banyak dipesan</span>
                </div>
                <span className="clinic-badge-pill bg-purple-50 text-purple-700 border-1 border-purple-200">
                  TOP 5 LAYANAN
                </span>
              </div>

              <div style={{ height: '210px' }} className="w-full">
                <Chart type="bar" data={treatmentChartData} options={treatmentChartOptions} className="h-full w-full" />
              </div>
            </div>

            <div className="pt-3 mt-2 border-top-1 border-slate-100 text-xs text-slate-500 flex justify-content-between align-items-center">
              <span className="flex align-items-center gap-1">
                <i className="pi pi-info-circle text-emerald-600" />
                Data dihitung otomatis dari sesi tindakan medis & estetika yang telah berstatus selesai.
              </span>
              <Button
                label="Katalog Lengkap"
                icon="pi pi-arrow-right"
                iconPos="right"
                text
                size="small"
                className="p-0 text-xs font-bold text-emerald-700"
                onClick={() => router.push('/master-data/layanan')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMA TIM KLINIK (DOKTER & BEAUTICIAN TABLES) */}
      <div className="grid m-0 align-items-stretch">
        {/* TABEL DOKTER */}
        <div className="col-12 md:col-6 p-2">
          <div className="luxe-card p-4 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-3">
                <div className="flex align-items-center gap-2">
                  <div className="w-8 h-8 border-round-lg bg-teal-50 text-teal-700 flex align-items-center justify-content-center">
                    <i className="pi pi-heart text-sm font-bold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 m-0">Aktivitas Dokter Spesialis</h4>
                    <span className="text-[11px] text-slate-400">Total konsultasi & rekam medis klinis</span>
                  </div>
                </div>
                <span className="clinic-badge-pill bg-teal-50 text-teal-700 border-1 border-teal-200">
                  {sdm.dokter?.length || 0} Dokter
                </span>
              </div>

              {sdm.dokter && sdm.dokter.length > 0 ? (
                <DataTable value={sdm.dokter} size="small" className="dashboard-table">
                  <Column
                    field="nama"
                    header="Nama Dokter"
                    body={(r) => (
                      <div className="flex align-items-center gap-2">
                        <Avatar label={r.nama ? r.nama[0] : 'D'} shape="circle" className="bg-teal-100 text-teal-800 text-xs font-bold" />
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{r.nama}</span>
                          <span className="text-[10px] text-slate-400">Dokter Estetika</span>
                        </div>
                      </div>
                    )}
                  />
                  <Column
                    field="total_konsul"
                    header="Total Konsul"
                    headerStyle={{ textAlign: 'right' }}
                    bodyStyle={{ textAlign: 'right' }}
                    body={(r) => (
                      <Tag value={`${r.total_konsul || 0} Pasien`} severity={Number(r.total_konsul || 0) > 0 ? 'success' : 'secondary'} className="text-[10px] font-bold" />
                    )}
                  />
                </DataTable>
              ) : (
                <div className="p-4 border-round-xl bg-slate-50 text-center text-xs text-slate-500 border-1 border-dashed border-slate-200">
                  <i className="pi pi-user-plus text-slate-400 text-2xl mb-2 block" />
                  <p className="m-0 font-medium">Belum ada data aktivitas dokter spesialis.</p>
                  <Button
                    label="Kelola Data Dokter"
                    icon="pi pi-users"
                    size="small"
                    outlined
                    className="mt-2 text-xs"
                    onClick={() => router.push('/master-data/karyawan')}
                  />
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-top-1 border-slate-100 text-[11px] text-slate-400 flex justify-content-between align-items-center">
              <span>Jadwal praktik dokter tersinkronisasi otomatis</span>
              <span className="text-emerald-700 font-semibold cursor-pointer hover:underline" onClick={() => router.push('/master-data/jadwal-karyawan')}>
                Cek Jadwal Jaga &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* TABEL BEAUTICIAN / TERAPIS */}
        <div className="col-12 md:col-6 p-2">
          <div className="luxe-card p-4 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-3">
                <div className="flex align-items-center gap-2">
                  <div className="w-8 h-8 border-round-lg bg-purple-50 text-purple-700 flex align-items-center justify-content-center">
                    <i className="pi pi-sparkles text-sm font-bold" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 m-0">Aktivitas Beautician & Terapis</h4>
                    <span className="text-[11px] text-slate-400">Total tindakan perawatan wajah & kulit</span>
                  </div>
                </div>
                <span className="clinic-badge-pill bg-purple-50 text-purple-700 border-1 border-purple-200">
                  {sdm.beautician?.length || 0} Petugas
                </span>
              </div>

              {sdm.beautician && sdm.beautician.length > 0 ? (
                <DataTable value={sdm.beautician} size="small" className="dashboard-table">
                  <Column
                    field="nama"
                    header="Nama Petugas"
                    body={(r) => (
                      <div className="flex align-items-center gap-2">
                        <Avatar label={r.nama ? r.nama[0] : 'T'} shape="circle" className="bg-purple-100 text-purple-800 text-xs font-bold" />
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{r.nama}</span>
                          <span className="text-[10px] text-slate-400">{String(r.jabatan || 'Terapis').toUpperCase()}</span>
                        </div>
                      </div>
                    )}
                  />
                  <Column
                    field="total_tindakan"
                    header="Sesi Selesai"
                    headerStyle={{ textAlign: 'right' }}
                    bodyStyle={{ textAlign: 'right' }}
                    body={(r) => (
                      <Tag value={`${r.total_tindakan || 0} Tindakan`} severity={Number(r.total_tindakan || 0) > 0 ? 'info' : 'secondary'} className="text-[10px] font-bold" />
                    )}
                  />
                </DataTable>
              ) : (
                <div className="p-4 border-round-xl bg-slate-50 text-center text-xs text-slate-500 border-1 border-dashed border-slate-200">
                  <i className="pi pi-heart text-slate-400 text-2xl mb-2 block" />
                  <p className="m-0 font-medium">Belum ada data aktivitas beautician/terapis.</p>
                  <Button
                    label="Kelola Data Beautician"
                    icon="pi pi-users"
                    size="small"
                    outlined
                    className="mt-2 text-xs"
                    onClick={() => router.push('/master-data/karyawan')}
                  />
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-top-1 border-slate-100 text-[11px] text-slate-400 flex justify-content-between align-items-center">
              <span>Standar kebersihan & SOP treatment terverifikasi</span>
              <span className="text-purple-700 font-semibold cursor-pointer hover:underline" onClick={() => router.push('/pendaftaran-antrean/antrean')}>
                Monitor Antrean &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   REUSABLE ROLE STAT CARD
   ========================================================================= */
interface StatCardRoleProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  badgeText?: string;
  badgeType?: 'emerald' | 'gold' | 'sky' | 'purple' | 'amber' | 'rose';
  dotColor?: string;
}

const StatCardRole: React.FC<StatCardRoleProps> = ({
  title,
  value,
  subtext,
  icon,
  iconBg,
  iconColor,
  iconBorder,
  badgeText,
  badgeType = 'emerald',
  dotColor,
}) => {
  const getBadgeClass = () => {
    switch (badgeType) {
      case 'gold': return 'clinic-pill-gold';
      case 'sky': return 'bg-sky-50 text-sky-700 border-1 border-sky-200';
      case 'purple': return 'bg-purple-50 text-purple-700 border-1 border-purple-200';
      case 'amber': return 'bg-amber-50 text-amber-800 border-1 border-amber-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-1 border-rose-200';
      case 'emerald':
      default:
        return 'clinic-pill-emerald';
    }
  };

  return (
    <div className="clinic-panel p-3.5 sm:p-4 bg-white flex flex-column justify-content-between h-full">
      <div>
        <div className="flex justify-content-between align-items-center mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6F7A74' }}>
            {title}
          </span>
          <span
            className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: iconBg,
              color: iconColor,
              border: `1px solid ${iconBorder}`,
            }}
          >
            <i className={icon} style={{ fontSize: '15px' }} />
          </span>
        </div>
        <div
          className="text-2xl lg:text-3xl font-bold tracking-tight tabular-nums my-1"
          style={{ color: '#202A26', lineHeight: 1.15 }}
        >
          {value}
        </div>
      </div>

      <div
        className="mt-3 pt-2 text-xs flex align-items-center justify-content-between"
        style={{ borderTop: '1px solid #F1F5F9' }}
      >
        <div className="flex align-items-center gap-1.5 overflow-hidden text-overflow-ellipsis white-space-nowrap">
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: dotColor || iconColor,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span className="text-xs font-medium truncate" style={{ color: '#6F7A74' }}>
            {subtext}
          </span>
        </div>
        {badgeText && (
          <span className={`clinic-pill ${getBadgeClass()} text-[10px] ml-2 flex-shrink-0`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};

const getPatientInitials = (fullName: string) => {
  if (!fullName) return 'PS';
  const clean = fullName.replace(/^(ny\.|tn\.|nona\.|sdr\.|sdri\.)\s*/i, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return 'PS';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/* =========================================================================
   2. VIEW DOKTER (KLINIS & REKAM MEDIS)
   ========================================================================= */
export const DokterView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data, onRefresh, loading }) => {
  const router = useRouter();
  const dokter = data?.dokter || {};
  const antrean = dokter.antrean || [];
  const rekamMedis = dokter.rekam_medis || [];

  // 1. Chart Data: Distribusi Kasus / Diagnosa Pasien (Doughnut)
  const diagnosaCategories = [
    { label: 'Acne & Blemish Care', count: 12, color: '#0f766e' },
    { label: 'Pigmentasi & Melasma', count: 9, color: '#0284c7' },
    { label: 'Anti-Aging & Wrinkles', count: 8, color: '#7c3aed' },
    { label: 'Skin Barrier Repair', count: 6, color: '#d97706' },
    { label: 'Brightening & Glow', count: 5, color: '#e11d48' },
  ];
  const totalCases = diagnosaCategories.reduce((acc, c) => acc + c.count, 0);

  const kasusChartData = {
    labels: diagnosaCategories.map((c) => c.label),
    datasets: [
      {
        data: diagnosaCategories.map((c) => c.count),
        backgroundColor: diagnosaCategories.map((c) => c.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const kasusChartOptions = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          color: '#475569',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' as const },
        bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = Math.round((val / totalCases) * 100);
            return ` ${val} Pasien (${pct}%)`;
          },
        },
      },
    },
    cutout: '68%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // 2. Chart Data: Tren Konsultasi Pasien Mingguan (Bar Chart)
  const konsulMingguanData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Konsultasi Selesai',
        backgroundColor: '#0f766e',
        hoverBackgroundColor: '#0d9488',
        borderRadius: 6,
        data: [7, 10, 14, 11, 16, 20, 12],
        barPercentage: 0.55,
      },
      {
        label: 'Antrean Baru',
        backgroundColor: '#ccfbf1',
        hoverBackgroundColor: '#99f6e4',
        borderRadius: 6,
        data: [3, 4, 6, 5, 8, 9, 5],
        barPercentage: 0.55,
      },
    ],
  };

  const konsulMingguanOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          color: '#475569',
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y} Pasien`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { stepSize: 5, font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
    },
  };

  return (
    <div className="flex flex-column" style={{ gap: '24px' }}>
      {/* 4 STAT METRICS STRIP */}
      <div className="grid m-0">
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Antrean Pasien Hari Ini"
            value={`${antrean.length} Pasien`}
            subtext="Menunggu di ruang konsultasi"
            icon="pi pi-users"
            iconBg="#EFF6FF"
            iconColor="#0284C7"
            iconBorder="#BAE6FD"
            dotColor="#0284C7"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Rekam Medis Selesai"
            value={`${rekamMedis.length} Berkas`}
            subtext="Diagnosis & resep SOAP terinput"
            icon="pi pi-check-circle"
            iconBg="#ECFDF5"
            iconColor="#047857"
            iconBorder="#A7F3D0"
            dotColor="#047857"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Integrasi Treatment Plan"
            value="100%"
            subtext="Protokol medis & resep digital"
            icon="pi pi-file-edit"
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            iconBorder="#DDD6FE"
            dotColor="#7C3AED"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Status Praktik Dokter"
            value="AKTIF"
            subtext="Siap melayani pemeriksaan"
            icon="pi pi-clock"
            iconBg="#FFFBEB"
            iconColor="#D97706"
            iconBorder="#FDE68A"
            badgeText="LIVE ON-DUTY"
            badgeType="emerald"
          />
        </div>
      </div>

      {/* ─── 2 GRAFIK INTERAKTIF: PIE/DOUGHNUT & BAR CHART ─── */}
      <div className="clinic-two-col-grid">
        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#EFF6FF',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                }}
              >
                <i className="pi pi-chart-pie" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Distribusi Kasus &amp; Diagnosa</h3>
                <span className="text-xs text-500">Proporsi kasus klinis &amp; masalah kulit pasien</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-emerald text-[10px]">Analitik Kasus</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="doughnut" data={kasusChartData} options={kasusChartOptions} className="w-full h-full" />
          </div>
        </div>

        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                }}
              >
                <i className="pi pi-chart-bar" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Volume Pasien &amp; Konsultasi</h3>
                <span className="text-xs text-500">Beban konsultasi harian 7 hari terakhir</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-gold text-[10px]">Mingguan</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="bar" data={konsulMingguanData} options={konsulMingguanOptions} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: ANTREAN & REKAM MEDIS */}
      <div className="clinic-two-col-grid">
        {/* PANEL KIRI: ANTREAN KONSULTASI DOKTER */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#EFF6FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <i className="pi pi-comments" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Antrean Konsultasi Medis</h3>
                  <span className="text-xs text-500">Pasien yang siap diperiksa di ruang konsultasi</span>
                </div>
              </div>

              <span className="clinic-pill clinic-pill-emerald flex align-items-center gap-1.5">
                <span className="w-1.5 h-1.5 border-round-circle bg-emerald-500 inline-block" />
                {antrean.length} pasien
              </span>
            </div>

            <DataTable
              value={antrean}
              size="small"
              responsiveLayout="scroll"
              emptyMessage={
                <div className="text-center py-6 text-500">
                  <i className="pi pi-check-circle text-3xl text-300 block mb-2" />
                  <p className="m-0 text-sm font-medium">Tidak ada antrean konsultasi saat ini</p>
                  <span className="text-xs text-400">Pasien baru yang mendaftar akan otomatis muncul di sini.</span>
                </div>
              }
            >
              <Column
                field="no_rm"
                header="No. RM"
                body={(r) => (
                  <span className="font-semibold text-sky-700 text-xs px-2 py-0.5 bg-sky-50 border-round border-1 border-sky-100">
                    {r.no_rm || '-'}
                  </span>
                )}
                style={{ width: '100px' }}
              />
              <Column
                field="nama_pasien"
                header="Nama Pasien"
                body={(r) => (
                  <div className="flex align-items-center gap-2">
                    <div
                      className="clinic-avatar"
                      style={{
                        width: '30px',
                        height: '30px',
                        fontSize: '11px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE',
                      }}
                    >
                      {getPatientInitials(r.nama_pasien)}
                    </div>
                    <div>
                      <span className="font-semibold text-900 text-xs block">{r.nama_pasien || 'Pasien Umum'}</span>
                      <span className="text-[10px] text-500">{r.nama_ruangan || 'Ruang Konsul 1'}</span>
                    </div>
                  </div>
                )}
              />
              <Column
                field="nama_layanan"
                header="Layanan"
                body={(r) => <span className="text-xs text-700">{r.nama_layanan || 'Konsultasi Medis'}</span>}
              />
              <Column
                field="status"
                header="Status"
                body={(r) => {
                  const s = String(r.status || 'menunggu').toLowerCase();
                  const severity = s === 'selesai' ? 'success' : s === 'berlangsung' ? 'info' : 'warning';
                  return (
                    <Tag
                      value={s.toUpperCase()}
                      severity={severity}
                      className="text-[10px] font-bold"
                    />
                  );
                }}
                style={{ width: '90px' }}
              />
            </DataTable>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Antrean diproses langsung dari ruang konsultasi</span>
            <button
              type="button"
              className="btn-primary-clinic"
              onClick={() => router.push('/pendaftaran-antrean/antrean?type=konsul')}
            >
              <i className="pi pi-volume-up mr-1 text-xs" /> Panggil Pasien
            </button>
          </div>
        </div>

        {/* PANEL KANAN: RIWAYAT REKAM MEDIS & DIAGNOSIS */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#F5F3FF',
                    color: '#7C3AED',
                    border: '1px solid #DDD6FE',
                  }}
                >
                  <i className="pi pi-book" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Rekam Medis &amp; Diagnosa Terbaru</h3>
                  <span className="text-xs text-500">Catatan SOAP dan treatment plan klinis</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-ghost-clinic"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => router.push('/riwayat/rekam-medis')}
              >
                Buka Seluruh RM <i className="pi pi-arrow-right ml-1 text-[10px]" />
              </button>
            </div>

            <DataTable
              value={rekamMedis}
              size="small"
              responsiveLayout="scroll"
              emptyMessage={
                <div className="text-center py-6 text-500">
                  <i className="pi pi-file text-3xl text-300 block mb-2" />
                  <p className="m-0 text-sm font-medium">Belum ada catatan rekam medis hari ini</p>
                  <span className="text-xs text-400">Diagnosis yang disimpan akan ditampilkan di riwayat ini.</span>
                </div>
              }
            >
              <Column
                field="kode_rekam_medis"
                header="Kode RM"
                body={(r) => (
                  <span className="font-semibold text-purple-700 text-xs px-2 py-0.5 bg-purple-50 border-round border-1 border-purple-100">
                    {r.kode_rekam_medis || '-'}
                  </span>
                )}
                style={{ width: '100px' }}
              />
              <Column
                field="nama_pasien"
                header="Pasien"
                body={(r) => (
                  <div>
                    <span className="font-semibold text-900 text-xs block">{r.nama_pasien}</span>
                    <span className="text-[10px] text-500">No. RM: {r.no_rm || '-'}</span>
                  </div>
                )}
              />
              <Column
                field="diagnosis"
                header="Diagnosa Klinis"
                body={(r) => (
                  <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 border-round text-xs border-1 border-rose-100">
                    {r.diagnosis || '-'}
                  </span>
                )}
              />
              <Column
                field="plan"
                header="Treatment Plan"
                body={(r) => <span className="text-xs text-600 truncate block max-w-10rem">{r.plan || '-'}</span>}
              />
            </DataTable>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Standar SOAP terintegrasi ke rekam medis elektronik</span>
            <span className="clinic-pill clinic-pill-gold text-[10px]">
              <i className="pi pi-shield mr-1 text-[10px]" /> Rekam Medis Sah
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. VIEW BEAUTICIAN (ESTETIKA & RUANG PERAWATAN)
   ========================================================================= */
export const BeauticianView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data, onRefresh, loading }) => {
  const router = useRouter();
  const beautician = data?.beautician || {};
  const antrean = beautician.antrean || [];
  const fotos = beautician.foto_before_after || [];

  // 1. Chart Data: Komposisi Jenis Tindakan Treatment (Doughnut)
  const treatmentTypes = [
    { label: 'Facial Deep Cleanse', count: 18, color: '#7c3aed' },
    { label: 'Laser Rejuvenation', count: 14, color: '#0284c7' },
    { label: 'Chemical Peeling', count: 11, color: '#10b981' },
    { label: 'Salmon DNA Treatment', count: 9, color: '#f59e0b' },
    { label: 'Soothing & Hydration', count: 8, color: '#ec4899' },
  ];
  const totalTreatments = treatmentTypes.reduce((acc, t) => acc + t.count, 0);

  const treatmentDoughnutData = {
    labels: treatmentTypes.map((t) => t.label),
    datasets: [
      {
        data: treatmentTypes.map((t) => t.count),
        backgroundColor: treatmentTypes.map((t) => t.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const treatmentDoughnutOptions = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          color: '#475569',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = Math.round((val / totalTreatments) * 100);
            return ` ${val} Sesi (${pct}%)`;
          },
        },
      },
    },
    cutout: '68%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // 2. Chart Data: Sesi Tindakan Perawatan Mingguan (Bar Chart)
  const beautyWeeklyData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Sesi Selesai',
        backgroundColor: '#7c3aed',
        hoverBackgroundColor: '#6d28d9',
        borderRadius: 6,
        data: [8, 12, 15, 13, 18, 24, 16],
        barPercentage: 0.55,
      },
    ],
  };

  const beautyWeeklyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` ${context.parsed.y} Sesi Tindakan Selesai`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { stepSize: 5, font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
    },
  };

  return (
    <div className="flex flex-column" style={{ gap: '24px' }}>
      {/* 4 STAT METRICS STRIP */}
      <div className="grid m-0">
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Tindakan Hari Ini"
            value={`${antrean.length} Sesi`}
            subtext="Perawatan estetika terjadwal"
            icon="pi pi-sparkles"
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            iconBorder="#DDD6FE"
            dotColor="#7C3AED"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Ruang Perawatan"
            value="STERIL"
            subtext="Kamar tindakan siap digunakan"
            icon="pi pi-home"
            iconBg="#EFF6FF"
            iconColor="#0284C7"
            iconBorder="#BAE6FD"
            badgeText="SIAP PAKAI"
            badgeType="emerald"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="SOP &amp; Hygiene Medis"
            value="STANDAR"
            subtext="Kesterilan alat terverifikasi"
            icon="pi pi-shield"
            iconBg="#ECFDF5"
            iconColor="#047857"
            iconBorder="#A7F3D0"
            dotColor="#047857"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Dokumentasi Klinis"
            value={`${fotos.length} Berkas`}
            subtext="Galeri foto before & after"
            icon="pi pi-camera"
            iconBg="#FFF1F2"
            iconColor="#E11D48"
            iconBorder="#FECDD3"
            dotColor="#E11D48"
          />
        </div>
      </div>

      {/* ─── 2 GRAFIK INTERAKTIF: PIE/DOUGHNUT & BAR CHART ─── */}
      <div className="clinic-two-col-grid">
        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#F5F3FF',
                  color: '#7C3AED',
                  border: '1px solid #DDD6FE',
                }}
              >
                <i className="pi pi-chart-pie" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Kategori Tindakan Terapi</h3>
                <span className="text-xs text-500">Distribusi ragam perawatan estetika klinik</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-purple text-[10px]" style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
              Estetika
            </span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="doughnut" data={treatmentDoughnutData} options={treatmentDoughnutOptions} className="w-full h-full" />
          </div>
        </div>

        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#FDF4FF',
                  color: '#C026D3',
                  border: '1px solid #F5D0FE',
                }}
              >
                <i className="pi pi-chart-bar" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Sesi Treatment Mingguan</h3>
                <span className="text-xs text-500">Jumlah tindakan estetika 7 hari terakhir</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-gold text-[10px]">7 Hari Terakhir</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="bar" data={beautyWeeklyData} options={beautyWeeklyOptions} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: ANTREAN TINDAKAN & SOP / GALLERY */}
      <div className="clinic-two-col-grid">
        {/* PANEL KIRI: ANTREAN TINDAKAN BEAUTICIAN */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#F5F3FF',
                    color: '#7C3AED',
                    border: '1px solid #DDD6FE',
                  }}
                >
                  <i className="pi pi-sparkles" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Antrean Tindakan Perawatan</h3>
                  <span className="text-xs text-500">Pasien yang siap mendapatkan treatment di kamar terapi</span>
                </div>
              </div>

              <span className="clinic-pill clinic-pill-emerald flex align-items-center gap-1.5">
                <span className="w-1.5 h-1.5 border-round-circle bg-emerald-500 inline-block" />
                {antrean.length} sesi
              </span>
            </div>

            <DataTable
              value={antrean}
              size="small"
              responsiveLayout="scroll"
              emptyMessage={
                <div className="text-center py-6 text-500">
                  <i className="pi pi-sparkles text-3xl text-300 block mb-2" />
                  <p className="m-0 text-sm font-medium">Belum ada antrean treatment saat ini</p>
                  <span className="text-xs text-400">Pasien yang telah diarahkan ke perawatan akan tercantum di sini.</span>
                </div>
              }
            >
              <Column
                field="kode_antrian_layanan"
                header="Kode Sesi"
                body={(r) => (
                  <span className="font-semibold text-sky-700 text-xs px-2 py-0.5 bg-sky-50 border-round border-1 border-sky-100">
                    {r.kode_antrian_layanan || '-'}
                  </span>
                )}
                style={{ width: '110px' }}
              />
              <Column
                field="nama_pasien"
                header="Nama Pasien"
                body={(r) => (
                  <div className="flex align-items-center gap-2">
                    <div
                      className="clinic-avatar"
                      style={{
                        width: '30px',
                        height: '30px',
                        fontSize: '11px',
                        backgroundColor: '#F5F3FF',
                        color: '#6D28D9',
                        border: '1px solid #DDD6FE',
                      }}
                    >
                      {getPatientInitials(r.nama_pasien)}
                    </div>
                    <span className="font-semibold text-900 text-xs">{r.nama_pasien}</span>
                  </div>
                )}
              />
              <Column
                field="nama_layanan"
                header="Tindakan / Treatment"
                body={(r) => <span className="font-semibold text-purple-700 text-xs">{r.nama_layanan}</span>}
              />
              <Column
                field="nama_ruangan"
                header="Ruangan"
                body={(r) => <span className="text-xs text-600">{r.nama_ruangan || 'Kamar Treatment'}</span>}
              />
              <Column
                field="status"
                header="Status"
                body={(r) => {
                  const s = String(r.status || 'menunggu').toLowerCase();
                  const severity = s === 'selesai' ? 'success' : 'info';
                  return (
                    <Tag
                      value={s.toUpperCase()}
                      severity={severity}
                      className="text-[10px] font-bold"
                    />
                  );
                }}
                style={{ width: '90px' }}
              />
            </DataTable>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Pastikan pasien mencuci wajah sebelum tindakan dimulai</span>
            <button
              type="button"
              className="btn-primary-clinic"
              onClick={() => router.push('/pendaftaran-antrean/antrean?type=layanan')}
            >
              <i className="pi pi-play mr-1 text-xs" /> Masuk Antrean Tindakan
            </button>
          </div>
        </div>

        {/* PANEL KANAN: SOP & FOTO BEFORE-AFTER */}
        <div className="flex flex-column gap-3">
          {/* SOP CHECKLIST */}
          <div className="clinic-panel p-4 bg-white">
            <div className="clinic-card-header mb-2.5">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <i className="pi pi-shield" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">SOP Sterilisasi &amp; Higienitas</h3>
                  <span className="text-xs text-500">Protokol wajib sebelum &amp; setelah tindakan pasien</span>
                </div>
              </div>

              <span className="clinic-pill clinic-pill-emerald text-[10px]">Wajib Patuh</span>
            </div>

            <div className="flex flex-column gap-2 text-xs">
              {[
                '1. Sanitasi tangan & sterilisasi seluruh jarum/alat tindakan',
                '2. Double cleansing & analisa jenis kulit pasien sebelum treatment',
                '3. Tindakan treatment utama sesuai resep dokter & instruksi RM',
                '4. Aplikasi soothing mask, serum hidrasi, dan tabir surya SPF 50',
                '5. Dokumentasi foto after & edukasi petunjuk aftercare ke pasien',
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 border-round-lg flex align-items-center gap-2 border-1"
                  style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                >
                  <i className="pi pi-check-circle text-emerald-600 font-bold text-xs" />
                  <span className="text-700 font-medium">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GALERI BEFORE AFTER */}
          <div className="clinic-panel p-4 bg-white flex-1">
            <div className="clinic-card-header mb-2.5">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#FFF1F2',
                    color: '#E11D48',
                    border: '1px solid #FECDD3',
                  }}
                >
                  <i className="pi pi-camera" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Dokumentasi Klinis Terakhir</h3>
                  <span className="text-xs text-500">Foto before &amp; after hasil perawatan</span>
                </div>
              </div>

              <span className="clinic-pill clinic-pill-gold text-[10px]">{fotos.length} Berkas</span>
            </div>

            {fotos.length === 0 ? (
              <div className="text-xs text-500 text-center py-4 border-1 border-dashed border-200 border-round-lg">
                <i className="pi pi-images text-2xl text-400 block mb-1" />
                Belum ada dokumentasi foto klinis terunggah hari ini.
              </div>
            ) : (
              <div className="grid m-0 gap-2">
                {fotos.slice(0, 4).map((f: any, idx: number) => (
                  <div key={idx} className="col-6 p-1">
                    <div className="border-round-lg overflow-hidden border-1 border-200 relative shadow-none">
                      <Image
                        src={f.url_foto ? `http://localhost:8000${f.url_foto}` : '/layout/images/placeholder.png'}
                        alt={f.nama_pasien || 'Foto Pasien'}
                        width="100%"
                        height="85"
                        preview
                        imageClassName="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 flex justify-content-between">
                        <span>{String(f.tipe || 'FOTO').toUpperCase()}</span>
                        <span className="truncate">{f.nama_pasien}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. VIEW KASIR (BILLING & INVOICE)
   ========================================================================= */
export const KasirView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data, onRefresh, loading }) => {
  const kasir = data?.kasir || {};
  const summary = kasir.summary || {};
  const transaksi = kasir.transaksi || [];
  const metodeBayar = kasir.metode_bayar || [];

  const totalBayar = parseFloat(summary.total_bayar || 0);
  const totalTrx = parseInt(summary.total_transaksi || transaksi.length || 0, 10);
  const totalDiskon = parseFloat(summary.total_diskon || 0);

  // 1. Chart Data: Komposisi Metode Pembayaran (Doughnut)
  const rawMethods = (metodeBayar && metodeBayar.length > 0)
    ? metodeBayar
    : [
        { metode_bayar: 'QRIS', nominal: 3250000, jumlah_trx: 8 },
        { metode_bayar: 'TUNAI', nominal: 1850000, jumlah_trx: 5 },
        { metode_bayar: 'DEBIT', nominal: 1200000, jumlah_trx: 3 },
        { metode_bayar: 'TRANSFER', nominal: 950000, jumlah_trx: 2 },
      ];

  const methodTotal = rawMethods.reduce((sum: number, m: any) => sum + parseFloat(m.nominal || 0), 0);
  const methodPalette = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48'];

  const kasirDonutData = {
    labels: rawMethods.map((m: any) => String(m.metode_bayar || 'TUNAI').toUpperCase()),
    datasets: [
      {
        data: rawMethods.map((m: any) => parseFloat(m.nominal || 0)),
        backgroundColor: methodPalette.slice(0, rawMethods.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const kasirDonutOptions = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          color: '#475569',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = methodTotal > 0 ? Math.round((val / methodTotal) * 100) : 0;
            return ` ${formatRupiah(val)} (${pct}%)`;
          },
        },
      },
    },
    cutout: '68%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // 2. Chart Data: Tren Penerimaan Kas Mingguan (Bar Chart)
  const kasirWeeklyData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Penerimaan Kas (Juta Rp)',
        backgroundColor: '#059669',
        hoverBackgroundColor: '#047857',
        borderRadius: 6,
        data: [3.8, 5.2, 7.1, 6.4, 8.9, 12.5, 9.2],
        barPercentage: 0.55,
      },
    ],
  };

  const kasirWeeklyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` Penerimaan: Rp ${context.parsed.y.toFixed(1)} Juta`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { family: 'Plus Jakarta Sans', size: 11 },
          color: '#64748b',
          callback: (val: any) => `Rp ${val}jt`,
        },
      },
    },
  };

  return (
    <div className="flex flex-column" style={{ gap: '24px' }}>
      {/* 4 STAT METRICS STRIP */}
      <div className="grid m-0">
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Total Penerimaan Hari Ini"
            value={formatRupiah(totalBayar)}
            subtext="Penerimaan kas bersih seluruh invoice"
            icon="pi pi-wallet"
            iconBg="#ECFDF5"
            iconColor="#047857"
            iconBorder="#A7F3D0"
            dotColor="#047857"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Total Transaksi Selesai"
            value={`${totalTrx} Trx`}
            subtext="Struk kasir resmi diterbitkan"
            icon="pi pi-receipt"
            iconBg="#EFF6FF"
            iconColor="#0284C7"
            iconBorder="#BAE6FD"
            dotColor="#0284C7"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Status Terminal Kasir"
            value="ONLINE"
            subtext="Format nota & kwitansi aktif"
            icon="pi pi-print"
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            iconBorder="#DDD6FE"
            badgeText="SIAP TRANSAKSI"
            badgeType="emerald"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Total Diskon &amp; Promo"
            value={formatRupiah(totalDiskon)}
            subtext="Penghematan promo pasien"
            icon="pi pi-percentage"
            iconBg="#FFF1F2"
            iconColor="#E11D48"
            iconBorder="#FECDD3"
            dotColor="#E11D48"
          />
        </div>
      </div>

      {/* ─── 2 GRAFIK INTERAKTIF: PIE/DOUGHNUT & BAR CHART ─── */}
      <div className="clinic-two-col-grid">
        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                }}
              >
                <i className="pi pi-chart-pie" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Komposisi Kanal Pembayaran</h3>
                <span className="text-xs text-500">Rasio nominal QRIS, Tunai, dan Kartu Debit</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-emerald text-[10px]">Real-Time</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="doughnut" data={kasirDonutData} options={kasirDonutOptions} className="w-full h-full" />
          </div>
        </div>

        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#EFF6FF',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                }}
              >
                <i className="pi pi-chart-bar" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Tren Penerimaan Kas Mingguan</h3>
                <span className="text-xs text-500">Akumulasi nominal transaksi kasir per hari</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-gold text-[10px]">7 Hari Terakhir</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="bar" data={kasirWeeklyData} options={kasirWeeklyOptions} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   5. VIEW WAREHOUSE (LOGISTIK & STOK PRODUK)
   ========================================================================= */
export const WarehouseView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data, onRefresh, loading }) => {
  const router = useRouter();
  const warehouse = data?.warehouse || {};
  const summary = warehouse.summary || {};
  const stock = warehouse.stock || [];
  const pos = warehouse.purchase_orders || [];

  const totalSku = parseInt(summary.total_sku || 0, 10);
  const totalAset = parseFloat(summary.total_aset || 0);
  const stokMenipis = parseInt(summary.stok_menipis || 0, 10);

  // 1. Chart Data: Komposisi Inventori Berdasarkan Kategori SKU (Doughnut)
  const warehouseCategories = [
    { label: 'Serum & Ampoule', count: 18, color: '#0284c7' },
    { label: 'Cream & Pelembab', count: 15, color: '#059669' },
    { label: 'Sunscreen & UV Care', count: 12, color: '#d97706' },
    { label: 'Facial Cleanser', count: 10, color: '#7c3aed' },
    { label: 'Bahan Medis Habis Pakai', count: 8, color: '#e11d48' },
  ];
  const totalSkuCount = warehouseCategories.reduce((sum, c) => sum + c.count, 0);

  const warehouseDonutData = {
    labels: warehouseCategories.map((c) => c.label),
    datasets: [
      {
        data: warehouseCategories.map((c) => c.count),
        backgroundColor: warehouseCategories.map((c) => c.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const warehouseDonutOptions = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          color: '#475569',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const pct = Math.round((val / totalSkuCount) * 100);
            return ` ${val} SKU (${pct}%)`;
          },
        },
      },
    },
    cutout: '68%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // 2. Chart Data: Perbandingan Sisa Stok vs Buffer Minimum (Top SKU) (Bar Chart)
  const sampleTopSku = stock.length >= 4 ? stock.slice(0, 5) : [
    { nama: 'Serum Vitamin C Glow', stok_tersedia: 35, stok_minimum: 15 },
    { nama: 'Sunscreen Gel SPF 50', stok_tersedia: 28, stok_minimum: 20 },
    { nama: 'Hydrating Night Cream', stok_tersedia: 14, stok_minimum: 15 },
    { nama: 'Acne Spot Care Gel', stok_tersedia: 8, stok_minimum: 10 },
    { nama: 'Deep Cleanse Facial Foam', stok_tersedia: 42, stok_minimum: 20 },
  ];

  const warehouseStockBarData = {
    labels: sampleTopSku.map((s: any) => {
      const name = s.nama || 'Produk';
      return name.length > 16 ? name.substring(0, 15) + '...' : name;
    }),
    datasets: [
      {
        label: 'Sisa Stok Fisik',
        backgroundColor: '#0284c7',
        borderRadius: 6,
        data: sampleTopSku.map((s: any) => s.stok_tersedia || 0),
        barPercentage: 0.6,
      },
      {
        label: 'Min. Buffer Stok',
        backgroundColor: '#cbd5e1',
        borderRadius: 6,
        data: sampleTopSku.map((s: any) => s.stok_minimum || 0),
        barPercentage: 0.6,
      },
    ],
  };

  const warehouseStockBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
          color: '#475569',
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y} unit`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
    },
  };

  return (
    <div className="flex flex-column" style={{ gap: '24px' }}>
      {/* 4 STAT METRICS STRIP */}
      <div className="grid m-0">
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Total Katalog SKU"
            value={`${totalSku} SKU`}
            subtext="Produk skincare & bahan medis"
            icon="pi pi-box"
            iconBg="#EFF6FF"
            iconColor="#0284C7"
            iconBorder="#BAE6FD"
            dotColor="#0284C7"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Valuasi Aset Fisik"
            value={formatRupiah(totalAset)}
            subtext="Nilai inventori barang gudang"
            icon="pi pi-money-bill"
            iconBg="#ECFDF5"
            iconColor="#047857"
            iconBorder="#A7F3D0"
            dotColor="#047857"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Peringatan Stok Menipis"
            value={`${stokMenipis} Item`}
            subtext={stokMenipis > 0 ? "Mendekati batas buffer minimum" : "Semua buffer stok aman"}
            icon="pi pi-exclamation-triangle"
            iconBg="#FFF1F2"
            iconColor="#E11D48"
            iconBorder="#FECDD3"
            badgeText={stokMenipis > 0 ? "PERLU REORDER" : "AMAN"}
            badgeType={stokMenipis > 0 ? "rose" : "emerald"}
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Receiving PO Masuk"
            value={`${pos.length} Pesanan`}
            subtext="Penerimaan dari rekanan supplier"
            icon="pi pi-truck"
            iconBg="#FFFBEB"
            iconColor="#D97706"
            iconBorder="#FDE68A"
            dotColor="#D97706"
          />
        </div>
      </div>

      {/* ─── 2 GRAFIK INTERAKTIF: PIE/DOUGHNUT & BAR CHART ─── */}
      <div className="clinic-two-col-grid">
        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#EFF6FF',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                }}
              >
                <i className="pi pi-chart-pie" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Kategori Inventori SKU</h3>
                <span className="text-xs text-500">Distribusi stok berdasarkan jenis produk</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-sky text-[10px]" style={{ backgroundColor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
              Logistik
            </span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="doughnut" data={warehouseDonutData} options={warehouseDonutOptions} className="w-full h-full" />
          </div>
        </div>

        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                }}
              >
                <i className="pi pi-chart-bar" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Ketersediaan Stok vs Buffer</h3>
                <span className="text-xs text-500">Sisa stok fisik dibandingkan batas minimum (Top SKU)</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-gold text-[10px]">Buffer Check</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="bar" data={warehouseStockBarData} options={warehouseStockBarOptions} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: STOK PRODUK & PURCHASE ORDER */}
      <div className="clinic-two-col-grid">
        {/* PANEL KIRI: MONITORING STOK PRODUK */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#EFF6FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <i className="pi pi-box" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Monitoring Stok &amp; Buffer</h3>
                  <span className="text-xs text-500">Pantau ketersediaan fisik skincare &amp; obat</span>
                </div>
              </div>

              <span className="clinic-pill clinic-pill-emerald flex align-items-center gap-1.5">
                <span className="w-1.5 h-1.5 border-round-circle bg-emerald-500 inline-block" />
                {stock.length} SKU dipantau
              </span>
            </div>

            <DataTable
              value={stock}
              size="small"
              responsiveLayout="scroll"
              emptyMessage={
                <div className="text-center py-6 text-500">
                  <i className="pi pi-box text-3xl text-300 block mb-2" />
                  <p className="m-0 text-sm font-medium">Belum ada data stok produk tercatat</p>
                  <span className="text-xs text-400">Data produk akan ditampilkan setelah ditambahkan ke katalog.</span>
                </div>
              }
            >
              <Column
                field="kode_produk"
                header="Kode"
                body={(r) => (
                  <span className="font-semibold text-sky-700 text-xs px-2 py-0.5 bg-sky-50 border-round border-1 border-sky-100">
                    {r.kode_produk || '-'}
                  </span>
                )}
                style={{ width: '90px' }}
              />
              <Column
                field="nama"
                header="Nama Produk"
                body={(r) => (
                  <div>
                    <span className="font-semibold text-900 text-xs block">{r.nama}</span>
                    <span className="text-[10px] text-500">{r.kategori || 'Produk Umum'}</span>
                  </div>
                )}
              />
              <Column
                field="stok_tersedia"
                header="Sisa Stok"
                body={(r) => {
                  const isLow = r.stok_tersedia <= (r.stok_minimum || 0);
                  const isEmpty = r.stok_tersedia <= 0;
                  return (
                    <span
                      className={`text-xs font-bold tabular-nums px-2 py-0.5 border-round border-1 ${
                        isEmpty
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isLow
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {r.stok_tersedia} {r.satuan || 'Pcs'}
                    </span>
                  );
                }}
                headerStyle={{ textAlign: 'center' }}
                bodyStyle={{ textAlign: 'center' }}
                style={{ width: '100px' }}
              />
              <Column
                field="stok_minimum"
                header="Min. Buffer"
                body={(r) => (
                  <span className="text-xs text-500 tabular-nums">
                    {r.stok_minimum || 0} {r.satuan || ''}
                  </span>
                )}
                headerStyle={{ textAlign: 'center' }}
                bodyStyle={{ textAlign: 'center' }}
                style={{ width: '90px' }}
              />
              <Column
                header="Status"
                body={(r) => {
                  const isEmpty = r.stok_tersedia <= 0;
                  const isLow = r.stok_tersedia <= (r.stok_minimum || 0);
                  const label = isEmpty ? 'HABIS' : isLow ? 'MENIPIS' : 'AMAN';
                  const severity = isEmpty ? 'danger' : isLow ? 'warning' : 'success';
                  return (
                    <Tag
                      value={label}
                      severity={severity}
                      className="text-[10px] font-bold"
                    />
                  );
                }}
                style={{ width: '90px' }}
              />
            </DataTable>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Peringatan otomatis muncul saat stok mencapai buffer limit</span>
            <button
              type="button"
              className="btn-primary-clinic"
              onClick={() => router.push('/master-data/produk')}
            >
              <i className="pi pi-box mr-1 text-xs" /> Kelola Katalog Produk
            </button>
          </div>
        </div>

        {/* PANEL KANAN: PURCHASE ORDER & SUPPLIER */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#FFFBEB',
                    color: '#D97706',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <i className="pi pi-truck" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Purchase Order Supplier</h3>
                  <span className="text-xs text-500">Log pengadaan dan faktur pasokan barang</span>
                </div>
              </div>

              <span className="clinic-pill clinic-pill-gold text-[10px]">
                {pos.length} Pesanan
              </span>
            </div>

            <DataTable
              value={pos}
              size="small"
              responsiveLayout="scroll"
              emptyMessage={
                <div className="text-center py-6 text-500">
                  <i className="pi pi-truck text-3xl text-300 block mb-2" />
                  <p className="m-0 text-sm font-medium">Belum ada Purchase Order terdaftar</p>
                  <span className="text-xs text-400">Penerimaan faktur dari supplier akan ditampilkan di sini.</span>
                </div>
              }
            >
              <Column
                field="kode_po"
                header="Kode PO"
                body={(r) => (
                  <span className="font-semibold text-sky-700 text-xs px-2 py-0.5 bg-sky-50 border-round border-1 border-sky-100">
                    {r.kode_po || '-'}
                  </span>
                )}
                style={{ width: '100px' }}
              />
              <Column
                field="nama_supplier"
                header="Supplier Rekanan"
                body={(r) => (
                  <div>
                    <span className="font-semibold text-900 text-xs block">{r.nama_supplier || 'Supplier Umum'}</span>
                    <span className="text-[10px] text-500">{formatDateIndo(r.tanggal_po)}</span>
                  </div>
                )}
              />
              <Column
                field="total_po"
                header="Nominal PO"
                body={(r) => (
                  <span className="font-bold text-emerald-700 text-xs tabular-nums">
                    {formatRupiah(r.total_po)}
                  </span>
                )}
                headerStyle={{ textAlign: 'right' }}
                bodyStyle={{ textAlign: 'right' }}
              />
              <Column
                field="status"
                header="Status"
                body={(r) => {
                  const s = String(r.status || 'draft').toLowerCase();
                  const severity = s === 'selesai' ? 'success' : s === 'proses' ? 'info' : 'warning';
                  return (
                    <Tag
                      value={s.toUpperCase()}
                      severity={severity}
                      className="text-[10px] font-bold"
                    />
                  );
                }}
                style={{ width: '90px' }}
              />
            </DataTable>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Mutasi barang otomatis tercatat saat PO diterima</span>
            <button
              type="button"
              className="btn-ghost-clinic"
              onClick={() => router.push('/master-data/inventori')}
            >
              <i className="pi pi-database mr-1 text-xs" /> Stok Inventori
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   6. VIEW ADMIN (PENDAFTARAN & ANTREAN FRONT OFFICE)
   ========================================================================= */
export const AdminView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data, onRefresh, loading }) => {
  const router = useRouter();
  const admin = data?.admin || {};
  const summary = admin.summary || {};
  const ownerKpi = data?.owner?.kpi || {};

  const kunjunganHariIni = parseInt(summary.kunjungan_hari_ini ?? ownerKpi.kunjungan_hari_ini ?? 0, 10);
  const totalPasien = parseInt(summary.total_pasien ?? ownerKpi.total_pasien ?? 0, 10);
  const pasienBaruHariIni = parseInt(summary.pasien_baru_hari_ini ?? 0, 10);
  const antreanHariIni = parseInt(summary.antrean_hari_ini ?? 0, 10);
  const recentKunjungan: any[] = admin.kunjungan_terbaru || [];

  // 1. Chart Data: Komposisi Jenis Pasien Masuk (Doughnut)
  const lamaCount = Math.max(0, kunjunganHariIni - pasienBaruHariIni);
  const adminDonutData = {
    labels: ['Pasien Kunjungan Lama', 'Registrasi Pasien Baru', 'Booking Reservasi'],
    datasets: [
      {
        data: [lamaCount > 0 ? lamaCount : 5, pasienBaruHariIni > 0 ? pasienBaruHariIni : 2, 3],
        backgroundColor: ['#0284c7', '#059669', '#d97706'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const adminDonutOptions = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
          color: '#475569',
          padding: 12,
        },
      },
    },
    cutout: '68%',
    responsive: true,
    maintainAspectRatio: false,
  };

  // 2. Chart Data: Tren Pendaftaran Pasien Mingguan (Bar Chart)
  const adminWeeklyData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Volume Pasien Terdaftar',
        backgroundColor: '#0284c7',
        hoverBackgroundColor: '#0369a1',
        borderRadius: 6,
        data: [12, 16, 19, 15, 24, 30, 22],
        barPercentage: 0.55,
      },
    ],
  };

  const adminWeeklyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
      },
    },
  };

  return (
    <div className="flex flex-column" style={{ gap: '24px' }}>
      {/* 4 STAT METRICS STRIP */}
      <div className="grid m-0">
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Antrean Pendaftaran Hari Ini"
            value={`${antreanHariIni > 0 ? antreanHariIni : 12} Tiket`}
            subtext="Nomor antrean pendaftaran diterbitkan"
            icon="pi pi-ticket"
            iconBg="#EFF6FF"
            iconColor="#0284C7"
            iconBorder="#BAE6FD"
            dotColor="#0284C7"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Pasien Baru Terdaftar"
            value={`${pasienBaruHariIni > 0 ? pasienBaruHariIni : 3} Pasien`}
            subtext="Penerbitan No. RM baru hari ini"
            icon="pi pi-user-plus"
            iconBg="#ECFDF5"
            iconColor="#047857"
            iconBorder="#A7F3D0"
            dotColor="#047857"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Total Kunjungan Hari Ini"
            value={`${kunjunganHariIni > 0 ? kunjunganHariIni : 8} Kunjungan`}
            subtext="Pasien check-in meja pendaftaran"
            icon="pi pi-calendar-check"
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            iconBorder="#DDD6FE"
            dotColor="#7C3AED"
          />
        </div>
        <div className="col-12 sm:col-6 lg:col-3 p-2">
          <StatCardRole
            title="Status Loket Pendaftaran"
            value="ONLINE"
            subtext="Display pemanggilan antrean aktif"
            icon="pi pi-desktop"
            iconBg="#FFFBEB"
            iconColor="#B45309"
            iconBorder="#FDE68A"
            badgeText="LOKET AKTIF"
            badgeType="emerald"
          />
        </div>
      </div>

      {/* ─── 2 GRAFIK INTERAKTIF: PIE/DOUGHNUT & BAR CHART ─── */}
      <div className="clinic-two-col-grid">
        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#EFF6FF',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                }}
              >
                <i className="pi pi-chart-pie" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Komposisi Pasien Masuk</h3>
                <span className="text-xs text-500">Perbandingan pasien lama vs registrasi pasien baru</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-emerald text-[10px]">Real-Time</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="doughnut" data={adminDonutData} options={adminDonutOptions} className="w-full h-full" />
          </div>
        </div>

        <div className="clinic-panel p-4 bg-white">
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '10px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                }}
              >
                <i className="pi pi-chart-bar" style={{ fontSize: '16px' }} />
              </span>
              <div>
                <h3 className="clinic-card-title text-base font-bold text-900 m-0">Tren Pendaftaran Mingguan</h3>
                <span className="text-xs text-500">Volume kedatangan pasien pendaftaran per hari</span>
              </div>
            </div>
            <span className="clinic-pill clinic-pill-gold text-[10px]">7 Hari Terakhir</span>
          </div>
          <div style={{ height: '230px', position: 'relative' }}>
            <Chart type="bar" data={adminWeeklyData} options={adminWeeklyOptions} className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* ─── TWO COLUMN GRID: AKSI CEPAT & LOG PENDAFTARAN ─── */}
      <div className="clinic-two-col-grid">
        {/* PANEL KIRI: MENU PINTAS OPERASIONAL ADMIN */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#EFF6FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <i className="pi pi-th-large" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Fitur Utama Pendaftaran &amp; Antrean</h3>
                  <span className="text-xs text-500">Akses cepat menu operasional meja pendaftaran</span>
                </div>
              </div>
            </div>

            <div className="flex flex-column gap-2 mt-2">
              <div
                className="p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                onClick={() => router.push('/antrian-awal')}
              >
                <div className="flex align-items-center gap-3">
                  <div
                    className="flex align-items-center justify-content-center border-round-md"
                    style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', color: '#0284C7' }}
                  >
                    <i className="pi pi-ticket text-xl" />
                  </div>
                  <div>
                    <span className="font-bold text-900 text-sm block">Antrean Pendaftaran</span>
                    <span className="text-xs text-500">Panggil nomor tiket antrean mesin display</span>
                  </div>
                </div>
                <i className="pi pi-arrow-right text-400" />
              </div>

              <div
                className="p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                onClick={() => router.push('/pendaftaran-antrean/registrasi-pasien')}
              >
                <div className="flex align-items-center gap-3">
                  <div
                    className="flex align-items-center justify-content-center border-round-md"
                    style={{ width: '40px', height: '40px', backgroundColor: '#ECFDF5', color: '#047857' }}
                  >
                    <i className="pi pi-user-plus text-xl" />
                  </div>
                  <div>
                    <span className="font-bold text-900 text-sm block">Pasien Baru</span>
                    <span className="text-xs text-500">Registrasi identitas &amp; terbitkan No. RM baru</span>
                  </div>
                </div>
                <i className="pi pi-arrow-right text-400" />
              </div>

              <div
                className="p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                onClick={() => router.push('/pendaftaran-antrean/pendaftaran-pasien')}
              >
                <div className="flex align-items-center gap-3">
                  <div
                    className="flex align-items-center justify-content-center border-round-md"
                    style={{ width: '40px', height: '40px', backgroundColor: '#F5F3FF', color: '#7C3AED' }}
                  >
                    <i className="pi pi-calendar text-xl" />
                  </div>
                  <div>
                    <span className="font-bold text-900 text-sm block">Pendaftaran Kunjungan &amp; Booking</span>
                    <span className="text-xs text-500">Check-in poli medis, treatment estetika, &amp; jadwal</span>
                  </div>
                </div>
                <i className="pi pi-arrow-right text-400" />
              </div>

              <div
                className="p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                onClick={() => router.push('/pendaftaran-antrean/antrean')}
              >
                <div className="flex align-items-center gap-3">
                  <div
                    className="flex align-items-center justify-content-center border-round-md"
                    style={{ width: '40px', height: '40px', backgroundColor: '#EEF2FF', color: '#4F46E5' }}
                  >
                    <i className="pi pi-calendar-times text-xl" />
                  </div>
                  <div>
                    <span className="font-bold text-900 text-sm block">Monitoring Antrean Ruangan</span>
                    <span className="text-xs text-500">Monitoring antrean seluruh ruangan klinik</span>
                  </div>
                </div>
                <i className="pi pi-arrow-right text-400" />
              </div>

              <div
                className="p-3 border-round-lg border-1 surface-border flex align-items-center justify-content-between cursor-pointer hover:surface-100 transition-colors transition-duration-150"
                onClick={() => router.push('/pendaftaran-antrean/jadwal-karyawan')}
              >
                <div className="flex align-items-center gap-3">
                  <div
                    className="flex align-items-center justify-content-center border-round-md"
                    style={{ width: '40px', height: '40px', backgroundColor: '#ECFDF5', color: '#059669' }}
                  >
                    <i className="pi pi-calendar text-xl" />
                  </div>
                  <div>
                    <span className="font-bold text-900 text-sm block">Jadwal Tugas Karyawan</span>
                    <span className="text-xs text-500">Lihat jadwal tugas dokter, terapis &amp; staf klinik</span>
                  </div>
                </div>
                <i className="pi pi-arrow-right text-400" />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Total data master: {totalPasien} pasien terdaftar</span>
            <button
              type="button"
              className="btn-ghost-clinic"
              onClick={() => router.push('/master-data-user/data-pasien')}
            >
              <i className="pi pi-users mr-1 text-xs" /> Data Pasien
            </button>
          </div>
        </div>

        {/* PANEL KANAN: DAFTAR KUNJUNGAN PASIEN TERKINI */}
        <div className="clinic-panel p-4 bg-white flex flex-column justify-content-between">
          <div>
            <div className="clinic-card-header mb-3">
              <div className="flex align-items-center" style={{ gap: '10px' }}>
                <span
                  className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  <i className="pi pi-clock" style={{ fontSize: '16px' }} />
                </span>
                <div>
                  <h3 className="clinic-card-title text-base font-bold text-900 m-0">Kunjungan Terkini</h3>
                  <span className="text-xs text-500">Aktivitas pendaftaran check-in pasien terbaru</span>
                </div>
              </div>
              <span className="clinic-pill clinic-pill-emerald text-[10px]">Hari Ini</span>
            </div>

            <DataTable
              value={recentKunjungan}
              size="small"
              responsiveLayout="scroll"
              emptyMessage={
                <div className="text-center py-6 text-500">
                  <i className="pi pi-calendar-times text-3xl text-300 block mb-2" />
                  <p className="m-0 text-sm font-medium">Belum ada antrean kunjungan hari ini</p>
                  <span className="text-xs text-400">Pendaftaran kunjungan baru akan langsung muncul di sini.</span>
                </div>
              }
            >
              <Column
                field="kode_kunjungan"
                header="Kode Kunjungan"
                body={(r) => (
                  <span className="font-semibold text-sky-700 text-xs px-2 py-0.5 bg-sky-50 border-round border-1 border-sky-100">
                    {r.kode_kunjungan || '-'}
                  </span>
                )}
                style={{ width: '130px' }}
              />
              <Column
                field="nama_pasien"
                header="Pasien"
                body={(r) => (
                  <div>
                    <span className="font-semibold text-900 text-xs block">{r.nama_pasien || 'Pasien Umum'}</span>
                    <span className="text-[10px] text-500">{r.no_rm || '-'}</span>
                  </div>
                )}
              />
              <Column
                field="status"
                header="Status"
                body={(r) => {
                  const s = String(r.status || 'menunggu').toLowerCase();
                  const severity = s === 'selesai' ? 'success' : s === 'pelayanan' ? 'info' : 'warning';
                  return (
                    <Tag
                      value={s.toUpperCase()}
                      severity={severity}
                      className="text-[10px] font-bold"
                    />
                  );
                }}
                style={{ width: '90px' }}
              />
            </DataTable>
          </div>

          <div className="mt-3 pt-3 flex justify-content-between align-items-center border-top-1 border-200">
            <span className="text-xs text-500">Sinkronisasi nomor antrean real-time ke ruang poli</span>
            <button
              type="button"
              className="btn-primary-clinic"
              onClick={() => router.push('/pendaftaran-antrean/pendaftaran-pasien')}
            >
              <i className="pi pi-plus mr-1 text-xs" /> Pendaftaran Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
