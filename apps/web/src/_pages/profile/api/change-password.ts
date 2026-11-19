'use server';

import type { ChangePasswordRequest, TokensResponse } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiPostAsUser } from '@/shared/api/server';
import { REDIRECT_PARAM, clearSessionCookies, setSessionCookies } from '@/shared/auth';
import type { ChangePasswordError } from '../model/password-form';

/** Where a 401 sends the user: login, then back here. Without a locale, `proxy.ts` adds it. */
const LOGIN_AND_BACK = `/login?${REDIRECT_PARAM}=${encodeURIComponent('/dashboard/profile')}`;

/**
 * `POST /auth/change-password` as the signed-in user. A Server Function, not an `apiClient` call:
 * the api ends every session and answers with a new token pair for this one, and only the server
 * can write it into the httpOnly session cookies, which keeps this browser signed in. `proxy.ts`
 * has already refreshed the access token for this request if it was about to expire.
 *
 * Resolves to `null` on success, or an error code for the form: `wrongCurrentPassword` (the api's
 * 403), `failed` for anything else, which can be retried. A 401 means the session is over: the
 * cookies are cleared and the user is sent to login.
 */
export async function changePassword(
  input: ChangePasswordRequest,
): Promise<ChangePasswordError | null> {
  const response = await apiPostAsUser<TokensResponse>('/auth/change-password', input);

  if (response.ok) {
    setSessionCookies(await cookies(), response.data);
    return null;
  }
  if (response.status === 403) {
    return { code: 'wrongCurrentPassword' };
  }
  if (response.status === 401) {
    clearSessionCookies(await cookies());
    redirect(LOGIN_AND_BACK);
  }
  return { code: 'failed' };
}
