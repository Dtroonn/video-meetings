import type { TokensResponse } from '@video-meetings/contracts';
import type { AuthTokens } from '../auth.types';

/** An access/refresh token pair; shared by the auth response DTOs. */
export class TokensResponseDto implements TokensResponse {
  readonly accessToken: string;
  readonly refreshToken: string;

  constructor({ accessToken, refreshToken }: AuthTokens) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
