/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // fail the build on ESLint errors
  },
  typescript: {
    ignoreBuildErrors: false, // fail the build on TS errors
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*', // Proxy to FastAPI Backend
      },
    ];
  },
};

export default nextConfig;
