'use client';

import React from 'react';

interface DoctorItem {
  nama?: string;
  name?: string;
  total_konsul?: number;
  patients?: number;
}

interface StaffItem {
  nama?: string;
  name?: string;
  jabatan?: string;
  role?: string;
  total_tindakan?: number;
  sessions?: number;
}

interface StaffActivityTableProps {
  doctors: DoctorItem[];
  staff: StaffItem[];
}

export const getInitials = (fullName: string) => {
  if (!fullName) return '--';
  const clean = fullName.replace(/^(dr\.|drg\.|prof\.|ners\.)\s*/i, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return '--';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Aturan warna avatar yang konsisten berdasarkan Peran/Jabatan:
 * - Dokter: Emerald / Hijau Brand
 * - Perawat: Sky Blue / Biru Netral
 * - Terapis / Beautician: Purple / Ungu Estetika
 */
const getRoleAvatarStyle = (role: string) => {
  const r = (role || '').toLowerCase();
  if (r.includes('dokter')) {
    return {
      backgroundColor: '#ECFDF5',
      color: '#047857',
      border: '1px solid #A7F3D0',
    };
  }
  if (r.includes('perawat')) {
    return {
      backgroundColor: '#EFF6FF',
      color: '#1D4ED8',
      border: '1px solid #BFDBFE',
    };
  }
  // Terapis / Beautician
  return {
    backgroundColor: '#F5F3FF',
    color: '#6D28D9',
    border: '1px solid #DDD6FE',
  };
};

export const StaffActivityTable: React.FC<StaffActivityTableProps> = ({
  doctors,
  staff,
}) => {
  const rawDoctors: DoctorItem[] =
    doctors && doctors.length > 0
      ? doctors
      : [
          { nama: 'M. Hais Batara', total_konsul: 0 },
          { nama: 'dr. Amanda Putri Wijaya', total_konsul: 8 },
          { nama: 'dr. Bagus Santoso', total_konsul: 10 },
        ];

  const rawStaff: StaffItem[] =
    staff && staff.length > 0
      ? staff
      : [
          { nama: 'Rani Kartika, S.Kep.Ns', jabatan: 'perawat', total_tindakan: 0 },
          { nama: 'Siti Nurhaliza, S.Kep.Ns', jabatan: 'perawat', total_tindakan: 0 },
          { nama: 'Dewi Anjani', jabatan: 'terapis', total_tindakan: 0 },
          { nama: 'Fajar Ramadhan', jabatan: 'terapis', total_tindakan: 0 },
        ];

  const totalDoctorConsults = rawDoctors.reduce(
    (sum, d) => sum + Number(d.total_konsul ?? d.patients ?? 0),
    0
  );

  const totalStaffActions = rawStaff.reduce(
    (sum, s) => sum + Number(s.total_tindakan ?? s.sessions ?? 0),
    0
  );

  return (
    <div className="clinic-two-col-grid">
      {/* ─── 1. AKTIVITAS DOKTER SPESIALIS ─── */}
      <div
        className="clinic-panel h-full flex flex-column justify-content-between bg-white"
        style={{ padding: '24px' }}
      >
        <div>
          {/* HEADER CARD: IKON SEJAJAR TENGAH DENGAN TEKS JUDUL (GAP 8PX, UKURAN 16-18PX) */}
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '8px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                }}
              >
                <i className="pi pi-heart" style={{ fontSize: '16px', lineHeight: 1 }} />
              </span>
              <h3
                className="clinic-card-title text-base font-bold text-900 m-0"
                style={{ lineHeight: 1.2 }}
              >
                Aktivitas Dokter Spesialis
              </h3>
            </div>

            <span className="clinic-pill clinic-pill-emerald flex align-items-center gap-1.5 shadow-none">
              <span className="w-1.5 h-1.5 border-round-circle bg-emerald-500 inline-block" />
              {rawDoctors.length} dokter terdaftar
            </span>
          </div>

          {/* TABLE HEADER (STRUKTUR 3 KOLOM KONSISTEN: 50% - 25% - 25%) */}
          <div
            className="grid m-0 px-3 py-2 border-round-lg text-xs font-semibold text-600 mb-2 align-items-center"
            style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <div className="col-6 p-0 text-left font-bold text-700">Nama Dokter</div>
            <div className="col-3 p-0 text-center font-bold text-700">Peran</div>
            <div className="col-3 p-0 text-right font-bold text-700">Konsultasi &amp; RM</div>
          </div>

          {/* TABLE ROWS */}
          <div className="flex flex-column gap-1">
            {rawDoctors.map((doc, idx) => {
              const docName = doc.nama || doc.name || 'Dokter';
              const consults = Number(doc.total_konsul ?? doc.patients ?? 0);
              const initials = getInitials(docName);
              const avatarStyle = getRoleAvatarStyle('dokter');

              return (
                <div
                  key={idx}
                  className="clinic-table-row grid align-items-center m-0 px-3 py-2"
                >
                  {/* KOLOM 1: AVATAR & NAMA DENGAN JARAK HORIZONTAL 12PX */}
                  <div
                    className="col-6 p-0 flex align-items-center"
                    style={{ gap: '12px' }}
                  >
                    <div className="clinic-avatar" style={avatarStyle}>
                      {initials}
                    </div>
                    <span
                      className="text-sm font-semibold text-900 text-overflow-ellipsis overflow-hidden white-space-nowrap pr-2"
                      title={docName}
                    >
                      {docName}
                    </span>
                  </div>

                  {/* KOLOM 2: BADGE PERAN (SATU-SATUNYA SUMBER INFORMASI PERAN) */}
                  <div className="col-3 p-0 text-center">
                    <span className="clinic-pill-role clinic-pill-role-dokter">
                      Dokter
                    </span>
                  </div>

                  {/* KOLOM 3: METRIK KONSULTASI */}
                  <div className="col-3 p-0 text-right">
                    {consults > 0 ? (
                      <span
                        className="inline-flex align-items-center gap-1 px-2.5 py-1 border-round-pill text-xs font-bold shadow-none"
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        <i className="pi pi-check text-[10px]" />
                        {consults} pasien
                      </span>
                    ) : (
                      <span
                        className="inline-flex align-items-center gap-1 px-2.5 py-1 border-round-pill text-xs font-normal"
                        style={{
                          backgroundColor: '#F8FAFC',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <i className="pi pi-clock text-[10px]" />
                        0 pasien
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER RINGKASAN (2 KOLOM JELAS TERPISAH DENGAN SPASI AMAN) */}
        <div
          className="pt-3 mt-3 flex justify-content-between align-items-center flex-wrap gap-2 text-xs"
          style={{ borderTop: '1px solid #E5E7EB' }}
        >
          <div className="flex align-items-center text-600 font-medium" style={{ gap: '6px' }}>
            <i className="pi pi-chart-bar text-xs text-emerald-600 flex-shrink-0" style={{ lineHeight: 1, verticalAlign: 'middle' }} />
            <span>Total Konsultasi:</span>
            <strong className="text-900 font-bold">{totalDoctorConsults} pasien</strong>
          </div>

          <span
            className="inline-flex align-items-center border-round-pill text-xs font-semibold shadow-none"
            style={{
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #A7F3D0',
              padding: '4px 10px',
              gap: '6px',
            }}
          >
            <i
              className="pi pi-check-circle text-emerald-600 flex-shrink-0"
              style={{ fontSize: '12px', lineHeight: 1, verticalAlign: 'middle' }}
            />
            <span style={{ lineHeight: 1 }}>Rekam Medis Real-time</span>
          </span>
        </div>
      </div>

      {/* ─── 2. AKTIVITAS BEAUTICIAN & TERAPIS ─── */}
      <div
        className="clinic-panel h-full flex flex-column justify-content-between bg-white"
        style={{ padding: '24px' }}
      >
        <div>
          {/* HEADER CARD: IKON SEJAJAR TENGAH DENGAN TEKS JUDUL (GAP 8PX, UKURAN 16-18PX) */}
          <div className="clinic-card-header mb-3">
            <div className="flex align-items-center" style={{ gap: '8px' }}>
              <span
                className="flex align-items-center justify-content-center border-round-md flex-shrink-0"
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: '#F5F3FF',
                  color: '#6D28D9',
                  border: '1px solid #DDD6FE',
                }}
              >
                <i className="pi pi-sparkles" style={{ fontSize: '16px', lineHeight: 1 }} />
              </span>
              <h3
                className="clinic-card-title text-base font-bold text-900 m-0"
                style={{ lineHeight: 1.2 }}
              >
                Aktivitas Beautician &amp; Terapis
              </h3>
            </div>

            <span
              className="clinic-pill flex align-items-center gap-1.5 shadow-none"
              style={{
                backgroundColor: '#F5F3FF',
                color: '#6D28D9',
                border: '1px solid #DDD6FE',
              }}
            >
              <span className="w-1.5 h-1.5 border-round-circle bg-purple-500 inline-block" />
              {rawStaff.length} petugas terdaftar
            </span>
          </div>

          {/* TABLE HEADER (STRUKTUR 3 KOLOM KONSISTEN: 50% - 25% - 25%) */}
          <div
            className="grid m-0 px-3 py-2 border-round-lg text-xs font-semibold text-600 mb-2 align-items-center"
            style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}
          >
            <div className="col-6 p-0 text-left font-bold text-700">Nama Petugas</div>
            <div className="col-3 p-0 text-center font-bold text-700">Jabatan</div>
            <div className="col-3 p-0 text-right font-bold text-700">Sesi Ditangani</div>
          </div>

          {/* TABLE ROWS */}
          <div className="flex flex-column gap-1">
            {rawStaff.map((st, idx) => {
              const staffName = st.nama || st.name || 'Petugas';
              const roleName = String(st.jabatan || st.role || 'terapis').toLowerCase();
              const isNurse = roleName.includes('perawat');
              const actions = Number(st.total_tindakan ?? st.sessions ?? 0);
              const initials = getInitials(staffName);
              const avatarStyle = getRoleAvatarStyle(isNurse ? 'perawat' : 'terapis');

              return (
                <div
                  key={idx}
                  className="clinic-table-row grid align-items-center m-0 px-3 py-2"
                >
                  {/* KOLOM 1: AVATAR & NAMA DENGAN JARAK HORIZONTAL 12PX */}
                  <div
                    className="col-6 p-0 flex align-items-center"
                    style={{ gap: '12px' }}
                  >
                    <div className="clinic-avatar" style={avatarStyle}>
                      {initials}
                    </div>
                    <span
                      className="text-sm font-semibold text-900 text-overflow-ellipsis overflow-hidden white-space-nowrap pr-2"
                      title={staffName}
                    >
                      {staffName}
                    </span>
                  </div>

                  {/* KOLOM 2: BADGE JABATAN (SATU-SATUNYA SUMBER INFORMASI JABATAN) */}
                  <div className="col-3 p-0 text-center">
                    <span
                      className={`clinic-pill-role ${
                        isNurse ? 'clinic-pill-role-perawat' : 'clinic-pill-role-terapis'
                      }`}
                    >
                      {isNurse ? 'Perawat' : 'Terapis'}
                    </span>
                  </div>

                  {/* KOLOM 3: METRIK TINDAKAN */}
                  <div className="col-3 p-0 text-right">
                    {actions > 0 ? (
                      <span
                        className="inline-flex align-items-center gap-1 px-2.5 py-1 border-round-pill text-xs font-bold shadow-none"
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                        }}
                      >
                        <i className="pi pi-check text-[10px]" />
                        {actions} tindakan
                      </span>
                    ) : (
                      <span
                        className="inline-flex align-items-center gap-1 px-2.5 py-1 border-round-pill text-xs font-normal"
                        style={{
                          backgroundColor: '#F8FAFC',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        <i className="pi pi-clock text-[10px]" />
                        0 tindakan
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER RINGKASAN (2 KOLOM JELAS TERPISAH DENGAN SPASI AMAN) */}
        <div
          className="pt-3 mt-3 flex justify-content-between align-items-center flex-wrap gap-2 text-xs"
          style={{ borderTop: '1px solid #E5E7EB' }}
        >
          <div className="flex align-items-center text-600 font-medium" style={{ gap: '6px' }}>
            <i className="pi pi-chart-bar text-xs text-purple-600 flex-shrink-0" style={{ lineHeight: 1, verticalAlign: 'middle' }} />
            <span>Total Sesi:</span>
            <strong className="text-900 font-bold">{totalStaffActions} tindakan</strong>
          </div>

          <span
            className="inline-flex align-items-center border-round-pill text-xs font-semibold shadow-none"
            style={{
              backgroundColor: '#F5F3FF',
              color: '#6D28D9',
              border: '1px solid #DDD6FE',
              padding: '4px 10px',
              gap: '6px',
            }}
          >
            <i
              className="pi pi-sync text-purple-600 flex-shrink-0"
              style={{ fontSize: '11px', lineHeight: 1, verticalAlign: 'middle' }}
            />
            <span style={{ lineHeight: 1 }}>Antrean Layanan Aktif</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StaffActivityTable;
