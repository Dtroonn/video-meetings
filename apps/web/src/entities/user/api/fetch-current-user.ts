import type { UserResponse } from '@video-meetings/contracts';

/**
 * `GET /api/users/me` from the browser: the signed-in user. Same-origin, so the browser sends the
 * httpOnly session cookie and the api reads the access token from it.
 *
 * A plain `fetch` for now; it moves to the shared ky client (with refresh-and-retry on 401) once
 * that exists.
 *
 * @throws on a network error or a non-2xx response.
 */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<UserResponse> {
  const response = await fetch('/api/users/me', {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`GET /api/users/me failed with ${response.status}`);
  }
  return (await response.json()) as UserResponse;
}
