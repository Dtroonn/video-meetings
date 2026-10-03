import type { TokensResponse } from '@video-meetings/contracts';
import type { ResponseCookies } from 'next/dist/server/web/spec-extension/cookies';
import { getTokenExpiry } from './token';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** What both `await cookies()` (in Server Functions / Route Handlers) and `NextResponse.cookies` offer. */
export type CookieWriter = Pick<ResponseCookies, 'set' | 'delete'>;

/** Cookie lifetime in seconds: until the token itself expires. */
function maxAgeOf(token: string): number | undefined {
  const expiry = getTokenExpiry(token);
  return expiry === null ? undefined : Math.max(0, expiry - Math.floor(Date.now() / 1000));
}

/**
 * Stores a token pair in httpOnly cookies, so client-side JS never sees the tokens. `proxy.ts`
 * turns the access token into an `Authorization` header for `/api/*` requests.
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
