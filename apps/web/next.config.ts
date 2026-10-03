import type { NextConfig } from 'next';
import { API_URL } from './src/shared/config';

const nextConfig: NextConfig = {
  // Proxying keeps api calls same-origin, so the api needs no CORS setup.
  rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
