import type { NextConfig } from 'next';

/** Where the NestJS api listens; requests to `/api/*` are proxied there. */
const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Proxying keeps api calls same-origin, so the api needs no CORS setup.
  rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
