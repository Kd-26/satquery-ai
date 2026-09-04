/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // fail the build on ESLint errors
  },
  typescript: {
    ignoreBuildErrors: false, // fail the build on TS errors
  },
};

export default nextConfig;
