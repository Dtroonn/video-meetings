import type { RegisterRequest } from '@video-meetings/contracts';
import { apiPost, type ApiResponse } from '@/shared/api';

/** `POST /auth/register`; the response is returned as is, success or not. */
export function registerUser(data: RegisterRequest): Promise<ApiResponse> {
  return apiPost('/auth/register', data);
}
