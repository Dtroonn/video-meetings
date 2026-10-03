'use server';

import type { AuthResponse } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as v from 'valibot';
import { apiPost } from '@/shared/api';
import { safeRedirectPath, setSessionCookies } from '@/shared/auth';
import { loginSchema, type LoginError, type LoginFormInput } from '../model/login-form';

/**
 * `POST /auth/login`. On success stores the tokens in cookies and redirects to `from` (a path on
 * this site, else `/`); on failure returns the error to show.
 */
export async function login(input: LoginFormInput, from: string): Promise<LoginError> {
  // Server Functions are public endpoints, so the input is validated again here.
  const parsed = v.safeParse(loginSchema, input);
  if (!parsed.success) {
    return { message: 'Enter a valid email and password' };
  }

  const response = await apiPost<AuthResponse>('/auth/login', parsed.output);
  if (!response.ok) {
    if (response.status === 401) {
      return { message: 'Invalid email or password' };
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
