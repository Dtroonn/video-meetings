import type { PublicUser } from '@/users/users.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** What register and login produce; the controller maps it to a response DTO. */
export interface AuthResult extends AuthTokens {
  user: PublicUser;
}

/** The user info carried by an access token. Never add the password hash here. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
}
