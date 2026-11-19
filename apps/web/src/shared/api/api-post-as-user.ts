import { ACCESS_TOKEN_COOKIE } from '@video-meetings/contracts';
import { cookies } from 'next/headers';
import { apiRequest, type ApiResponse } from './client';

/**
 * A JSON `POST` straight to the api as the signed-in user, with the access token from the session
 * cookie as `Authorization: Bearer` (Server Functions only). Like `apiGet`, it doesn't check the
 * token first: the api decides, and the caller handles its 401. Not cached: it changes data.
 */
export async function apiPostAsUser<T>(path: string, data: unknown): Promise<ApiResponse<T>> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  return apiRequest<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(data),
  });
}
