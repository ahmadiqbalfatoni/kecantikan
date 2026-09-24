'use client';

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { UserPlus } from 'lucide-react';
import { PasienFormCard } from '@/app/(main)/pendaftaran-antrean/pendaftaran-pasien/components/PasienFormCard';

interface Props {
  visible: boolean;
  toast: React.RefObject<Toast>;
  onHide: () => void;
  onSuccess: (pasien: any) => void;
}

export const DialogQuickAddPasien: React.FC<Props> = ({
  visible,
  toast,
  onHide,
  onSuccess,
}) => {
  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex align-items-center gap-2">
          <UserPlus className="text-primary" size={22} />
          <span className="font-bold text-xl">Form Pendaftaran Pasien Baru</span>
        </div>
      }
      modal
      style={{ width: '100%', maxWidth: '950px' }}
      breakpoints={{ '960px': '95vw', '641px': '100vw' }}
      contentClassName="p-2 sm:p-3"
    >
      {visible && (
        <PasienFormCard
          toast={toast}
          onCancel={onHide}
          submitLabel="Daftarkan Pasien Baru & Lanjut Booking"
          onSuccess={(resultData) => {
            onSuccess(resultData);
            onHide();
          }}
        />
      )}
    </Dialog>
  );
};
