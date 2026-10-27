'use server';

import type { AuthResponse, LoginRequest } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiPost } from '@/shared/api';
import { safeRedirectPath, setSessionCookies } from '@/shared/auth';
import { type LoginError } from '../model/login-form';

/**
 * `POST /auth/login`. On success stores the tokens in cookies and redirects to `from` (a path on
 * this site, else the dashboard); on failure returns the error's code for the form to show.
 */
export async function login(input: LoginRequest, from: string): Promise<LoginError> {
  const response = await apiPost<AuthResponse>('/auth/login', input);
  if (!response.ok) {
    if (response.status === 401) {
      return { code: 'invalidCredentials' };
    }
    return { code: response.status === 0 ? 'unreachable' : 'unknown' };
  }

  setSessionCookies(await cookies(), response.data);
  // The page always passes `from`; the fallback only covers a tampered request. Without a locale,
  // `proxy.ts` adds the user's one.
  redirect(safeRedirectPath(from, '/dashboard'), 'replace');
}
