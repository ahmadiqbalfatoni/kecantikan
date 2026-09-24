'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiPasienCreate, apiPasienUpdate } from '../endpoints';

interface PasienFormData {
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
  status?: string;
}

interface Props {
  visible: boolean;
  onHide: () => void;
  initialData?: Partial<PasienFormData> | null;
  onSuccess: (resultData: any) => void;
  toast: React.RefObject<Toast>;
  title?: string;
  submitLabel?: string;
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
  pekerjaan: 'Karyawan Swasta',
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
  status: 'aktif',
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
    status: data.status || 'aktif',
  };
};

export const PasienFormDialog: React.FC<Props> = ({
  visible,
  onHide,
  initialData,
  onSuccess,
  toast,
  title,
  submitLabel,
}) => {
  const [formData, setFormData] = useState<PasienFormData>(sanitizeFormData(initialData));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Selected Region Codes (for cascading API queries)
  const [kodeProvinsi, setKodeProvinsi] = useState<string>('');
  const [kodeKota, setKodeKota] = useState<string>('');
  const [kodeKecamatan, setKodeKecamatan] = useState<string>('');

  // Dropdown Lists from API
  const [provList, setProvList] = useState<{ kode: string; nama: string }[]>([]);
  const [kotaList, setKotaList] = useState<{ kode: string; nama: string }[]>([]);
  const [kecList, setKecList] = useState<{ kode: string; nama: string }[]>([]);
  const [kelList, setKelList] = useState<{ kode: string; nama: string }[]>([]);

  // Loading states per dropdown level
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingKota, setLoadingKota] = useState(false);
  const [loadingKec, setLoadingKec] = useState(false);
  const [loadingKel, setLoadingKel] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(sanitizeFormData(initialData));
    } else {
      setFormData(defaultFormData);
      setKodeProvinsi('');
      setKodeKota('');
      setKodeKecamatan('');
    }
  }, [initialData, visible]);

  // 1. Fetch Provinsi List when modal opens
  useEffect(() => {
    if (!visible) return;
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

          if (formData.provinsi) {
            const match = list.find(
              (p: any) => p.nama.toLowerCase() === formData.provinsi.toLowerCase()
            );
            if (match) setKodeProvinsi(match.kode);
          }
        }
      } catch (err) {
        showError(toast, 'Gagal memuat data provinsi');
      } finally {
        setLoadingProv(false);
      }
    };
    fetchProv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 2. Fetch Kota / Kabupaten when kodeProvinsi changes
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

          if (formData.kota_kabupaten) {
            const match = list.find(
              (k: any) => k.nama.toLowerCase() === formData.kota_kabupaten.toLowerCase()
            );
            if (match) setKodeKota(match.kode);
          }
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

  // 3. Fetch Kecamatan when kodeKota changes
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

          if (formData.kecamatan) {
            const match = list.find(
              (c: any) => c.nama.toLowerCase() === formData.kecamatan.toLowerCase()
            );
            if (match) setKodeKecamatan(match.kode);
          }
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

  // 4. Fetch Kelurahan when kodeKecamatan changes
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

  // Handlers for Dropdown Cascade with Automatic Reset
  const handleProvChange = (selectedKode: string) => {
    const selectedObj = provList.find((p) => p.kode === selectedKode);
    const namaVal = selectedObj ? selectedObj.nama : '';

    setKodeProvinsi(selectedKode);
    setFormData((prev) => ({
      ...prev,
      provinsi: namaVal,
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
    const namaVal = selectedObj ? selectedObj.nama : '';

    setKodeKota(selectedKode);
    setFormData((prev) => ({
      ...prev,
      kota_kabupaten: namaVal,
      kecamatan: '',
      kelurahan_desa: '',
    }));
    setKodeKecamatan('');
    setKecList([]);
    setKelList([]);
  };

  const handleKecChange = (selectedKode: string) => {
    const selectedObj = kecList.find((c) => c.kode === selectedKode);
    const namaVal = selectedObj ? selectedObj.nama : '';

    setKodeKecamatan(selectedKode);
    setFormData((prev) => ({
      ...prev,
      kecamatan: namaVal,
      kelurahan_desa: '',
    }));
    setKelList([]);
  };

  const handleKelChange = (selectedKode: string) => {
    const selectedObj = kelList.find((l) => l.kode === selectedKode);
    const namaVal = selectedObj ? selectedObj.nama : '';

    setFormData((prev) => ({
      ...prev,
      kelurahan_desa: namaVal,
    }));
  };

  const handleChange = (field: keyof PasienFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.nama.trim()) {
      showError(toast, 'Nama pasien wajib diisi');
      setActiveTab(0);
      return;
    }
    if (!formData.no_hp.trim()) {
      showError(toast, 'Nomor HP pasien wajib diisi');
      setActiveTab(2);
      return;
    }
    if (!formData.tanggal_lahir) {
      showError(toast, 'Tanggal lahir wajib diisi');
      setActiveTab(0);
      return;
    }

    if (formData.nik && formData.nik.trim().length !== 16) {
      showError(toast, 'NIK harus terdiri dari 16 digit angka');
      setActiveTab(0);
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

      const endpoint = formData.id || formData.no_rm ? apiPasienUpdate : apiPasienCreate;
      const res = await postData(endpoint, payload);

      if (['00', '0000'].includes(res.data.status)) {
        showSuccess(toast, res.data.message || 'Pendaftaran berhasil');
        onSuccess(res.data.data);
        onHide();
      } else {
        showError(toast, res.data.message || 'Gagal mendaftarkan pasien');
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

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={title || (formData.no_rm ? `Edit Profil Pasien (${formData.no_rm})` : 'Pendaftaran Pasien Baru')}
      style={{ width: '800px' }}
      modal
      className="p-fluid"
      footer={
        <div className="flex justify-content-between align-items-center gap-2">
          <div>
            {activeTab > 0 && (
              <Button
                label="Kembali"
                icon="pi pi-arrow-left"
                className="p-button-outlined p-button-secondary font-bold"
                onClick={() => setActiveTab((prev) => Math.max(0, prev - 1))}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              label="Batal"
              icon="pi pi-times"
              className="p-button-outlined p-button-secondary font-bold"
              onClick={onHide}
              disabled={loading}
            />
            {activeTab < 3 ? (
              <Button
                label="Selanjutnya"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="p-button-primary font-bold"
                onClick={() => {
                  if (activeTab === 0 && !formData.nama.trim()) {
                    showError(toast, 'Nama Pasien wajib diisi');
                    return;
                  }
                  if (activeTab === 2 && !formData.no_hp.trim()) {
                    showError(toast, 'Nomor HP (WhatsApp) wajib diisi');
                    return;
                  }
                  setActiveTab((prev) => Math.min(3, prev + 1));
                }}
              />
            ) : (
              <Button
                label={submitLabel || (formData.no_rm ? 'Simpan Perubahan' : 'Daftarkan Pasien & Lanjut Pilih Layanan')}
                icon="pi pi-check"
                className="p-button-success font-bold"
                onClick={handleSubmit}
                loading={loading}
              />
            )}
          </div>
        </div>
      }
    >
      <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
        {/* TAB 1: DATA DIRI */}
        <TabPanel header="Data Diri" leftIcon="pi pi-user mr-2">
          <div className="grid p-fluid mt-1">
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Nama Lengkap <span className="text-red-500">*</span></label>
              <InputText
                value={formData.nama}
                onChange={(e) => handleChange('nama', e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">NIK (16 Digit)</label>
              <InputText
                value={formData.nik}
                onChange={(e) => handleChange('nik', e.target.value)}
                placeholder="3515xxxxxxxxxxxx"
                maxLength={16}
              />
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
              />
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

            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">Status Pasien</label>
              <Dropdown
                value={formData.status || 'aktif'}
                options={[
                  { label: 'Aktif', value: 'aktif' },
                  { label: 'Tidak Aktif', value: 'tidak aktif' },
                ]}
                onChange={(e) => handleChange('status', e.value)}
              />
            </div>
          </div>
        </TabPanel>

        {/* TAB 2: ALAMAT CASCADING DROPDOWNS (PROVINSI -> KOTA -> KECAMATAN -> KELURAHAN) */}
        <TabPanel header="Alamat" leftIcon="pi pi-map-marker mr-2">
          <div className="grid p-fluid mt-1">
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
                value={kelList.find((l) => l.nama === formData.kelurahan_desa)?.kode || ''}
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
          <div className="grid p-fluid mt-1">
            <div className="col-12 md:col-6 field">
              <label className="font-semibold text-900">No. HP (WhatsApp) <span className="text-red-500">*</span></label>
              <InputText
                value={formData.no_hp}
                onChange={(e) => handleChange('no_hp', e.target.value)}
                placeholder="081234567890"
              />
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
          <div className="grid p-fluid mt-1">
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
    </Dialog>
  );
};
