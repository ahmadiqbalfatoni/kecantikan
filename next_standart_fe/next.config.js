const rawAsset = process.env.PUBLIC_ASSET_ORG || '';
const assetHost = (!rawAsset || rawAsset.includes('<') || rawAsset.includes('>'))
    ? (process.env.NODE_ENV === 'production' ? 'https://worthy-illumination-production-844e.up.railway.app' : 'http://127.0.0.1:8000')
    : rawAsset;

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
