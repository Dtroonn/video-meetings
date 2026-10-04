'use server';

import type { LogoutRequest } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiPost } from '@/shared/api';
import { REFRESH_TOKEN_COOKIE, clearSessionCookies } from '@/shared/auth';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/shared/i18n';

/**
 * Ends the session: `POST /auth/logout` revokes the refresh token, then the session cookies are
 * cleared and the user is sent to the login page of `locale` (Server Functions can't read the
 * `[lang]` root param, so the caller passes it).
 *
 * The cookies are cleared even when the api fails: the user asked to be signed out of this
 * browser, and an unrevoked refresh token just expires on its own.
 */
export async function logout(locale: string): Promise<never> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    const body: LogoutRequest = { refreshToken };
    apiPost<void>('/auth/logout', body);
  }

  clearSessionCookies(cookieStore);
  // The argument comes from the client, so it's checked like any other input.
  redirect(localePath(isLocale(locale) ? locale : DEFAULT_LOCALE, '/login'));
}
