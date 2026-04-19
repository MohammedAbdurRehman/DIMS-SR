/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_PROXY_URL || '')
      .trim()
      .replace(/\/$/, '');
    if (!apiBase) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
  serverExternalPackages: ['@hyperledger/fabric-gateway'],
}

export default nextConfig
