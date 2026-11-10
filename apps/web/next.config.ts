import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  distDir: process.env.NEXT_BUILD_DIR ?? '.next',
};
export default nextConfig;
