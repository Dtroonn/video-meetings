import { apiPost, type ApiResponse } from '@/shared/api';

export interface RegisterRequest {
  email: string;
  password: string;
}

/** `POST /auth/register`; the response is returned as is, success or not. */
export function registerUser(data: RegisterRequest): Promise<ApiResponse> {
  return apiPost('/auth/register', data);
}
