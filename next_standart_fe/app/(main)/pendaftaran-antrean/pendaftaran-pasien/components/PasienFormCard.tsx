'use client';

import React, { useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiPasienCreate, apiPasienUpdate } from './endpoints';

export interface PasienFormData {
  id?: number;
  no_rm?: string;
  nama: string;
  nik: string;
  tempat_lahir: string;
  tanggal_lahir: Date | string | null;
  jenis_kelamin: string;
  golongan_darah: string;
  agama: string;
  status_perkawinan: string;
  kewarganegaraan: string;
  pekerjaan: string;
  provinsi: string;
  kota_kabupaten: string;
  kecamatan: string;
  kelurahan_desa: string;
  kode_pos: string;
  patokan: string;
  no_hp: string;
  email: string;
  nama_kontak_darurat: string;
  no_hp_kontak_darurat: string;
  hubungan_kontak_darurat: string;
  alergi: string;
}

interface Props {
  initialData?: Partial<PasienFormData> | null;
  onSuccess: (resultData: any) => void;
  onCancel?: () => void;
  toast: React.RefObject<Toast>;
  submitLabel?: string;
  hidePilihLayanan?: boolean;
  hideHeader?: boolean;
}

const defaultFormData: PasienFormData = {
  nama: '',
  nik: '',
  tempat_lahir: '',
  tanggal_lahir: null,
  jenis_kelamin: 'L',
  golongan_darah: '',
  agama: 'Islam',
  status_perkawinan: 'belum_menikah',
  kewarganegaraan: 'WNI',
  pekerjaan: 'Lainnya',
  provinsi: '',
  kota_kabupaten: '',
  kecamatan: '',
  kelurahan_desa: '',
  kode_pos: '',
  patokan: '',
  no_hp: '',
  email: '',
  nama_kontak_darurat: '',
  no_hp_kontak_darurat: '',
  hubungan_kontak_darurat: '',
  alergi: '',
  no_rm: '',
};

const sanitizeFormData = (data?: Partial<PasienFormData> | null): PasienFormData => {
  if (!data) return { ...defaultFormData };
  return {
    nama: data.nama || '',
    nik: data.nik || '',
    tempat_lahir: data.tempat_lahir || '',
    tanggal_lahir: data.tanggal_lahir ? new Date(data.tanggal_lahir) : null,
    jenis_kelamin: data.jenis_kelamin || 'L',
    golongan_darah: data.golongan_darah || '',
    agama: data.agama || 'Islam',
    status_perkawinan: data.status_perkawinan || 'belum_menikah',
    kewarganegaraan: data.kewarganegaraan || 'WNI',
    pekerjaan: data.pekerjaan || 'Lainnya',
    provinsi: data.provinsi || '',
    kota_kabupaten: data.kota_kabupaten || '',
    kecamatan: data.kecamatan || '',
    kelurahan_desa: data.kelurahan_desa || '',
    kode_pos: data.kode_pos || '',
    patokan: data.patokan || '',
    no_hp: data.no_hp || '',
    email: data.email || '',
    nama_kontak_darurat: data.nama_kontak_darurat || '',
    no_hp_kontak_darurat: data.no_hp_kontak_darurat || '',
    hubungan_kontak_darurat: data.hubungan_kontak_darurat || '',
    alergi: data.alergi || '',
    no_rm: data.no_rm || '',
  };
};

export const PasienFormCard: React.FC<Props> = ({
  initialData,
  onSuccess,
  onCancel,
  toast,
  submitLabel,
  hidePilihLayanan = false,
  hideHeader = false,
}) => {
  const [formData, setFormData] = useState<PasienFormData>(sanitizeFormData(initialData));
  const [activeFormTab, setActiveFormTab] = useState(0);
  const [submittedTabs, setSubmittedTabs] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Cascading Dropdown States
  const [kodeProvinsi, setKodeProvinsi] = useState<string>('');
  const [kodeKota, setKodeKota] = useState<string>('');
  const [kodeKecamatan, setKodeKecamatan] = useState<string>('');

  // Dropdown options
  const [provList, setProvList] = useState<{ kode: string; nama: string }[]>([]);
  const [kotaList, setKotaList] = useState<{ kode: string; nama: string }[]>([]);
  const [kecList, setKecList] = useState<{ kode: string; nama: string }[]>([]);
  const [kelList, setKelList] = useState<{ kode: string; nama: string }[]>([]);

  // Loading states
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingKota, setLoadingKota] = useState(false);
  const [loadingKec, setLoadingKec] = useState(false);
  const [loadingKel, setLoadingKel] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(sanitizeFormData(initialData));
      setKodeProvinsi('');
      setKodeKota('');
      setKodeKecamatan('');
    } else {
      setFormData(defaultFormData);
      setKodeProvinsi('');
      setKodeKota('');
      setKodeKecamatan('');
    }
  }, [initialData]);

  // 1. Fetch Provinsi List
  useEffect(() => {
    const fetchProv = async () => {
      setLoadingProv(true);
      try {
        const res = await postData('/master/wilayah/provinsi');
        if (['00', '0000'].includes(res.data?.status) && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            kode: String(item.kode || item.id),
            nama: String(item.nama || item.name),
          }));
          setProvList(list);
        }
      } catch (err) {
        showError(toast, 'Gagal memuat data provinsi');
      } finally {
        setLoadingProv(false);
      }
    };
    fetchProv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-match Kode Provinsi saat provList atau formData.provinsi tersedia
  useEffect(() => {
    if (provList.length > 0 && formData.provinsi) {
      const match = provList.find(
        (p) => p.nama.trim().toLowerCase() === formData.provinsi.trim().toLowerCase()
      );
      if (match && match.kode !== kodeProvinsi) {
        setKodeProvinsi(match.kode);
      }
    }
  }, [provList, formData.provinsi]);

  // 2. Fetch Kota List
  useEffect(() => {
    if (!kodeProvinsi) {
      setKotaList([]);
      setKodeKota('');
      setKecList([]);
      setKodeKecamatan('');
      setKelList([]);
      return;
    }
    const fetchKota = async () => {
      setLoadingKota(true);
      try {
        const res = await postData(`/master/wilayah/kota?kode_provinsi=${kodeProvinsi}`, {
          kode_provinsi: kodeProvinsi,
          id_provinsi: kodeProvinsi,
        });
        if (['00', '0000'].includes(res.data?.status) && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            kode: String(item.kode || item.id),
            nama: String(item.nama || item.name),
          }));
          setKotaList(list);
        }
      } catch (err) {
        showError(toast, 'Gagal memuat kota/kabupaten');
      } finally {
        setLoadingKota(false);
      }
    };
    fetchKota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kodeProvinsi]);

  // Auto-match Kode Kota saat kotaList atau formData.kota_kabupaten tersedia
  useEffect(() => {
    if (kotaList.length > 0 && formData.kota_kabupaten) {
      const match = kotaList.find(
        (k) => k.nama.trim().toLowerCase() === formData.kota_kabupaten.trim().toLowerCase()
      );
      if (match && match.kode !== kodeKota) {
        setKodeKota(match.kode);
      }
    }
  }, [kotaList, formData.kota_kabupaten]);

  // 3. Fetch Kecamatan List
  useEffect(() => {
    if (!kodeKota) {
      setKecList([]);
      setKodeKecamatan('');
      setKelList([]);
      return;
    }
    const fetchKec = async () => {
      setLoadingKec(true);
      try {
        const res = await postData(`/master/wilayah/kecamatan?kode_kota=${kodeKota}`, {
          kode_kota: kodeKota,
          kode_kabupaten: kodeKota,
          id_kabupaten: kodeKota,
        });
        if (['00', '0000'].includes(res.data?.status) && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            kode: String(item.kode || item.id),
            nama: String(item.nama || item.name),
          }));
          setKecList(list);
        }
      } catch (err) {
        showError(toast, 'Gagal memuat kecamatan');
      } finally {
        setLoadingKec(false);
      }
    };
    fetchKec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kodeKota]);

  // Auto-match Kode Kecamatan saat kecList atau formData.kecamatan tersedia
  useEffect(() => {
    if (kecList.length > 0 && formData.kecamatan) {
      const match = kecList.find(
        (c) => c.nama.trim().toLowerCase() === formData.kecamatan.trim().toLowerCase()
      );
      if (match && match.kode !== kodeKecamatan) {
        setKodeKecamatan(match.kode);
      }
    }
  }, [kecList, formData.kecamatan]);

  // 4. Fetch Kelurahan List
  useEffect(() => {
    if (!kodeKecamatan) {
      setKelList([]);
      return;
    }
    const fetchKel = async () => {
      setLoadingKel(true);
      try {
        const res = await postData(`/master/wilayah/kelurahan?kode_kecamatan=${kodeKecamatan}`, {
          kode_kecamatan: kodeKecamatan,
          id_kecamatan: kodeKecamatan,
        });
        if (['00', '0000'].includes(res.data?.status) && Array.isArray(res.data.data)) {
          const list = res.data.data.map((item: any) => ({
            kode: String(item.kode || item.id),
            nama: String(item.nama || item.name),
          }));
          setKelList(list);
        }
      } catch (err) {
        showError(toast, 'Gagal memuat kelurahan/desa');
      } finally {
        setLoadingKel(false);
      }
    };
    fetchKel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kodeKecamatan]);

  // Dropdown Handlers
  const handleProvChange = (selectedKode: string) => {
    const selectedObj = provList.find((p) => p.kode === selectedKode);
    setKodeProvinsi(selectedKode);
    setFormData((prev) => ({
      ...prev,
      provinsi: selectedObj ? selectedObj.nama : '',
      kota_kabupaten: '',
      kecamatan: '',
      kelurahan_desa: '',
    }));
    setKodeKota('');
    setKodeKecamatan('');
    setKotaList([]);
    setKecList([]);
    setKelList([]);
  };

  const handleKotaChange = (selectedKode: string) => {
    const selectedObj = kotaList.find((k) => k.kode === selectedKode);
    setKodeKota(selectedKode);
    setFormData((prev) => ({
      ...prev,
      kota_kabupaten: selectedObj ? selectedObj.nama : '',
      kecamatan: '',
      kelurahan_desa: '',
    }));
    setKodeKecamatan('');
    setKecList([]);
    setKelList([]);
  };

  const handleKecChange = (selectedKode: string) => {
    const selectedObj = kecList.find((c) => c.kode === selectedKode);
    setKodeKecamatan(selectedKode);
    setFormData((prev) => ({
      ...prev,
      kecamatan: selectedObj ? selectedObj.nama : '',
      kelurahan_desa: '',
    }));
    setKelList([]);
  };

  const handleKelChange = (selectedKode: string) => {
    const selectedObj = kelList.find((l) => l.kode === selectedKode);
    setFormData((prev) => ({
      ...prev,
      kelurahan_desa: selectedObj ? selectedObj.nama : '',
    }));
  };

  const handleChange = (field: keyof PasienFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /** Logika yang dijalankan saat menekan Enter atau tombol Selanjutnya/Submit */
  const handleNextOrSubmit = () => {
    // Tandai tab aktif saat ini sudah divalidasi
    setSubmittedTabs((prev) => new Set(prev).add(activeFormTab));
    if (activeFormTab < 3) {
      // Validasi per-tab sebelum lanjut
      if (activeFormTab === 0 && (!formData.nama.trim() || !formData.tanggal_lahir)) {
        if (!formData.nama.trim()) showError(toast, 'Nama Pasien wajib diisi');
        else if (!formData.tanggal_lahir) showError(toast, 'Tanggal Lahir wajib diisi');
        return;
      }
      if (activeFormTab === 2 && !formData.no_hp.trim()) {
        showError(toast, 'Nomor HP (WhatsApp) wajib diisi');
        return;
      }
      setActiveFormTab((prev) => Math.min(3, prev + 1));
    } else {
      // Tab terakhir: submit
      handleSubmit(true);
    }
  };

  const handleSubmit = async (proceedToLayanan: boolean = true) => {
    // Tandai semua tab sudah divalidasi
    setSubmittedTabs(new Set([0, 1, 2, 3]));
    if (!formData.nama.trim()) {
      showError(toast, 'Nama pasien wajib diisi');
      setActiveFormTab(0);
      return;
    }
    if (!formData.no_hp.trim()) {
      showError(toast, 'Nomor HP pasien wajib diisi');
      setActiveFormTab(2);
      return;
    }
    if (!formData.tanggal_lahir) {
      showError(toast, 'Tanggal lahir wajib diisi');
      setActiveFormTab(0);
      return;
    }

    if (formData.nik && formData.nik.trim().length !== 16) {
      showError(toast, 'NIK harus terdiri dari 16 digit angka');
      setActiveFormTab(0);
      return;
    }

    setLoading(true);
    try {
      const formattedDate = formData.tanggal_lahir instanceof Date
        ? formData.tanggal_lahir.toISOString().slice(0, 10)
        : formData.tanggal_lahir;

      const payload = {
        ...formData,
        tanggal_lahir: formattedDate,
      };

      const isEdit = Boolean(formData.id || formData.no_rm);
      const endpoint = isEdit ? apiPasienUpdate : apiPasienCreate;
      const res = await postData(endpoint, payload);

      if (['00', '0000'].includes(res.data.status)) {
        showSuccess(toast, res.data.message || 'Data pasien berhasil disimpan');
        const resultData = res.data?.data || {
          ...formData,
          no_rm: formData.no_rm || payload.no_rm,
        };
        resultData.proceedToLayanan = proceedToLayanan && !hidePilihLayanan;
        onSuccess(resultData);
      } else {
        showError(toast, res.data.message || 'Gagal menyimpan data pasien');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Terjadi kesalahan sistem';
      showError(toast, msg);
    } finally {
      setLoading(false);
    }
  };

  const jenisKelaminOptions = [
    { label: 'Laki-laki', value: 'L' },
    { label: 'Perempuan', value: 'P' },
  ];

  const golDarahOptions = [
    { label: 'Belum Tahu / -', value: '-' },
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'AB', value: 'AB' },
    { label: 'O', value: 'O' },
  ];

  const agamaOptions = [
    { label: 'Islam', value: 'Islam' },
    { label: 'Kristen', value: 'Kristen' },
    { label: 'Katolik', value: 'Katolik' },
    { label: 'Hindu', value: 'Hindu' },
    { label: 'Buddha', value: 'Buddha' },
    { label: 'Konghucu', value: 'Konghucu' },
    { label: 'Lainnya', value: 'Lainnya' },
  ];

  const statusNikahOptions = [
    { label: 'Belum Menikah', value: 'belum_menikah' },
    { label: 'Menikah', value: 'menikah' },
    { label: 'Cerai Hidup', value: 'cerai_hidup' },
    { label: 'Cerai Mati', value: 'cerai_mati' },
  ];

  const kewarganegaraanOptions = [
    { label: 'WNI (Warga Negara Indonesia)', value: 'WNI' },
    { label: 'WNA (Warga Negara Asing)', value: 'WNA' },
  ];

  const pekerjaanOptions = [
    { label: 'Karyawan Swasta', value: 'Karyawan Swasta' },
    { label: 'PNS / ASN', value: 'PNS / ASN' },
    { label: 'Wiraswasta / Pengusaha', value: 'Wiraswasta / Pengusaha' },
    { label: 'Ibu Rumah Tangga', value: 'Ibu Rumah Tangga' },
    { label: 'Pelajar / Mahasiswa', value: 'Pelajar / Mahasiswa' },
    { label: 'Dokter / Tenaga Kesehatan', value: 'Dokter / Tenaga Kesehatan' },
    { label: 'TNI / POLRI', value: 'TNI / POLRI' },
    { label: 'Professional / Konsultan', value: 'Professional / Konsultan' },
    { label: 'Buruh / Pekerja Harian', value: 'Buruh / Pekerja Harian' },
    { label: 'Pensiunan', value: 'Pensiunan' },
    { label: 'Belum / Tidak Bekerja', value: 'Belum / Tidak Bekerja' },
    { label: 'Lainnya', value: 'Lainnya' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Hanya aktifkan Enter dari elemen input text biasa (bukan Dropdown/Calendar/Textarea)
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (
      e.key === 'Enter' &&
      tag === 'input' &&
      !target.closest('.p-calendar') &&
      !target.closest('.p-dropdown')
    ) {
      e.preventDefault();
      handleNextOrSubmit();
    }
  };

  return (
    <div
      className={hideHeader ? 'p-1' : 'surface-card p-4 border-round-xl border-1 surface-border shadow-1 mb-4'}
      onKeyDown={handleKeyDown}
    >
      {/* FORM CARD HEADER */}
      {!hideHeader && (
        <div className="flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
              <i className="pi pi-user-edit text-blue-600 text-2xl" />
              {formData.no_rm ? `Edit Profile Pasien (${formData.no_rm})` : 'Form Pendaftaran Pasien Baru'}
            </h3>
            <p className="text-500 text-sm m-0">
              Isi formulir rekam medis pasien secara lengkap di bawah ini.
            </p>
          </div>

          {formData.no_rm && (
            <Tag value={`No. RM: ${formData.no_rm}`} severity="info" className="text-sm px-3 py-2 font-bold" />
          )}
        </div>
      )}

      <TabView activeIndex={activeFormTab} onTabChange={(e) => setActiveFormTab(e.index)}>
        {/* TAB 1: DATA DIRI */}
        <TabPanel header="Data Diri" leftIcon="pi pi-user mr-2">
          <div className="grid p-fluid mt-2">
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Nama Lengkap <span className="text-red-500">*</span></label>
              <InputText
                value={formData.nama}
                onChange={(e) => handleChange('nama', e.target.value)}
                placeholder="Masukkan nama lengkap pasien"
                invalid={submittedTabs.has(0) && !formData.nama.trim()}
                className={submittedTabs.has(0) && !formData.nama.trim() ? 'p-invalid border-1 border-red-500 w-full' : 'w-full'}
              />
              {submittedTabs.has(0) && !formData.nama.trim() && (
                <small className="p-error text-red-500 font-semibold block mt-1">Nama lengkap wajib diisi.</small>
              )}
            </div>
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">NIK (16 Digit)</label>
              <InputText
                value={formData.nik}
                onChange={(e) => handleChange('nik', e.target.value)}
                placeholder="3515xxxxxxxxxxxx"
                maxLength={16}
                invalid={submittedTabs.has(0) && Boolean(formData.nik && formData.nik.trim().length !== 16)}
                className={submittedTabs.has(0) && formData.nik && formData.nik.trim().length !== 16 ? 'p-invalid border-1 border-red-500 w-full' : 'w-full'}
              />
              {submittedTabs.has(0) && formData.nik && formData.nik.trim().length !== 16 && (
                <small className="p-error text-red-500 font-semibold block mt-1">NIK harus 16 digit angka.</small>
              )}
            </div>

            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Tempat Lahir</label>
              <InputText
                value={formData.tempat_lahir}
                onChange={(e) => handleChange('tempat_lahir', e.target.value)}
                placeholder="Kota tempat lahir"
              />
            </div>
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Tanggal Lahir <span className="text-red-500">*</span></label>
              <Calendar
                value={formData.tanggal_lahir as Date}
                onChange={(e) => handleChange('tanggal_lahir', e.value)}
                dateFormat="yy-mm-dd"
                maxDate={new Date()}
                showIcon
                placeholder="YYYY-MM-DD"
                invalid={submittedTabs.has(0) && !formData.tanggal_lahir}
                className={submittedTabs.has(0) && !formData.tanggal_lahir ? 'p-invalid border-1 border-red-500 border-round w-full' : 'w-full'}
              />
              {submittedTabs.has(0) && !formData.tanggal_lahir && (
                <small className="p-error text-red-500 font-semibold block mt-1">Tanggal lahir wajib diisi.</small>
              )}
            </div>

            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Jenis Kelamin <span className="text-red-500">*</span></label>
              <Dropdown
                value={formData.jenis_kelamin}
                options={jenisKelaminOptions}
                onChange={(e) => handleChange('jenis_kelamin', e.value)}
              />
            </div>
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Golongan Darah</label>
              <Dropdown
                value={formData.golongan_darah}
                options={golDarahOptions}
                onChange={(e) => handleChange('golongan_darah', e.value)}
                placeholder="Pilih Golongan Darah"
              />
            </div>

            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">Agama</label>
              <Dropdown
                value={formData.agama}
                options={agamaOptions}
                onChange={(e) => handleChange('agama', e.value)}
              />
            </div>
            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">Status Perkawinan</label>
              <Dropdown
                value={formData.status_perkawinan}
                options={statusNikahOptions}
                onChange={(e) => handleChange('status_perkawinan', e.value)}
              />
            </div>
            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">Kewarganegaraan</label>
              <Dropdown
                value={formData.kewarganegaraan}
                options={kewarganegaraanOptions}
                onChange={(e) => handleChange('kewarganegaraan', e.value)}
              />
            </div>

            <div className={formData.pekerjaan && !pekerjaanOptions.some((o) => o.value !== 'Lainnya' && o.value === formData.pekerjaan) ? "col-12 md:col-6 field" : "col-12 field"}>
              <label className="font-semibold text-900">Pekerjaan</label>
              <Dropdown
                value={
                  pekerjaanOptions.some((o) => o.value !== 'Lainnya' && o.value === formData.pekerjaan)
                    ? formData.pekerjaan
                    : (formData.pekerjaan ? 'Lainnya' : '')
                }
                options={pekerjaanOptions}
                onChange={(e) => {
                  if (e.value === 'Lainnya') {
                    handleChange('pekerjaan', 'Lainnya');
                  } else {
                    handleChange('pekerjaan', e.value || '');
                  }
                }}
                placeholder="Pilih Pekerjaan"
                filter
                showClear
              />
            </div>

            {(!formData.pekerjaan || !pekerjaanOptions.some((o) => o.value !== 'Lainnya' && o.value === formData.pekerjaan)) && formData.pekerjaan !== '' && (
              <div className="col-12 md:col-6 field">
                <label className="font-semibold text-900">Ketik Pekerjaan Lainnya</label>
                <InputText
                  value={formData.pekerjaan === 'Lainnya' ? '' : formData.pekerjaan}
                  onChange={(e) => handleChange('pekerjaan', e.target.value || 'Lainnya')}
                  placeholder="Ketik detail pekerjaan..."
                />
              </div>
            )}
          </div>
        </TabPanel>

        {/* TAB 2: ALAMAT CASCADING DROPDOWNS */}
        <TabPanel header="Alamat" leftIcon="pi pi-map-marker mr-2">
          <div className="grid p-fluid mt-2">
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Provinsi</label>
              <Dropdown
                value={kodeProvinsi}
                options={provList.map((p) => ({ label: p.nama, value: p.kode }))}
                onChange={(e) => handleProvChange(e.value)}
                placeholder="Pilih Provinsi"
                filter
                showClear
                loading={loadingProv}
              />
            </div>

            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Kota / Kabupaten</label>
              <Dropdown
                value={kodeKota}
                options={kotaList.map((k) => ({ label: k.nama, value: k.kode }))}
                onChange={(e) => handleKotaChange(e.value)}
                placeholder={!kodeProvinsi ? 'Pilih Provinsi terlebih dahulu' : 'Pilih Kota / Kabupaten'}
                disabled={!kodeProvinsi}
                filter
                showClear
                loading={loadingKota}
              />
            </div>

            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Kecamatan</label>
              <Dropdown
                value={kodeKecamatan}
                options={kecList.map((c) => ({ label: c.nama, value: c.kode }))}
                onChange={(e) => handleKecChange(e.value)}
                placeholder={!kodeKota ? 'Pilih Kota/Kabupaten terlebih dahulu' : 'Pilih Kecamatan'}
                disabled={!kodeKota}
                filter
                showClear
                loading={loadingKec}
              />
            </div>

            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Kelurahan / Desa</label>
              <Dropdown
                value={kelList.find((l) => l.nama.trim().toLowerCase() === (formData.kelurahan_desa || '').trim().toLowerCase())?.kode || ''}
                options={kelList.map((l) => ({ label: l.nama, value: l.kode }))}
                onChange={(e) => handleKelChange(e.value)}
                placeholder={!kodeKecamatan ? 'Pilih Kecamatan terlebih dahulu' : 'Pilih Kelurahan / Desa'}
                disabled={!kodeKecamatan}
                filter
                showClear
                loading={loadingKel}
              />
            </div>

            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">Kode Pos</label>
              <InputText
                value={formData.kode_pos}
                onChange={(e) => handleChange('kode_pos', e.target.value)}
                placeholder="60123"
              />
            </div>

            <div className="col-12 md:col-8 field">
              <label className="font-semibold text-900">Patokan / Alamat Detail</label>
              <InputText
                value={formData.patokan}
                onChange={(e) => handleChange('patokan', e.target.value)}
                placeholder="Depan Masjid / Jalan Utama No. 12"
              />
            </div>
          </div>
        </TabPanel>

        {/* TAB 3: KONTAK */}
        <TabPanel header="Kontak & Darurat" leftIcon="pi pi-phone mr-2">
          <div className="grid p-fluid mt-2">
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">No. HP (WhatsApp) <span className="text-red-500">*</span></label>
              <InputText
                value={formData.no_hp}
                onChange={(e) => handleChange('no_hp', e.target.value)}
                placeholder="081234567890"
                invalid={submittedTabs.has(2) && !formData.no_hp.trim()}
                className={submittedTabs.has(2) && !formData.no_hp.trim() ? 'p-invalid border-1 border-red-500 w-full' : 'w-full'}
              />
              {submittedTabs.has(2) && !formData.no_hp.trim() && (
                <small className="p-error text-red-500 font-semibold block mt-1">Nomor HP wajib diisi.</small>
              )}
            </div>
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Email</label>
              <InputText
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="pasien@gmail.com"
              />
            </div>

            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">Nama Kontak Darurat</label>
              <InputText
                value={formData.nama_kontak_darurat}
                onChange={(e) => handleChange('nama_kontak_darurat', e.target.value)}
                placeholder="Nama penanggung jawab"
              />
            </div>
            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">No. HP Kontak Darurat</label>
              <InputText
                value={formData.no_hp_kontak_darurat}
                onChange={(e) => handleChange('no_hp_kontak_darurat', e.target.value)}
                placeholder="081234567890"
              />
            </div>
            <div className="col-12 md:col-4 field">
              <label className="font-semibold text-900">Hubungan Kontak</label>
              <InputText
                value={formData.hubungan_kontak_darurat}
                onChange={(e) => handleChange('hubungan_kontak_darurat', e.target.value)}
                placeholder="Orang Tua / Suami / Istri / Anak"
              />
            </div>
          </div>
        </TabPanel>

        {/* TAB 4: ALERGI & RIWAYAT */}
        <TabPanel header="Alergi" leftIcon="pi pi-exclamation-triangle mr-2">
          <div className="grid p-fluid mt-2">
            <div className="col-12 field">
              <label className="font-semibold text-900">Riwayat Alergi (Obat / Makanan / Kosmetik)</label>
              <InputTextarea
                rows={4}
                value={formData.alergi}
                onChange={(e) => handleChange('alergi', e.target.value)}
                placeholder="Tuliskan alergi pasien jika ada (contoh: Alergi Parasetamol, Seafood, dll)"
              />
            </div>
          </div>
        </TabPanel>
      </TabView>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-content-between align-items-center gap-3 mt-4 pt-3 border-top-1 surface-border flex-wrap">
        <div className="flex gap-2">
          {onCancel && (
            <Button
              label={formData.no_rm ? 'Batal Edit' : 'Batal'}
              icon="pi pi-times"
              outlined
              severity="secondary"
              className="border-round-lg font-bold"
              onClick={onCancel}
              disabled={loading}
              type="button"
            />
          )}

          {activeFormTab > 0 && (
            <Button
              label="Kembali"
              icon="pi pi-arrow-left"
              outlined
              severity="secondary"
              className="border-round-lg font-bold"
              onClick={() => setActiveFormTab((prev) => Math.max(0, prev - 1))}
              type="button"
            />
          )}
        </div>

        <div className="flex gap-2 flex-wrap align-items-center">
          {activeFormTab < 3 ? (
            <Button
              label="Selanjutnya"
              icon="pi pi-arrow-right"
              iconPos="right"
              className="p-button-primary border-round-lg font-bold"
              onClick={handleNextOrSubmit}
              type="button"
            />
          ) : formData.no_rm ? (
            <>
              <Button
                label="Simpan Perubahan"
                icon="pi pi-save"
                outlined
                severity="info"
                className="border-round-lg font-bold"
                onClick={() => {
                  setSubmittedTabs(new Set([0, 1, 2, 3]));
                  handleSubmit(false);
                }}
                loading={loading}
                type="button"
              />
              {!hidePilihLayanan && (
                <Button
                  label="Simpan Perubahan & Pilih Layanan"
                  icon="pi pi-check-circle"
                  severity="success"
                  className="border-round-lg font-bold"
                  onClick={() => {
                    setSubmittedTabs(new Set([0, 1, 2, 3]));
                    handleSubmit(true);
                  }}
                  loading={loading}
                  type="button"
                />
              )}
            </>
          ) : (
            <Button
              label={submitLabel || (hidePilihLayanan ? 'Daftarkan Pasien Baru' : 'Daftarkan Pasien Baru & Lanjut Pilih Layanan')}
              icon="pi pi-check"
              className="p-button-success border-round-lg font-bold"
              onClick={() => {
                setSubmittedTabs(new Set([0, 1, 2, 3]));
                handleSubmit(!hidePilihLayanan);
              }}
              loading={loading}
              type="button"
            />
          )}
        </div>
      </div>
    </div>
  );
};
