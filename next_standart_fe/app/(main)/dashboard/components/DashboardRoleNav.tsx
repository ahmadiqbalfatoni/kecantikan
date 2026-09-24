'use client';

import React from 'react';

export type DashboardRole = 'owner' | 'dokter' | 'beautician' | 'kasir' | 'warehouse';

interface RoleNavConfig {
  id: DashboardRole;
  title: string;
  subtitle: string;
  icon: string;
  activeColor: string;
  bgActive: string;
  badge: string;
}

const ROLES: RoleNavConfig[] = [
  {
    id: 'owner',
    title: 'Owner & Eksekutif',
    subtitle: 'KPI Omzet, Finansial & SDM',
    icon: 'pi pi-crown',
    activeColor: '#047857',
    bgActive: '#ecfdf5',
    badge: 'Eksekutif',
  },
  {
    id: 'dokter',
    title: 'Dokter Spesialis',
    subtitle: 'Antrean Pasien & Rekam Medis',
    icon: 'pi pi-heart-fill',
    activeColor: '#0284c7',
    bgActive: '#f0f9ff',
    badge: 'Klinis Medis',
  },
  {
    id: 'beautician',
    title: 'Beautician & Terapis',
    subtitle: 'Treatment Kulit & SOP',
    icon: 'pi pi-sparkles',
    activeColor: '#9333ea',
    bgActive: '#faf5ff',
    badge: 'Estetika',
  },
  {
    id: 'kasir',
    title: 'Kasir & Billing',
    subtitle: 'Transaksi & Pelunasan',
    icon: 'pi pi-credit-card',
    activeColor: '#16a34a',
    bgActive: '#f0fdf4',
    badge: 'Keuangan',
  },
  {
    id: 'warehouse',
    title: 'Gudang & Farmasi',
    subtitle: 'Stok Produk & PO Logistik',
    icon: 'pi pi-box',
    activeColor: '#ea580c',
    bgActive: '#fff7ed',
    badge: 'Logistik',
  },
];

interface DashboardRoleNavProps {
  activeRole: DashboardRole;
  onSelectRole: (role: DashboardRole) => void;
  userRoleName?: string;
}

export const DashboardRoleNav: React.FC<DashboardRoleNavProps> = ({
  activeRole,
  onSelectRole,
  userRoleName,
}) => {
  return (
    <div className="luxe-card p-2 md:p-2.5 mb-4 border-1 surface-border">
      <div className="flex flex-column lg:flex-row justify-content-between align-items-start lg:align-items-center gap-2 mb-2 px-2 pt-1">
        <div className="flex align-items-center gap-2">
          <div
            className="flex align-items-center justify-content-center border-round-lg text-white"
            style={{
              width: '28px',
              height: '28px',
              background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            }}
          >
            <i className="pi pi-sliders-h text-xs" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              PILIH MODUL ANALITIK DIVISI
            </span>
            <span className="text-[11px] text-slate-400 block">
              Beralih perspektif operasional sesuai divisi tugas klinik
            </span>
          </div>
        </div>

        {userRoleName && (
          <div className="flex align-items-center gap-2 text-xs text-slate-500">
            <span>Login sebagai:</span>
            <span className="clinic-badge-pill bg-emerald-50 text-emerald-700 border-1 border-emerald-200">
              <span className="pulse-dot" />
              {userRoleName.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* HORIZONTAL SEGMENTED BUTTON BAR */}
      <div className="grid m-0 gap-2">
        {ROLES.map((r) => {
          const isActive = activeRole === r.id;
          return (
            <div key={r.id} className="col-12 sm:col md:col p-0">
              <button
                type="button"
                onClick={() => onSelectRole(r.id)}
                className={`w-full p-2.5 text-left border-round-xl transition-all border-1 cursor-pointer flex align-items-center gap-2.5 ${
                  isActive
                    ? 'shadow-2'
                    : 'hover:surface-100 border-transparent bg-transparent'
                }`}
                style={{
                  backgroundColor: isActive ? r.bgActive : '#f8fafc',
                  borderColor: isActive ? r.activeColor : '#e2e8f0',
                  transform: isActive ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <div
                  className="flex align-items-center justify-content-center border-round-lg flex-shrink-0 transition-colors shadow-sm"
                  style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: isActive ? r.activeColor : '#ffffff',
                    color: isActive ? '#ffffff' : '#64748b',
                    border: isActive ? 'none' : '1px solid #e2e8f0',
                  }}
                >
                  <i className={`${r.icon} text-base`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex align-items-center justify-content-between gap-1 mb-0.5">
                    <span
                      className="text-xs font-bold truncate block"
                      style={{ color: isActive ? r.activeColor : '#1e293b' }}
                    >
                      {r.title}
                    </span>
                    {isActive && (
                      <span
                        className="text-[9px] font-black uppercase px-1.5 py-0.5 border-round-pill text-white"
                        style={{ backgroundColor: r.activeColor }}
                      >
                        Aktif
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 truncate block">
                    {r.subtitle}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardRoleNav;
