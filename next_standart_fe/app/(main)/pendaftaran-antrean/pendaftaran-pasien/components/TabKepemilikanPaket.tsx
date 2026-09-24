'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { Dialog } from 'primereact/dialog';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiPasienKepemilikanPaket, apiPasienAmbilAntrianLayanan } from './endpoints';
import { KarcisAntrianLayananModal } from './dialogs/KarcisAntrianLayananModal';
import { Package } from 'lucide-react';

interface DetailKepemilikan {
  kode_detail_kepemilikan_paket_layanan: string;
  kode_layanan: string;
  nama_layanan: string;
  sesi_total: number;
  sesi_terpakai: number;
  sisa_sesi: number;
  tipe?: string;
  wajib_konsultasi?: string;
  kode_ruangan?: string;
  nama_ruangan?: string;
  durasi_menit?: number;
}

interface KepemilikanPaket {
  id: number;
  kode_kepemilikan_paket_layanan: string;
  kode_transaksi?: string;
  no_rm: string;
  nama_pasien: string;
  no_hp_pasien?: string;
  kode_paket_layanan: string;
  nama_paket: string;
  tipe_paket?: string;
  kode_ruangan_paket?: string;
  nama_ruangan_paket?: string;
  tanggal_beli: string;
  tanggal_expired: string;
  status: 'aktif' | 'habis' | 'expired' | string;
  total_sesi: number;
  total_terpakai: number;
  sisa_sesi: number;
  details: DetailKepemilikan[];
}

interface TabKepemilikanPaketProps {
  toast?: any;
  refreshTrigger?: number;
}

export const TabKepemilikanPaket: React.FC<TabKepemilikanPaketProps> = ({ toast, refreshTrigger = 0 }) => {
  const [dataList, setDataList] = useState<KepemilikanPaket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const [page, setPage] = useState<number>(1);
  const [rows, setRows] = useState<number>(10);
  const [first, setFirst] = useState<number>(0);

  const [searchVal, setSearchVal] = useState<string>('');
  const [appliedKeyword, setAppliedKeyword] = useState<string>('');

  const [selectedItem, setSelectedItem] = useState<KepemilikanPaket | null>(null);
  const [dialogDetailVisible, setDialogDetailVisible] = useState<boolean>(false);

  // State Modal Klaim Sesi Paket (dengan opsi konsultasi)
  const [claimDialogVisible, setClaimDialogVisible] = useState<boolean>(false);
  const [claimTargetItem, setClaimTargetItem] = useState<KepemilikanPaket | null>(null);
  const [claimTargetDetail, setClaimTargetDetail] = useState<DetailKepemilikan | null>(null);
  const [claimConsultChoice, setClaimConsultChoice] = useState<boolean>(true);
  const [submittingClaim, setSubmittingClaim] = useState<boolean>(false);

  const [antrianLayananModalVisible, setAntrianLayananModalVisible] = useState(false);
  const [antrianLayananData, setAntrianLayananData] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await postData(apiPasienKepemilikanPaket, {
        page,
        perPage: rows,
        keyword: appliedKeyword.trim(),
      });

      if (['00', '0000'].includes(res.data.status)) {
        setDataList(res.data.data || []);
        setTotalRecords(res.data.total_data || 0);
      } else {
        showError(toast, res.data.message || 'Gagal memuat data kepemilikan paket');
      }
    } catch (err: any) {
      showError(toast, err?.response?.data?.message || 'Terjadi kesalahan sistem saat memuat data paket pasien');
    } finally {
      setLoading(false);
    }
  }, [page, rows, appliedKeyword, toast]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      setFirst(0);
      setAppliedKeyword(val);
    }, 300);
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearchVal('');
    setAppliedKeyword('');
    setPage(1);
    setFirst(0);
  };

  const handleOpenDetail = (item: KepemilikanPaket) => {
    setSelectedItem(item);
    setDialogDetailVisible(true);
  };

  const handleOpenClaimDialog = (item: KepemilikanPaket, detailItem?: DetailKepemilikan) => {
    const targetDetail = detailItem || (item.details || []).find((d) => d.sisa_sesi > 0) || item.details?.[0];
    if (!targetDetail || targetDetail.sisa_sesi <= 0) {
      showError(toast, 'Sesi layanan paket ini sudah habis');
      return;
    }
    setClaimTargetItem(item);
    setClaimTargetDetail(targetDetail);
    setClaimConsultChoice(true); // default Ya
    setClaimDialogVisible(true);
  };

  const handleExecuteClaim = async () => {
    if (!claimTargetItem || !claimTargetDetail) return;

    // Tipe PAKET adalah sumber kebenaran tunggal untuk aturan konsultasi
    // wajib_konsultasi dari detail layanan komponen DIABAIKAN untuk klaim paket
    const tipePaket = (claimTargetItem.tipe_paket || '').toString().trim().toUpperCase();
    // Tentukan wajibKon hanya dari tipePaket
    const wajibKon: string = tipePaket === 'MEDICAL TREATMENT' ? 'wajib'
      : tipePaket === 'SERVICE TREATMENT' ? 'tidak'
      : 'opsional';

    // Tentukan pilihan konsultasi:
    // - BEAUTY TREATMENT (opsional): IKUTI PILIHAN USER (claimConsultChoice)
    // - MEDICAL TREATMENT: selalu konsultasi
    // - SERVICE TREATMENT: tidak pernah konsultasi
    let chooseConsult: boolean;
    if (wajibKon === 'wajib') {
      chooseConsult = true;
    } else if (wajibKon === 'tidak') {
      chooseConsult = false;
    } else {
      // OPSIONAL (BEAUTY TREATMENT): ikuti pilihan user di dialog
      chooseConsult = claimConsultChoice === true;
    }

    setSubmittingClaim(true);
    try {
      const res = await postData(apiPasienAmbilAntrianLayanan, {
        no_rm: claimTargetItem.no_rm,
        items: [
          {
            jenis_layanan: 'klaim_paket',
            kode_layanan: claimTargetDetail.kode_layanan,
            kode_ruangan: claimTargetDetail.kode_ruangan || claimTargetItem.kode_ruangan_paket,
            nama_ruangan: claimTargetDetail.nama_ruangan || claimTargetItem.nama_ruangan_paket,
            butuh_konsul: chooseConsult,
            wajib_konsultasi: wajibKon,
            lewat_konsultasi: chooseConsult,
            kode_kepemilikan_paket_layanan: claimTargetItem.kode_kepemilikan_paket_layanan,
          },
        ],
      });

      if (['00', '0000'].includes(res.data.status)) {
        showSuccess(toast, res.data.message || 'Klaim sesi berhasil diterbitkan');
        setAntrianLayananData(res.data.data);
        setAntrianLayananModalVisible(true);
        setClaimDialogVisible(false);
        setDialogDetailVisible(false);
        loadData();
      } else {
        showError(toast, res.data.message || 'Gagal mengklaim sesi paket');
      }
    } catch (error: any) {
      showError(toast, error?.response?.data?.message || 'Terjadi kesalahan saat klaim sesi paket');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const formatDateIndoDash = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handlePrintKartuSesi = (item: KepemilikanPaket) => {
    if (!item) return;

    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) return;

    const statusColor = item.status === 'aktif' ? '#10b981' : item.status === 'habis' ? '#f59e0b' : '#ef4444';
    const statusLabel = (item.status || '').toUpperCase();

    const sectionsHtml = (item.details || []).map((det, sIdx) => {
      const total = det.sesi_total || 1;
      const terpakai = det.sesi_terpakai || 0;
      const sisa = Math.max(0, total - terpakai);
      const percent = Math.min(100, Math.round((terpakai / total) * 100));

      const circlesHtml = Array.from({ length: total }, (_, i) => {
        const sesiNum = i + 1;
        const isUsed = sesiNum <= terpakai;
        if (isUsed) {
          return `
            <div class="stamp-circle stamp-circle-used">
              <div class="stamp-check">✓</div>
              <div class="stamp-label">SESI ${sesiNum}</div>
            </div>
          `;
        } else {
          return `
            <div class="stamp-circle stamp-circle-remain">
              <div class="stamp-num">${sesiNum}</div>
              <div class="stamp-label-remain">TERSEDIA</div>
            </div>
          `;
        }
      }).join('');

      return `
        <div class="service-card">
          <div class="service-header">
            <div>
              <span class="service-title">${sIdx + 1}. ${det.nama_layanan || det.kode_layanan}</span>
              <span class="service-badge">${det.tipe || 'Beauty Treatment'}</span>
              <div class="service-sub">
                <span>📍 ${det.nama_ruangan || 'Ruang Treatment'}</span>
                <span>•</span>
                <span>⏱ ${det.durasi_menit || 30} Menit</span>
                <span>•</span>
                <span>${det.kode_layanan}</span>
              </div>
            </div>
          </div>

          <div class="stamp-area">
            ${circlesHtml}
          </div>

          <div class="service-footer">
            <span><strong>${terpakai}</strong> dari <strong>${total}</strong> sesi terpakai</span>
            <div class="progress-track">
              <div class="progress-bar" style="width: ${percent}%;"></div>
            </div>
            <span>${percent}%</span>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kartu Sesi Layanan Paket - ${item.kode_kepemilikan_paket_layanan}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 12px;
              color: #0f172a;
              background: #ffffff;
              padding: 15px;
            }
            .card-wrapper {
              max-width: 580px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 8px 24px rgba(0,0,0,0.08);
              color: #0f172a;
            }
            .header-banner {
              background: linear-gradient(90deg, #059669 0%, #047857 100%);
              color: #ffffff;
              padding: 12px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand-group {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo-box {
              background: #ffffff;
              border-radius: 8px;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
              flex-shrink: 0;
            }
            .brand-title {
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 0.4px;
            }
            .brand-subtitle {
              font-size: 10px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.9);
              letter-spacing: 0.4px;
              margin-top: 1px;
            }
            .status-badge {
              background: #090d0f;
              color: ${statusColor};
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .id-card-body {
              padding: 16px;
              display: flex;
              gap: 16px;
              background-image: repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.02) 0px, rgba(0, 0, 0, 0.02) 1px, transparent 1px, transparent 10px);
            }
            .photo-box {
              width: 95px;
              height: 115px;
              border-radius: 10px;
              border: 1px solid #cbd5e1;
              background: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              font-size: 40px;
              color: #94a3b8;
            }
            .info-table {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 4px;
              font-size: 11.5px;
            }
            .info-row {
              display: grid;
              grid-template-columns: 90px 10px 1fr;
              align-items: center;
            }
            .info-label { color: #64748b; font-weight: 500; }
            .info-colon { color: #64748b; font-weight: 700; }
            .info-val { color: #0f172a; font-weight: 700; }
            .dashed-sep {
              border-top: 1px dashed #e2e8f0;
              margin: 4px 0;
            }
            .id-card-footer {
              padding: 4px 16px 14px 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .kpl-label { font-size: 10px; color: #64748b; font-weight: 600; }
            .kpl-val { font-family: monospace; font-size: 12.5px; font-weight: 800; color: #0f172a; }
            .qr-placeholder {
              width: 44px;
              height: 44px;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              background-image: linear-gradient(45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%), 
                                linear-gradient(-45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%), 
                                linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%);
              background-size: 8px 8px;
            }
            .service-card {
              margin: 14px 16px;
              background: #ffffff;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              overflow: hidden;
            }
            .service-header {
              padding: 10px 14px;
              border-bottom: 1px dashed #e2e8f0;
            }
            .service-title { font-weight: 800; color: #0f172a; font-size: 13px; }
            .service-badge {
              background: #eff6ff;
              color: #2563eb;
              border: 1px solid #dbeafe;
              font-size: 9.5px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 4px;
              margin-left: 6px;
            }
            .service-sub {
              font-size: 10.5px;
              color: #64748b;
              margin-top: 3px;
              display: flex;
              gap: 6px;
            }
            .stamp-area {
              padding: 18px 14px;
              background-image: radial-gradient(rgba(0, 0, 0, 0.09) 1.5px, transparent 1.5px);
              background-size: 16px 16px;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 16px;
              flex-wrap: wrap;
            }
            .stamp-circle {
              width: 68px;
              height: 68px;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .stamp-circle-used {
              border: 2px solid #059669;
              background: radial-gradient(circle, #ecfdf5 0%, #d1fae5 100%);
              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
              transform: rotate(-6deg);
            }
            .stamp-check { color: #059669; font-size: 20px; font-weight: 900; line-height: 1; }
            .stamp-label { color: #065f46; font-size: 8.5px; font-weight: 800; letter-spacing: 0.5px; margin-top: 2px; }
            .stamp-circle-remain {
              border: 2px dashed #94a3b8;
              background: #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.04);
            }
            .stamp-num { color: #0f172a; font-size: 17px; font-weight: 800; line-height: 1; }
            .stamp-label-remain { color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: 0.5px; margin-top: 2px; }
            .service-footer {
              padding: 8px 14px 12px 14px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              font-size: 10.5px;
              color: #475569;
              border-top: 1px solid #f1f5f9;
            }
            .progress-track {
              flex: 1;
              height: 5px;
              border-radius: 3px;
              background: #e2e8f0;
              overflow: hidden;
            }
            .progress-bar {
              height: 100%;
              background: #10b981;
              border-radius: 3px;
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        </head>
        <body>
          <div class="card-wrapper">
            <div class="header-banner">
              <div class="brand-group">
                <div class="logo-box">
                  <span class="material-symbols-outlined" style="font-size: 20px; color: #059669; line-height: 1;">spa</span>
                </div>
                <div>
                  <div class="brand-title">KARTU SESI LAYANAN PAKET</div>
                  <div class="brand-subtitle">KLINIK KECANTIKAN ESTETIKA</div>
                </div>
              </div>
              <div class="status-badge">
                ${statusLabel}
              </div>
            </div>

            <div class="id-card-body">
              <div class="photo-box">👤</div>
              <div class="info-table">
                <div class="info-row">
                  <span class="info-label">Nama Pasien</span>
                  <span class="info-colon">:</span>
                  <span class="info-val">${item.nama_pasien || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">No. RM</span>
                  <span class="info-colon">:</span>
                  <span class="info-val">${item.no_rm || '-'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">No. HP</span>
                  <span class="info-colon">:</span>
                  <span class="info-val">${item.no_hp_pasien || '-'}</span>
                </div>

                <div class="dashed-sep"></div>

                <div class="info-row">
                  <span class="info-label">Nama Paket</span>
                  <span class="info-colon">:</span>
                  <span class="info-val">${item.nama_paket || item.kode_paket_layanan}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Kode Paket</span>
                  <span class="info-colon">:</span>
                  <span class="info-val">${item.kode_paket_layanan}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Tgl Pembelian</span>
                  <span class="info-colon">:</span>
                  <span class="info-val">${formatDateIndoDash(item.tanggal_beli)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Berlaku s.d.</span>
                  <span class="info-colon">:</span>
                  <span class="info-val" style="color: ${item.tanggal_expired ? '#dc2626' : '#0f172a'};">
                    ${item.tanggal_expired ? formatDateIndoDash(item.tanggal_expired) : 'Tidak ada batas'}
                  </span>
                </div>
              </div>
            </div>

            <div class="id-card-footer">
              <div>
                <div class="kpl-label">No. Kartu (KPL)</div>
                <div class="kpl-val">${item.kode_kepemilikan_paket_layanan}</div>
              </div>
              <div class="qr-placeholder"></div>
            </div>

            ${sectionsHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const getStatusColor = (status: string) => {
    const st = (status || '').toLowerCase();
    if (st === 'aktif') return '#22c55e';
    if (st === 'habis') return '#f59e0b';
    if (st === 'expired') return '#ef4444';
    return '#94a3b8';
  };

  // Column templates matching Pendaftaran Pasien table
  const noRmBodyTemplate = (rowData: KepemilikanPaket) => (
    <span className="font-bold text-900">{rowData.no_rm}</span>
  );

  const pasienBodyTemplate = (rowData: KepemilikanPaket) => (
    <div>
      <span className="font-bold text-900 block text-sm">{rowData.nama_pasien || '-'}</span>
      {rowData.no_hp_pasien && <span className="text-xs text-500 block">HP: {rowData.no_hp_pasien}</span>}
    </div>
  );

  const paketBodyTemplate = (rowData: KepemilikanPaket) => (
    <div>
      <span className="font-bold text-900 block text-sm">{rowData.nama_paket || rowData.kode_paket_layanan}</span>
      <span className="text-xs text-500 font-mono block">Kode: {rowData.kode_kepemilikan_paket_layanan}</span>
    </div>
  );

  const progresSesiTemplate = (rowData: KepemilikanPaket) => {
    const total = rowData.total_sesi || 1;
    const terpakai = rowData.total_terpakai || 0;
    const percent = Math.min(100, Math.round((terpakai / total) * 100));

    return (
      <div className="w-full max-w-12rem">
        <div className="flex justify-content-between text-xs font-semibold mb-1">
          <span>{terpakai} / {total} Sesi Terpakai</span>
          <span>{percent}%</span>
        </div>
        <ProgressBar value={percent} showValue={false} style={{ height: '7px' }} color={percent === 100 ? '#ef4444' : '#3b82f6'} />
      </div>
    );
  };

  const sisaSesiTemplate = (rowData: KepemilikanPaket) => {
    const sisa = rowData.sisa_sesi;
    let severity: 'success' | 'warning' | 'danger' = 'success';
    if (sisa === 0) severity = 'danger';
    else if (sisa === 1) severity = 'warning';

    return <Tag value={`${sisa} Sesi Tersisa`} severity={severity} className="font-bold text-xs px-2 py-1 border-round-md" />;
  };

  const tanggalBodyTemplate = (rowData: KepemilikanPaket) => (
    <div className="text-xs">
      <span className="text-500 block">Beli: {rowData.tanggal_beli || '-'}</span>
      <span className="font-bold text-900 block">Expired: {rowData.tanggal_expired || '-'}</span>
    </div>
  );



  const actionBodyTemplate = (rowData: KepemilikanPaket) => (
    <div className="flex align-items-center justify-content-center gap-1">
      {rowData.status === 'aktif' && rowData.sisa_sesi > 0 && (
        <Button
          icon="pi pi-ticket"
          label="Klaim Sesi"
          size="small"
          severity="success"
          className="text-xs font-bold border-round-md"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenClaimDialog(rowData);
          }}
        />
      )}
      <Button
        icon="pi pi-id-card"
        label="Lihat Kartu"
        size="small"
        outlined
        severity="info"
        className="text-xs font-semibold border-round-md"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenDetail(rowData);
        }}
      />
    </div>
  );

  return (
    <>
      <ConfirmDialog />

      <KarcisAntrianLayananModal
        visible={antrianLayananModalVisible}
        onHide={() => setAntrianLayananModalVisible(false)}
        data={antrianLayananData}
      />

      {/* HEADER SECTION */}
      <div className="card surface-card border-1 surface-border border-round-xl p-4 shadow-1 mb-3">
        <div className="flex align-items-center gap-2 mb-1">
          <Package className="text-primary" size={24} />
          <h2 className="text-xl font-bold text-900 m-0">Data Kepemilikan Paket Pasien</h2>
        </div>
        <p className="text-xs text-500 mt-1 mb-0">
          Cari data pasien terdaftar yang memiliki paket layanan aktif atau multi-sesi beserta rincian sisa sesinya.
        </p>
      </div>

      {/* CARD KEPEMILIKAN PAKET DENGAN POLA KONSISTEN MASTER DATA */}
      <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">

        {/* Baris Tombol Aksi di bagian paling atas sebelum tabel */}
        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
          <Button
            size="small"
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            loading={loading}
            onClick={loadData}
          />
        </div>

        {/* DATATABLE */}
        <DataTable
          value={dataList}
          loading={loading}
          lazy
          paginator
          first={first}
          rows={rows}
          totalRecords={totalRecords}
          onPage={(e) => {
            setFirst(e.first);
            setRows(e.rows);
            setPage((e.page || 0) + 1);
          }}
          dataKey="kode_kepemilikan_paket_layanan"
          emptyMessage="Data Kepemilikan Paket Pasien Tidak Ditemukan"
          rowsPerPageOptions={[10, 25, 50]}
          rowHover
          onRowClick={(e) => handleOpenDetail(e.data as KepemilikanPaket)}
          style={{ cursor: 'pointer' }}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data kepemilikan paket"
          header={
            <div className="flex flex-column gap-3">
              <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-xl font-bold text-900">Data Kepemilikan Paket</span>
                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                  <IconField iconPosition="left" className="w-full md:w-20rem">
                    <InputIcon className="pi pi-search" />
                    <InputText
                      value={searchVal}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                          setPage(1);
                          setFirst(0);
                          setAppliedKeyword(searchVal);
                        }
                      }}
                      placeholder="Cari Data..."
                      className="w-full text-sm"
                    />
                  </IconField>
                  <Button
                    type="button"
                    icon="pi pi-filter-slash"
                    outlined
                    severity="danger"
                    tooltip="Reset Filter"
                    tooltipOptions={{ position: 'bottom' }}
                    onClick={handleClearSearch}
                  />
                </div>
              </div>
              <div className="flex flex-wrap align-items-center gap-3 px-2 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                <span className="flex align-items-center gap-1">
                  <i className="pi pi-info-circle" />
                  <span className="font-semibold">KETERANGAN STATUS:</span>
                </span>
                <span className="flex align-items-center gap-1">
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#22c55e', boxShadow: '0 1px 3px #22c55e55' }} />
                  Aktif
                </span>
                <span className="flex align-items-center gap-1">
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b', boxShadow: '0 1px 3px #f59e0b55' }} />
                  Habis
                </span>
                <span className="flex align-items-center gap-1">
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444', boxShadow: '0 1px 3px #ef444455' }} />
                  Expired
                </span>
              </div>
            </div>
          }
        >
          <Column
            header=""
            headerStyle={{ width: '3rem' }}
            align="center"
            body={(r: KepemilikanPaket) => (
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  backgroundColor: getStatusColor(r.status),
                  boxShadow: `0 1px 3px ${getStatusColor(r.status)}55`,
                }}
                title={`Status: ${(r.status || '').toUpperCase()}`}
              />
            )}
          />
          <Column field="no_rm" header="No. RM" body={noRmBodyTemplate} sortable headerStyle={{ fontWeight: 'bold' }} style={{ minWidth: '8rem' }} />
          <Column field="nama_pasien" header="Nama Pasien" body={pasienBodyTemplate} sortable style={{ minWidth: '12rem' }} />
          <Column field="nama_paket" header="Paket Layanan" body={paketBodyTemplate} sortable style={{ minWidth: '14rem' }} />
          <Column header="Progres Sesi" body={progresSesiTemplate} style={{ minWidth: '12rem' }} />
          <Column header="Sisa Sesi" body={sisaSesiTemplate} align="center" style={{ minWidth: '10rem' }} />
          <Column header="Masa Berlaku" body={tanggalBodyTemplate} align="center" style={{ minWidth: '11rem' }} />
          <Column header="Aksi" body={actionBodyTemplate} align="center" style={{ minWidth: '14rem' }} />
        </DataTable>
      </div>

      {/* DIALOG DETAIL SESI (KARTU IDENTITAS KTP / SIM STYLE - WHITE THEME) */}
      <Dialog
        visible={dialogDetailVisible}
        onHide={() => setDialogDetailVisible(false)}
        showHeader={false}
        modal
        style={{ width: '560px', maxWidth: '95vw', borderRadius: '18px', overflow: 'hidden' }}
        contentStyle={{ padding: '16px', background: '#f8fafc', borderRadius: '18px', overflowY: 'auto', maxHeight: '90vh' }}
      >
        {selectedItem && (
          <div className="flex flex-column gap-3">
            {/* 1. KARTU IDENTITAS RESMI (KTP / SIM STYLE) */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                position: 'relative',
              }}
            >
              {/* Header Kartu (Banner Hijau) */}
              <div
                style={{
                  background: 'linear-gradient(90deg, #059669 0%, #047857 100%)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '10px',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#059669',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669', lineHeight: 1 }}>
                      spa
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px', lineHeight: 1.2 }}>
                      KARTU SESI LAYANAN PAKET
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.4px', marginTop: '2px' }}>
                      KLINIK KECANTIKAN ESTETIKA
                    </div>
                  </div>
                </div>

                {/* Status Badge (Black pill with status color) */}
                <div
                  style={{
                    background: '#090d0f',
                    color: getStatusColor(selectedItem.status),
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  {(selectedItem.status || '').toUpperCase()}
                </div>
              </div>

              {/* Body Kartu dengan Watermark Garis Diagonal */}
              <div
                style={{
                  padding: '16px',
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.02) 0px, rgba(0, 0, 0, 0.02) 1px, transparent 1px, transparent 10px)',
                  display: 'flex',
                  gap: '16px',
                }}
              >
                {/* Kolom Kiri: Foto / Avatar Placeholder */}
                <div
                  style={{
                    width: '100px',
                    height: '120px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="pi pi-user" style={{ fontSize: '42px', color: '#94a3b8' }} />
                </div>

                {/* Kolom Kanan: Data Pasien & Paket (Label : Value Rapat) */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  {/* Data Pasien */}
                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Nama Pasien</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{selectedItem.nama_pasien || '-'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>No. RM</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>{selectedItem.no_rm}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>No. HP</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{selectedItem.no_hp_pasien || '-'}</span>
                  </div>

                  {/* Garis Pemisah Putus-Putus Halus */}
                  <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />

                  {/* Data Paket */}
                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Nama Paket</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, wordBreak: 'break-word' }}>{selectedItem.nama_paket || selectedItem.kode_paket_layanan}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Kode Paket</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, fontFamily: 'monospace' }}>{selectedItem.kode_paket_layanan}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Tgl Pembelian</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{formatDateIndoDash(selectedItem.tanggal_beli)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '95px 12px 1fr', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Berlaku s.d.</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>:</span>
                    <span style={{ color: selectedItem.tanggal_expired ? '#dc2626' : '#0f172a', fontWeight: 700 }}>
                      {selectedItem.tanggal_expired ? formatDateIndoDash(selectedItem.tanggal_expired) : 'Tidak ada batas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Kartu Identitas: No KPL & QR Matrix Placeholder */}
              <div
                style={{
                  padding: '4px 16px 16px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>No. Kartu (KPL)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.3px', marginTop: '1px' }}>
                    {selectedItem.kode_kepemilikan_paket_layanan}
                  </div>
                </div>

                {/* QR Matrix Pattern Placeholder (Light Version) */}
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    backgroundImage: `
                      linear-gradient(45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%), 
                      linear-gradient(-45deg, rgba(0, 0, 0, 0.08) 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%), 
                      linear-gradient(-45deg, transparent 75%, rgba(0, 0, 0, 0.08) 75%)
                    `,
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  }}
                  title="QR / Barcode Security Pattern"
                />
              </div>
            </div>

            {/* 2. KARTU STEMPEL SESI PER LAYANAN */}
            <div className="flex flex-column gap-3">
              {(selectedItem.details || []).map((det: DetailKepemilikan, sIdx: number) => {
                const total = det.sesi_total || 1;
                const terpakai = det.sesi_terpakai || 0;
                const sisa = Math.max(0, total - terpakai);
                const percent = Math.min(100, Math.round((terpakai / total) * 100));

                return (
                  <div
                    key={det.kode_detail_kepemilikan_paket_layanan || sIdx}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {/* Header Layanan */}
                    <div
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        borderBottom: '1px dashed #e2e8f0',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                            {sIdx + 1}. {det.nama_layanan || det.kode_layanan}
                          </span>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #dbeafe',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {det.tipe || 'Beauty Treatment'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginTop: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ color: '#f43f5e' }}>📍</span>
                          <span>{det.nama_ruangan || 'Ruang Treatment'}</span>
                          <span>•</span>
                          <span>⏱ {det.durasi_menit || 30} Menit</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'monospace' }}>{det.kode_layanan}</span>
                        </div>
                      </div>
                    </div>

                    {/* Area Stempel Sesi (Dot Matrix Pattern & CENTERED) */}
                    <div
                      style={{
                        padding: '20px 16px',
                        backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.09) 1.5px, transparent 1.5px)',
                        backgroundSize: '16px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {Array.from({ length: total }, (_, i) => {
                        const sesiNum = i + 1;
                        const isUsed = sesiNum <= terpakai;

                        if (isUsed) {
                          return (
                            <div
                              key={sesiNum}
                              style={{
                                width: '74px',
                                height: '74px',
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #059669',
                                background: 'radial-gradient(circle, #ecfdf5 0%, #d1fae5 100%)',
                                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
                                transform: `rotate(${i % 2 === 0 ? '-5deg' : '-7deg'})`,
                                flexShrink: 0,
                                userSelect: 'none',
                              }}
                            >
                              <div style={{ color: '#059669', fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>✓</div>
                              <div style={{ color: '#065f46', fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px', marginTop: '3px' }}>
                                SESI {sesiNum}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={sesiNum}
                              style={{
                                width: '74px',
                                height: '74px',
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed #94a3b8',
                                background: '#ffffff',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                                flexShrink: 0,
                                userSelect: 'none',
                              }}
                            >
                              <div style={{ color: '#0f172a', fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>
                                {sesiNum}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.5px', marginTop: '3px' }}>
                                TERSEDIA
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>

                    {/* Progress Bar & Ringkasan */}
                    <div
                      style={{
                        padding: '10px 16px 14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '11px',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <span style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{det.sesi_terpakai}</strong> dari{' '}
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{total}</strong> sesi terpakai
                      </span>

                      {/* Custom Progress Track */}
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          borderRadius: '3px',
                          background: '#e2e8f0',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${percent}%`,
                            background: '#10b981',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>

                      <span style={{ color: '#0f172a', fontWeight: 700, minWidth: '32px', textAlign: 'right' }}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. MODAL FOOTER BUTTONS (TUTUP & CETAK KARTU SESI) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setDialogDetailVisible(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="pi pi-times" style={{ fontSize: '13px' }} />
                Tutup
              </button>

              <button
                type="button"
                onClick={() => handlePrintKartuSesi(selectedItem)}
                style={{
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  borderRadius: '10px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="pi pi-print" style={{ fontSize: '13px' }} />
                Cetak Kartu Sesi
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* DIALOG KONFIRMASI KLAIM SESI PAKET */}
      <Dialog
        visible={claimDialogVisible}
        onHide={() => !submittingClaim && setClaimDialogVisible(false)}
        header={
          <div className="flex align-items-center gap-3 py-1">
            <div
              className="flex align-items-center justify-content-center border-round-xl text-white shadow-1"
              style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
            >
              <i className="pi pi-send text-xl" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-900 m-0">Konfirmasi Klaim Sesi Paket</h4>
              <p className="text-xs text-500 m-0 mt-1">Verifikasi rincian sesi dan alur kunjungan pasien</p>
            </div>
          </div>
        }
        footer={
          <div className="flex align-items-center justify-content-between pt-2">
            <Button
              label="Batal"
              icon="pi pi-times"
              severity="secondary"
              outlined
              disabled={submittingClaim}
              className="border-round-lg font-bold px-3"
              onClick={() => setClaimDialogVisible(false)}
            />
            <Button
              label={submittingClaim ? 'Menerbitkan Antrean...' : 'Ya, Terbitkan Antrean'}
              icon="pi pi-check"
              severity="success"
              loading={submittingClaim}
              className="border-round-lg font-bold px-4"
              onClick={handleExecuteClaim}
            />
          </div>
        }
        modal
        style={{ width: '100%', maxWidth: '560px' }}
        className="p-fluid"
      >
        {claimTargetItem && claimTargetDetail && (() => {
          const tipePaket = (claimTargetItem.tipe_paket || '').toString().trim().toUpperCase();
          const isWajib = tipePaket === 'MEDICAL TREATMENT';
          const isService = tipePaket === 'SERVICE TREATMENT';
          const isOpsional = !isWajib && !isService;
          const roomName = claimTargetDetail.nama_ruangan || claimTargetItem.nama_ruangan_paket || 'Ruangan Tindakan';

          return (
            <div className="flex flex-column gap-3 pt-2">
              <div className="p-3 border-round-xl border-1 surface-border surface-50 flex flex-column gap-2 text-sm">
                <div className="flex align-items-center justify-content-between">
                  <span className="text-500 font-medium text-xs">Pasien</span>
                  <div className="flex align-items-center gap-2">
                    <span className="font-bold text-900">{claimTargetItem.nama_pasien}</span>
                    <span className="text-xs font-bold px-2 py-1 border-round-lg text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>{claimTargetItem.no_rm}</span>
                  </div>
                </div>
                <div className="flex align-items-center justify-content-between">
                  <span className="text-500 font-medium text-xs">Tujuan Ruangan</span>
                  <span className="font-semibold text-primary text-xs flex align-items-center"><i className="pi pi-map-marker text-xs mr-1.5" />{roomName}</span>
                </div>
              </div>
              <div className="flex flex-column gap-2">
                <span className="text-sm font-bold text-700">Rincian Sesi yang Diklaim:</span>
                <div className="surface-50 border-1 surface-border border-round-xl p-3 flex flex-column gap-2">
                  <div className="flex align-items-center justify-content-between">
                    <span className="font-bold text-900 text-sm">{claimTargetDetail.nama_layanan || claimTargetDetail.kode_layanan}</span>
                    <span className="font-bold text-amber-600 text-sm">Rp 0 (Klaim Sesi)</span>
                  </div>
                  <div className="flex align-items-center gap-2 flex-wrap">
                    <span className="text-xs text-500">{claimTargetItem.nama_paket}</span>
                    <Tag value={`Tersisa ${claimTargetDetail.sisa_sesi} Sesi`} severity="success" className="text-xs font-bold" />
                  </div>
                  {isWajib && (<span className="text-xs font-semibold text-red-700 flex align-items-center gap-1 pt-1 border-top-1 surface-border"><i className="pi pi-user-edit text-xs" /> Wajib Konsultasi Dokter Dulu</span>)}
                  {isService && (<span className="text-xs font-semibold text-green-700 flex align-items-center gap-1 pt-1 border-top-1 surface-border"><i className="pi pi-bolt text-xs" /> Langsung ke {roomName}</span>)}
                  {isOpsional && (
                    <div className="flex flex-column gap-2 pt-1 border-top-1 surface-border">
                      <div className="flex align-items-center justify-content-between">
                        <span className="text-xs font-bold text-700 flex align-items-center gap-1"><i className="pi pi-question-circle text-indigo-500" />Pilihan Alur Kunjungan</span>
                        <Tag value="Opsional Konsul" severity="info" className="text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 p-2 border-round-xl border-2 cursor-pointer transition-all transition-duration-200 flex align-items-center gap-2" style={{ borderColor: claimConsultChoice !== false ? '#6366f1' : '#e2e8f0', background: claimConsultChoice !== false ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)' : 'var(--surface-50)' }} onClick={() => setClaimConsultChoice(true)}>
                          <div className="flex align-items-center justify-content-center border-round-lg text-white flex-shrink-0" style={{ width: '32px', height: '32px', background: claimConsultChoice !== false ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#cbd5e1' }}><i className="pi pi-user-edit text-sm" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs" style={{ color: claimConsultChoice !== false ? '#4338ca' : '#64748b' }}>Konsultasi Dokter Dulu</div>
                            <div className="text-xs" style={{ color: claimConsultChoice !== false ? '#6366f1' : '#94a3b8' }}>Ke Ruang Konsultasi</div>
                          </div>
                          {claimConsultChoice !== false && <i className="pi pi-check-circle text-indigo-500 flex-shrink-0" />}
                        </div>
                        <div className="flex-1 p-2 border-round-xl border-2 cursor-pointer transition-all transition-duration-200 flex align-items-center gap-2" style={{ borderColor: claimConsultChoice === false ? '#10b981' : '#e2e8f0', background: claimConsultChoice === false ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'var(--surface-50)' }} onClick={() => setClaimConsultChoice(false)}>
                          <div className="flex align-items-center justify-content-center border-round-lg text-white flex-shrink-0" style={{ width: '32px', height: '32px', background: claimConsultChoice === false ? 'linear-gradient(135deg, #10b981, #059669)' : '#cbd5e1' }}><i className="pi pi-bolt text-sm" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs" style={{ color: claimConsultChoice === false ? '#065f46' : '#64748b' }}>Langsung Tindakan</div>
                            <div className="text-xs" style={{ color: claimConsultChoice === false ? '#10b981' : '#94a3b8' }}>{roomName}</div>
                          </div>
                          {claimConsultChoice === false && <i className="pi pi-check-circle text-green-500 flex-shrink-0" />}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex align-items-center justify-content-between font-extrabold text-base pt-2 border-top-2 surface-border text-900">
                <span>Total Estimasi Biaya:</span>
                <span className="text-blue-600">Rp 0 (Klaim Sesi Paket)</span>
              </div>
              <p className="text-xs text-500 m-0">Nomor antrean dan nomor kunjungan baru akan otomatis diterbitkan ke sistem.</p>
            </div>
          );
        })()}
      </Dialog>
    </>
  );
};
