/**
 * @file apiConfig.ts
 * @description Helper terpusat untuk URL API backend dengan dukungan berbagai variasi env Railway
 */

export const formatUrl = (rawUrl: string): string => {
    let url = rawUrl.trim();
    if (!url) return '';

    // Tambahkan protokol jika belum ada
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('.internal')) {
            url = `http://${url}`;
        } else {
            url = `https://${url}`;
        }
    }

    // Hapus trailing slash
    return url.replace(/\/+$/, '');
};

const isLocalhostUrl = (str?: string) => !str || str.includes('localhost') || str.includes('127.0.0.1');
const checkIsProd = () => process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN);

export const getBackendBaseUrl = (): string => {
    const isProd = checkIsProd();

    const candidates = [
        process.env.NEXT_PUBLIC_API_URL,
        process.env.NEXT_PUBLIC_API_URI,
        process.env.BACKEND_URL,
        process.env.PUBLIC_ASSET_ORG,
        process.env.API_URL,
        process.env.NEXT_PUBLIC_URL_API,
        process.env.NEXT_PUBLIC_API_BASE_URL,
    ].filter(Boolean) as string[];

    // Di production, utamakan yang BUKAN localhost agar tidak tertimpa oleh file .env bawaan lokal
    let chosen = '';
    if (isProd) {
        chosen = candidates.find((c) => !isLocalhostUrl(c) && !c.includes('<') && !c.includes('>')) || '';
    } else {
        chosen = candidates.find((c) => !c.includes('<') && !c.includes('>')) || '';
    }

    if (chosen) {
        let base = formatUrl(chosen);
        // Hapus path /api/v1 atau /api jika ada
        return base.replace(/\/api(\/v1)?\/?$/, '');
    }

    if (isProd) {
        return 'https://illustrious-gentleness-production-c749.up.railway.app';
    }

    return 'http://localhost:8000';
};

export const getBackendApiUrl = (): string => {
    const isProd = checkIsProd();

    const candidates = [
        process.env.NEXT_PUBLIC_API_URL,
        process.env.NEXT_PUBLIC_API_URI,
        process.env.BACKEND_URL,
        process.env.API_URL,
        process.env.NEXT_PUBLIC_URL_API,
        process.env.NEXT_PUBLIC_API_BASE_URL,
    ].filter(Boolean) as string[];

    // Di production, utamakan yang BUKAN localhost agar tidak tertimpa oleh file .env bawaan lokal
    let chosen = '';
    if (isProd) {
        chosen = candidates.find((c) => !isLocalhostUrl(c) && !c.includes('<') && !c.includes('>')) || '';
    } else {
        chosen = candidates.find((c) => !c.includes('<') && !c.includes('>')) || '';
    }

    if (chosen) {
        let url = formatUrl(chosen);
        if (!url.endsWith('/api/v1')) {
            if (url.endsWith('/api')) {
                url = `${url}/v1`;
            } else {
                url = `${url}/api/v1`;
            }
        }
        return url;
    }

    // Fallback otomatis jika env Railway belum terisi
    if (isProd) {
        return 'https://illustrious-gentleness-production-c749.up.railway.app/api/v1';
    }

    return 'http://localhost:8000/api/v1';
};

