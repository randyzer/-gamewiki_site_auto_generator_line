import type { NextConfig } from 'next';

const config: NextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      { source: '/en', destination: '/', permanent: true },
      { source: '/en/:path*', destination: '/:path*/', permanent: true },
    ];
  },
};
export default config;
