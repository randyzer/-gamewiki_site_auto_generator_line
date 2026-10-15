import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [{ source: '/en/:path*', destination: '/:path*', permanent: true }];
  },
};
export default config;
