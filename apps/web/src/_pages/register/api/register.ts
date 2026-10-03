'use server';

import type { AuthResponse, RegisterRequest } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiPost } from '@/shared/api';
import { safeRedirectPath, setSessionCookies } from '@/shared/auth';
import { type RegisterError } from '../model/register-form';

/**
 * `POST /auth/register`. On success stores the tokens in cookies and redirects to `from` (a path
 * on this site, else `/`); on failure returns the error's code for the form to show.
 */
export async function register(
  { email, password }: RegisterRequest,
  from: string,
): Promise<RegisterError> {
  const response = await apiPost<AuthResponse>('/auth/register', { email, password });
  if (!response.ok) {
    if (response.status === 409) {
      return { code: 'emailTaken' };
    }
    return { code: response.status === 0 ? 'unreachable' : 'unknown' };
  }

  setSessionCookies(await cookies(), response.data);
  redirect(safeRedirectPath(from));
}
