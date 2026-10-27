import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  type TokensResponse,
} from '@video-meetings/contracts';
import type { ResponseCookies } from 'next/dist/server/web/spec-extension/cookies';
import { getTokenExpiry } from './token';

// Defined in contracts: the api reads the access token from the same cookie.
export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

/** What both `await cookies()` (in Server Functions / Route Handlers) and `NextResponse.cookies` offer. */
export type CookieWriter = Pick<ResponseCookies, 'set' | 'delete'>;

/** Cookie lifetime in seconds: until the token itself expires. */
function maxAgeOf(token: string): number | undefined {
  const expiry = getTokenExpiry(token);
  return expiry === null ? undefined : Math.max(0, expiry - Math.floor(Date.now() / 1000));
}

/**
 * Stores a token pair in httpOnly cookies, so client-side JS never sees the tokens. The browser
 * sends them with same-origin `/api/*` requests, and the api reads the access token from its
 * cookie when there's no `Authorization` header.
 */
export function setSessionCookies(
  store: CookieWriter,
  { accessToken, refreshToken }: TokensResponse,
) {
  for (const [name, token] of [
    [ACCESS_TOKEN_COOKIE, accessToken],
    [REFRESH_TOKEN_COOKIE, refreshToken],
  ] as const) {
    store.set(name, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeOf(token),
    });
  }
}

export function clearSessionCookies(store: CookieWriter) {
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}
