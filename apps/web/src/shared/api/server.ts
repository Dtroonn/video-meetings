// Server Components only: these read the request through `next/headers` and `next/root-params`.
// Everything that is safe to import from anywhere, `proxy.ts` included, lives in `./index.ts`.
export { apiGet } from './api-get';
export { ApiError, resolveApiResponse } from './resolve-response';
