'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingReservasiPage() {
  const router = useRouter();

  useEffect(() => {
    // Fitur booking telah dipindahkan ke Tab 2 pada halaman Pendaftaran Pasien
    if (typeof window !== 'undefined') {
      const search = window.location.search || '?tab=1';
      const hasTab = search.includes('tab=');
      const targetUrl = hasTab
        ? `/pendaftaran-antrean/pendaftaran-pasien${search}`
        : `/pendaftaran-antrean/pendaftaran-pasien?tab=1${search.startsWith('?') ? `&${search.slice(1)}` : ''}`;
      router.replace(targetUrl);
    }
  }, [router]);

  return (
    <div className="flex flex-column align-items-center justify-content-center min-h-20rem text-500 gap-2">
      <i className="pi pi-spin pi-spinner text-3xl text-primary" />
      <span className="text-sm font-medium">Mengalihkan ke Tab Booking & Reservasi...</span>
    </div>
  );
}
