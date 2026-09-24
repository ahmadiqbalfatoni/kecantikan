'use client';

import React, { useRef } from 'react';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Calendar } from 'primereact/calendar';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { OverlayPanel } from 'primereact/overlaypanel';

/**
 * 1. HEADER HALAMAN STANDAR CONTOH LAPORAN
 */
interface LaporanHeaderProps {
  icon: string;
  title: string;
  subtitle: string;
}

export const LaporanHeader: React.FC<LaporanHeaderProps> = ({
  icon,
  title,
  subtitle,
}) => {
  return (
    <div className="flex justify-content-between items-start mb-4">
      <div className="flex flex-column">
        <h3 className="text-xl font-bold text-900 flex align-items-center gap-2 m-0 mb-1">
          <i className={`${icon} text-primary text-2xl`} />
          <span className="font-bold text-900">{title}</span>
        </h3>
        <p className="text-500 m-0 text-sm">{subtitle}</p>
      </div>
    </div>
  );
};

/**
 * 2. SUMMARY / KPI CARDS 4 KOLOM MODERN
 */
export interface SummaryCardItem {
  label: string;
  value: string | number;
  icon: string;
  color?: 'blue' | 'purple' | 'red' | 'green' | 'amber' | 'emerald' | 'indigo';
}

interface LaporanSummaryCardsProps {
  items: SummaryCardItem[];
}

export const LaporanSummaryCards: React.FC<LaporanSummaryCardsProps> = ({ items }) => {
  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'purple':
        return {
          text: 'text-purple-700',
          bg: 'bg-purple-50',
          icon: 'text-purple-600',
        };
      case 'red':
      case 'amber':
        return {
          text: 'text-red-600',
          bg: 'bg-red-50',
          icon: 'text-red-600',
        };
      case 'green':
      case 'emerald':
        return {
          text: 'text-green-600',
          bg: 'bg-green-50',
          icon: 'text-green-600',
        };
      case 'indigo':
        return {
          text: 'text-indigo-700',
          bg: 'bg-indigo-50',
          icon: 'text-indigo-600',
        };
      case 'blue':
      default:
        return {
          text: 'text-blue-700',
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
        };
    }
  };

  return (
    <div className="grid mb-3">
      {items.map((item, idx) => {
        const cls = getColorClasses(item.color);
        return (
          <div key={idx} className="col-12 sm:col-6 lg:col-3">
            <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
              <div className="flex flex-column gap-1">
                <span className="text-xs font-bold text-500 uppercase tracking-wider">
                  {item.label}
                </span>
                <span className={`text-xl font-black ${cls.text}`}>
                  {item.value}
                </span>
              </div>
              <div className={`p-3 ${cls.bg} border-round-lg`}>
                <i className={`${item.icon} ${cls.icon} text-xl`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * 3. TOMBOL AKSI UTAMA DI ATAS CARD
 */
interface LaporanActionBarProps {
  onPrint?: () => void;
  loadingPrint?: boolean;
  onExport?: () => void;
  loadingExport?: boolean;
  onRefresh?: () => void;
  loadingRefresh?: boolean;
  extraActions?: React.ReactNode;
}

export const LaporanActionBar: React.FC<LaporanActionBarProps> = ({
  onPrint,
  loadingPrint,
  onExport,
  loadingExport,
  onRefresh,
  loadingRefresh,
  extraActions,
}) => {
  return (
    <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
      {onPrint && (
        <Button
          size="small"
          label="Cetak Laporan"
          icon="pi pi-print"
          outlined
          onClick={onPrint}
          loading={loadingPrint}
        />
      )}
      {onExport && (
        <Button
          size="small"
          label="Export Excel"
          icon="pi pi-file-excel"
          outlined
          severity="success"
          onClick={onExport}
          loading={loadingExport}
        />
      )}
      {((onPrint || onExport) && onRefresh) && (
        <Divider layout="vertical" className="m-0" />
      )}
      {onRefresh && (
        <Button
          size="small"
          label="Refresh"
          icon="pi pi-refresh"
          outlined
          onClick={onRefresh}
          loading={loadingRefresh}
        />
      )}
      {extraActions}
    </div>
  );
};

/**
 * 4. KETERANGAN STATUS (LEGEND) STANDAR
 */
export interface LegendItem {
  label: string;
  color: string;
}

interface LaporanLegendBoxProps {
  items: LegendItem[];
}

export const LaporanLegendBox: React.FC<LaporanLegendBoxProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-wrap align-items-center gap-4 mb-3 p-3 surface-50 border-round-xl border-1 surface-border">
      <span className="flex align-items-center text-xs font-bold text-500 uppercase tracking-wider mr-2">
        <i className="pi pi-info-circle mr-2" /> KETERANGAN STATUS:
      </span>
      {items.map((it, idx) => (
        <div key={idx} className="flex align-items-center gap-2">
          <span
            className="block border-round-sm"
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: it.color,
            }}
          />
          <span className="text-xs font-semibold text-700">{it.label}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * 5. KONTROL FILTER & PENCARIAN HEADER DATATABLE
 */
export interface LaporanFilterPopupProps {
  title?: string;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

export const LaporanFilterPopup: React.FC<LaporanFilterPopupProps> = ({
  title = "Filter Laporan",
  onClose,
  onApply,
  onReset,
  children,
}) => {
  return (
    <div className="flex flex-column gap-3 p-1" style={{ width: '360px', maxWidth: '90vw' }}>
      {/* Header Popup dengan Tombol Close (✕) Sesuai Mockup */}
      <div className="flex align-items-center justify-content-between border-bottom-1 border-200 pb-2">
        <span className="font-bold text-base text-800 flex align-items-center gap-2">
          <i className="pi pi-filter text-primary" />
          <span>{title}</span>
        </span>
        <Button
          type="button"
          icon="pi pi-times"
          className="p-button-rounded p-button-text p-button-secondary p-0"
          style={{ width: '28px', height: '28px' }}
          onClick={onClose}
        />
      </div>

      {/* Grid 2 Kolom Kontrol Filter */}
      <div className="grid formgrid p-fluid">
        {children}
      </div>

      {/* Tombol Aksi di Bawah Panel */}
      <div className="border-top-1 border-200 pt-3 flex justify-content-between align-items-center gap-2">
        <Button
          type="button"
          label="Reset Filter"
          icon="pi pi-filter-slash"
          size="small"
          outlined
          severity="danger"
          className="text-xs"
          onClick={onReset}
        />
        <Button
          type="button"
          label="Terapkan Filter"
          icon="pi pi-check"
          size="small"
          className="text-xs"
          onClick={() => {
            onApply();
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export interface LaporanTableHeaderFilterProps {
  tanggalAwal?: Date | null;
  setTanggalAwal?: (d: Date | null) => void;
  tanggalAkhir?: Date | null;
  setTanggalAkhir?: (d: Date | null) => void;
  searchVal: string;
  setSearchVal: (val: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onReset: () => void;
  searchPlaceholder?: string;
  onFilterClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  filterLoading?: boolean;
  isFiltered?: boolean;
  filterOverlay?: React.ReactNode | ((close: () => void) => React.ReactNode);
  extraFilterButton?: React.ReactNode;
}

export const LaporanTableHeaderFilter: React.FC<LaporanTableHeaderFilterProps> = ({
  tanggalAwal,
  setTanggalAwal,
  tanggalAkhir,
  setTanggalAkhir,
  searchVal,
  setSearchVal,
  onSearchKeyDown,
  onReset,
  searchPlaceholder = 'Cari Data...',
  onFilterClick,
  filterLoading = false,
  isFiltered,
  filterOverlay,
  extraFilterButton,
}) => {
  const op = useRef<OverlayPanel>(null);

  const hasActiveFilter =
    isFiltered !== undefined
      ? isFiltered
      : Boolean(
          (tanggalAwal !== null && tanggalAwal !== undefined) ||
          (tanggalAkhir !== null && tanggalAkhir !== undefined) ||
          (searchVal && searchVal.trim().length > 0)
        );

  const handleFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onFilterClick) {
      onFilterClick(e);
    } else {
      op.current?.toggle(e);
    }
  };

  const closeOverlay = () => {
    op.current?.hide();
  };

  return (
    <div className="flex flex-wrap align-items-center justify-content-between gap-3 w-full">
      {/* SISI KIRI: Rentang Tanggal */}
      <div className="flex align-items-center flex-wrap gap-2">
        {setTanggalAwal && setTanggalAkhir && (
          <div className="flex align-items-center gap-2">
            <Calendar
              value={tanggalAwal || null}
              onChange={(e) => setTanggalAwal(e.value as Date)}
              dateFormat="yy-mm-dd"
              showIcon
              placeholder="Mulai"
              className="w-10rem md:w-11rem text-sm"
            />
            <span className="text-xs text-500 font-bold">s.d</span>
            <Calendar
              value={tanggalAkhir || null}
              onChange={(e) => setTanggalAkhir(e.value as Date)}
              dateFormat="yy-mm-dd"
              showIcon
              placeholder="Selesai"
              className="w-10rem md:w-11rem text-sm"
            />
          </div>
        )}
      </div>

      {/* SISI KANAN: Filter, Search & Reset */}
      <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto justify-content-end">
        {extraFilterButton}

        {/* Tombol Filter Mengikuti Laporan Operasional Service */}
        <Button
          type="button"
          icon="pi pi-filter"
          label="Filter"
          outlined
          size="small"
          className="text-sm white-space-nowrap"
          loading={filterLoading}
          severity={hasActiveFilter ? 'warning' : 'secondary'}
          onClick={handleFilterClick}
          tooltip="Buka Panel Filter"
          tooltipOptions={{ position: 'bottom' }}
        />

        <span className="p-input-icon-left flex-1 md:w-20rem">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText
              value={searchVal}
              className="w-full text-sm"
              placeholder={searchPlaceholder}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </IconField>
        </span>

        <Button
          type="button"
          icon="pi pi-filter-slash"
          outlined
          size="small"
          severity="danger"
          tooltip="Reset Semua Filter"
          tooltipOptions={{ position: 'bottom' }}
          onClick={onReset}
          className="flex-shrink-0"
        />
      </div>

      {/* Panel Overlay Filter Tambahan Laporan */}
      <OverlayPanel ref={op} style={{ width: filterOverlay ? 'auto' : '360px', maxWidth: '95vw' }}>
        {filterOverlay ? (
          typeof filterOverlay === 'function' ? filterOverlay(closeOverlay) : filterOverlay
        ) : (
          <div className="flex flex-column gap-3 p-1">
            <div className="flex align-items-center justify-content-between border-bottom-1 border-200 pb-2">
              <span className="font-bold text-sm text-800 flex align-items-center gap-2">
                <i className="pi pi-filter text-primary" /> Filter Tambahan Laporan
              </span>
              {hasActiveFilter && (
                <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 border-round">
                  Aktif
                </span>
              )}
            </div>

            {setTanggalAwal && setTanggalAkhir ? (
              <div className="flex flex-column gap-3">
                <div className="flex flex-column gap-1">
                  <label className="text-xs font-semibold text-600">Tanggal Mulai:</label>
                  <Calendar
                    value={tanggalAwal || null}
                    onChange={(e) => setTanggalAwal(e.value as Date)}
                    dateFormat="yy-mm-dd"
                    showIcon
                    placeholder="Pilih Tanggal Mulai"
                    className="w-full text-sm"
                  />
                </div>
                <div className="flex flex-column gap-1">
                  <label className="text-xs font-semibold text-600">Tanggal Selesai:</label>
                  <Calendar
                    value={tanggalAkhir || null}
                    onChange={(e) => setTanggalAkhir(e.value as Date)}
                    dateFormat="yy-mm-dd"
                    showIcon
                    placeholder="Pilih Tanggal Selesai"
                    className="w-full text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-600 py-1 line-height-3">
                Gunakan kolom <strong>Search</strong> untuk menyaring data secara instan, atau klik tombol <strong>Reset</strong> untuk mengembalikan ke tampilan awal.
              </div>
            )}

            <div className="border-top-1 border-200 pt-2 flex justify-content-between align-items-center gap-2">
              <Button
                label="Reset Filter"
                icon="pi pi-filter-slash"
                size="small"
                outlined
                severity="danger"
                className="text-xs"
                onClick={() => {
                  onReset();
                  op.current?.hide();
                }}
              />
              <Button
                label="Terapkan"
                icon="pi pi-check"
                size="small"
                className="text-xs"
                onClick={() => {
                  op.current?.hide();
                }}
              />
            </div>
          </div>
        )}
      </OverlayPanel>
    </div>
  );
};
