import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  basePath: '/coming-to-sf',
  async redirects() {
    return [{ source: '/', destination: '/coming-to-sf/', basePath: false, permanent: false }];
  },
};
export default nextConfig;
