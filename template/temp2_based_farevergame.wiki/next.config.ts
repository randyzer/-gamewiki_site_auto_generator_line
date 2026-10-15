import type { NextConfig } from 'next';
const config: NextConfig = {
  trailingSlash: true,
  outputFileTracingIncludes: { '/*': ['./content/**/*.mdx'] },
  async redirects() {
    return [{ source: '/en', destination: '/', permanent: true }, { source: '/en/:path*', destination: '/:path*/', permanent: true }];
  },
};
export default config;
