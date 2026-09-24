'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { Divider } from 'primereact/divider';
import { Checkbox } from 'primereact/checkbox';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { useSession } from 'next-auth/react';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';

interface UserRecord {
  id?: number;
  user_code: string;
  username: string;
  fullname: string;
  telp: string;
  role: string;
  kode_cabang?: string | null;
  nama_cabang?: string | null;
  status: string | number;
  created_at?: string;
}

const SUPERADMIN_ROLE_OPTIONS = [
  { label: 'Owner / Manager', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Dokter', value: 'dokter' },
  { label: 'Beautician / Terapis', value: 'beautician' },
  { label: 'Kasir', value: 'kasir' },
  { label: 'Warehouse / Logistik', value: 'warehouse' },
  { label: 'Superadmin / IT', value: 'superadmin' },
];

const MANAGER_ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Beautician / Terapis', value: 'beautician' },
  { label: 'Kasir', value: 'kasir' },
  { label: 'Warehouse / Logistik', value: 'warehouse' },
  { label: 'Dokter', value: 'dokter' },
];

const STATUS_OPTIONS = [
  { label: 'Aktif', value: '1' },
  { label: 'Tidak Aktif', value: '0' },
];

interface PermissionModule {
  id: string;
  label: string;
  to: string;
  icon: string;
  desc: string;
}

interface PermissionCategory {
  category: string;
  icon: string;
  items: PermissionModule[];
}

const AVAILABLE_MODULE_CATEGORIES: PermissionCategory[] = [
  {
    category: 'Layanan & Tindakan',
    icon: 'pi pi-sparkles',
    items: [
      { id: 'tindakan', label: 'Tindakan Perawatan', to: '/pendaftaran-antrean/antrean?type=layanan', icon: 'pi pi-sparkles', desc: 'Antrean & pengerjaan tindakan ruangan estetika' },
      { id: 'konsul', label: 'Konsultasi Medis', to: '/pendaftaran-antrean/antrean?type=konsul', icon: 'pi pi-comments', desc: 'Antrean & konsultasi anamnesa dokter' },
      { id: 'antrean_ruangan', label: 'Antrean Ruangan', to: '/pendaftaran-antrean/antrean', icon: 'pi pi-calendar-times', desc: 'Monitoring antrean seluruh ruangan klinik' },
      { id: 'jadwal_karyawan_layanan', label: 'Jadwal Karyawan', to: '/pendaftaran-antrean/jadwal-karyawan', icon: 'pi pi-calendar', desc: 'Melihat jadwal shift tugas dokter, terapis & staf klinik' },
    ]
  },
  {
    category: 'Kasir & Pembayaran',
    icon: 'pi pi-calculator',
    items: [
      { id: 'kasir', label: 'Kasir Pembayaran', to: '/kasir', icon: 'pi pi-calculator', desc: 'Transaksi pembayaran kasir, invoice, dan pelunasan' },
    ]
  },
  {
    category: 'Pendaftaran & Pasien',
    icon: 'pi pi-calendar',
    items: [
      { id: 'antrian_awal', label: 'Antrean Pendaftaran', to: '/antrian-awal', icon: 'pi pi-ticket', desc: 'Display pemanggilan nomor tiket antrean awal' },
      { id: 'registrasi_pasien', label: 'Pasien Baru', to: '/pendaftaran-antrean/registrasi-pasien', icon: 'pi pi-user-plus', desc: 'Pendaftaran dan registrasi identitas pasien baru' },
      { id: 'pendaftaran_pasien', label: 'Pendaftaran Kunjungan & Booking', to: '/pendaftaran-antrean/pendaftaran-pasien', icon: 'pi pi-calendar', desc: 'Check-in kunjungan harian & booking konsultasi/layanan' },
      { id: 'data_pasien', label: 'Data Pasien', to: '/master-data-user/data-pasien', icon: 'pi pi-user', desc: 'Katalog profil lengkap & riwayat data pasien' },
    ]
  },
  {
    category: 'Promo & Diskon',
    icon: 'pi pi-percentage',
    items: [
      { id: 'promo', label: 'Data Promo', to: '/master-data/promo', icon: 'pi pi-percentage', desc: 'Daftar promo & potongan harga klinik' },
      { id: 'detail_promo', label: 'Detail Promo', to: '/master-data/detail-promo', icon: 'pi pi-tags', desc: 'Ketentuan dan rincian diskon promo klinik' },
    ]
  },
  {
    category: 'Logistik, Produk & Inventori',
    icon: 'pi pi-box',
    items: [
      { id: 'kategori_produk', label: 'Kategori Produk', to: '/master-data/kategori-produk', icon: 'pi pi-tags', desc: 'Kategori produk skincare, obat, dan bahan' },
      { id: 'produk', label: 'Data Produk', to: '/master-data/produk', icon: 'pi pi-box', desc: 'Katalog produk & master harga jual/beli' },
      { id: 'paket_produk', label: 'Paket Produk', to: '/master-data/paket-produk', icon: 'pi pi-inbox', desc: 'Bundling paket produk skincare' },
      { id: 'inventori', label: 'Stok Inventori', to: '/master-data/inventori', icon: 'pi pi-box', desc: 'Monitoring saldo stok, mutasi & opname gudang' },
      { id: 'supplier', label: 'Supplier & Vendor', to: '/master-data/supplier', icon: 'pi pi-truck', desc: 'Daftar vendor dan supplier pengadaan klinik' },
      { id: 'alat', label: 'Alat & Peralatan', to: '/master-data/alat', icon: 'pi pi-wrench', desc: 'Daftar mesin estetika dan peralatan medis' },
    ]
  },
  {
    category: 'Referensi Layanan & Jadwal',
    icon: 'pi pi-briefcase',
    items: [
      { id: 'layanan', label: 'Data Layanan', to: '/master-data/layanan', icon: 'pi pi-briefcase', desc: 'Katalog tindakan dan treatment klinik' },
      { id: 'paket_layanan', label: 'Paket Layanan', to: '/master-data/paket-layanan', icon: 'pi pi-box', desc: 'Paket bundling layanan treatment estetika' },
      { id: 'jadwal_karyawan', label: 'Jadwal Karyawan', to: '/master-data/jadwal-karyawan', icon: 'pi pi-calendar-times', desc: 'Jadwal shift kerja & praktik dokter/staf' },
    ]
  },
  {
    category: 'Laporan & Rekam Medis',
    icon: 'pi pi-file',
    items: [
      { id: 'laporan', label: 'Laporan & Rekam Medis', to: '/riwayat/rekam-medis', icon: 'pi pi-file', desc: 'Laporan analitik, transaksi & rekam medis klinik' },
    ]
  },
];

const ROLE_PRESET_PATHS: Record<string, string[]> = {
  admin: [
    '/antrian-awal',
    '/pendaftaran-antrean/registrasi-pasien',
    '/pendaftaran-antrean/pendaftaran-pasien',
    '/master-data-user/data-pasien',
    '/pendaftaran-antrean/jadwal-karyawan',
  ],
  beautician: [
    '/pendaftaran-antrean/antrean?type=layanan',
    '/pendaftaran-antrean/antrean',
    '/pendaftaran-antrean/jadwal-karyawan',
    '/riwayat/rekam-medis',
    '/master-data/layanan',
    '/master-data/jadwal-karyawan',
  ],
  kasir: [
    '/kasir',
    '/master-data/promo',
    '/master-data/detail-promo',
    '/riwayat/rekam-medis',
  ],
  warehouse: [
    '/master-data/kategori-produk',
    '/master-data/produk',
    '/master-data/paket-produk',
    '/master-data/inventori',
    '/master-data/supplier',
    '/master-data/alat',
    '/riwayat/rekam-medis',
  ],
  dokter: [
    '/pendaftaran-antrean/antrean?type=konsul',
    '/pendaftaran-antrean/antrean?type=layanan',
    '/pendaftaran-antrean/antrean',
    '/pendaftaran-antrean/jadwal-karyawan',
    '/master-data-user/data-pasien',
    '/riwayat/rekam-medis',
    '/master-data/layanan',
    '/master-data/paket-layanan',
    '/master-data/jadwal-karyawan',
  ],
  owner: [
    '/master-data/kategori-layanan',
    '/master-data/layanan',
    '/master-data/paket-layanan',
    '/master-data/kategori-produk',
    '/master-data/produk',
    '/master-data/paket-produk',
    '/master-data/inventori',
    '/master-data/supplier',
    '/master-data/karyawan',
    '/master-data/jadwal-karyawan',
    '/master-data/alat',
    '/master-data/ruangan',
    '/master-data/promo',
    '/master-data/detail-promo',
    '/antrian-awal',
    '/pendaftaran-antrean/registrasi-pasien',
    '/pendaftaran-antrean/pendaftaran-pasien',
    '/master-data-user/data-pasien',
    '/pendaftaran-antrean/antrean?type=layanan',
    '/pendaftaran-antrean/antrean?type=konsul',
    '/pendaftaran-antrean/antrean',
    '/pendaftaran-antrean/jadwal-karyawan',
    '/kasir',
    '/riwayat/rekam-medis',
    '/setup/config',
    '/setup/users',
  ],
};

const buildMenuFromSelectedPaths = (
  selectedPaths: Set<string>,
  selectedTindakanRooms: Set<string>,
  selectedKonsulRooms: Set<string>,
  tindakanRooms: any[],
  konsulRooms: any[]
) => {
  const resultMenu: any[] = [
    {
      label: 'HOME',
      icon: 'pi pi-fw pi-home',
      items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/dashboard' }],
    },
  ];

  AVAILABLE_MODULE_CATEGORIES.forEach((cat) => {
    const matchingItems = cat.items.filter((it) => selectedPaths.has(it.to));
    if (matchingItems.length > 0) {
      resultMenu.push({
        label: cat.category,
        icon: cat.icon,
        items: matchingItems.map((it) => {
          const itemObj: any = {
            label: it.label,
            icon: it.icon,
            to: it.to,
          };

          // Rincian Ruangan Tindakan
          if (it.to.includes('type=layanan')) {
            const isAll = selectedTindakanRooms.size === 0 || selectedTindakanRooms.size === tindakanRooms.length;
            itemObj.allowed_ruangan = isAll ? [] : Array.from(selectedTindakanRooms);
            const activeRooms = tindakanRooms.filter((r) => isAll || selectedTindakanRooms.has(r.kode_ruangan));
            if (activeRooms.length > 0) {
              itemObj.items = activeRooms.map((r) => ({
                label: r.nama_ruangan,
                icon: 'pi pi-building',
                to: `/pendaftaran-antrean/antrean?type=layanan&ruangan=${r.kode_ruangan}`,
              }));
            }
          }

          // Rincian Ruangan Konsultasi
          if (it.to.includes('type=konsul')) {
            const isAll = selectedKonsulRooms.size === 0 || selectedKonsulRooms.size === konsulRooms.length;
            itemObj.allowed_ruangan = isAll ? [] : Array.from(selectedKonsulRooms);
            const activeRooms = konsulRooms.filter((r) => isAll || selectedKonsulRooms.has(r.kode_ruangan));
            if (activeRooms.length > 0) {
              itemObj.items = activeRooms.map((r) => ({
                label: r.nama_ruangan,
                icon: 'pi pi-building',
                to: `/pendaftaran-antrean/antrean?type=konsul&ruangan=${r.kode_ruangan}`,
              }));
            }
          }

          return itemObj;
        }),
      });
    }
  });

  return resultMenu;
};

const getRoleSeverity = (role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' => {
  const r = (role || '').toLowerCase();
  if (r.includes('owner') || r.includes('manager')) return 'info';
  if (r.includes('dokter')) return 'danger';
  if (r.includes('beautician') || r.includes('terapis')) return 'warning';
  if (r.includes('kasir')) return 'success';
  if (r.includes('warehouse') || r.includes('gudang')) return 'secondary';
  return 'info';
};

export default function ManajemenUserPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user?.role || '').toLowerCase() === 'superadmin';
  const roleOptions = isSuperAdmin ? SUPERADMIN_ROLE_OPTIONS : MANAGER_ROLE_OPTIONS;
  const toast = useRef<Toast>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [rows, setRows] = useState<number>(10);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedCabang, setSelectedCabang] = useState<string | null>(null);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // Modal Create / Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({
    user_code: '',
    fullname: '',
    username: '',
    telp: '',
    role: 'beautician',
    kode_cabang: null,
    password: '',
    status: '1',
  });
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Hak Akses (Permissions) State
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [permissionFilter, setPermissionFilter] = useState<string>('');
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(false);

  // Master Karyawan & Ruangan State
  const [karyawanList, setKaryawanList] = useState<any[]>([]);
  const [selectedKaryawanId, setSelectedKaryawanId] = useState<string | null>(null);
  const [ruanganList, setRuanganList] = useState<any[]>([]);
  const [selectedTindakanRooms, setSelectedTindakanRooms] = useState<Set<string>>(new Set());
  const [selectedKonsulRooms, setSelectedKonsulRooms] = useState<Set<string>>(new Set());

  const tindakanRooms = useMemo(
    () => ruanganList.filter((r) => !r.is_konsultasi || r.is_konsultasi === 0),
    [ruanganList]
  );
  const konsulRooms = useMemo(
    () => ruanganList.filter((r) => r.is_konsultasi === 1),
    [ruanganList]
  );

  const fetchBranches = async () => {
    try {
      const res = await postData('/master/cabang-data', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        const list = res.data.data || [];
        setBranchOptions([
          { label: 'Semua Cabang / Pusat', value: null },
          ...list.map((b: any) => ({
            label: `${b.kode_cabang} - ${b.nama_cabang}`,
            value: b.kode_cabang,
          })),
        ]);
      }
    } catch (_) {}
  };

  const fetchKaryawan = async () => {
    try {
      const payload: any = {};
      if (!isSuperAdmin && session?.user?.kode_cabang) {
        payload.kode_cabang = session.user.kode_cabang;
      }
      const res = await postData('/master/karyawan-data', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setKaryawanList(res.data.data || []);
      }
    } catch (_) {}
  };

  const fetchRuangan = async () => {
    try {
      const res = await postData('/master/ruangan-dropdown', {});
      if (res?.data?.data) {
        setRuanganList(res.data.data || []);
      }
    } catch (_) {}
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const payload: any = {
        first: (page - 1) * rows,
        rows: rows,
      };
      if (keyword) payload.search = keyword;
      if (selectedRole) payload.role = selectedRole;

      // Jika Manager, kunci query ke cabang sendiri
      if (!isSuperAdmin && session?.user?.kode_cabang) {
        payload.kode_cabang = session.user.kode_cabang;
      } else if (selectedCabang) {
        payload.kode_cabang = selectedCabang;
      }

      const res = await postData('/setup/user-login/user-data', payload);
      if (['00', '0000', 200].includes(res?.data?.status) || res?.status === 200) {
        setUsers(res.data.data || []);
        setTotalRecords(res.data.total_data ?? (res.data.data ? res.data.data.length : 0));
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat data pengguna');
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchKaryawan();
    fetchRuangan();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, rows, keyword, selectedRole, selectedCabang]);

  const handleSelectKaryawan = (kodeKaryawan: string | null) => {
    setSelectedKaryawanId(kodeKaryawan);
    if (!kodeKaryawan) return;
    const emp = karyawanList.find((k) => k.kode_karyawan === kodeKaryawan);
    if (!emp) return;

    let mappedRole = 'admin';
    const jab = (emp.jabatan || '').toLowerCase();
    if (jab === 'admin' || (jab.includes('admin') && !jab.includes('superadmin')) || jab.includes('resepsionis') || jab.includes('front')) {
      mappedRole = 'admin';
    } else if (jab.includes('warehouse') || jab.includes('logistik') || jab.includes('gudang') || jab.includes('apoteker')) {
      mappedRole = 'warehouse';
    } else if (jab.includes('dokter')) {
      mappedRole = 'dokter';
    } else if (jab.includes('kasir')) {
      mappedRole = 'kasir';
    } else if (jab.includes('owner') || jab.includes('manager')) {
      mappedRole = 'owner';
    } else if (jab.includes('superadmin') || jab.includes('it')) {
      mappedRole = 'superadmin';
    } else if (jab.includes('beautician') || jab.includes('terapis') || jab.includes('perawat')) {
      mappedRole = 'beautician';
    }

    const empEmail = emp.email || `${(emp.nama || 'staf').toLowerCase().replace(/[^a-z0-9]/g, '.')}@klinik.com`;

    setFormData((prev: any) => ({
      ...prev,
      fullname: emp.nama || '',
      username: empEmail,
      telp: emp.no_hp || '',
      role: mappedRole,
      kode_karyawan: emp.kode_karyawan,
      kode_cabang: emp.kode_cabang || prev.kode_cabang,
    }));

    if (mappedRole === 'superadmin') {
      const all = new Set<string>();
      AVAILABLE_MODULE_CATEGORIES.forEach((cat) => {
        cat.items.forEach((it) => all.add(it.to));
      });
      setSelectedPermissions(all);
      setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
    } else {
      const preset = ROLE_PRESET_PATHS[mappedRole] || (mappedRole === 'manager' ? ROLE_PRESET_PATHS['owner'] : []);
      setSelectedPermissions(new Set(preset));

      if (mappedRole === 'beautician' || mappedRole === 'dokter') {
        setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      } else {
        setSelectedTindakanRooms(new Set());
      }
      if (mappedRole === 'dokter') {
        setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
      } else {
        setSelectedKonsulRooms(new Set());
      }
    }
  };

  const handleOpenCreate = () => {
    setIsEdit(false);
    setActiveTab(0);
    setSelectedKaryawanId(null);
    const defaultRole = isSuperAdmin ? 'owner' : 'beautician';
    setFormData({
      user_code: '',
      fullname: '',
      username: '',
      telp: '',
      role: defaultRole,
      kode_cabang: session?.user?.kode_cabang || null,
      password: '',
      status: '1',
      kode_karyawan: null,
    });
    const preset = ROLE_PRESET_PATHS[defaultRole] || [];
    setSelectedPermissions(new Set(preset));
    setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
    setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
    setPermissionFilter('');
    setShowModal(true);
  };

  const handleOpenEdit = async (u: UserRecord) => {
    setIsEdit(true);
    setActiveTab(0);
    const matchedKaryawan = karyawanList.find(
      (k) => k.kode_user === u.user_code || k.email === u.username
    );
    setSelectedKaryawanId(matchedKaryawan ? matchedKaryawan.kode_karyawan : null);

    setFormData({
      user_code: u.user_code,
      fullname: u.fullname || '',
      username: u.username || '',
      telp: u.telp || '',
      role: u.role || 'beautician',
      kode_cabang: u.kode_cabang || null,
      password: '',
      status: String(u.status) === '1' || u.status === 1 ? '1' : '0',
      kode_karyawan: matchedKaryawan ? matchedKaryawan.kode_karyawan : null,
    });
    setPermissionFilter('');
    setShowModal(true);
    setLoadingPermissions(true);

    try {
      const resNav = await postData('/setup/nav/user-data', { user_code: u.user_code });
      if (['00', '0000'].includes(resNav?.data?.status) && resNav.data.data) {
        const paths = new Set<string>();
        let loadedTindakanRooms = new Set<string>();
        let loadedKonsulRooms = new Set<string>();
        let hasTindakanConfig = false;
        let hasKonsulConfig = false;

        const extractPaths = (items: any[]) => {
          if (!items || !Array.isArray(items)) return;
          items.forEach((it) => {
            if (it.to) paths.add(it.to);
            if (it.to?.includes('type=layanan')) {
              hasTindakanConfig = true;
              if (Array.isArray(it.allowed_ruangan) && it.allowed_ruangan.length > 0) {
                loadedTindakanRooms = new Set(it.allowed_ruangan);
              }
            }
            if (it.to?.includes('type=konsul')) {
              hasKonsulConfig = true;
              if (Array.isArray(it.allowed_ruangan) && it.allowed_ruangan.length > 0) {
                loadedKonsulRooms = new Set(it.allowed_ruangan);
              }
            }
            if (it.items) extractPaths(it.items);
          });
        };
        extractPaths(resNav.data.data);
        setSelectedPermissions(paths);

        if (hasTindakanConfig && loadedTindakanRooms.size > 0) {
          setSelectedTindakanRooms(loadedTindakanRooms);
        } else {
          setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
        }

        if (hasKonsulConfig && loadedKonsulRooms.size > 0) {
          setSelectedKonsulRooms(loadedKonsulRooms);
        } else {
          setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
        }
      } else {
        const defaultPaths = ROLE_PRESET_PATHS[u.role] || [];
        setSelectedPermissions(new Set(defaultPaths));
        setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
        setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
      }
    } catch (_) {
      const defaultPaths = ROLE_PRESET_PATHS[u.role] || [];
      setSelectedPermissions(new Set(defaultPaths));
      setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    setFormData((prev: any) => ({ ...prev, role: newRole }));
    if (newRole === 'superadmin') {
      const all = new Set<string>();
      AVAILABLE_MODULE_CATEGORIES.forEach((cat) => {
        cat.items.forEach((it) => all.add(it.to));
      });
      setSelectedPermissions(all);
      setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
    } else {
      const preset = ROLE_PRESET_PATHS[newRole] || (newRole === 'manager' ? ROLE_PRESET_PATHS['owner'] : []);
      setSelectedPermissions(new Set(preset));
      if (newRole === 'beautician' || newRole === 'dokter') {
        setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      } else {
        setSelectedTindakanRooms(new Set());
      }
      if (newRole === 'dokter') {
        setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
      } else {
        setSelectedKonsulRooms(new Set());
      }
    }
  };

  const togglePermission = (path: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleCategory = (category: PermissionCategory) => {
    const categoryPaths = category.items.map((it) => it.to);
    const allSelected = categoryPaths.every((p) => selectedPermissions.has(p));
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryPaths.forEach((p) => next.delete(p));
      } else {
        categoryPaths.forEach((p) => next.add(p));
      }
      return next;
    });
  };

  const applyPreset = () => {
    if (formData.role === 'superadmin') {
      selectAllPermissions();
      setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
      showSuccess(toast, "Preset hak akses role 'SUPERADMIN' diterapkan.");
      return;
    }
    const preset = ROLE_PRESET_PATHS[formData.role] || (formData.role === 'manager' ? ROLE_PRESET_PATHS['owner'] : null);
    if (preset) {
      setSelectedPermissions(new Set(preset));
      if (formData.role === 'beautician' || formData.role === 'dokter') {
        setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)));
      } else {
        setSelectedTindakanRooms(new Set());
      }
      if (formData.role === 'dokter') {
        setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)));
      } else {
        setSelectedKonsulRooms(new Set());
      }
      showSuccess(toast, `Preset hak akses role '${formData.role.toUpperCase()}' diterapkan.`);
    }
  };

  const selectAllPermissions = () => {
    const all = new Set<string>();
    AVAILABLE_MODULE_CATEGORIES.forEach((cat) => {
      cat.items.forEach((it) => all.add(it.to));
    });
    setSelectedPermissions(all);
  };

  const deselectAllPermissions = () => {
    setSelectedPermissions(new Set());
  };

  const karyawanOptions = useMemo(() => {
    // Kumpulkan kode_user dan email dari seluruh user yang ada di sistem
    const existingUserCodes = new Set(users.map((u) => u.user_code).filter(Boolean));
    const existingUsernames = new Set(
      users.map((u) => (u.username || '').toLowerCase().trim()).filter(Boolean)
    );

    // Hanya tampilkan karyawan yang belum memiliki akun
    const filtered = karyawanList.filter((k) => {
      // Jika mode Edit dan ini adalah karyawan yang sedang terhubung ke user saat ini, tetap izinkan tampil
      if (isEdit && formData.kode_karyawan && k.kode_karyawan === formData.kode_karyawan) {
        return true;
      }
      // Cek apakah karyawan ini sudah memiliki akun
      const hasAccountByKodeUser = Boolean(k.kode_user);
      const hasAccountByEmail = Boolean(
        k.email && existingUsernames.has(k.email.toLowerCase().trim())
      );

      return !hasAccountByKodeUser && !hasAccountByEmail;
    });

    return filtered.map((k) => ({
      label: `${k.nama} (${k.kode_karyawan}) - ${k.jabatan?.toUpperCase() || 'STAF'}`,
      value: k.kode_karyawan,
      karyawan: k,
    }));
  }, [karyawanList, users, isEdit, formData.kode_karyawan]);

  const karyawanOptionTemplate = (option: any) => {
    const k = option.karyawan;
    if (!k) return option.label;
    const isLinkedToCurrent = isEdit && formData.kode_karyawan === k.kode_karyawan;

    return (
      <div className="flex align-items-center justify-content-between w-full py-2.5 px-1 gap-3">
        <div className="flex flex-column gap-1.5">
          <span className="font-semibold text-sm text-900 leading-tight">{k.nama}</span>
          <div className="text-xs text-500 flex flex-wrap align-items-center gap-2 leading-tight">
            <span className="font-mono font-bold text-[11px] text-gray-700 bg-gray-100 px-1.5 py-0.5 border-round">
              {k.kode_karyawan}
            </span>
            <span>•</span>
            <span>{k.email || '-'}</span>
            <span>•</span>
            <span>{k.no_hp || '-'}</span>
          </div>
        </div>
        <div className="flex align-items-center gap-2 flex-shrink-0">
          <Tag
            value={
              k.jabatan === 'admin'
                ? 'ADMIN'
                : k.jabatan === 'beautician' || k.jabatan === 'terapis'
                ? 'BEAUTICIAN / TERAPIS'
                : k.jabatan === 'warehouse' || k.jabatan === 'logistik'
                ? 'WAREHOUSE / LOGISTIK'
                : k.jabatan === 'owner' || k.jabatan === 'manager'
                ? 'OWNER / MANAGER'
                : k.jabatan === 'superadmin'
                ? 'SUPERADMIN / IT'
                : k.jabatan?.toUpperCase() || 'STAF'
            }
            severity={
              k.jabatan === 'dokter'
                ? 'danger'
                : k.jabatan === 'kasir'
                ? 'success'
                : k.jabatan === 'beautician' || k.jabatan === 'terapis'
                ? 'warning'
                : k.jabatan === 'warehouse' || k.jabatan === 'logistik'
                ? 'secondary'
                : 'info'
            }
            className="text-xs px-2.5 py-1 font-bold"
          />
          {isLinkedToCurrent && (
            <Tag value="Akun Ini" severity="info" className="text-xs px-2.5 py-1" />
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    if (!formData.fullname || !formData.username || !formData.telp || !formData.role) {
      showError(toast, 'Harap lengkapi semua kolom yang wajib diisi!');
      return;
    }
    if (!isEdit && !formData.password) {
      showError(toast, 'Password wajib diisi untuk pengguna baru!');
      return;
    }

    setFormLoading(true);
    try {
      const customMenu = buildMenuFromSelectedPaths(
        selectedPermissions,
        selectedTindakanRooms,
        selectedKonsulRooms,
        tindakanRooms,
        konsulRooms
      );

      if (isEdit) {
        const payload: any = {
          user_code: formData.user_code,
          fullname: formData.fullname,
          username: formData.username,
          telp: formData.telp,
          role: formData.role,
          kode_cabang: formData.kode_cabang || null,
          status: formData.status,
          kode_karyawan: formData.kode_karyawan || null,
          menu: customMenu,
        };
        if (formData.password) payload.password = formData.password;

        const res = await postData('/setup/user-login/user-update', payload);
        if (['00', '0000'].includes(res?.data?.status)) {
          showSuccess(toast, 'Data pengguna & hak akses berhasil diperbarui');
          setShowModal(false);
          fetchUsers();
          fetchKaryawan();
        } else {
          showError(toast, res?.data?.message || 'Gagal memperbarui data pengguna');
        }
      } else {
        const payload = {
          fullname: formData.fullname,
          username: formData.username,
          telp: formData.telp,
          role: formData.role,
          kode_cabang: formData.kode_cabang || null,
          password: formData.password,
          status: formData.status,
          kode_karyawan: formData.kode_karyawan || null,
          menu: customMenu,
        };

        const res = await postData('/setup/user-login/user-create', payload);
        if (['00', '0000'].includes(res?.data?.status)) {
          showSuccess(toast, 'Pengguna baru & hak akses berhasil dibuat');
          setShowModal(false);
          fetchUsers();
          fetchKaryawan();
        } else {
          showError(toast, res?.data?.message || 'Gagal menambahkan pengguna baru');
        }
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem';
      showError(toast, errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (codes: string[], names?: string) => {
    const confirmText = names || `${codes.length} data pengguna ini`;

    confirmDialog({
      message: `Apakah Anda yakin ingin menghapus akun pengguna "${confirmText}"?`,
      header: 'Konfirmasi Hapus Pengguna',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Ya, Hapus',
      rejectLabel: 'Batal',
      accept: async () => {
        try {
          const res = await postData('/setup/user-login/user-delete', { user_code: codes });
          if (['00', '0000'].includes(res?.data?.status)) {
            showSuccess(toast, 'Pengguna berhasil dihapus');
            setSelectedRows([]);
            fetchUsers();
          } else {
            showError(toast, res?.data?.message || 'Gagal menghapus pengguna');
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.message || err?.message || 'Gagal menghapus pengguna';
          showError(toast, errMsg);
        }
      },
    });
  };

  return (
    <div className="w-full">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
        {/* Page Header */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
            <i className="pi pi-users text-purple-600 text-2xl" />
            Kelola Pengguna & Hak Akses Staf
          </h3>
          <p className="text-500 text-sm m-0">
            {isSuperAdmin
              ? 'Kelola akun seluruh staf klinik lintas cabang dan konfigurasi hak akses modul.'
              : 'Buat akun staf cabang (Beautician, Kasir, Warehouse) dan atur hak akses modulnya secara manual.'}
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
          <Button
            size="small"
            label="Baru"
            icon="pi pi-plus"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            onClick={handleOpenCreate}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label="Cetak"
            icon="pi pi-print"
            outlined
            className="border-round-md font-medium px-3 border-purple-600 text-purple-600"
            onClick={() => window.print()}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label={`Hapus${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
            icon="pi pi-trash"
            severity="danger"
            outlined
            disabled={selectedRows.length === 0}
            className="border-round-md font-medium px-3"
            onClick={() => {
              if (selectedRows.length < 1) return;
              handleDelete(selectedRows.map((r) => r.user_code));
            }}
          />
          <Divider layout="vertical" className="m-0 h-2rem" />
          <Button
            size="small"
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="success"
            className="border-round-md font-medium px-3"
            loading={loading}
            onClick={fetchUsers}
          />
        </div>

        {/* DataTable */}
        <DataTable
          value={users}
          loading={loading}
          paginator
          rows={rows}
          totalRecords={totalRecords}
          lazy
          first={(page - 1) * rows}
          onPage={(e) => {
            setPage((e.page || 0) + 1);
            setRows(e.rows);
          }}
          selection={selectedRows}
          onSelectionChange={(e: any) => setSelectedRows(e.value)}
          dataKey="user_code"
          className="p-datatable-sm"
          emptyMessage="Data pengguna tidak ditemukan."
          responsiveLayout="scroll"
          rowsPerPageOptions={[10, 25, 50]}
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
          currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
          header={
            <div className="flex flex-column gap-3">
              <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="text-xl font-bold">Data Pengguna & Hak Akses</span>
                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                  <Dropdown
                    value={selectedRole}
                    options={[{ label: 'Semua Role', value: null }, ...roleOptions]}
                    onChange={(e) => {
                      setSelectedRole(e.value);
                      setPage(1);
                    }}
                    placeholder="Filter Role"
                    className="p-inputtext-sm w-full md:w-12rem text-sm border-round-md"
                    showClear
                  />
                  {isSuperAdmin && (
                    <Dropdown
                      value={selectedCabang}
                      options={branchOptions}
                      onChange={(e) => {
                        setSelectedCabang(e.value);
                        setPage(1);
                      }}
                      placeholder="Filter Cabang"
                      className="p-inputtext-sm w-full md:w-14rem text-sm border-round-md"
                      showClear
                    />
                  )}
                  <IconField iconPosition="left" className="w-full md:w-18rem">
                    <InputIcon className="pi pi-search" />
                    <InputText
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        setPage(1);
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
                    onClick={() => {
                      setKeyword('');
                      setSelectedRole(null);
                      setSelectedCabang(null);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                <span className="flex align-items-center gap-1">
                  <i className="pi pi-info-circle" />
                  <span className="font-semibold">KETERANGAN STATUS:</span>
                </span>
                <span className="flex align-items-center gap-1">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: '#22c55e',
                      boxShadow: '0 1px 3px #22c55e55',
                    }}
                  />
                  Aktif
                </span>
                <span className="flex align-items-center gap-1">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: '#ef4444',
                      boxShadow: '0 1px 3px #ef444455',
                    }}
                  />
                  Tidak Aktif
                </span>
              </div>
            </div>
          }
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
          <Column
            header=""
            headerStyle={{ width: '3rem' }}
            align="center"
            body={(r: UserRecord) => {
              const isActive = String(r.status) === '1' || r.status === 1 || r.status === 'aktif';
              return (
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px',
                    backgroundColor: isActive ? '#22c55e' : '#ef4444',
                    boxShadow: isActive ? '0 1px 3px #22c55e55' : '0 1px 3px #ef444455',
                  }}
                  title={isActive ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                />
              );
            }}
          />
          <Column
            field="user_code"
            header="Kode User"
            sortable
            headerStyle={{ fontWeight: 'bold', width: '8rem' }}
            body={(r: UserRecord) => <span className="font-mono text-xs font-bold text-gray-700">{r.user_code}</span>}
          />
          <Column
            field="fullname"
            header="Nama Pengguna"
            sortable
            headerStyle={{ fontWeight: 'bold' }}
            body={(r: UserRecord) => (
              <div>
                <div className="font-semibold text-900 text-sm">{r.fullname}</div>
                <div className="text-xs text-500">{r.username}</div>
              </div>
            )}
          />
          <Column
            field="telp"
            header="No. Telp"
            sortable
            headerStyle={{ fontWeight: 'bold', width: '10rem' }}
            body={(r: UserRecord) => <span className="text-sm text-gray-700">{r.telp || '-'}</span>}
          />
          <Column
            field="role"
            header="Role Dashboard"
            sortable
            headerStyle={{ fontWeight: 'bold', width: '10rem' }}
            body={(r: UserRecord) => (
              <Tag
                value={String(r.role || 'USER').toUpperCase()}
                severity={getRoleSeverity(r.role)}
                className="text-xs font-bold px-2 py-0.5"
              />
            )}
          />
          <Column
            field="nama_cabang"
            header="Cabang"
            sortable
            headerStyle={{ fontWeight: 'bold', width: '12rem' }}
            body={(r: UserRecord) => {
              const label = r.nama_cabang || (r.kode_cabang ? r.kode_cabang : 'Pusat / Semua');
              const isPusat = !r.kode_cabang;
              return (
                <Tag
                  value={label}
                  severity={isPusat ? 'info' : 'secondary'}
                  className="text-xs"
                  icon={isPusat ? 'pi pi-shield' : 'pi pi-building'}
                />
              );
            }}
          />
          <Column
            header="Aksi"
            align="center"
            headerStyle={{ width: '8rem', textAlign: 'center', fontWeight: 'bold' }}
            body={(r: UserRecord) => (
              <div className="flex align-items-center justify-content-center gap-2">
                <Button
                  icon="pi pi-pencil"
                  outlined
                  severity="success"
                  className="p-button-sm border-round-md"
                  tooltip="Edit Pengguna & Hak Akses"
                  onClick={() => handleOpenEdit(r)}
                />
                <Button
                  icon="pi pi-trash"
                  outlined
                  severity="danger"
                  className="p-button-sm border-round-md"
                  tooltip="Hapus Pengguna"
                  onClick={() => handleDelete([r.user_code], `${r.fullname} (${r.username})`)}
                />
              </div>
            )}
          />
        </DataTable>
      </div>

      {/* DIALOG CREATE / EDIT USER & PEMILIHAN HAK AKSES */}
      <Dialog
        header={
          <div className="flex align-items-center gap-2">
            <i className={`pi ${isEdit ? 'pi-user-edit text-green-600' : 'pi-user-plus text-purple-600'} text-xl`} />
            <span className="font-bold text-lg">
              {isEdit ? `Edit Data Pengguna: ${formData.fullname || formData.username}` : 'Tambah Pengguna Baru'}
            </span>
            {formData.role && (
              <Tag
                value={String(formData.role).toUpperCase()}
                severity={getRoleSeverity(formData.role)}
                className="text-xs font-bold ml-2"
              />
            )}
          </div>
        }
        visible={showModal}
        style={{ width: '880px', maxWidth: '96vw' }}
        modal
        onHide={() => setShowModal(false)}
        footer={
          <div className="flex justify-content-between align-items-center pt-2 border-top-1 surface-border">
            <div className="text-xs text-600 font-medium flex align-items-center gap-2">
              <i className="pi pi-shield text-purple-600" />
              <span>
                Total modul aktif: <strong className="text-purple-700">{selectedPermissions.size} modul</strong> terpilih
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                label="Batal"
                icon="pi pi-times"
                outlined
                severity="secondary"
                onClick={() => setShowModal(false)}
              />
              <Button
                label={isEdit ? 'Simpan Perubahan' : 'Simpan Pengguna'}
                icon="pi pi-check"
                severity="success"
                onClick={handleSubmit}
                loading={formLoading}
              />
            </div>
          </div>
        }
      >
        <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} className="mt-2">
          {/* TAB 1: INFORMASI AKUN */}
          <TabPanel header="Informasi Akun Staf" leftIcon="pi pi-user mr-2">
            <div className="p-1">
              {/* Opsi Pilih dari Master Karyawan */}
              <div className="surface-50 border-1 border-200 border-round-lg p-3 mb-4">
                <div className="flex align-items-center justify-content-between mb-2">
                  <label className="text-xs font-bold text-700 flex align-items-center gap-2">
                    <i className="pi pi-id-card text-purple-600" />
                    Pilih Staf dari Master Karyawan (Opsional)
                  </label>
                  {selectedKaryawanId && (
                    <Button
                      type="button"
                      label="Reset Pilihan"
                      icon="pi pi-times"
                      text
                      severity="danger"
                      className="p-0 text-xs font-semibold"
                      onClick={() => {
                        setSelectedKaryawanId(null);
                        setFormData((prev: any) => ({ ...prev, kode_karyawan: null }));
                      }}
                    />
                  )}
                </div>
                <Dropdown
                  value={selectedKaryawanId}
                  options={karyawanOptions}
                  onChange={(e) => handleSelectKaryawan(e.value)}
                  placeholder="-- Pilih staf klinik (hanya yang belum punya akun) --"
                  emptyMessage="Semua karyawan sudah memiliki akun login"
                  className="w-full text-sm"
                  filter
                  showClear
                  itemTemplate={karyawanOptionTemplate}
                />
                <small className="text-500 mt-1 block">
                  Hanya menampilkan staf yang belum memiliki akun. Memilih staf akan otomatis mengisi Nama, Email, No. HP, Role, dan rekomendasi hak akses.
                </small>
              </div>

              {/* Form Input Grid (2 Kolom Rapi) */}
              <div className="grid p-fluid">
                <div className="col-12 md:col-6 field mb-3">
                  <label className="text-xs font-bold text-700 block mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    value={formData.fullname}
                    onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                    placeholder="Contoh: dr. Amanda Putri"
                    className="w-full text-sm"
                  />
                </div>

                <div className="col-12 md:col-6 field mb-3">
                  <label className="text-xs font-bold text-700 block mb-1">
                    Username / Email Login <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Contoh: dokter@klinik.com"
                    className="w-full text-sm"
                  />
                </div>

                <div className="col-12 md:col-6 field mb-3">
                  <label className="text-xs font-bold text-700 block mb-1">
                    No. Telepon / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <InputText
                    value={formData.telp}
                    onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full text-sm"
                  />
                </div>

                <div className="col-12 md:col-6 field mb-3">
                  <label className="text-xs font-bold text-700 block mb-1">
                    Role Operasional <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    value={formData.role}
                    options={roleOptions}
                    onChange={(e) => handleRoleChange(e.value)}
                    placeholder="Pilih Role Operasional"
                    className="w-full text-sm"
                  />
                </div>

                <div className="col-12 md:col-6 field mb-3">
                  <label className="text-xs font-bold text-700 block mb-1">Penempatan Cabang</label>
                  <Dropdown
                    value={formData.kode_cabang}
                    options={branchOptions.filter((b) => b.value !== null)}
                    onChange={(e) => setFormData({ ...formData, kode_cabang: e.value })}
                    placeholder="Pusat / Semua Cabang"
                    className="w-full text-sm"
                    disabled={!isSuperAdmin && Boolean(session?.user?.kode_cabang)}
                  />
                  {!isSuperAdmin && session?.user?.kode_cabang && (
                    <small className="text-500 mt-1 block">Terikat otomatis pada cabang Anda.</small>
                  )}
                </div>

                <div className="col-12 md:col-6 field mb-3">
                  <label className="text-xs font-bold text-700 block mb-1">Status Akun</label>
                  <Dropdown
                    value={formData.status}
                    options={STATUS_OPTIONS}
                    onChange={(e) => setFormData({ ...formData, status: e.value })}
                    className="w-full text-sm"
                  />
                </div>

                <div className="col-12 field mb-2">
                  <label className="text-xs font-bold text-700 block mb-1">
                    {isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Login *'}
                  </label>
                  <Password
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    toggleMask
                    className="w-full"
                    inputClassName="w-full text-sm"
                  />
                </div>
              </div>

              {/* Tombol Navigasi ke Tab Hak Akses */}
              <div className="flex justify-content-end mt-3 pt-2 border-top-1 surface-border">
                <Button
                  type="button"
                  label="Lanjut ke Hak Akses & Menu Modul"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  outlined
                  severity="success"
                  className="text-sm font-medium"
                  onClick={() => setActiveTab(1)}
                />
              </div>
            </div>
          </TabPanel>

          {/* TAB 2: HAK AKSES & MENU OPERASIONAL */}
          <TabPanel header="Hak Akses & Menu Operasional" leftIcon="pi pi-shield mr-2">
            <div className="p-1">
              {/* Header Action Bar */}
              <div className="flex flex-column sm:flex-row justify-content-between align-items-stretch sm:align-items-center gap-2 mb-3 pb-2 border-bottom-1 surface-border">
                <IconField iconPosition="left" className="w-full sm:w-20rem">
                  <InputIcon className="pi pi-search text-gray-400 text-xs" />
                  <InputText
                    value={permissionFilter}
                    onChange={(e) => setPermissionFilter(e.target.value)}
                    placeholder="Cari fitur / modul..."
                    className="w-full text-xs p-inputtext-sm border-round-md"
                  />
                </IconField>

                <div className="flex align-items-center gap-2">
                  <Button
                    type="button"
                    size="small"
                    label={`Preset (${String(formData.role || '').toUpperCase()})`}
                    icon="pi pi-history"
                    outlined
                    severity="info"
                    className="text-xs py-1.5 px-2.5 border-round-md"
                    onClick={applyPreset}
                    tooltip={`Terapkan preset rekomendasi untuk role ${formData.role}`}
                    tooltipOptions={{ position: 'bottom' }}
                  />
                  <Button
                    type="button"
                    size="small"
                    label="Pilih Semua"
                    icon="pi pi-check-square"
                    outlined
                    severity="success"
                    className="text-xs py-1.5 px-2.5 border-round-md"
                    onClick={selectAllPermissions}
                  />
                  <Button
                    type="button"
                    size="small"
                    label="Reset"
                    icon="pi pi-times"
                    outlined
                    severity="secondary"
                    className="text-xs py-1.5 px-2.5 border-round-md"
                    onClick={deselectAllPermissions}
                  />
                </div>
              </div>

              {/* Daftar Kategori & Modul */}
              {loadingPermissions ? (
                <div className="p-5 text-center text-gray-500 text-sm">
                  <i className="pi pi-spin pi-spinner text-purple-600 text-2xl block mb-2" />
                  Memuat konfigurasi modul...
                </div>
              ) : (
                <div
                  className="overflow-y-auto pr-2 flex flex-column gap-3"
                  style={{ maxHeight: '460px', scrollbarWidth: 'thin' }}
                >
                  {AVAILABLE_MODULE_CATEGORIES.map((cat, idx) => {
                    const filterLower = permissionFilter.toLowerCase().trim();
                    const filteredItems = cat.items.filter(
                      (it) =>
                        it.label.toLowerCase().includes(filterLower) ||
                        it.desc.toLowerCase().includes(filterLower) ||
                        cat.category.toLowerCase().includes(filterLower)
                    );

                    if (filterLower && filteredItems.length === 0) return null;

                    const allCatPaths = cat.items.map((it) => it.to);
                    const isCatAllChecked = allCatPaths.every((p) => selectedPermissions.has(p));
                    const checkedCount = cat.items.filter((it) => selectedPermissions.has(it.to)).length;

                    return (
                      <div
                        key={cat.category || idx}
                        className="border-1 surface-border border-round-lg p-3 surface-50"
                      >
                        {/* Header Kategori */}
                        <div className="flex align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border">
                          <div
                            className="flex align-items-center gap-2 cursor-pointer select-none"
                            onClick={() => toggleCategory(cat)}
                          >
                            <Checkbox
                              checked={isCatAllChecked}
                              readOnly
                              className="pointer-events-none"
                            />
                            <span className="font-bold text-sm text-900 flex align-items-center gap-2">
                              <i className={`${cat.icon} text-purple-600 text-sm`} />
                              <span>{cat.category}</span>
                            </span>
                          </div>
                          <span className="text-xs text-500 font-semibold bg-white px-2 py-0.5 border-round border-1 surface-border">
                            {checkedCount}/{cat.items.length} Modul Aktif
                          </span>
                        </div>

                        {/* Items dalam Kategori */}
                        <div className="flex flex-column gap-2">
                          {filteredItems.map((item) => {
                            const isChecked = selectedPermissions.has(item.to);
                            const isTindakanModule = item.to.includes('type=layanan');
                            const isKonsulModule = item.to.includes('type=konsul');

                            return (
                              <div
                                key={item.id}
                                className={`border-round-lg transition-all border-1 overflow-hidden ${
                                  isChecked
                                    ? 'bg-white shadow-1 border-purple-200'
                                    : 'bg-white/60 border-transparent hover:bg-white hover:border-200'
                                }`}
                              >
                                <div
                                  className="p-3 flex align-items-start gap-3 cursor-pointer select-none"
                                  onClick={() => togglePermission(item.to)}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    readOnly
                                    className="mt-0.5 pointer-events-none"
                                  />
                                  <div className="flex-1">
                                    <div
                                      className={`text-sm font-semibold cursor-pointer block ${
                                        isChecked ? 'text-purple-900' : 'text-800'
                                      }`}
                                    >
                                      {item.label}
                                    </div>
                                    <p className="text-xs text-500 m-0 mt-0.5 leading-normal">{item.desc}</p>
                                  </div>
                                </div>

                                {/* RINCIAN RUANGAN TINDAKAN */}
                                {isChecked && isTindakanModule && (
                                  <div
                                    className="px-3 pb-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="p-3 bg-purple-50/70 border-round-xl border-1 border-purple-200 shadow-xs">
                                      <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom-1 border-purple-200/60">
                                        <div className="flex align-items-center gap-2">
                                          <i className="pi pi-building text-purple-600 text-base" />
                                          <span className="text-sm font-bold text-purple-900">
                                            Akses Ruangan Tindakan
                                          </span>
                                          <span className="text-xs px-2 py-0.5 border-round-md font-semibold bg-purple-200/80 text-purple-900">
                                            {selectedTindakanRooms.size}/{tindakanRooms.length} aktif
                                          </span>
                                        </div>
                                        <div className="flex align-items-center gap-1.5">
                                          <Button
                                            type="button"
                                            size="small"
                                            text
                                            label="Pilih Semua"
                                            icon="pi pi-check"
                                            className="px-2 py-1 text-xs text-purple-700 font-bold hover:bg-purple-100 border-round-md"
                                            onClick={() =>
                                              setSelectedTindakanRooms(new Set(tindakanRooms.map((r) => r.kode_ruangan)))
                                            }
                                          />
                                          <span className="text-xs text-300">|</span>
                                          <Button
                                            type="button"
                                            size="small"
                                            text
                                            label="Kosongkan"
                                            icon="pi pi-times"
                                            className="px-2 py-1 text-xs text-red-500 font-bold hover:bg-red-50 border-round-md"
                                            onClick={() => setSelectedTindakanRooms(new Set())}
                                          />
                                        </div>
                                      </div>
                                      <div
                                        className="w-full"
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                                          gap: '10px',
                                        }}
                                      >
                                        {tindakanRooms.map((room) => {
                                          const isRoomChecked = selectedTindakanRooms.has(room.kode_ruangan);
                                          return (
                                            <div
                                              key={room.kode_ruangan}
                                              onClick={() => {
                                                const next = new Set(selectedTindakanRooms);
                                                if (isRoomChecked) next.delete(room.kode_ruangan);
                                                else next.add(room.kode_ruangan);
                                                setSelectedTindakanRooms(next);
                                              }}
                                              className={`cursor-pointer px-3 py-2.5 border-round-lg flex align-items-center gap-2.5 border-1 transition-all select-none ${
                                                isRoomChecked
                                                  ? 'bg-purple-100 border-purple-400 text-purple-950 font-semibold shadow-1'
                                                  : 'bg-white border-200 text-700 hover:bg-purple-50/50 hover:border-purple-300'
                                              }`}
                                            >
                                              <i
                                                className={`pi ${
                                                  isRoomChecked ? 'pi-check-circle text-purple-600' : 'pi-circle text-400'
                                                } text-base flex-shrink-0`}
                                              />
                                              <span
                                                className={`font-mono font-bold text-xs px-2 py-1 border-round flex-shrink-0 ${
                                                  isRoomChecked
                                                    ? 'bg-purple-200 text-purple-900 border-1 border-purple-300'
                                                    : 'bg-surface-200 text-600 border-1 border-200'
                                                }`}
                                              >
                                                {room.kode_ruangan}
                                              </span>
                                              <span className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis flex-1">
                                                {room.nama_ruangan}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* RINCIAN RUANGAN KONSULTASI */}
                                {isChecked && isKonsulModule && (
                                  <div
                                    className="px-3 pb-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="p-3 bg-purple-50/70 border-round-xl border-1 border-purple-200 shadow-xs">
                                      <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom-1 border-purple-200/60">
                                        <div className="flex align-items-center gap-2">
                                          <i className="pi pi-comments text-purple-600 text-base" />
                                          <span className="text-sm font-bold text-purple-900">
                                            Akses Ruangan Konsultasi
                                          </span>
                                          <span className="text-xs px-2 py-0.5 border-round-md font-semibold bg-purple-200/80 text-purple-900">
                                            {selectedKonsulRooms.size}/{konsulRooms.length} aktif
                                          </span>
                                        </div>
                                        <div className="flex align-items-center gap-1.5">
                                          <Button
                                            type="button"
                                            size="small"
                                            text
                                            label="Pilih Semua"
                                            icon="pi pi-check"
                                            className="px-2 py-1 text-xs text-purple-700 font-bold hover:bg-purple-100 border-round-md"
                                            onClick={() =>
                                              setSelectedKonsulRooms(new Set(konsulRooms.map((r) => r.kode_ruangan)))
                                            }
                                          />
                                          <span className="text-xs text-300">|</span>
                                          <Button
                                            type="button"
                                            size="small"
                                            text
                                            label="Kosongkan"
                                            icon="pi pi-times"
                                            className="px-2 py-1 text-xs text-red-500 font-bold hover:bg-red-50 border-round-md"
                                            onClick={() => setSelectedKonsulRooms(new Set())}
                                          />
                                        </div>
                                      </div>
                                      <div
                                        className="w-full"
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                                          gap: '10px',
                                        }}
                                      >
                                        {konsulRooms.map((room) => {
                                          const isRoomChecked = selectedKonsulRooms.has(room.kode_ruangan);
                                          return (
                                            <div
                                              key={room.kode_ruangan}
                                              onClick={() => {
                                                const next = new Set(selectedKonsulRooms);
                                                if (isRoomChecked) next.delete(room.kode_ruangan);
                                                else next.add(room.kode_ruangan);
                                                setSelectedKonsulRooms(next);
                                              }}
                                              className={`cursor-pointer px-3 py-2.5 border-round-lg flex align-items-center gap-2.5 border-1 transition-all select-none ${
                                                isRoomChecked
                                                  ? 'bg-purple-100 border-purple-400 text-purple-950 font-semibold shadow-1'
                                                  : 'bg-white border-200 text-700 hover:bg-purple-50/50 hover:border-purple-300'
                                              }`}
                                            >
                                              <i
                                                className={`pi ${
                                                  isRoomChecked ? 'pi-check-circle text-purple-600' : 'pi-circle text-400'
                                                } text-base flex-shrink-0`}
                                              />
                                              <span
                                                className={`font-mono font-bold text-xs px-2 py-1 border-round flex-shrink-0 ${
                                                  isRoomChecked
                                                    ? 'bg-purple-200 text-purple-900 border-1 border-purple-300'
                                                    : 'bg-surface-200 text-600 border-1 border-200'
                                                }`}
                                              >
                                                {room.kode_ruangan}
                                              </span>
                                              <span className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis flex-1">
                                                {room.nama_ruangan}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabPanel>
        </TabView>
      </Dialog>
    </div>
  );
}