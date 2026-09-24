'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { Checkbox } from 'primereact/checkbox';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';

interface SubMenuItem {
    label: string;
    icon: string;
    to: string;
}

interface MenuGroup {
    label: string;
    icon: string;
    items: SubMenuItem[];
}

interface RoleItem {
    kode_role: string;
    role_key: string;
    nama_role: string;
    badge_severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
    color: string;
    deskripsi: string;
    status: 'aktif' | 'tidak aktif';
    user_count: number;
    active_paths: string[];
    is_custom?: boolean;
}

const DEFAULT_ROLES: RoleItem[] = [
    {
        kode_role: 'ROLE-001',
        role_key: 'owner',
        nama_role: 'Owner / Manager',
        badge_severity: 'info',
        color: '#0284c7',
        deskripsi: 'Monitoring KPI Klinik, Pendapatan, Monitoring Treatment, Inventory Valuation, dan Performa SDM.',
        status: 'aktif',
        user_count: 0,
        active_paths: [
            '/dashboard',
            '/pendaftaran-antrean/antrean?type=layanan',
            '/pendaftaran-antrean/antrean?type=konsul',
            '/kasir',
            '/riwayat/rekam-medis',
            '/pendaftaran-antrean/antrean',
            '/master-data/layanan',
            '/master-data/produk',
            '/master-data/promo',
            '/master-data/detail-promo',
        ],
        is_custom: false,
    },
    {
        kode_role: 'ROLE-002',
        role_key: 'dokter',
        nama_role: 'Dokter',
        badge_severity: 'danger',
        color: '#0f766e',
        deskripsi: 'Pemeriksaan klinis pasien, diagnosa rekam medis, treatment plan, dan antrean konsultasi medis.',
        status: 'aktif',
        user_count: 0,
        active_paths: [
            '/dashboard',
            '/pendaftaran-antrean/antrean?type=konsul',
            '/pendaftaran-antrean/antrean?type=layanan',
            '/riwayat/rekam-medis',
            '/master-data/layanan',
            '/master-data/paket-layanan',
        ],
        is_custom: false,
    },
    {
        kode_role: 'ROLE-003',
        role_key: 'beautician',
        nama_role: 'Beautician / Terapis',
        badge_severity: 'warning',
        color: '#9333ea',
        deskripsi: 'Pelayanan treatment estetika, antrean ruangan perawatan, SOP treatment, dan foto before-after.',
        status: 'aktif',
        user_count: 0,
        active_paths: [
            '/dashboard',
            '/pendaftaran-antrean/antrean?type=layanan',
            '/riwayat/rekam-medis',
            '/master-data/layanan',
        ],
        is_custom: false,
    },
    {
        kode_role: 'ROLE-004',
        role_key: 'kasir',
        nama_role: 'Kasir',
        badge_severity: 'success',
        color: '#16a34a',
        deskripsi: 'Transaksi pembayaran layanan dan produk, invoice kasir, diskon promo, serta mutasi kas klinik.',
        status: 'aktif',
        user_count: 0,
        active_paths: [
            '/dashboard',
            '/kasir',
            '/antrian-awal',
            '/pendaftaran-antrean/registrasi-pasien',
            '/pendaftaran-antrean/pendaftaran-pasien',
            '/pendaftaran-antrean/booking',
            '/pendaftaran-antrean/antrean',
            '/master-data-user/data-pasien',
            '/master-data/promo',
            '/master-data/detail-promo',
        ],
        is_custom: false,
    },
    {
        kode_role: 'ROLE-005',
        role_key: 'warehouse',
        nama_role: 'Warehouse / Logistik',
        badge_severity: 'secondary',
        color: '#ea580c',
        deskripsi: 'Katalog stok produk, bahan medis, monitoring kadaluwarsa, supplier, dan restock logistik.',
        status: 'aktif',
        user_count: 0,
        active_paths: [
            '/dashboard',
            '/master-data/kategori-produk',
            '/master-data/produk',
            '/master-data/paket-produk',
            '/master-data/inventori',
            '/master-data/supplier',
            '/master-data/alat',
        ],
        is_custom: false,
    },
    {
        kode_role: 'ROLE-006',
        role_key: 'superadmin',
        nama_role: 'Superadmin / IT',
        badge_severity: 'info',
        color: '#4f46e5',
        deskripsi: 'Administrator sistem klinik dengan hak akses tak terbatas ke seluruh menu dan konfigurasi.',
        status: 'aktif',
        user_count: 1,
        active_paths: ['*'],
        is_custom: false,
    },
    {
        kode_role: 'ROLE-007',
        role_key: 'admin',
        nama_role: 'Admin',
        badge_severity: 'info',
        color: '#0891b2',
        deskripsi: 'Pelayanan pendaftaran pasien, registrasi pasien baru, check-in kunjungan, dan display antrean pendaftaran.',
        status: 'aktif',
        user_count: 0,
        active_paths: [
            '/dashboard',
            '/antrian-awal',
            '/pendaftaran-antrean/registrasi-pasien',
            '/pendaftaran-antrean/pendaftaran-pasien',
            '/master-data-user/data-pasien',
        ],
        is_custom: false,
    },
];

export default function ManajemenMenuRolePage() {
    const toast = useRef<Toast>(null);

    const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_ROLES);
    const [masterMenu, setMasterMenu] = useState<MenuGroup[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    // Modal Create Role
    const [createRoleVisible, setCreateRoleVisible] = useState<boolean>(false);
    const [roleForm, setRoleForm] = useState({
        kode_role: '',
        role_key: '',
        nama_role: '',
        deskripsi: '',
        status: 'aktif',
    });

    // Modal Atur Hak Akses Role
    const [permissionModalVisible, setPermissionModalVisible] = useState<boolean>(false);
    const [activeRole, setActiveRole] = useState<RoleItem | null>(null);
    const [currentActivePaths, setCurrentActivePaths] = useState<Set<string>>(new Set());
    const [modalLoading, setModalLoading] = useState<boolean>(false);
    const [modalSaving, setModalSaving] = useState<boolean>(false);
    const [modalIsCustom, setModalIsCustom] = useState<boolean>(false);
    const [modalKeyword, setModalKeyword] = useState<string>('');

    // Load initial data (master menu, user counts per role)
    const loadAllData = async () => {
        setLoading(true);
        try {
            // 1. Fetch master menu template
            const resBase = await postData('/setup/nav/base-data', { role: 'master' });
            let fetchedMasterMenu: MenuGroup[] = [];
            if (['00', '0000'].includes(resBase?.data?.status)) {
                fetchedMasterMenu = resBase.data.master_menu || [];
                setMasterMenu(fetchedMasterMenu);
            }

            // 2. Fetch user counts to display on table
            let userMap: Record<string, number> = {};
            try {
                const resUsers = await postData('/setup/user-login/user-data', {});
                if (['00', '0000'].includes(resUsers?.data?.status)) {
                    (resUsers.data.data || []).forEach((u: any) => {
                        const r = String(u.role || '').toLowerCase();
                        userMap[r] = (userMap[r] || 0) + 1;
                    });
                }
            } catch (_) {
                // silent fallback
            }

            // 3. Update roles with user counts and active module paths
            setRoles((prevRoles) =>
                prevRoles.map((r) => ({
                    ...r,
                    user_count: userMap[r.role_key] ?? (r.role_key === 'superadmin' ? 1 : 0),
                }))
            );
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || error?.message || 'Gagal memuat data hak akses role');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Total available modules in the master tree
    const totalMasterModules = useMemo(() => {
        let count = 0;
        masterMenu.forEach((g) => {
            count += (g.items || []).length;
        });
        return count || 19;
    }, [masterMenu]);

    // Filter table by search keyword
    const filteredRoles = useMemo(() => {
        if (!keyword.trim()) return roles;
        const kw = keyword.toLowerCase();
        return roles.filter(
            (r) =>
                r.nama_role.toLowerCase().includes(kw) ||
                r.kode_role.toLowerCase().includes(kw) ||
                r.deskripsi.toLowerCase().includes(kw)
        );
    }, [roles, keyword]);

    // Open Modal Tambah Role Baru
    const handleOpenCreateRole = () => {
        const nextCode = `ROLE-${String(roles.length + 1).padStart(3, '0')}`;
        setRoleForm({
            kode_role: nextCode,
            role_key: '',
            nama_role: '',
            deskripsi: '',
            status: 'aktif',
        });
        setCreateRoleVisible(true);
    };

    // Save New Role
    const handleSaveNewRole = () => {
        if (!roleForm.nama_role.trim()) {
            showError(toast, 'Nama Role wajib diisi!');
            return;
        }

        const generatedKey = (roleForm.role_key || roleForm.nama_role)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_');

        const newRole: RoleItem = {
            kode_role: roleForm.kode_role,
            role_key: generatedKey,
            nama_role: roleForm.nama_role,
            badge_severity: 'info',
            color: '#6366f1',
            deskripsi: roleForm.deskripsi || 'Peran operasional kustom klinik kecantikan.',
            status: roleForm.status as any,
            user_count: 0,
            active_paths: [],
            is_custom: true,
        };

        setRoles((prev) => [...prev, newRole]);
        showSuccess(toast, `Role '${newRole.nama_role}' berhasil ditambahkan. Silakan atur hak aksesnya.`);
        setCreateRoleVisible(false);
    };

    // Open Modal Atur Hak Akses Role
    const handleOpenPermissionModal = async (role: RoleItem) => {
        setActiveRole(role);
        setModalLoading(true);
        setModalKeyword('');
        setPermissionModalVisible(true);

        try {
            const res = await postData('/setup/nav/base-data', { role: role.role_key });
            if (['00', '0000'].includes(res?.data?.status)) {
                const fullMaster: MenuGroup[] = res.data.master_menu || [];
                if (fullMaster.length > 0) {
                    setMasterMenu(fullMaster);
                }

                const currentMenu: MenuGroup[] = res.data.data || [];
                setModalIsCustom(Boolean(res.data.is_custom));

                const paths = new Set<string>();
                if (role.role_key === 'superadmin' && !res.data.is_custom) {
                    // All paths active
                    fullMaster.forEach((g) => (g.items || []).forEach((it) => paths.add(it.to)));
                } else if (res.data.is_custom) {
                    currentMenu.forEach((g) => (g.items || []).forEach((it) => paths.add(it.to)));
                } else {
                    // Use preset recommended paths
                    role.active_paths.forEach((p) => {
                        if (p === '*') {
                            fullMaster.forEach((g) => (g.items || []).forEach((it) => paths.add(it.to)));
                        } else {
                            paths.add(p);
                        }
                    });
                }

                setCurrentActivePaths(paths);
            } else {
                showError(toast, res?.data?.message || 'Gagal memuat modul role');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || error?.message || 'Gagal terhubung ke server');
        } finally {
            setModalLoading(false);
        }
    };

    // Toggle individual module item
    const handleToggleModalItem = (path: string) => {
        const next = new Set(currentActivePaths);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        setCurrentActivePaths(next);
    };

    // Toggle group modules
    const handleToggleModalGroup = (group: MenuGroup) => {
        const groupPaths = (group.items || []).map((it) => it.to);
        const allChecked = groupPaths.every((p) => currentActivePaths.has(p));
        const next = new Set(currentActivePaths);

        if (allChecked) {
            groupPaths.forEach((p) => next.delete(p));
        } else {
            groupPaths.forEach((p) => next.add(p));
        }
        setCurrentActivePaths(next);
    };

    // Quick Action: Terapkan Rekomendasi
    const handleApplyPreset = () => {
        if (!activeRole) return;
        const defaultPreset = DEFAULT_ROLES.find((r) => r.role_key === activeRole.role_key);
        const presetPaths = defaultPreset?.active_paths || [];

        const next = new Set<string>();
        if (presetPaths.includes('*') || activeRole.role_key === 'superadmin') {
            masterMenu.forEach((g) => (g.items || []).forEach((it) => next.add(it.to)));
        } else {
            presetPaths.forEach((p) => next.add(p));
        }

        setCurrentActivePaths(next);
        showSuccess(toast, `Rekomendasi hak akses standar untuk role '${activeRole.nama_role}' berhasil diterapkan.`);
    };

    // Quick Action: Pilih Semua
    const handleSelectAll = () => {
        const next = new Set<string>();
        masterMenu.forEach((g) => (g.items || []).forEach((it) => next.add(it.to)));
        setCurrentActivePaths(next);
    };

    // Quick Action: Batalkan Semua
    const handleDeselectAll = () => {
        setCurrentActivePaths(new Set());
    };

    // Save Role Permissions from Modal
    const handleSavePermissions = async () => {
        if (!activeRole) return;

        setModalSaving(true);
        try {
            const filteredMenu: MenuGroup[] = [];

            masterMenu.forEach((group) => {
                const matchingItems = (group.items || []).filter((it) => currentActivePaths.has(it.to));
                if (matchingItems.length > 0) {
                    filteredMenu.push({
                        label: group.label,
                        icon: group.icon,
                        items: matchingItems,
                    });
                }
            });

            const res = await postData('/setup/nav/role-save', {
                role: activeRole.role_key,
                menu: filteredMenu,
            });

            if (['00', '0000'].includes(res?.data?.status)) {
                showSuccess(toast, `Hak akses role '${activeRole.nama_role}' berhasil disimpan!`);

                // Update row in table
                const newActiveArray = Array.from(currentActivePaths);
                setRoles((prev) =>
                    prev.map((r) =>
                        r.role_key === activeRole.role_key
                            ? { ...r, active_paths: newActiveArray, is_custom: true }
                            : r
                    )
                );

                setPermissionModalVisible(false);
            } else {
                showError(toast, res?.data?.message || 'Gagal menyimpan pengaturan navigasi');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || error?.message || 'Terjadi kesalahan sistem');
        } finally {
            setModalSaving(false);
        }
    };

    // Delete single / batch role
    const handleDeleteRole = (role: RoleItem) => {
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus / menonaktifkan role "${role.nama_role}"?`,
            header: 'Konfirmasi Hapus Role',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: () => {
                setRoles((prev) => prev.filter((r) => r.kode_role !== role.kode_role));
                showSuccess(toast, `Role ${role.nama_role} berhasil dihapus.`);
            },
        });
    };

    const handleBatchDelete = () => {
        if (selectedRows.length === 0) return;
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus ${selectedRows.length} role yang dipilih?`,
            header: 'Konfirmasi Hapus Role',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: () => {
                const deleteCodes = new Set(selectedRows.map((r) => r.kode_role));
                setRoles((prev) => prev.filter((r) => !deleteCodes.has(r.kode_role)));
                setSelectedRows([]);
                showSuccess(toast, 'Role terpilih berhasil dihapus.');
            },
        });
    };

    // Filter masterMenu inside modal by keyword
    const filteredModalMenu = useMemo(() => {
        if (!modalKeyword.trim()) return masterMenu;
        const kw = modalKeyword.toLowerCase();
        return masterMenu
            .map((group) => {
                const groupMatches = group.label.toLowerCase().includes(kw);
                const filteredItems = (group.items || []).filter(
                    (it) => it.label.toLowerCase().includes(kw) || it.to.toLowerCase().includes(kw)
                );
                if (groupMatches) return group;
                return { ...group, items: filteredItems };
            })
            .filter((g) => (g.items || []).length > 0);
    }, [masterMenu, modalKeyword]);

    return (
        <div className="w-full">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* 1. Header Halaman */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-shield text-purple-600 text-2xl" />
                        Pengaturan Hak Akses Role
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Kelola hak akses menu untuk setiap peran (role) pengguna secara spesifik.
                    </p>
                </div>

                {/* 2. Toolbar Aksi (di atas tabel) */}
                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Baru"
                        icon="pi pi-plus"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        onClick={handleOpenCreateRole}
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
                        onClick={handleBatchDelete}
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
                        onClick={loadAllData}
                    />
                </div>

                {/* 3. Tabel Data Role & Hak Akses */}
                <DataTable
                    value={filteredRoles}
                    loading={loading}
                    paginator
                    rows={rows}
                    totalRecords={filteredRoles.length}
                    selection={selectedRows}
                    onSelectionChange={(e: any) => setSelectedRows(e.value as any[])}
                    dataKey="kode_role"
                    className="p-datatable-sm"
                    emptyMessage="Data role tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Role &amp; Hak Akses</span>
                                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <IconField iconPosition="left" className="w-full md:w-20rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                            placeholder="Cari Role..."
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
                                        onClick={() => setKeyword('')}
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
                    {/* Checkbox Multi-Selection */}
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>

                    {/* Indikator Status Warna */}
                    <Column
                        header=""
                        headerStyle={{ width: '3rem' }}
                        align="center"
                        body={(r: RoleItem) => (
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    backgroundColor: r.status === 'aktif' ? '#22c55e' : '#ef4444',
                                    boxShadow: r.status === 'aktif' ? '0 1px 3px #22c55e55' : '0 1px 3px #ef444455',
                                }}
                                title={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                            />
                        )}
                    ></Column>

                    {/* Kode Role */}
                    <Column
                        field="kode_role"
                        header="Kode Role"
                        sortable
                        headerStyle={{ fontWeight: 'bold', width: '7.5rem' }}
                        className="font-bold text-blue-700"
                    ></Column>

                    {/* Nama Role */}
                    <Column
                        field="nama_role"
                        header="Nama Role"
                        sortable
                        headerStyle={{ fontWeight: 'bold', minWidth: '12rem' }}
                        body={(r: RoleItem) => (
                            <Tag
                                value={r.nama_role.toUpperCase()}
                                severity={r.badge_severity}
                                className="text-xs font-bold px-2 py-1"
                            />
                        )}
                    ></Column>

                    {/* Deskripsi */}
                    <Column
                        field="deskripsi"
                        header="Deskripsi Tugas Role"
                        headerStyle={{ fontWeight: 'bold', minWidth: '18rem' }}
                        body={(r: RoleItem) => (
                            <span className="text-xs text-700 line-clamp-2">
                                {r.deskripsi}
                            </span>
                        )}
                    ></Column>

                    {/* Modul Aktif */}
                    <Column
                        field="active_paths"
                        header="Modul Aktif"
                        sortable
                        headerStyle={{ fontWeight: 'bold', minWidth: '10rem', textAlign: 'center' }}
                        align="center"
                        body={(r: RoleItem) => {
                            const isAll = r.active_paths.includes('*') || r.role_key === 'superadmin';
                            const count = isAll ? totalMasterModules : r.active_paths.length;
                            return (
                                <span
                                    className={`font-semibold text-xs px-2.5 py-1 border-round ${
                                        count > 0 ? 'bg-green-50 text-green-700 font-bold' : 'bg-red-50 text-red-700'
                                    }`}
                                >
                                    {count} / {totalMasterModules} Modul
                                </span>
                            );
                        }}
                    ></Column>

                    {/* Jumlah Pengguna */}
                    <Column
                        field="user_count"
                        header="Jumlah Pengguna"
                        sortable
                        headerStyle={{ fontWeight: 'bold', minWidth: '10rem', textAlign: 'center' }}
                        align="center"
                        body={(r: RoleItem) => (
                            <span className="text-xs font-bold text-600 bg-gray-100 border-round px-2 py-1">
                                {r.user_count} Pengguna
                            </span>
                        )}
                    ></Column>

                    {/* Kolom Aksi */}
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r: RoleItem) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button
                                    icon="pi pi-pencil"
                                    outlined
                                    severity="success"
                                    className="p-button-sm border-round-md"
                                    onClick={() => handleOpenPermissionModal(r)}
                                    tooltip="Atur Hak Akses Menu Role"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    outlined
                                    severity="danger"
                                    className="p-button-sm border-round-md"
                                    onClick={() => handleDeleteRole(r)}
                                    tooltip="Hapus Role"
                                />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* 4. MODAL ATUR HAK AKSES ROLE (Dibuka saat klik tombol Pensil / Edit di tabel) */}
            <Dialog
                header={
                    <div className="flex align-items-center justify-content-between w-full pr-3">
                        <div className="flex align-items-center gap-2">
                            <span
                                className="flex align-items-center justify-content-center border-round-lg shadow-1"
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    backgroundColor: activeRole?.color || '#0284c7',
                                    color: '#ffffff',
                                }}
                            >
                                <i className="pi pi-shield text-base" />
                            </span>
                            <div>
                                <h4 className="text-lg font-bold text-900 m-0">
                                    Atur Hak Akses Role: {activeRole?.nama_role}
                                </h4>
                                <span className="text-xs text-500 font-normal">
                                    Centang modul yang diizinkan untuk peran ini
                                </span>
                            </div>
                        </div>
                    </div>
                }
                visible={permissionModalVisible}
                style={{ width: '920px', maxWidth: '95vw' }}
                modal
                onHide={() => setPermissionModalVisible(false)}
                footer={
                    <div className="flex flex-column sm:flex-row justify-content-between align-items-center gap-3 pt-3 border-top-1 surface-border">
                        <span className="text-xs text-500 text-left">
                            Perubahan akan otomatis disinkronkan ke seluruh staf berkedudukan{' '}
                            <strong>{activeRole?.nama_role}</strong>.
                        </span>
                        <div className="flex gap-2">
                            <Button
                                label="Batal"
                                icon="pi pi-times"
                                outlined
                                severity="secondary"
                                onClick={() => setPermissionModalVisible(false)}
                            />
                            <Button
                                label="✓ Simpan Hak Akses Role"
                                severity="success"
                                className="font-bold px-3"
                                onClick={handleSavePermissions}
                                loading={modalSaving}
                            />
                        </div>
                    </div>
                }
            >
                <div className="pt-2">
                    {/* Header Info Banner */}
                    <div
                        className="p-3 border-round-xl border-1 mb-3 flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3"
                        style={{
                            borderColor: `${activeRole?.color || '#0284c7'}40`,
                            backgroundColor: '#f8fafc',
                        }}
                    >
                        <div>
                            <div className="flex align-items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-900">{activeRole?.nama_role}</span>
                                <Tag
                                    value={modalIsCustom ? 'KONFIGURASI KHUSUS' : 'MENGIKUTI DEFAULT'}
                                    severity={modalIsCustom ? 'success' : 'info'}
                                    className="text-[10px] font-bold"
                                />
                            </div>
                            <span className="text-xs text-600 block">{activeRole?.deskripsi}</span>
                        </div>

                        {/* Quick Action Preset Buttons */}
                        <div className="flex flex-wrap gap-2 align-items-center">
                            <Button
                                label="Terapkan Rekomendasi"
                                icon="pi pi-bolt"
                                size="small"
                                outlined
                                className="text-xs font-bold border-round-md bg-white border-purple-600 text-purple-600"
                                onClick={handleApplyPreset}
                                tooltip="Terapkan modul standar yang direkomendasikan untuk tugas peran ini"
                            />
                            <Button
                                label="Pilih Semua"
                                icon="pi pi-check-square"
                                size="small"
                                outlined
                                severity="secondary"
                                className="text-xs font-bold border-round-md bg-white"
                                onClick={handleSelectAll}
                            />
                            <Button
                                label="Batalkan Semua"
                                icon="pi pi-times-circle"
                                size="small"
                                outlined
                                severity="danger"
                                className="text-xs font-bold border-round-md bg-white"
                                onClick={handleDeselectAll}
                            />
                        </div>
                    </div>

                    {/* Progress Info & Search Bar */}
                    <div className="flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                        <span className="text-xs font-semibold text-gray-700">
                            Modul Terpilih:{' '}
                            <strong className="text-green-700 font-bold">
                                {currentActivePaths.size}
                            </strong>{' '}
                            dari {totalMasterModules} modul aktif untuk peran ini
                        </span>

                        <IconField iconPosition="left" className="w-full sm:w-16rem">
                            <InputIcon className="pi pi-search" />
                            <InputText
                                value={modalKeyword}
                                onChange={(e) => setModalKeyword(e.target.value)}
                                placeholder="Cari nama modul..."
                                className="w-full text-xs"
                            />
                        </IconField>
                    </div>

                    {/* Category Cards Grid */}
                    {modalLoading ? (
                        <div className="p-4 text-center text-500">
                            <i className="pi pi-spin pi-spinner text-2xl mb-2" />
                            <p className="text-xs">Memuat daftar modul hak akses...</p>
                        </div>
                    ) : (
                        <div className="grid" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            {filteredModalMenu.map((group, groupIdx) => {
                                const groupPaths = (group.items || []).map((it) => it.to);
                                const activeInGroup = groupPaths.filter((p) => currentActivePaths.has(p)).length;
                                const isAllChecked = groupPaths.length > 0 && activeInGroup === groupPaths.length;

                                return (
                                    <div key={groupIdx} className="col-12 md:col-6">
                                        <div className="surface-card border-round-xl border-1 surface-border shadow-1 h-full flex flex-column overflow-hidden">
                                            {/* Card Group Header */}
                                            <div
                                                onClick={() => handleToggleModalGroup(group)}
                                                className="p-2.5 surface-100 border-bottom-1 surface-border flex justify-content-between align-items-center cursor-pointer hover:surface-200 transition-colors"
                                            >
                                                <div className="flex align-items-center gap-2">
                                                    <Checkbox
                                                        checked={isAllChecked}
                                                        onChange={() => handleToggleModalGroup(group)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <i className={`${group.icon || 'pi pi-folder'} text-sm text-purple-600`} />
                                                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                                                        {group.label}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 border-round ${
                                                        activeInGroup > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-200 text-gray-600'
                                                    }`}
                                                >
                                                    {activeInGroup} / {groupPaths.length}
                                                </span>
                                            </div>

                                            {/* Card Items List */}
                                            <div className="p-2 flex flex-column gap-1 flex-1">
                                                {(group.items || []).map((item, itemIdx) => {
                                                    const isItemChecked = currentActivePaths.has(item.to);
                                                    return (
                                                        <div
                                                            key={itemIdx}
                                                            onClick={() => handleToggleModalItem(item.to)}
                                                            className={`p-2 border-round-md cursor-pointer flex justify-content-between align-items-center transition-all ${
                                                                isItemChecked
                                                                    ? 'bg-purple-50 border-1 border-purple-200'
                                                                    : 'hover:surface-50 border-1 border-transparent'
                                                                }`}
                                                        >
                                                            <div className="flex align-items-center gap-2">
                                                                <Checkbox
                                                                    checked={isItemChecked}
                                                                    onChange={() => handleToggleModalItem(item.to)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <i
                                                                    className={`${item.icon || 'pi pi-circle'} text-xs ${
                                                                        isItemChecked ? 'text-purple-700' : 'text-gray-400'
                                                                    }`}
                                                                />
                                                                <span
                                                                    className={`text-xs ${
                                                                        isItemChecked ? 'font-bold text-purple-900' : 'text-gray-700 font-normal'
                                                                    }`}
                                                                >
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                {item.to}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Dialog>

            {/* 5. MODAL TAMBAH ROLE BARU (+ Baru) */}
            <Dialog
                header="Tambah Role Baru"
                visible={createRoleVisible}
                style={{ width: '480px' }}
                modal
                onHide={() => setCreateRoleVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 pt-3 border-top-1 surface-border">
                        <Button
                            label="Batal"
                            icon="pi pi-times"
                            outlined
                            severity="secondary"
                            onClick={() => setCreateRoleVisible(false)}
                        />
                        <Button
                            label="Simpan Role"
                            icon="pi pi-check"
                            severity="success"
                            onClick={handleSaveNewRole}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Kode Role *</label>
                        <InputText
                            value={roleForm.kode_role}
                            onChange={(e) => setRoleForm({ ...roleForm, kode_role: e.target.value })}
                            placeholder="Contoh: ROLE-007"
                            className="w-full text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Nama Role *</label>
                        <InputText
                            value={roleForm.nama_role}
                            onChange={(e) => setRoleForm({ ...roleForm, nama_role: e.target.value })}
                            placeholder="Contoh: Staf Front Office / Konsultan"
                            className="w-full text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Deskripsi Tugas</label>
                        <InputText
                            value={roleForm.deskripsi}
                            onChange={(e) => setRoleForm({ ...roleForm, deskripsi: e.target.value })}
                            placeholder="Contoh: Bertanggung jawab pada pendaftaran & pelayanan tamu."
                            className="w-full text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Status</label>
                        <Dropdown
                            value={roleForm.status}
                            options={[
                                { label: 'Aktif', value: 'aktif' },
                                { label: 'Tidak Aktif', value: 'tidak aktif' },
                            ]}
                            onChange={(e) => setRoleForm({ ...roleForm, status: e.value })}
                            className="w-full text-sm"
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
