import React from 'react';
import AppConfig from '../../layout/AppConfig';
import { RootLayoutProps } from '@/types/layout';
import { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
    themeColor: '#4f46e5', // Sesuaikan dengan warna brand Microva Store (misal: Indigo)
    width: 'device-width',
    initialScale: 1,
};

// 2. Metadata Microva Store
export const metadata: Metadata = {
    title: {
        default: 'Microva Store - Platform SaaS & Manajemen Aplikasi',
        template: '%s | Microva Store', // Otomatis format judul di sub-halaman (contoh: "Dashboard | Microva Store")
    },
    description: 'Solusi lengkap manajemen aplikasi SaaS Microva Store. Kelola layanan, transaksi, dan operasional Anda dengan lebih cepat, aman, dan efisien.',
    keywords: ['Microva Store', 'SaaS', 'Store Platform', 'Dashboard SaaS', 'Aplikasi SaaS'],
    authors: [{ name: 'Microva Team' }],
    manifest: '/manifest.json',

    // Atur robot sesuai kebutuhan (gunakan 'index: true' jika halaman ini ingin di-index Google)
    robots: {
        index: true,
        follow: true,
        nocache: false,
    },

    // Metadata untuk WhatsApp, Facebook, LinkedIn, dll.
    openGraph: {
        type: 'website',
        locale: 'id_ID',
        url: 'https://microvastore.com', // Ganti dengan URL domain asli Anda
        siteName: 'Microva Store',
        title: 'Microva Store - Platform SaaS & Manajemen Aplikasi',
        description: 'Solusi lengkap manajemen aplikasi SaaS Microva Store. Kelola layanan dan operasional Anda secara efisien.',
        images: [
            {
                url: '/layout/images/og-image.jpeg', // Pastikan gambar berukuran 1200x630px ada di folder public/
                width: 1200,
                height: 630,
                alt: 'Microva Store Preview',
            },
        ],
    },

    // Metadata khusus X / Twitter
    twitter: {
        card: 'summary_large_image',
        title: 'Microva Store - Platform SaaS & Manajemen Aplikasi',
        description: 'Solusi lengkap manajemen aplikasi SaaS Microva Store.',
        images: ['/layout/images/og-image.jpeg'],
    },

    // Icon dan Favicon
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon-16x16.png',
        apple: '/apple-touch-icon.png',
    },
};

export default function SimpleLayout({ children }: RootLayoutProps) {
    return (
        <>
            {children}
        </>
    );
}
