/* eslint-disable @next/next/no-img-element */
'use client'
import React, { useContext, useEffect, useRef, useState } from 'react';
import AppMenuitem from './AppMenuitem';
import { LayoutContext } from './context/layoutcontext';
import { MenuProvider } from './context/menucontext';
import { useSession } from 'next-auth/react';
import postData from '@/lib/axios/postData';
import { InputText } from 'primereact/inputtext';
import { AppMenuItem } from '@/types';
import { Skeleton } from 'primereact/skeleton';
import { InputIcon } from 'primereact/inputicon';
import { IconField } from 'primereact/iconfield';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ClipboardList } from 'lucide-react';

interface MenuState {
    searchVal: string;
    filteredMenu: AppMenuItem[];
    load: boolean;
    menu: AppMenuItem[];
    allowedPaths: Set<string>;
}

interface RuanganItem {
    kode_ruangan: string;
    nama_ruangan: string;
}

const LAPORAN_MENU_ITEMS = [
    { id: 'penjualan', label: 'Laporan Penjualan', icon: 'pi-shopping-cart' },
    { id: 'treatment', label: 'Laporan Treatment', icon: 'pi-sparkles' },
    { id: 'produk', label: 'Laporan Produk', icon: 'pi-box' },
    { id: 'paket', label: 'Laporan Paket', icon: 'pi-tags' },
    { id: 'pasien', label: 'Laporan Pasien', icon: 'pi-users' },
    { id: 'kunjungan', label: 'Laporan Kunjungan', icon: 'pi-calendar' },
    { id: 'dokter', label: 'Laporan Dokter', icon: 'pi-heart' },
    { id: 'beautician', label: 'Laporan Beautician', icon: 'pi-star' },
    { id: 'inventory', label: 'Laporan Inventory', icon: 'pi-database' },
    { id: 'keuangan', label: 'Laporan Keuangan', icon: 'pi-wallet' },
    { id: 'voucher', label: 'Laporan Voucher', icon: 'pi-ticket' },
    { id: 'rekam_medis', label: 'Laporan RME', icon: 'ClipboardList' },
    { id: 'membership', label: 'Laporan Membership', icon: 'pi-id-card' },
    { id: 'appointment', label: 'Laporan Appointment', icon: 'pi-clock' },
    { id: 'komisi', label: 'Laporan Komisi', icon: 'pi-percentage' },
    { id: 'stok_opname', label: 'Laporan Stok Opname', icon: 'pi-check-square' },
    { id: 'pembelian', label: 'Laporan Pembelian', icon: 'pi-truck' },
    { id: 'expired', label: 'Laporan Expired', icon: 'pi-exclamation-triangle' },
    { id: 'deposit', label: 'Laporan Deposit', icon: 'pi-money-bill' },
    { id: 'crm', label: 'Laporan CRM', icon: 'pi-comments' },
];

const DEFAULT_MASTER_DATA_ITEMS: AppMenuItem[] = [
    { label: 'Kategori Layanan', icon: 'pi pi-fw pi-tags', to: '/master-data/kategori-layanan' },
    { label: 'Data Layanan', icon: 'pi pi-fw pi-briefcase', to: '/master-data/layanan' },
    { label: 'Paket Layanan', icon: 'pi pi-fw pi-box', to: '/master-data/paket-layanan' },
    { label: 'Kategori Produk', icon: 'pi pi-fw pi-tags', to: '/master-data/kategori-produk' },
    { label: 'Data Produk', icon: 'pi pi-fw pi-box', to: '/master-data/produk' },
    { label: 'Paket Produk', icon: 'pi pi-fw pi-inbox', to: '/master-data/paket-produk' },
    { label: 'Inventori', icon: 'pi pi-fw pi-box', to: '/master-data/inventori' },
    { label: 'Supplier', icon: 'pi pi-fw pi-truck', to: '/master-data/supplier' },
    { label: 'Karyawan', icon: 'pi pi-fw pi-users', to: '/master-data/karyawan' },
    { label: 'Jadwal Karyawan', icon: 'pi pi-fw pi-calendar-times', to: '/master-data/jadwal-karyawan' },
    { label: 'Alat & Peralatan', icon: 'pi pi-fw pi-wrench', to: '/master-data/alat' },
    { label: 'Data Ruangan', icon: 'pi pi-fw pi-building', to: '/master-data/ruangan' },
    { label: 'Data Promo', icon: 'pi pi-fw pi-percentage', to: '/master-data/promo' },
    { label: 'Detail Promo', icon: 'pi pi-fw pi-tags', to: '/master-data/detail-promo' },
];

const DEFAULT_PENDAFTARAN_ITEMS: AppMenuItem[] = [
    { label: 'Antrean Pendaftaran', icon: 'pi pi-fw pi-ticket', to: '/antrian-awal' },
    { label: 'Pasien Baru', icon: 'UserPlus', to: '/pendaftaran-antrean/registrasi-pasien' },
    { label: 'Pendaftaran Kunjungan', icon: 'ClipboardList', to: '/pendaftaran-antrean/pendaftaran-pasien' },
];

const DEFAULT_PENGATURAN_ITEMS: AppMenuItem[] = [
    { label: 'Pengaturan Klinik', icon: 'pi pi-fw pi-sliders-h', to: '/setup/config' },
    { label: 'Data Pasien', icon: 'pi pi-fw pi-user', to: '/master-data-user/data-pasien' },
    { label: 'Manajemen User', icon: 'pi pi-fw pi-users', to: '/setup/users' },
    { label: 'Manajemen Role', icon: 'pi pi-fw pi-shield', to: '/setup/navigation' },
];

const DEFAULT_SUPERADMIN_PENGATURAN_ITEMS: AppMenuItem[] = [
    { label: 'Monitoring Cabang', icon: 'pi pi-fw pi-chart-line', to: '/setup/monitoring-cabang' },
    { label: 'Manajemen Cabang', icon: 'pi pi-fw pi-building', to: '/setup/cabang' },
    { label: 'Pengaturan Klinik', icon: 'pi pi-fw pi-sliders-h', to: '/setup/config' },
    { label: 'Manajemen User', icon: 'pi pi-fw pi-users', to: '/setup/users' },
    { label: 'Manajemen Role', icon: 'pi pi-fw pi-shield', to: '/setup/navigation' },
];

const AppMenu = () => {
    const { data: session } = useSession();
    const { layoutConfig } = useContext(LayoutContext);
    const searchRef = useRef<HTMLInputElement>(null);
    const lastPressTime = useRef<number>(0);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeRuangan = searchParams.get('ruangan') || '';

    const isLaporanPage = pathname === '/riwayat/rekam-medis';
    const activeReportTab = isLaporanPage ? (searchParams.get('tab') || 'penjualan') : '';
    const [isLaporanOpen, setIsLaporanOpen] = useState<boolean>(true);

    useEffect(() => {
        if (isLaporanPage) {
            setIsLaporanOpen(true);
        }
    }, [isLaporanPage, pathname, searchParams]);

    const toggleLaporanAccordion = () => {
        setIsLaporanOpen((prev) => !prev);
    };

    const [state, setState] = useState<MenuState>({
        searchVal: "",
        filteredMenu: [],
        load: true,
        menu: [],
        allowedPaths: new Set(),
    });

    useEffect(() => {
        if (state.searchVal.trim()) {
            const searchLower = state.searchVal.toLowerCase();
            const hasMatch = LAPORAN_MENU_ITEMS.some((item) =>
                item.label.toLowerCase().includes(searchLower)
            ) || 'data laporan'.includes(searchLower);
            if (hasMatch) {
                setIsLaporanOpen(true);
            }
        }
    }, [state.searchVal]);

    const userRole = (session?.user?.role || '').toLowerCase();
    const isOwnerOrManagerRole = userRole === 'owner' || userRole === 'manager';

    const getRoleAllowedReports = () => {
        if (isOwnerOrManagerRole) return LAPORAN_MENU_ITEMS;
        if (userRole === 'dokter') {
            return LAPORAN_MENU_ITEMS.filter((it) => ['dokter', 'rekam_medis', 'pasien', 'kunjungan'].includes(it.id));
        }
        if (userRole === 'beautician') {
            return LAPORAN_MENU_ITEMS.filter((it) => ['beautician', 'treatment'].includes(it.id));
        }
        if (userRole === 'kasir') {
            return LAPORAN_MENU_ITEMS.filter((it) => ['penjualan', 'keuangan', 'voucher', 'deposit', 'pasien'].includes(it.id));
        }
        if (userRole === 'warehouse') {
            return LAPORAN_MENU_ITEMS.filter((it) => ['inventory', 'pembelian', 'expired', 'stok_opname', 'produk'].includes(it.id));
        }
        if (userRole === 'admin') {
            return LAPORAN_MENU_ITEMS.filter((it) => ['pasien', 'kunjungan', 'appointment'].includes(it.id));
        }
        return LAPORAN_MENU_ITEMS;
    };

    const roleReports = getRoleAllowedReports();

    const filteredReports = state.searchVal.trim()
        ? roleReports.filter((it) =>
              it.label.toLowerCase().includes(state.searchVal.toLowerCase())
          )
        : roleReports;

    const [ruanganList, setRuanganList] = useState<RuanganItem[]>([]);
    const [loadRuangan, setLoadRuangan] = useState<boolean>(true);

    useEffect(() => {
        getMenu(session?.user?.user_code || 'USR000000');
    }, [session]);

    useEffect(() => {
        fetchRuangan();
    }, []);

    const fetchRuangan = async () => {
        setLoadRuangan(true);
        try {
            const res = await postData('/master/ruangan-dropdown', {});
            setRuanganList(res.data.data || []);
        } catch (_) {
            // silent fail - sidebar tetap tampil tanpa ruangan
        } finally {
            setLoadRuangan(false);
        }
    };

    const getMenu = async (user_code: string) => {
        setState(prev => ({ ...prev, load: true }));
        try {
            const { data: vaData } = await postData('/setup/nav/user-data', { user_code: user_code });

            if (!vaData?.data) {
                throw new Error('Invalid menu data');
            }

            const rawMenu: AppMenuItem[] = JSON.parse(JSON.stringify(vaData.data));
            const userAllowedPaths = new Set<string>();
            const scanAllowedPaths = (items: any[]) => {
                if (!Array.isArray(items)) return;
                for (const it of items) {
                    if (it.to) userAllowedPaths.add(it.to);
                    if (it.items) scanAllowedPaths(it.items);
                }
            };
            scanAllowedPaths(rawMenu);

            const transformItem = (item: AppMenuItem): AppMenuItem => {
                const newItem: AppMenuItem = { ...item };
                if (
                    newItem.label &&
                    (newItem.label.toLowerCase().includes('master data & user') ||
                        newItem.label.toLowerCase().includes('pengaturan') ||
                        newItem.label.toLowerCase().includes('setup'))
                ) {
                    newItem.label = 'PENGATURAN KLINIK';
                }
                if (
                    (newItem.label && (newItem.label.toLowerCase() === 'antrean awal' || newItem.label.toLowerCase() === 'antrian awal')) ||
                    newItem.to === '/antrian-awal' ||
                    newItem.to === '/pendaftaran-antrean/antrean-awal' ||
                    newItem.to === '/pendaftaran-antrean/antrian-awal'
                ) {
                    newItem.label = 'Antrean Pendaftaran';
                }
                if (newItem.items && newItem.items.length > 0) {
                    let subItems = newItem.items
                        .filter((sub) => {
                            const lbl = (sub.label || '').trim().toLowerCase();
                            const to = (sub.to || '').trim().toLowerCase();
                            return !(lbl === 'antrean' && to === '/pendaftaran-antrean/antrean');
                        })
                        .map(transformItem);

                    const groupLabel = (newItem.label || '').toLowerCase();
                    if (groupLabel.includes('pendaftaran') && groupLabel.includes('antrean')) {
                        const pasienBaruItem: AppMenuItem = {
                            label: 'Pasien Baru',
                            to: '/pendaftaran-antrean/registrasi-pasien',
                            icon: 'UserPlus',
                        };

                        const hasPasienBaru = subItems.some(
                            (it) => it.to === '/pendaftaran-antrean/registrasi-pasien' || (it.label || '').toLowerCase().includes('registrasi pasien') || (it.label || '').toLowerCase().includes('pasien baru')
                        );
                        if (!hasPasienBaru) {
                            const antreanIdx = subItems.findIndex(
                                (it) => (it.label || '').toLowerCase().includes('antrean pendaftaran') || it.to === '/antrian-awal'
                            );
                            if (antreanIdx !== -1) {
                                subItems.splice(antreanIdx + 1, 0, pasienBaruItem);
                            } else {
                                subItems.unshift(pasienBaruItem);
                            }
                        } else {
                            subItems = subItems.map((it) => {
                                if (it.to === '/pendaftaran-antrean/registrasi-pasien' || (it.label || '').toLowerCase().includes('registrasi pasien') || (it.label || '').toLowerCase().includes('pasien baru')) {
                                    return { ...it, label: 'Pasien Baru', to: '/pendaftaran-antrean/registrasi-pasien', icon: 'UserPlus' };
                                }
                                return it;
                            });
                        }

                        // Update nama menu: Pendaftaran Pasien -> Pendaftaran Kunjungan
                        subItems = subItems.map((it) => {
                            if (
                                it.to === '/pendaftaran-antrean/pendaftaran-pasien' ||
                                (it.label || '').toLowerCase().includes('pendaftaran pasien') ||
                                (it.label || '').toLowerCase().includes('pendaftaran kunjungan')
                            ) {
                                return {
                                    ...it,
                                    label: 'Pendaftaran Kunjungan',
                                    to: '/pendaftaran-antrean/pendaftaran-pasien',
                                    icon: 'ClipboardList'
                                };
                            }
                            return it;
                        });

                        // Fitur Booking sudah dipindahkan menjadi tab di Pendaftaran Kunjungan,
                        // hapus dari sidebar agar tidak duplikat
                        subItems = subItems.filter(
                            (it) => !it.to?.includes('/booking') && !(it.label || '').toLowerCase().includes('booking')
                        );

                        // Pastikan urutan item konsisten:
                        // 1. Antrean Pendaftaran
                        // 2. Pasien Baru
                        // 3. Pendaftaran Kunjungan
                        const getOrderScore = (it: AppMenuItem) => {
                            const to = (it.to || '').toLowerCase();
                            const lbl = (it.label || '').toLowerCase();
                            if (to === '/antrian-awal' || lbl.includes('antrean pendaftaran') || lbl.includes('antrian awal')) return 1;
                            if (to === '/pendaftaran-antrean/registrasi-pasien' || lbl.includes('pasien baru') || lbl.includes('registrasi pasien')) return 2;
                            if (to === '/pendaftaran-antrean/pendaftaran-pasien' || lbl.includes('pendaftaran kunjungan') || lbl.includes('pendaftaran pasien')) return 3;
                            if (to === '/pendaftaran-antrean/booking' || lbl.includes('booking')) return 4;
                            return 99;
                        };
                        subItems.sort((a, b) => getOrderScore(a) - getOrderScore(b));
                    }
                    const currentRole = (session?.user?.role || '').toLowerCase();
                    const isOwnerOrManagerCurrent = currentRole === 'owner' || currentRole === 'manager';
                    if (groupLabel.includes('master data') && isOwnerOrManagerCurrent) {
                        DEFAULT_MASTER_DATA_ITEMS.forEach((defItem) => {
                            const exists = subItems.some(
                                (it) => it.to === defItem.to || (it.label || '').toLowerCase() === defItem.label.toLowerCase()
                            );
                            if (!exists) {
                                subItems.push(defItem);
                            }
                        });
                    }

                    if (groupLabel.includes('pengaturan') || groupLabel.includes('master data & user') || groupLabel.includes('setup')) {
                        const isSuperAdminRole = (session?.user?.role || '').toLowerCase() === 'superadmin';
                        const configItem: AppMenuItem = {
                            label: 'Pengaturan Klinik',
                            to: '/setup/config',
                            icon: 'pi pi-fw pi-sliders-h',
                        };
                        const hasConfig = subItems.some(
                            (it) => it.to === '/setup/config' || (it.label || '').toLowerCase().includes('pengaturan klinik') || (it.label || '').toLowerCase().includes('profil')
                        );

                        if (isSuperAdminRole) {
                            const hasMonitoring = subItems.some((it) => it.to === '/setup/monitoring-cabang');
                            const hasCabang = subItems.some((it) => it.to === '/setup/cabang');
                            if (!hasMonitoring) {
                                subItems.unshift({
                                    label: 'Monitoring Cabang',
                                    to: '/setup/monitoring-cabang',
                                    icon: 'pi pi-fw pi-chart-line',
                                });
                            }
                            if (!hasCabang) {
                                const monIdx = subItems.findIndex((it) => it.to === '/setup/monitoring-cabang');
                                subItems.splice(monIdx + 1, 0, {
                                    label: 'Manajemen Cabang',
                                    to: '/setup/cabang',
                                    icon: 'pi pi-fw pi-building',
                                });
                            }
                            if (!hasConfig) {
                                const cabIdx = subItems.findIndex((it) => it.to === '/setup/cabang');
                                if (cabIdx !== -1) {
                                    subItems.splice(cabIdx + 1, 0, configItem);
                                } else {
                                    subItems.unshift(configItem);
                                }
                            }
                        } else {
                            if (!hasConfig) {
                                subItems.unshift(configItem);
                            }
                        }

                        // Standarisasi label dan ikon menu pengaturan
                        subItems = subItems.map((it) => {
                            const to = (it.to || '').toLowerCase();
                            if (to === '/setup/config') return { ...it, label: 'Pengaturan Klinik', icon: 'pi pi-fw pi-sliders-h' };
                            if (to === '/setup/monitoring-cabang') return { ...it, label: 'Monitoring Cabang', icon: 'pi pi-fw pi-chart-line' };
                            if (to === '/setup/cabang') return { ...it, label: 'Manajemen Cabang', icon: 'pi pi-fw pi-building' };
                            if (to === '/master-data-user/data-pasien') return { ...it, label: 'Data Pasien', icon: 'pi pi-fw pi-user' };
                            if (to === '/setup/users') return { ...it, label: 'Manajemen User', icon: 'pi pi-fw pi-users' };
                            if (to === '/setup/navigation') return { ...it, label: 'Manajemen Role', icon: 'pi pi-fw pi-shield' };
                            return it;
                        });
                    }

                    newItem.items = subItems;
                }
                return newItem;
            };
            let transformedMenu = rawMenu
                .filter((item) => {
                    const lbl = (item.label || '').trim().toLowerCase();
                    const to = (item.to || '').trim().toLowerCase();
                    return !(lbl === 'antrean' && to === '/pendaftaran-antrean/antrean');
                })
                .map(transformItem);

            const currentRole = (session?.user?.role || '').toLowerCase();
            const isSuperAdminRole = currentRole === 'superadmin';
            const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';

            if (isOwnerOrManager) {
                // Garansi Master Data selalu ada di sidebar (khusus pengguna Owner / Manager)
                const hasMasterData = transformedMenu.some(
                    (it) => (it.label || '').toLowerCase().includes('master data') && !(it.label || '').toLowerCase().includes('pengaturan')
                );
                if (!hasMasterData) {
                    const homeIdx = transformedMenu.findIndex(
                        (it) => {
                            const lbl = (it.label || '').toLowerCase();
                            return lbl === 'home' || lbl === 'beranda' || lbl.includes('dashboard') || it.to === '/';
                        }
                    );
                    const masterGroup: AppMenuItem = {
                        label: 'MASTER DATA',
                        icon: 'pi pi-fw pi-database',
                        items: DEFAULT_MASTER_DATA_ITEMS,
                    };
                    if (homeIdx !== -1) {
                        transformedMenu.splice(homeIdx + 1, 0, transformItem(masterGroup));
                    } else {
                        transformedMenu.unshift(transformItem(masterGroup));
                    }
                }

                // Garansi Pendaftaran & Antrean selalu ada di sidebar untuk Owner / Manager
                const hasPendaftaran = transformedMenu.some(
                    (it) => {
                        const lbl = (it.label || '').toLowerCase();
                        return (lbl.includes('pendaftaran') || lbl.includes('antrean')) && !lbl.includes('master data') && !lbl.includes('pengaturan');
                    }
                );
                if (!hasPendaftaran) {
                    const pendaftaranGroup: AppMenuItem = {
                        label: 'Pendaftaran & Antrean',
                        icon: 'pi pi-fw pi-calendar',
                        items: DEFAULT_PENDAFTARAN_ITEMS,
                    };
                    const masterIdx = transformedMenu.findIndex(
                        (it) => (it.label || '').toLowerCase().includes('master data') && !(it.label || '').toLowerCase().includes('pengaturan')
                    );
                    if (masterIdx !== -1) {
                        transformedMenu.splice(masterIdx + 1, 0, transformItem(pendaftaranGroup));
                    } else {
                        transformedMenu.push(transformItem(pendaftaranGroup));
                    }
                }

                // Garansi Pengaturan Klinik selalu ada di sidebar untuk Owner / Manager
                const hasPengaturan = transformedMenu.some(
                    (it) => (it.label || '').toLowerCase().includes('pengaturan') || (it.label || '').toLowerCase().includes('setup')
                );
                if (!hasPengaturan) {
                    const pengaturanGroup: AppMenuItem = {
                        label: 'PENGATURAN KLINIK',
                        icon: 'pi pi-fw pi-cog',
                        items: DEFAULT_PENGATURAN_ITEMS,
                    };
                    transformedMenu.push(transformItem(pengaturanGroup));
                }
            } else if (isSuperAdminRole) {
                // Khusus Superadmin: HANYA Dashboard dan Pengaturan Klinik
                transformedMenu = transformedMenu.filter((it) => {
                    const lbl = (it.label || '').toLowerCase();
                    return lbl === 'home' || lbl === 'beranda' || lbl.includes('dashboard') || lbl.includes('pengaturan') || lbl.includes('setup');
                });
            }

            const menu2: AppMenuItem[] = JSON.parse(JSON.stringify(transformedMenu));

            setState(prev => ({
                ...prev,
                filteredMenu: menu2,
                menu: transformedMenu,
                allowedPaths: userAllowedPaths
            }));
        } catch (error) {
            console.error("Error loading menu:", error);
            const isSuperAdminRole = (session?.user?.role || '').toLowerCase() === 'superadmin';
            const fallbackMenu: AppMenuItem[] = isSuperAdminRole
                ? [
                    {
                        label: 'HOME',
                        icon: 'pi pi-fw pi-home',
                        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/dashboard' }]
                    },
                    {
                        label: 'PENGATURAN KLINIK',
                        icon: 'pi pi-fw pi-cog',
                        items: DEFAULT_SUPERADMIN_PENGATURAN_ITEMS
                    }
                ]
                : [
                    {
                        label: 'HOME',
                        icon: 'pi pi-fw pi-home',
                        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/dashboard' }]
                    },
                    {
                        label: 'MASTER DATA',
                        icon: 'pi pi-fw pi-database',
                        items: DEFAULT_MASTER_DATA_ITEMS
                    },
                    {
                        label: 'Pendaftaran & Antrean',
                        icon: 'pi pi-fw pi-calendar',
                        items: DEFAULT_PENDAFTARAN_ITEMS
                    },
                    {
                        label: 'PENGATURAN KLINIK',
                        icon: 'pi pi-fw pi-cog',
                        items: DEFAULT_PENGATURAN_ITEMS
                    }
                ];
            setState(prev => ({
                ...prev,
                filteredMenu: fallbackMenu,
                menu: fallbackMenu,
                allowedPaths: new Set()
            }));
        } finally {
            setState(prev => ({ ...prev, load: false }));
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === "f") {
                const now = Date.now();

                if (now - lastPressTime.current < 1000) {
                    lastPressTime.current = 0;
                    return;
                }

                e.preventDefault();
                lastPressTime.current = now;
                searchRef.current?.focus();
                searchRef.current?.select();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const searchMenuByLabel = (
        menu: AppMenuItem[] | undefined,
        keyword: string,
        parentIndexes: number[] = []
    ): AppMenuItem[] => {
        if (!Array.isArray(menu) || menu.length === 0) return [];

        const lowerKeyword = keyword?.toLowerCase() || "";

        if (!lowerKeyword.trim()) {
            return menu.map((item, idx) => {
                const newItem: AppMenuItem = {
                    ...item,
                    indexPath: [...parentIndexes, idx],
                };

                if (item.items && item.items.length > 0) {
                    newItem.items = searchMenuByLabel(item.items, "", [...parentIndexes, idx]);
                }

                return newItem;
            });
        }

        return menu
            .map((item, idx): AppMenuItem | null => {
                const isMatch = item.label?.toLowerCase().includes(lowerKeyword);
                const childMatches = searchMenuByLabel(item.items || [], keyword, [...parentIndexes, idx]);

                if (isMatch) {
                    const newItem: AppMenuItem = {
                        ...item,
                        indexPath: [...parentIndexes, idx]
                    };
                    if (item.items && item.items.length > 0) {
                        newItem.items = childMatches;
                    }
                    return newItem;
                } else if (childMatches.length > 0) {
                    const newItem: AppMenuItem = {
                        ...item,
                        indexPath: [...parentIndexes, idx]
                    };
                    if (item.items && item.items.length > 0) {
                        newItem.items = childMatches;
                    }
                    return newItem;
                }

                return null;
            })
            .filter((item): item is AppMenuItem => item !== null);
    };

    useEffect(() => {
        const filtered = searchMenuByLabel(state.menu, state.searchVal);
        setState(prev => ({ ...prev, filteredMenu: filtered }));
    }, [state.menu, state.searchVal]);

    return (
        <MenuProvider>
            <div className="layout-sidebar-search">
                <span className="block w-full p-input-icon-left">
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            type="search"
                            ref={searchRef}
                            className="w-full"
                            value={state.searchVal}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const keyword = e.target.value;
                                const filtered = searchMenuByLabel(state.menu, keyword);
                                setState(prev => ({
                                    ...prev,
                                    searchVal: keyword,
                                    filteredMenu: filtered
                                }));
                            }}
                            placeholder="Search..."
                        />
                    </IconField>
                </span>
            </div>
            <div className="layout-menu-container">
                <ul className="layout-menu">
                {state.load
                    ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((item, i) => (
                        <li key={i} className="my-3">
                            <Skeleton className="py-4" />
                        </li>
                    ))
                    : (() => {
                        const isHomeItem = (item: AppMenuItem) => {
                            const lbl = (item.label || '').toLowerCase();
                            return lbl === 'home' || lbl === 'beranda' || lbl.includes('dashboard') || item.to === '/';
                        };

                        const isMasterDataItem = (item: AppMenuItem) => {
                            const lbl = (item.label || '').toLowerCase();
                            return lbl.includes('master data') && !lbl.includes('pengaturan') && !lbl.includes('& user');
                        };

                        const isPendaftaranItem = (item: AppMenuItem) => {
                            const lbl = (item.label || '').toLowerCase();
                            return (
                                (lbl.includes('pendaftaran') || lbl.includes('antrean') || lbl.includes('antrian')) &&
                                !isHomeItem(item) &&
                                !isMasterDataItem(item)
                            );
                        };

                        const isPengaturanItem = (item: AppMenuItem) => {
                            const lbl = (item.label || '').toLowerCase();
                            return lbl.includes('pengaturan') || lbl.includes('master data & user') || lbl.includes('setup');
                        };

                        const currentRole = (session?.user?.role || '').toLowerCase();
                        const isSuperAdminRole = currentRole === 'superadmin';
                        const isOwnerOrManager = currentRole === 'owner' || currentRole === 'manager';

                        // 1. Home / Dashboard
                        const homeItems = state.filteredMenu.filter(isHomeItem);
                        // 2. Master Data (tampilkan jika ada di menu pengguna dan bukan superadmin)
                        const masterDataItems = !isSuperAdminRole ? state.filteredMenu.filter(isMasterDataItem) : [];
                        // 3. Pendaftaran (tampilkan jika ada di menu pengguna dan bukan superadmin)
                        const pendaftaranItems = !isSuperAdminRole ? state.filteredMenu.filter(isPendaftaranItem) : [];
                        // 7. Pengaturan (HANYA untuk Superadmin dan Owner/Manager)
                        const pengaturanItems = (isSuperAdminRole || isOwnerOrManager) ? state.filteredMenu.filter(isPengaturanItem) : [];

                        // Item tambahan lainnya di luar kategori utama dan bukan kasir/laporan/layanan operasional
                        const extraItems = state.filteredMenu.filter((item) => {
                            if (isHomeItem(item) || isMasterDataItem(item) || isPendaftaranItem(item) || isPengaturanItem(item)) return false;
                            const lbl = (item.label || '').toLowerCase();
                            return !lbl.includes('kasir') && !lbl.includes('laporan') && !lbl.includes('riwayat') && lbl !== 'layanan' && lbl !== 'layanan & tindakan';
                        });

                        const renderItem = (item: AppMenuItem, i: number) =>
                            !item.separator ? (
                                <AppMenuitem
                                    load={state.load}
                                    item={item}
                                    root={true}
                                    index={i}
                                    key={item.label || i}
                                />
                            ) : (
                                <li className="menu-separator" key={`separator-${i}`}></li>
                            );

                        // Hak Akses Operasional Berdasarkan Role & Permission Navigasi yang Diberikan
                        const hasAllowedPath = (target: string) => {
                            if (state.allowedPaths.has(target)) return true;
                            for (const p of state.allowedPaths) {
                                if (target.includes('?') && p.startsWith(target)) return true;
                                if (!target.includes('?') && (p === target || p.startsWith(target + '?'))) return true;
                            }
                            return false;
                        };

                        const canAccessTindakan =
                            !isSuperAdminRole &&
                            (isOwnerOrManager ||
                                hasAllowedPath('/pendaftaran-antrean/antrean?type=layanan') ||
                                (state.allowedPaths.size === 0 && ['dokter', 'beautician'].includes(currentRole)));

                        const canAccessKonsul =
                            !isSuperAdminRole &&
                            (isOwnerOrManager ||
                                hasAllowedPath('/pendaftaran-antrean/antrean?type=konsul') ||
                                (state.allowedPaths.size === 0 && currentRole === 'dokter'));

                        const canAccessAntreanRuangan =
                            !isSuperAdminRole &&
                            (isOwnerOrManager ||
                                state.allowedPaths.has('/pendaftaran-antrean/antrean') ||
                                (state.allowedPaths.size === 0 && ['beautician', 'dokter'].includes(currentRole)));

                        const canAccessJadwalKaryawan =
                            !isSuperAdminRole &&
                            (isOwnerOrManager ||
                                currentRole === 'admin' ||
                                state.allowedPaths.has('/pendaftaran-antrean/jadwal-karyawan') ||
                                state.allowedPaths.has('/pendaftaran-antrean/antrean') ||
                                (state.allowedPaths.size === 0 && ['admin', 'beautician', 'dokter'].includes(currentRole)));

                        const canAccessLayanan = canAccessTindakan || canAccessKonsul || canAccessAntreanRuangan || canAccessJadwalKaryawan;

                        const canAccessKasir =
                            !isSuperAdminRole &&
                            (isOwnerOrManager ||
                                currentRole === 'kasir' ||
                                hasAllowedPath('/kasir'));

                        const canAccessLaporan = !isSuperAdminRole;

                        const searchLower = state.searchVal.trim().toLowerCase();
                        const matchesTindakan = canAccessTindakan && (!searchLower || 'tindakan'.includes(searchLower) || 'layanan'.includes(searchLower));
                        const matchesKonsul = canAccessKonsul && (!searchLower || 'konsultasi'.includes(searchLower) || 'medis'.includes(searchLower));
                        const matchesAntreanRuangan = canAccessAntreanRuangan && (!searchLower || 'antrean ruangan'.includes(searchLower) || 'antrean'.includes(searchLower) || 'ruangan'.includes(searchLower) || 'monitoring'.includes(searchLower));
                        const matchesJadwalKaryawan = canAccessJadwalKaryawan && (!searchLower || 'jadwal'.includes(searchLower) || 'jadwal karyawan'.includes(searchLower) || 'tugas'.includes(searchLower) || 'dokter'.includes(searchLower) || 'terapis'.includes(searchLower));
                        const showLayananSection = canAccessLayanan && (matchesTindakan || matchesKonsul || matchesAntreanRuangan || matchesJadwalKaryawan);
                        const matchesKasir = canAccessKasir && (!searchLower || 'kasir'.includes(searchLower) || 'pembayaran'.includes(searchLower));

                        let idx = 0;
                        return (
                            <>
                                {/* 1. HOME */}
                                {homeItems.map((item) => renderItem(item, idx++))}

                                {/* 2. MASTER DATA */}
                                {masterDataItems.map((item) => renderItem(item, idx++))}

                                {/* 3. PENDAFTARAN */}
                                {pendaftaranItems.map((item) => renderItem(item, idx++))}

                                {/* Item Tambahan Lainnya (jika ada) */}
                                {extraItems.map((item) => renderItem(item, idx++))}

                                {/* 4. LAYANAN (Tindakan, Konsultasi, Antrean Ruangan, Jadwal Karyawan) */}
                                {showLayananSection && (
                                    <li className="layout-root-menuitem" key="layanan-ruangan-section">
                                        <div className="layout-menuitem-root-text">LAYANAN</div>
                                        <ul>
                                            {(() => {
                                                const typeParam = searchParams.get('type') || '';
                                                const isAntreanRuanganActive =
                                                    pathname === '/pendaftaran-antrean/antrean' && !typeParam;
                                                const isJadwalKaryawanActive =
                                                    pathname === '/pendaftaran-antrean/jadwal-karyawan';
                                                const isLayananActive =
                                                    pathname === '/pendaftaran-antrean/antrean' &&
                                                    typeParam === 'layanan';
                                                const isKonsulActive =
                                                    pathname === '/pendaftaran-antrean/antrean' &&
                                                    typeParam === 'konsul';

                                                return (
                                                    <>
                                                        {/* Sidebar Tindakan */}
                                                        {matchesTindakan && (
                                                            <li className={isLayananActive ? 'active-menuitem' : ''}>
                                                                <Link
                                                                    href="/pendaftaran-antrean/antrean?type=layanan"
                                                                    className={`p-ripple flex align-items-center gap-2${isLayananActive ? ' active-route' : ''}`}
                                                                    style={{ padding: '0.75rem 1.25rem', borderRadius: '6px', transition: 'background 0.2s' }}
                                                                >
                                                                    <i
                                                                        className="layout-menuitem-icon pi pi-sparkles"
                                                                        style={{ color: isLayananActive ? 'var(--primary-color)' : undefined }}
                                                                    />
                                                                    <span
                                                                        className="layout-menuitem-text"
                                                                        style={{
                                                                            fontWeight: isLayananActive ? 700 : undefined,
                                                                            color: isLayananActive ? 'var(--primary-color)' : undefined,
                                                                        }}
                                                                    >
                                                                        Tindakan
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        )}

                                                        {/* Sidebar Konsultasi */}
                                                        {matchesKonsul && (
                                                            <li className={isKonsulActive ? 'active-menuitem' : ''}>
                                                                <Link
                                                                    href="/pendaftaran-antrean/antrean?type=konsul"
                                                                    className={`p-ripple flex align-items-center gap-2${isKonsulActive ? ' active-route' : ''}`}
                                                                    style={{ padding: '0.75rem 1.25rem', borderRadius: '6px', transition: 'background 0.2s' }}
                                                                >
                                                                    <i
                                                                        className="layout-menuitem-icon pi pi-comments"
                                                                        style={{ color: isKonsulActive ? 'var(--primary-color)' : undefined }}
                                                                    />
                                                                    <span
                                                                        className="layout-menuitem-text"
                                                                        style={{
                                                                            fontWeight: isKonsulActive ? 700 : undefined,
                                                                            color: isKonsulActive ? 'var(--primary-color)' : undefined,
                                                                        }}
                                                                    >
                                                                        Konsultasi
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        )}

                                                        {/* Sidebar Antrean Ruangan (Monitoring Antrean Seluruh Ruangan) */}
                                                        {matchesAntreanRuangan && (
                                                            <li className={isAntreanRuanganActive ? 'active-menuitem' : ''}>
                                                                <Link
                                                                    href="/pendaftaran-antrean/antrean"
                                                                    className={`p-ripple flex align-items-center gap-2${isAntreanRuanganActive ? ' active-route' : ''}`}
                                                                    style={{ padding: '0.75rem 1.25rem', borderRadius: '6px', transition: 'background 0.2s' }}
                                                                >
                                                                    <i
                                                                        className="layout-menuitem-icon pi pi-calendar-times"
                                                                        style={{ color: isAntreanRuanganActive ? 'var(--primary-color)' : undefined }}
                                                                    />
                                                                    <span
                                                                        className="layout-menuitem-text"
                                                                        style={{
                                                                            fontWeight: isAntreanRuanganActive ? 700 : undefined,
                                                                            color: isAntreanRuanganActive ? 'var(--primary-color)' : undefined,
                                                                        }}
                                                                    >
                                                                        Antrean Ruangan
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        )}

                                                        {/* Sidebar Jadwal Karyawan (Jadwal Tugas Dokter, Terapis, dll - Read Only) */}
                                                        {matchesJadwalKaryawan && (
                                                            <li className={isJadwalKaryawanActive ? 'active-menuitem' : ''}>
                                                                <Link
                                                                    href="/pendaftaran-antrean/jadwal-karyawan"
                                                                    className={`p-ripple flex align-items-center gap-2${isJadwalKaryawanActive ? ' active-route' : ''}`}
                                                                    style={{ padding: '0.75rem 1.25rem', borderRadius: '6px', transition: 'background 0.2s' }}
                                                                >
                                                                    <i
                                                                        className="layout-menuitem-icon pi pi-calendar"
                                                                        style={{ color: isJadwalKaryawanActive ? 'var(--primary-color)' : undefined }}
                                                                    />
                                                                    <span
                                                                        className="layout-menuitem-text"
                                                                        style={{
                                                                            fontWeight: isJadwalKaryawanActive ? 700 : undefined,
                                                                            color: isJadwalKaryawanActive ? 'var(--primary-color)' : undefined,
                                                                        }}
                                                                    >
                                                                        Jadwal Karyawan
                                                                    </span>
                                                                </Link>
                                                            </li>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </ul>
                                    </li>
                                )}

                                {/* 5. KASIR */}
                                {matchesKasir && (
                                    <li className="layout-root-menuitem" key="kasir-section">
                                        <div className="layout-menuitem-root-text">KASIR</div>
                                        <ul>
                                            <li className={pathname === '/kasir' ? 'active-menuitem' : ''}>
                                                <Link
                                                    href="/kasir"
                                                    className={`p-ripple flex align-items-center gap-2${pathname === '/kasir' ? ' active-route' : ''}`}
                                                    style={{ padding: '0.75rem 1.25rem', borderRadius: '6px', transition: 'background 0.2s' }}
                                                >
                                                    <i
                                                        className="layout-menuitem-icon pi pi-calculator"
                                                        style={{ color: pathname === '/kasir' ? 'var(--primary-color)' : undefined }}
                                                    />
                                                    <span
                                                        className="layout-menuitem-text"
                                                        style={{
                                                            fontWeight: pathname === '/kasir' ? 700 : undefined,
                                                            color: pathname === '/kasir' ? 'var(--primary-color)' : undefined,
                                                        }}
                                                    >
                                                        Kasir
                                                    </span>
                                                </Link>
                                            </li>
                                        </ul>
                                    </li>
                                )}

                                {/* 6. LAPORAN */}
                                {canAccessLaporan && (
                                    <li className="layout-root-menuitem" key="riwayat-section">
                                        <div className="layout-menuitem-root-text">LAPORAN</div>
                                        <ul>
                                            <li className={isLaporanPage ? 'active-menuitem' : ''}>
                                                {/* Parent Laporan Accordion Button */}
                                                <a
                                                    role="button"
                                                    tabIndex={0}
                                                    onMouseDown={(e) => {
                                                        // Mencegah browser melakukan auto-scroll karena focus event saat diklik mouse
                                                        e.preventDefault();
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleLaporanAccordion();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            toggleLaporanAccordion();
                                                        }
                                                    }}
                                                    className={`p-ripple flex align-items-center justify-content-between cursor-pointer${isLaporanPage ? ' active-route' : ''}`}
                                                    style={{
                                                        padding: '0.75rem 1.25rem',
                                                        borderRadius: '6px',
                                                        transition: 'background 0.2s',
                                                        userSelect: 'none'
                                                    }}
                                                >
                                                    <div className="flex align-items-center gap-2">
                                                        <i
                                                            className={`layout-menuitem-icon pi ${isLaporanOpen ? 'pi-folder-open' : 'pi-folder'}`}
                                                            style={{ color: isLaporanPage ? 'var(--primary-color)' : undefined }}
                                                        />
                                                        <span
                                                            className="layout-menuitem-text"
                                                            style={{
                                                                fontWeight: isLaporanPage ? 700 : undefined,
                                                                color: isLaporanPage ? 'var(--primary-color)' : undefined,
                                                            }}
                                                        >
                                                            Data Laporan
                                                        </span>
                                                    </div>
                                                    <i
                                                        className="pi pi-angle-down layout-submenu-toggler"
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            transform: isLaporanOpen ? 'rotate(-180deg)' : 'rotate(0deg)',
                                                            transition: 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)',
                                                            color: isLaporanPage ? 'var(--primary-color)' : '#94a3b8'
                                                        }}
                                                    />
                                                </a>

                                                {/* Submenu Dropdown List Seluruh Jenis Laporan */}
                                                <div className={`laporan-accordion-wrapper ${isLaporanOpen ? 'is-open' : 'is-closed'}`}>
                                                    <div className="laporan-accordion-inner">
                                                        <ul
                                                            className="layout-submenu laporan-dropdown-submenu"
                                                            style={{
                                                                listStyle: 'none',
                                                                margin: '0.25rem 0 0.5rem 0',
                                                                padding: '0 0 0 0.5rem',
                                                            }}
                                                        >
                                                            {filteredReports.map((item) => {
                                                                const isTabActive = isLaporanPage && activeReportTab === item.id;
                                                                return (
                                                                    <li key={item.id} className={isTabActive ? 'active-menuitem' : ''}>
                                                                        <Link
                                                                            href={`/riwayat/rekam-medis?tab=${item.id}`}
                                                                            scroll={false}
                                                                            className={`p-ripple flex align-items-center gap-2 laporan-subitem${isTabActive ? ' active-route' : ''}`}
                                                                            style={{
                                                                                padding: '0.55rem 0.85rem',
                                                                                borderRadius: '6px',
                                                                                fontSize: '0.92rem',
                                                                                lineHeight: 1.4,
                                                                                transition: 'all 0.18s ease-in-out',
                                                                                border: isTabActive ? '1px solid #bbf7d0' : '1px solid transparent',
                                                                                background: isTabActive ? '#f0fdf4' : 'transparent',
                                                                                color: isTabActive ? '#15803d' : '#475569',
                                                                                fontWeight: isTabActive ? 600 : 500,
                                                                            }}
                                                                        >
                                                                            <span className="flex align-items-center justify-content-center flex-shrink-0" style={{ width: '18px', height: '18px' }}>
                                                                                {item.icon === 'ClipboardList' ? (
                                                                                    <ClipboardList
                                                                                        size={15}
                                                                                        className="layout-menuitem-icon"
                                                                                        style={{
                                                                                            color: isTabActive ? '#16a34a' : '#94a3b8',
                                                                                            transition: 'color 0.18s ease-in-out',
                                                                                        }}
                                                                                    />
                                                                                ) : (
                                                                                    <i
                                                                                        className={`layout-menuitem-icon pi ${item.icon}`}
                                                                                        style={{
                                                                                            fontSize: '0.92rem',
                                                                                            color: isTabActive ? '#16a34a' : '#94a3b8',
                                                                                            transition: 'color 0.18s ease-in-out',
                                                                                        }}
                                                                                    />
                                                                                )}
                                                                            </span>
                                                                            <span className="layout-menuitem-text">{item.label}</span>
                                                                        </Link>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </li>
                                        </ul>
                                    </li>
                                )}

                                {/* 7. PENGATURAN */}
                                {pengaturanItems.map((item) => renderItem(item, idx++))}
                            </>
                        );
                    })()
                }
            </ul>
            </div>

        </MenuProvider>
    );
};

export default AppMenu;