/**
 * @file apiConfig.ts
 * @description Helper terpusat untuk URL API backend dengan fallback cerdas untuk deployment Railway
 */

export const getBackendApiUrl = (): string => {
    let url = process.env.API_URL || process.env.NEXT_PUBLIC_URL_API || process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // Jika kosong atau masih berupa placeholder bawaan template
    if (!url || url.includes('<') || url.includes('>')) {
        if (process.env.NODE_ENV === 'production') {
            return 'https://worthy-illumination-production-844e.up.railway.app/api/v1';
        }
        return 'http://localhost:8000/api/v1';
    }

    url = url.endsWith('/') ? url.slice(0, -1) : url;

    if (!url.endsWith('/api/v1')) {
        url = `${url}/api/v1`;
    }

    return url;
};
