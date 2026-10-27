import type { ApiErrorResponse } from '@video-meetings/contracts';
import { redirect } from 'next/navigation';
import { SESSION_EXPIRED_PATH } from '../auth';
import { localePath } from '../i18n';
import { getLocale } from '../i18n/server';
import type { ApiResponse } from './client';

/** A failed api request, thrown by `resolveApiResponse` for the nearest `error.tsx` to show. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorResponse,
  ) {
    super(`The api responded with ${status}: ${String(body.message)}`);
    this.name = 'ApiError';
  }
}

/**
 * The data of a successful api response, for Server Components (`await resolveApiResponse(await
 * apiGet(...))`). Otherwise it doesn't return:
 * - **401** → redirects to the login page, via `SESSION_EXPIRED_PATH`, which clears the rejected
 *   session cookies first (otherwise `proxy.ts` would bounce the user from login back home);
 * - **anything else** (including `0`, the api unreachable) → throws `ApiError`, which the error
 *   page (`app/[lang]/error.tsx`) catches and shows with a retry button.
 */
export async function resolveApiResponse<T>(response: ApiResponse<T>): Promise<T> {
  if (response.ok) {
    return response.data;
  }
  if (response.status === 401) {
    redirect(localePath(await getLocale(), SESSION_EXPIRED_PATH));
  }
  throw new ApiError(response.status, response.error);
}
