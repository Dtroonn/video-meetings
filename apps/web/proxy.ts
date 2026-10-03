import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REDIRECT_PARAM,
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  expiresWithin,
  rotateTokens,
  setSessionCookies,
} from '@/shared/auth';

/** Refresh the tokens this long before the access token expires, so it can't lapse mid-request. */
const REFRESH_BEFORE_EXPIRY_SECONDS = 30;

/** Pages only for signed-out users; a signed-in user is sent home. */
const GUEST_ONLY_PATHS = new Set(['/login', '/register']);

/** The page shown, with status 500, when the session can't be refreshed because the api failed. */
const SERVER_ERROR_PATH = '/500';

/**
 * Runs before every page and Server Function request (see `config.matcher`):
 * 1. Proactively rotates the tokens when the access token is missing or about to expire, and
 *    passes the new ones both to the browser and to this request's own rendering. If the api
 *    rejects the refresh token (401), the session is over: the cookies are cleared and the user
 *    is sent to the login page. Any other failure (api unreachable, 5xx) shows the 500 page and
 *    keeps the cookies, so the next request can retry with the same session.
 * 2. Sends signed-in users away from the login and sign-up pages.
 */
export async function proxy(request: NextRequest) {
  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  /** Applies the rotation's outcome to the outgoing response's cookies. */
  let updateResponseCookies: ((response: NextResponse) => void) | undefined;

  if (refreshToken && (!accessToken || expiresWithin(accessToken, REFRESH_BEFORE_EXPIRY_SECONDS))) {
    const rotation = await rotateTokens(refreshToken);

    if (rotation.ok) {
      const { tokens } = rotation;
      // Updating the request cookies lets Server Components and Server Functions in this very
      // request read the new tokens; the response cookies store them in the browser.
      request.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken);
      request.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken);
      accessToken = tokens.accessToken;
      updateResponseCookies = (response) => setSessionCookies(response.cookies, tokens);
    } else if (rotation.status === 401) {
      const response = sessionExpiredResponse(request);
      accessToken = undefined;
      clearSessionCookies(response.cookies);
      return response;
    } else {
      // The cookies stay: the session may still be valid once the api recovers. A rewrite, not a
      // redirect, so the URL stays and reloading the page retries the original request.
      return NextResponse.rewrite(new URL(SERVER_ERROR_PATH, request.url), { status: 500 });
    }
  }

  const isSignedIn = accessToken !== undefined && !expiresWithin(accessToken, 0);
  let response: NextResponse = NextResponse.next();

  if (isSignedIn && GUEST_ONLY_PATHS.has(request.nextUrl.pathname)) {
    response = NextResponse.redirect(new URL('/', request.url));
  }

  updateResponseCookies?.(response);
  return response;
}

/** The session is over: send the user to login, and back to this page afterwards. */
function sessionExpiredResponse(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (GUEST_ONLY_PATHS.has(pathname)) {
    // Already on the login or sign-up page: just let it render without the stale cookies.
    request.cookies.delete([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]);
    return NextResponse.next();
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set(REDIRECT_PARAM, `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except static assets and `/api/*`. Api calls never need the proxy: in production
    // nginx sends them straight to the api and the client adds the `Authorization` header itself;
    // the rest are our own Route Handlers (e.g. `/api/auth/refresh`), which rotate on their own.
    '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
