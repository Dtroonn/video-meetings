import type { UpdateMeRequest, UserResponse } from '@video-meetings/contracts';
import { apiClient } from '@/shared/api';

/**
 * `PATCH /api/users/me` from the browser: changes the signed-in user's profile (`null` clears a
 * field) and returns the updated user. `apiClient` refreshes the session and retries once on a 401.
 *
 * @throws on a network error or a non-2xx response.
 */
export async function updateProfile(body: UpdateMeRequest): Promise<UserResponse> {
  const { data } = await apiClient.patch<UserResponse>('/users/me', body);
  return data;
}
