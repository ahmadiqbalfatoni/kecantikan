'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LaporanModuleId } from './components/LaporanNavCard';
import {
  LaporanPenjualanView,
  LaporanTreatmentView,
  LaporanProdukView,
  LaporanPaketView,
  LaporanMembershipView,
  LaporanPasienView,
  LaporanKunjunganView,
  LaporanAppointmentView,
  LaporanDokterView,
  LaporanBeauticianView,
  LaporanKomisiView,
  LaporanInventoryView,
  LaporanStokOpnameView,
  LaporanPembelianView,
  LaporanExpiredView,
  LaporanDepositView,
  LaporanVoucherView,
  LaporanCrmView,
  LaporanKeuanganView,
} from './components/LaporanViews';
import { LaporanRekamMedisView } from './components/LaporanRekamMedisView';
import { Skeleton } from 'primereact/skeleton';

const LaporanContent: React.FC = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeModule = (searchParams.get('tab') as LaporanModuleId) || 'penjualan';

  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const navigateToActive = (tab: LaporanModuleId = 'penjualan') => {
    router.push(`/riwayat/rekam-medis?tab=${tab}`);
  };

  return (
    <div className="w-full">
      {/* ─── MODUL OPERASIONAL AKTIF DARI DATABASE ─── */}
      {activeModule === 'penjualan' && <LaporanPenjualanView />}
      {activeModule === 'treatment' && <LaporanTreatmentView />}
      {activeModule === 'produk' && <LaporanProdukView />}
      {activeModule === 'paket' && <LaporanPaketView />}
      {activeModule === 'membership' && <LaporanMembershipView />}
      {activeModule === 'pasien' && <LaporanPasienView />}
      {activeModule === 'kunjungan' && <LaporanKunjunganView />}
      {activeModule === 'appointment' && <LaporanAppointmentView />}
      {activeModule === 'dokter' && <LaporanDokterView />}
      {activeModule === 'beautician' && <LaporanBeauticianView />}
      {activeModule === 'komisi' && <LaporanKomisiView />}
      {activeModule === 'inventory' && <LaporanInventoryView />}
      {activeModule === 'stok_opname' && <LaporanStokOpnameView />}
      {activeModule === 'pembelian' && <LaporanPembelianView />}
      {activeModule === 'expired' && <LaporanExpiredView />}
      {activeModule === 'deposit' && <LaporanDepositView />}
      {activeModule === 'voucher' && <LaporanVoucherView />}
      {activeModule === 'crm' && <LaporanCrmView />}
      {activeModule === 'keuangan' && <LaporanKeuanganView />}
      {activeModule === 'rekam_medis' && <LaporanRekamMedisView />}
    </div>
  );
};

const LaporanPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="card">
          <Skeleton width="40%" height="2rem" className="mb-3" />
          <Skeleton width="100%" height="15rem" />
        </div>
      }
    >
      <LaporanContent />
    </Suspense>
  );
};

export default LaporanPage;
