'use client';

import React, { useState } from 'react';
import { Toast } from 'primereact/toast';
import { PasienFormCard, PasienFormData } from './PasienFormCard';
import { KarcisAntrianModal } from './dialogs/KarcisAntrianModal';
import { KarcisAntrianLayananModal } from './dialogs/KarcisAntrianLayananModal';

interface Props {
  toast: React.RefObject<Toast>;
  editingPasien?: Partial<PasienFormData> | null;
  onCancelEdit?: () => void;
  onRefreshVisits?: () => void;
  /** Dipanggil saat form pasien baru berhasil — data dikirim ke parent untuk step pilih layanan inline */
  onRegistrationSuccess?: (pasienData: any) => void;
}

export const TabPendaftaran: React.FC<Props> = ({
  toast,
  editingPasien,
  onCancelEdit,
  onRefreshVisits,
  onRegistrationSuccess,
}) => {
  // Ticket modals (hanya untuk mode edit — bukan pendaftaran baru)
  const [karcisVisible, setKarcisVisible] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [antrianLayananModalVisible, setAntrianLayananModalVisible] = useState(false);
  const [antrianLayananData, setAntrianLayananData] = useState<any>(null);

  const handleRegistrationSuccess = (resultData: any) => {
    if (onRegistrationSuccess && resultData && (resultData.no_rm || resultData.id)) {
      // Kirim ke parent untuk ditampilkan inline step pilih layanan
      onRegistrationSuccess(resultData);
    } else if (onRefreshVisits) {
      onRefreshVisits();
    }
  };

  return (
    <>
      <PasienFormCard
        initialData={editingPasien}
        onSuccess={handleRegistrationSuccess}
        onCancel={editingPasien ? onCancelEdit : undefined}
        toast={toast}
      />

      {/* TICKET MODALS (untuk kasus non-baru, misal daftarkan ulang dari edit) */}
      <KarcisAntrianModal
        visible={karcisVisible}
        onHide={() => setKarcisVisible(false)}
        data={ticketData}
      />
      <KarcisAntrianLayananModal
        visible={antrianLayananModalVisible}
        onHide={() => setAntrianLayananModalVisible(false)}
        data={antrianLayananData}
      />
    </>
  );
};
