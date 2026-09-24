const getAssetHost = () => {
    const raw =
        process.env.PUBLIC_ASSET_ORG ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_URI ||
        process.env.API_URL ||
        '';

    if (raw && !raw.includes('<') && !raw.includes('>')) {
        let formatted = raw.trim();
        if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
            formatted = (formatted.includes('localhost') || formatted.includes('127.0.0.1'))
                ? `http://${formatted}`
                : `https://${formatted}`;
        }
        return formatted.replace(/\/+$/, '').replace(/\/api(\/v1)?\/?$/, '');
    }

    return process.env.NODE_ENV === 'production'
        ? 'https://illustrious-gentleness-production-c749.up.railway.app'
        : 'http://127.0.0.1:8000';
};

const assetHost = getAssetHost();

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    async rewrites() {
        return [
            {
                source: '/api/assets/:path*',
                destination: `${assetHost}/:path*`,
            },
            {
                source: '/uploads/:path*',
                destination: `${assetHost}/uploads/:path*`,
            },
        ];
    }
}

module.exports = nextConfig
