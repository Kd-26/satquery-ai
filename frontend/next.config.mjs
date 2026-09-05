/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence the workspace root detection warning from monorepo lockfile detection
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
