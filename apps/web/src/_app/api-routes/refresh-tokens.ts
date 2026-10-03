import type { ApiErrorResponse } from '@video-meetings/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import {
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  rotateTokens,
  type RotationResult,
  setSessionCookies,
} from '@/shared/auth';

/**
 * `POST /api/auth/refresh`: rotates the session cookies for client-side code, which can't read
 * the httpOnly refresh token itself. Shares the grace window with `proxy.ts`, so a client retry
 * racing a page navigation gets the same pair instead of a 401. Takes precedence over the
 * `/api/*` rewrite to the api (filesystem routes are matched before `next.config` rewrites).
 *
 * Responds 204 with new cookies; 401 (cookies cleared) if there's no session or the api rejected
 * the refresh token; 500 (cookies kept, so a later retry can still succeed) if the api failed.
 */
export async function refreshTokens(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const rotation: RotationResult = refreshToken
    ? await rotateTokens(refreshToken)
    : { ok: false, status: 401 };

  if (rotation.ok) {
    const response = new NextResponse(null, { status: 204 });
    setSessionCookies(response.cookies, rotation.tokens);
    return response;
  }

  if (rotation.status === 401) {
    const body: ApiErrorResponse = {
      statusCode: 401,
      message: 'Session expired',
      error: 'Unauthorized',
    };
    const response = NextResponse.json(body, { status: 401 });
    clearSessionCookies(response.cookies);
    return response;
  }

  const body: ApiErrorResponse = {
    statusCode: 500,
    message: 'Could not refresh the session',
    error: 'Internal Server Error',
  };
  return NextResponse.json(body, { status: 500 });
}
