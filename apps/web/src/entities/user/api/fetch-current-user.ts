import type { UserResponse } from '@video-meetings/contracts';
import { apiClient } from '@/shared/api';

/**
 * `GET /api/users/me` from the browser: the signed-in user. Same-origin, so the browser sends the
 * httpOnly session cookie and the api reads the access token from it; `apiClient` refreshes the
 * session and retries once on a 401.
 *
 * @throws on a network error or a non-2xx response.
 */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>('/users/me', { signal });
  return data;
}
