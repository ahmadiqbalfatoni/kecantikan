'use client';

import React, { useState, useEffect } from 'react';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';
import type { TransaksiListItem } from '../page';

import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

const METODE_ICON: Record<string, string> = {
  tunai: 'pi-wallet',
  debit: 'pi-credit-card',
  kredit: 'pi-credit-card',
  qris: 'pi-qrcode',
  transfer: 'pi-arrow-right-arrow-left',
};

interface KasirSidebarProps {
  toast: React.RefObject<Toast>;
  selectedKodeTrx: string | null;
  refreshKey: number;
  onSelectTrx: (kode: string) => void;
  onNewTrx: () => void;
  onListChange: (list: TransaksiListItem[]) => void;
}

const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

export const KasirSidebar: React.FC<KasirSidebarProps> = ({
  toast,
  selectedKodeTrx,
  refreshKey,
  onSelectTrx,
  onNewTrx,
  onListChange,
}) => {
  const [list, setList] = useState<TransaksiListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchList();
  }, [refreshKey]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/kasir-list', { tanggal: todayStr, perPage: 100 });
      if (['00', '0000'].includes(res?.data?.status)) {
        const data = res.data.data || [];
        setList(data);
        onListChange(data);
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat daftar transaksi');
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const filteredList = list.filter((item) => {
    const statusMatch = filterStatus === 'semua' || item.status === filterStatus;
    const searchMatch =
      !search ||
      item.kode_transaksi?.toLowerCase().includes(search.toLowerCase()) ||
      item.nama_pasien?.toLowerCase().includes(search.toLowerCase()) ||
      item.no_rm?.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const totalDraft = list.filter((i) => i.status === 'draft').length;
  const totalLunas = list.filter((i) => i.status === 'lunas').length;
  const totalPendapatan = list.filter((i) => i.status === 'lunas').reduce((s, i) => s + parseFloat(String(i.total_bayar || 0)), 0);

  return (
    <div className="flex flex-column h-full user-select-none surface-card border-right-1 surface-border">
      {/* Header Stat Bar */}
      <div className="p-3 bg-teal-50 border-bottom-1 surface-border flex-shrink-0">
        <div className="flex align-items-center justify-content-between mb-3">
          <div className="flex align-items-center gap-2">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(13,148,136,0.3)',
              }}
            >
              <i className="pi pi-calculator text-white text-base" />
            </div>
            <div>
              <div className="text-sm font-black text-teal-900 m-0">Transaksi Kasir</div>
              <div className="text-[11px] text-teal-700 font-semibold m-0">
                {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
          <Button
            icon="pi pi-plus"
            label="Baru"
            severity="success"
            size="small"
            onClick={onNewTrx}
            className="font-bold text-xs bg-teal-600 border-none border-round-lg px-3 text-white shadow-1"
          />
        </div>

        {/* Ringkasan hari ini */}
        <div className="grid grid-nogutter gap-1">
          <div className="col bg-white p-2 border-round-lg border-1 surface-border text-center shadow-1">
            <div className="text-[10px] font-bold text-500 uppercase">Draft</div>
            <div className="text-sm font-extrabold text-slate-700">{totalDraft}</div>
          </div>
          <div className="col bg-white p-2 border-round-lg border-1 surface-border text-center shadow-1">
            <div className="text-[10px] font-bold text-500 uppercase">Lunas</div>
            <div className="text-sm font-extrabold text-green-600">{totalLunas}</div>
          </div>
          <div className="col-5 bg-white p-2 border-round-lg border-1 surface-border text-center shadow-1">
            <div className="text-[10px] font-bold text-500 uppercase">Pendapatan</div>
            <div className="text-xs font-black text-teal-700 white-space-nowrap">{formatRupiah(totalPendapatan)}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-3 border-bottom-1 surface-border flex-shrink-0 bg-white">
        <IconField iconPosition="left" className="w-full mb-2">
          <InputIcon className="pi pi-search text-xs text-400" />
          <InputText
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi / pasien / RM..."
            className="p-inputtext-sm w-full border-round-lg text-xs"
          />
        </IconField>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 border-round-lg">
          {[
            { key: 'semua', label: 'Semua' },
            { key: 'draft', label: 'Draft' },
            { key: 'lunas', label: 'Lunas' },
            { key: 'batal', label: 'Batal' },
          ].map((t) => {
            const isActive = filterStatus === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilterStatus(t.key)}
                className={`flex-1 py-1 text-xs border-round-md font-bold transition-all border-none cursor-pointer ${
                  isActive ? 'bg-teal-600 text-white shadow-1' : 'bg-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction Cards List */}
      <div className="flex-1 overflow-y-auto p-3 surface-ground">
        {loading ? (
          <div className="flex align-items-center justify-content-center py-5">
            <ProgressSpinner style={{ width: '28px', height: '28px' }} />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-column align-items-center justify-content-center py-5 text-center">
            <i className="pi pi-inbox text-3xl text-300 mb-2" />
            <span className="text-xs text-500 font-medium">Belum ada transaksi hari ini</span>
          </div>
        ) : (
          <div className="flex flex-column gap-2">
            {filteredList.map((item) => {
              const isSelected = selectedKodeTrx === item.kode_transaksi;
              const isLunas = item.status === 'lunas';
              const isBatal = item.status === 'batal';

              return (
                <div
                  key={item.kode_transaksi}
                  onClick={() => onSelectTrx(item.kode_transaksi)}
                  className={`surface-card p-3 border-round-xl border-1 transition-all cursor-pointer shadow-1 hover:shadow-2 ${
                    isSelected ? 'border-2 border-teal-500 bg-teal-50/50' : 'surface-border'
                  }`}
                >
                  <div className="flex align-items-center justify-content-between mb-1">
                    <span className="font-extrabold text-xs text-teal-900">{item.kode_transaksi}</span>
                    <Tag
                      value={item.status.toUpperCase()}
                      severity={isLunas ? 'success' : isBatal ? 'danger' : 'info'}
                      className="text-[10px] font-bold px-2 py-0.5"
                    />
                  </div>

                  <div className="font-bold text-sm text-slate-800 mb-1 overflow-hidden text-ellipsis white-space-nowrap">
                    {item.nama_pasien || item.no_rm}
                  </div>

                  <div className="flex align-items-center justify-content-between text-xs pt-1 border-top-1 surface-border">
                    <span className="text-[11px] text-500">RM: {item.no_rm}</span>
                    <div className="text-right">
                      <span className="font-black text-teal-700 block">{formatRupiah(parseFloat(String(item.total_bayar || 0)))}</span>
                      {parseFloat(String(item.dp_nominal || 0)) > 0 && (
                        <span className="text-[10px] text-teal-600 font-bold block">
                          DP: -{formatRupiah(parseFloat(String(item.dp_nominal)))}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.metode_bayar && isLunas && (
                    <div className="flex align-items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <i className={`pi ${METODE_ICON[item.metode_bayar] || 'pi-credit-card'}`} style={{ fontSize: '10px' }} />
                      <span className="capitalize">{item.metode_bayar}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
