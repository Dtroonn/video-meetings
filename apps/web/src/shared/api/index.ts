// Safe to import from anywhere: `apiPost` server-side (`proxy.ts` included), `apiClient` in Client
// Components. Helpers that read the request (`apiGet`, `resolveApiResponse`) are in
// `@/shared/api/server`.
export { apiClient } from './api-client';
export { apiPost, type ApiResponse } from './client';
