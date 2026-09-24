'use client';

import React from 'react';
import { Pasien } from '../pendaftaran-pasien/components/tab_pendaftaran_lama';

export type { Pasien };

interface PasienKtpCardProps {
  pasien: Pasien;
  showMedicalAlert?: boolean;
}

export const PasienKtpCard: React.FC<PasienKtpCardProps> = ({ pasien, showMedicalAlert = true }) => {
  // Helper calculate age
  const calculateAge = (dateString?: string) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper format birth date DD-MM-YYYY
  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return dateString;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  const age = calculateAge(pasien.tanggal_lahir);
  const birthDateFormatted = formatBirthDate(pasien.tanggal_lahir);

  // Location uppercase
  const prov = (pasien.provinsi || 'JAWA TIMUR').toUpperCase();
  const rawKab = (pasien.kota_kabupaten || 'KABUPATEN BANYUWANGI').toUpperCase();
  const kab = rawKab.startsWith('KAB') || rawKab.startsWith('KOTA') ? rawKab : `KABUPATEN ${rawKab}`;
  const gender = pasien.jenis_kelamin === 'L' ? 'LAKI-LAKI' : pasien.jenis_kelamin === 'P' ? 'PEREMPUAN' : '-';
  const marital = (pasien.status_perkawinan || '-').replace(/_/g, ' ').toUpperCase();

  const hasAlergi = Boolean(
    pasien.alergi &&
    pasien.alergi.trim() !== '' &&
    pasien.alergi.trim() !== '-' &&
    pasien.alergi.trim().toLowerCase() !== 'tidak ada'
  );

  const hasKontakDarurat = Boolean(
    pasien.nama_kontak_darurat ||
    pasien.no_hp_kontak_darurat ||
    pasien.hubungan_kontak_darurat
  );

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');

  return (
    <div className="w-full flex flex-column align-items-center">
      {/* MEDICAL PATIENT ID CARD - EMERALD GREEN THEME */}
      <div
        className="w-full relative border-round-2xl overflow-hidden select-none"
        style={{
          background: 'linear-gradient(135deg, #a7f3d0 0%, #d1fae5 45%, #6ee7b7 100%)',
          border: '2px solid #34d399',
          boxShadow: '0 12px 28px -5px rgba(5, 150, 105, 0.25), 0 4px 10px -2px rgba(5, 150, 105, 0.15)',
          color: '#064e3b',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          maxWidth: '640px',
        }}
      >
        {/* Subtle Security Guilloche Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(#065f46 0.75px, transparent 0.75px), radial-gradient(#065f46 0.75px, #d1fae5 0.75px)`,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px',
          }}
        />

        {/* CLINIC LOGO WATERMARK (CENTERED IN THE CARD) */}
        <div
          className="absolute pointer-events-none flex align-items-center justify-content-center select-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.07,
            zIndex: 0,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '19rem',
              color: '#064e3b',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            spa
          </span>
        </div>

        {/* CARD CONTENT */}
        <div className="relative p-3 md:p-4 z-1">
          {/* 1. HEADER */}
          <div className="text-center mb-2 pb-1.5 border-bottom-1 border-emerald-400">
            <div className="text-xs md:text-sm font-bold tracking-widest text-emerald-950 uppercase leading-tight">
              PROVINSI {prov}
            </div>
            <div className="text-xs md:text-sm font-bold tracking-widest text-emerald-950 uppercase leading-tight mt-0.5">
              {kab}
            </div>
          </div>

          {/* 2. NIK & NO. RM ROW */}
          <div className="flex align-items-center justify-content-between mb-2">
            <div className="flex align-items-baseline gap-2">
              <span className="font-bold text-sm md:text-base tracking-wider text-emerald-950 font-mono">
                NIK :
              </span>
              <span className="font-bold text-base md:text-xl text-emerald-950 font-mono tracking-widest">
                {pasien.nik || '—'}
              </span>
            </div>
            <div
              className="flex align-items-center justify-content-center bg-emerald-800 text-white border-round-md font-mono text-xs font-bold shadow-1 border-1 border-emerald-600"
              style={{ minWidth: '130px', padding: '4px 10px', gap: '6px' }}
            >
              <span className="material-symbols-outlined text-emerald-200" style={{ fontSize: '15px', lineHeight: 1 }}>
                badge
              </span>
              <span className="tracking-wide">NO. RM : {pasien.no_rm}</span>
            </div>
          </div>

          {/* 3. MAIN BODY (LEFT DATA + RIGHT PHOTO/SIGNATURE) */}
          <div className="grid grid-nogutter align-items-start gap-2">
            {/* Left Data Column */}
            <div className="col flex-1" style={{ fontSize: '11px', lineHeight: '1.45' }}>
              <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
                <tbody>
                  {/* Nama */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5" style={{ width: '120px' }}>
                      Nama
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5" style={{ width: '12px' }}>:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5 tracking-wide">{pasien.nama || '—'}</td>
                  </tr>

                  {/* Tempat/Tgl Lahir */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Tempat/Tgl Lahir
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">
                      {[pasien.tempat_lahir, birthDateFormatted].filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>

                  {/* Umur */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Umur
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">
                      {age !== null ? `${age} TAHUN` : '—'}
                    </td>
                  </tr>

                  {/* Jenis Kelamin & Gol Darah */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Jenis Kelamin
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">
                      <div className="flex align-items-center gap-3">
                        <span>{gender}</span>
                        <span className="text-emerald-800 font-normal">
                          • Gol. Darah : <strong className="text-emerald-950">{pasien.golongan_darah && pasien.golongan_darah !== '-' ? pasien.golongan_darah : '—'}</strong>
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Alamat */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Alamat
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">
                      {pasien.alamat || pasien.kelurahan_desa || '—'}
                      {pasien.patokan ? <span className="text-emerald-800 font-normal ml-1">({pasien.patokan})</span> : ''}
                    </td>
                  </tr>

                  {/* RT/RW & Kel/Desa & Kode Pos */}
                  <tr>
                    <td className="font-semibold text-emerald-800 whitespace-nowrap align-top pl-2.5 py-0.5">
                      • Kel/Desa
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">
                      {pasien.kelurahan_desa || '—'}
                      {pasien.kode_pos ? (
                        <span className="text-emerald-800 font-normal font-mono ml-2 text-[10px]">
                          [POS: {pasien.kode_pos}]
                        </span>
                      ) : ''}
                    </td>
                  </tr>

                  {/* Kecamatan */}
                  <tr>
                    <td className="font-semibold text-emerald-800 whitespace-nowrap align-top pl-2.5 py-0.5">
                      • Kecamatan
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">{pasien.kecamatan || '—'}</td>
                  </tr>

                  {/* Agama */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Agama
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">{pasien.agama || '—'}</td>
                  </tr>

                  {/* Status Perkawinan */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Status Perkawinan
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">{marital}</td>
                  </tr>

                  {/* Pekerjaan */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Pekerjaan
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">{pasien.pekerjaan || '—'}</td>
                  </tr>

                  {/* Kewarganegaraan */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Kewarganegaraan
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5">{pasien.kewarganegaraan || 'WNI'}</td>
                  </tr>

                  {/* No HP (WhatsApp) */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      No. HP (WA)
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 py-0.5 font-mono">{pasien.no_hp || '—'}</td>
                  </tr>

                  {/* Email */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Email
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-medium text-emerald-950 py-0.5 font-mono text-[10.5px]">
                      {pasien.email || '—'}
                    </td>
                  </tr>

                  {/* Kontak Darurat */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Kontak Darurat
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 py-0.5">
                      {hasKontakDarurat ? (
                        <div className="flex align-items-center flex-wrap" style={{ columnGap: '6px', rowGap: '2px' }}>
                          <span className="uppercase">{pasien.nama_kontak_darurat || '—'}</span>
                          {pasien.hubungan_kontak_darurat && (
                            <span className="text-emerald-800 text-[10px] font-medium uppercase">
                              ({pasien.hubungan_kontak_darurat})
                            </span>
                          )}
                          {pasien.no_hp_kontak_darurat && (
                            <span className="text-emerald-900 font-mono text-[10.5px] font-normal inline-flex align-items-center" style={{ gap: '4px' }}>
                              <span className="text-emerald-700">•</span>
                              <span className="material-symbols-outlined text-emerald-700" style={{ fontSize: '13px', lineHeight: 1 }}>
                                call
                              </span>
                              <span>{pasien.no_hp_kontak_darurat}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-800 font-normal">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Riwayat Alergi (Table Row Highlight) */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Riwayat Alergi
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="align-top py-0.5">
                      {hasAlergi ? (
                        <span
                          className="inline-flex align-items-center border-round bg-red-100 text-red-900 font-bold text-[10.5px] border-1 border-red-300 uppercase tracking-wide"
                          style={{ padding: '2px 8px', gap: '6px' }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: '14px',
                              color: '#dc2626',
                              lineHeight: 1,
                            }}
                          >
                            warning
                          </span>
                          <span>{pasien.alergi}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-medium text-[10.5px]">Tidak Ada</span>
                      )}
                    </td>
                  </tr>

                  {/* Berlaku Hingga */}
                  <tr>
                    <td className="font-semibold text-emerald-900 whitespace-nowrap align-top py-0.5">
                      Berlaku Hingga
                    </td>
                    <td className="align-top font-bold text-emerald-950 py-0.5">:</td>
                    <td className="font-bold text-emerald-950 uppercase py-0.5 tracking-wider">SEUMUR HIDUP</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Photo & Signature Column (Vertically Balanced) */}
            <div
              className="flex-shrink-0 flex flex-column align-items-center justify-content-center pt-2 pb-1"
              style={{ width: '125px', gap: '8px' }}
            >
              {/* Photo 3x4 Box in Emerald Green Studio Color */}
              <div
                className="relative border-round-md overflow-hidden flex flex-column align-items-center justify-content-center shadow-2"
                style={{
                  width: '108px',
                  height: '138px',
                  backgroundColor: '#059669',
                  border: '1.5px solid #047857',
                }}
              >
                {pasien.foto ? (
                  <img
                    src={pasien.foto.startsWith('http') || pasien.foto.startsWith('/') ? pasien.foto : `/uploads/${pasien.foto}`}
                    alt={pasien.nama || 'Foto Pasien'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  /* Silhouette / Studio Avatar */
                  <div className="flex flex-column align-items-center justify-content-center text-white text-center p-1">
                    <div className="w-4rem h-4rem border-circle bg-white-alpha-20 flex align-items-center justify-content-center mb-1 border-1 border-white-alpha-40">
                      <span className="text-2xl font-bold font-mono text-white">
                        {pasien.nama ? pasien.nama.charAt(0).toUpperCase() : <i className="pi pi-user text-xl" />}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wider uppercase opacity-90 leading-tight">
                      PASIEN KLINIK
                    </span>
                  </div>
                )}
              </div>

              {/* City & Issue Date */}
              <div className="text-center text-[10px] text-emerald-950 font-semibold leading-tight">
                <div>{kab.replace('KABUPATEN ', 'KAB. ')}</div>
                <div className="text-emerald-800 text-[9px] mt-0.5 font-mono">{todayStr}</div>
              </div>

              {/* Signature simulation */}
              <div className="text-center font-italic text-emerald-950 font-bold" style={{ fontFamily: 'cursive', fontSize: '13px', transform: 'rotate(-4deg)' }}>
                {pasien.nama?.split(' ')[0] || 'Tanda Tangan'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MEDICAL ALERT STRIP (IF HAS ALERGI) - REFINED, NEAT CLINICAL WARNING BANNER */}
      {showMedicalAlert && hasAlergi && (
        <div
          className="w-full mt-3 p-3 border-round-xl flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 shadow-1"
          style={{
            maxWidth: '640px',
            backgroundColor: '#fff5f5',
            border: '1.5px solid #fca5a5',
          }}
        >
          <div className="flex align-items-center gap-3">
            {/* Warning Icon Badge */}
            <div
              className="w-2.5rem h-2.5rem border-round-lg flex align-items-center justify-content-center flex-shrink-0 shadow-1"
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
              }}
            >
              <span
                className="material-symbols-outlined select-none"
                style={{
                  fontSize: '20px',
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                warning
              </span>
            </div>

            {/* Alert Content */}
            <div className="flex flex-column gap-1">
              <div className="flex align-items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  PERINGATAN MEDIS :
                </span>
                <span
                  className="text-xs font-bold text-red-950 uppercase border-round bg-red-100 border-1 border-red-300 tracking-wide"
                  style={{ padding: '2px 8px' }}
                >
                  {pasien.alergi}
                </span>
              </div>
              <div className="text-[11px] text-red-800 font-medium">
                Waspadai pemberian resep, obat, krim, atau tindakan klinis yang kontraindikasi dengan alergi ini.
              </div>
            </div>
          </div>

          {/* Special Attention Chip */}
          <div className="flex-shrink-0 self-end sm:self-center">
            <span
              className="text-[10.5px] font-bold text-red-800 bg-white border-round-md border-1 border-red-300 uppercase tracking-wide shadow-xs inline-flex align-items-center"
              style={{ padding: '4px 10px', gap: '6px' }}
            >
              <span
                className="material-symbols-outlined text-red-600"
                style={{ fontSize: '15px', lineHeight: 1 }}
              >
                shield
              </span>
              <span>PERHATIAN KHUSUS</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
