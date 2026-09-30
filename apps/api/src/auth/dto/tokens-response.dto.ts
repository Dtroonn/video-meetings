import type { AuthTokens } from '../auth.types';

/** An access/refresh token pair; shared by the auth response DTOs. */
export class TokensResponseDto {
  readonly accessToken: string;
  readonly refreshToken: string;

  constructor({ accessToken, refreshToken }: AuthTokens) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
