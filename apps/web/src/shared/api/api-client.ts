import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { REDIRECT_PARAM } from '../auth/redirect-path';
import { DEFAULT_LOCALE, localePath, splitLocale } from '../i18n/locale';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Set on the retry after a refresh, so a second 401 for the same request can't refresh again. */
    retriedAfterRefresh?: boolean;
  }
}

/** Our Route Handler that rotates the session cookies (`refreshTokens` in `@/_app/api-routes`). */
const REFRESH_PATH = '/auth/refresh';

/**
 * The api client for the browser (Client Components only). Requests go to same-origin `/api/...`,
 * rewritten to the api by `next.config.ts`; the browser sends the httpOnly `access_token` cookie
 * and the api reads the token from it, so no `Authorization` header is added (JS can't read the
 * cookie). Server code uses `apiPost` / `apiGet` instead: relative URLs don't work there.
 *
 * On a 401 it refreshes the session once via `POST /api/auth/refresh` and retries the request.
 * Errors are thrown as `AxiosError`.
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
});

/**
 * The refresh in flight, shared by every request that gets a 401 meanwhile, so parallel requests
 * trigger one refresh, not one each (the server's grace window covers other tabs).
 */
let refreshing: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  // A bare `axios` call, not `apiClient`: the refresh mustn't pass through these interceptors.
  refreshing ??= axios
    .post(`/api${REFRESH_PATH}`)
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** The session is over (the refresh got a 401): log in again, then come back to this page. */
function redirectToLogin() {
  const { pathname, search } = window.location;
  const { locale } = splitLocale(pathname);
  const url = new URL(localePath(locale ?? DEFAULT_LOCALE, '/login'), window.location.origin);
  url.searchParams.set(REDIRECT_PARAM, `${pathname}${search}`);
  window.location.assign(url);
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) {
    throw error;
  }
  const config: InternalAxiosRequestConfig = error.config;
  // Loop guards: a request already retried after a refresh, or one that can't be fixed by a
  // refresh, gets its 401 as is.
  if (config.retriedAfterRefresh) {
    redirectToLogin();
    return;
  }

  try {
    await refreshSession();
  } catch (refreshError) {
    // A 401 from the refresh means the session is gone (our Route Handler already cleared the
    // cookies). Anything else (5xx, network) keeps the session for a later retry.
    if (refreshError instanceof AxiosError && refreshError.response?.status === 401) {
      redirectToLogin();
      return;
    }
    throw error;
  }

  config.retriedAfterRefresh = true;
  return apiClient.request(config);
});
