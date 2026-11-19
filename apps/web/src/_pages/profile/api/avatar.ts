import type { UserResponse } from '@video-meetings/contracts';
import { apiClient } from '@/shared/api';

/**
 * `PUT /api/users/me/avatar`: uploads or replaces the signed-in user's avatar with the file as the
 * raw body (not multipart) and returns the updated user. The api checks the content and the size
 * again; the current avatar stays if it refuses.
 *
 * @throws the request's `AxiosError` on a network error or a non-2xx response.
 */
export async function uploadAvatar(file: File): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>('/users/me/avatar', file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  return data;
}

/**
 * `DELETE /api/users/me/avatar`: removes the signed-in user's avatar (204, also when there was
 * none).
 *
 * @throws the request's `AxiosError` on a network error or a non-2xx response.
 */
export async function removeAvatar(): Promise<void> {
  await apiClient.delete('/users/me/avatar');
}
