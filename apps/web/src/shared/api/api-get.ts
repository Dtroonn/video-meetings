import { ACCESS_TOKEN_COOKIE } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { apiRequest, type ApiResponse } from './client';

/**
 * Wrapped in `React.cache`: within one server render, every component asking for the same path
 * shares one request (per request, never across requests).
 */
const cachedGet = cache(async (path: string): Promise<ApiResponse<unknown>> => {
  // No check whether there is a token or whether it has expired: the api decides, and the caller
  // handles its 401 (see `resolveApiResponse`).
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  return apiRequest(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
});

/**
 * `GET` straight to the api as the signed-in user, with the access token from the session cookie
 * (Server Components only). Resolves to the api's response, errors included; pass it to
 * `resolveApiResponse` to get the data. Reads cookies, i.e. runtime data: with Cache Components,
 * render whatever awaits it inside `<Suspense>`.
 */
export function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return cachedGet(path) as Promise<ApiResponse<T>>;
}
