import type { UserResponse } from '../users/user';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokensRequest {
  refreshToken: string;
}

/** An access/refresh token pair. */
export interface TokensResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** The user plus a token pair; returned by register and login. */
export interface AuthResponse extends TokensResponse {
  readonly user: UserResponse;
}
