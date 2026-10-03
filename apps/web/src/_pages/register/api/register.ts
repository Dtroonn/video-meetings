'use server';

import type { AuthResponse } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as v from 'valibot';
import { apiPost } from '@/shared/api';
import { safeRedirectPath, setSessionCookies } from '@/shared/auth';
import { registerSchema, type RegisterError, type RegisterFormInput } from '../model/register-form';

/**
 * `POST /auth/register`. On success stores the tokens in cookies and redirects to `from` (a path
 * on this site, else `/`); on failure returns the error to show.
 */
export async function register(input: RegisterFormInput, from: string): Promise<RegisterError> {
  // Server Functions are public endpoints, so the input is validated again here.
  const parsed = v.safeParse(registerSchema, input);
  if (!parsed.success) {
    return { message: 'Check the form and try again' };
  }

  const { email, password } = parsed.output;
  const response = await apiPost<AuthResponse>('/auth/register', { email, password });
  if (!response.ok) {
    if (response.status === 409) {
      return { field: 'email', message: 'This email is already registered' };
    }
    return {
      message:
        response.status === 0
          ? "Can't reach the server. Try again later."
          : 'Something went wrong. Try again.',
    };
  }

  setSessionCookies(await cookies(), response.data);
  redirect(safeRedirectPath(from));
}
