// Safe to import from anywhere server-side, `proxy.ts` included. Helpers that read the request
// (`apiGet`, `resolveApiResponse`) are in `@/shared/api/server`.
export { apiPost, type ApiResponse } from './client';
