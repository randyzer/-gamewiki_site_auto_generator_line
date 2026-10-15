import type { NextConfig } from 'next';
const config: NextConfig = {
  trailingSlash: true,
  experimental: { globalNotFound: true },
  outputFileTracingIncludes: { '/*': ['./content/**/*.mdx'] },
  async redirects() { return [{ source: '/en/:path*', destination: '/:path*', permanent: true }]; },
};
export default config;
