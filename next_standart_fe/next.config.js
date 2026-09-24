const getAssetHost = () => {
    const isProd = process.env.NODE_ENV === 'production';
    const isLocalhost = (str) => !str || str.includes('localhost') || str.includes('127.0.0.1');

    const candidates = [
        process.env.PUBLIC_ASSET_ORG,
        process.env.NEXT_PUBLIC_API_URL,
        process.env.NEXT_PUBLIC_API_URI,
        process.env.API_URL,
    ].filter(Boolean);

    let chosen = '';
    if (isProd) {
        chosen = candidates.find((c) => !isLocalhost(c) && !c.includes('<') && !c.includes('>')) || '';
    } else {
        chosen = candidates.find((c) => !c.includes('<') && !c.includes('>')) || '';
    }

    if (chosen) {
        let formatted = chosen.trim();
        if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
            formatted = `https://${formatted}`;
        }
        return formatted.replace(/\/+$/, '').replace(/\/api(\/v1)?\/?$/, '');
    }

    return isProd
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
