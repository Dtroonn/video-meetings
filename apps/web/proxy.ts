import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REDIRECT_PARAM,
  REFRESH_TOKEN_COOKIE,
  SESSION_EXPIRED_PATH,
  clearSessionCookies,
  expiresWithin,
  isAccessTokenActive,
  rotateTokens,
  setSessionCookies,
} from '@/shared/auth';
import {
  LOCALE_COOKIE,
  localePath,
  negotiateLocale,
  splitLocale,
  type Locale,
} from '@/shared/i18n';

/** Refresh the tokens this long before the access token expires, so it can't lapse mid-request. */
const REFRESH_BEFORE_EXPIRY_SECONDS = 30;

/** The page shown, with status 500, when the session can't be refreshed because the api failed. */
const SERVER_ERROR_PATH = '/500';

const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** The paths below have no locale prefix (`/login`, not `/en/login`): it is stripped first. */
/** Pages only for signed-out users; a signed-in user is sent home. */
const GUEST_ONLY_PATHS = new Set(['/login', '/register']);

/**
 * Pages open to everyone, signed in or not. **Every other page requires a session** (most of the
 * app is private, so protection is the default): add a path here to make a new page public.
 */
const PUBLIC_PATHS = new Set(['/', SERVER_ERROR_PATH, SESSION_EXPIRED_PATH, ...GUEST_ONLY_PATHS]);

/**
 * Runs before every page and Server Function request (see `config.matcher`):
 * 0. Redirects a URL without a locale (`/login`) to the same URL with one (`/ru/login`): the
 *    locale remembered in the cookie, else the browser's `Accept-Language`, else the default.
 *    A URL with a locale is remembered in the cookie. The checks below ignore the prefix.
 * 1. Proactively rotates the tokens when the access token is missing or about to expire, and
 *    passes the new ones both to the browser and to this request's own rendering. If the api
 *    rejects the refresh token (401), the session is over and the stale cookies are cleared. Any
 *    other failure (api unreachable, 5xx) keeps the cookies, so the next request can retry with
 *    the same session.
 * 2. Sends signed-out users from a private page to the login page (and back afterwards), and
 *    shows the 500 page when a private page can't be served because the api failed. Public pages
 *    just render, as signed-out when there is no usable session.
 * 3. Sends signed-in users away from the login and sign-up pages.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, path } = splitLocale(pathname);
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!locale) {
    const url = request.nextUrl.clone();
    url.pathname = localePath(
      negotiateLocale(cookieLocale, request.headers.get('accept-language')),
      pathname,
    );
    return NextResponse.redirect(url);
  }

  const isPublic = PUBLIC_PATHS.has(path);

  let accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  /** Applies the rotation's outcome to the outgoing response's cookies. */
  let updateResponseCookies: ((response: NextResponse) => void) | undefined;
  let clearCookies = false;

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
      accessToken = undefined;
      clearCookies = true;
    } else if (!isPublic) {
      // The cookies stay: the session may still be valid once the api recovers. A rewrite, not a
      // redirect, so the URL stays and reloading the page retries the original request.
      return NextResponse.rewrite(new URL(localePath(locale, SERVER_ERROR_PATH), request.url), {
        status: 500,
      });
    }
    // A public page renders anyway when the api is down: it just can't tell who's signed in.
  }

  const isSignedIn = isAccessTokenActive(accessToken);

  /** Writes the cookie changes collected above (locale, session) to the outgoing response. */
  const withCookies = (response: NextResponse, clearSession = clearCookies): NextResponse => {
    if (cookieLocale !== locale) setLocaleCookie(response, locale);
    if (clearSession) clearSessionCookies(response.cookies);
    updateResponseCookies?.(response);
    return response;
  };

  // Signed in and on the login or sign-up page: nothing to do there, go home.
  if (isSignedIn && GUEST_ONLY_PATHS.has(path)) {
    return withCookies(NextResponse.redirect(new URL(localePath(locale, '/'), request.url)));
  }

  // Signed out and on a private page: log in first, then come back to this page. Any stale
  // session cookies (e.g. an expired access token without a refresh token) go too.
  if (!isSignedIn && !isPublic) {
    return withCookies(loginRedirect(request, locale), true);
  }

  if (clearCookies) {
    // The session is over: let this request's own rendering see no session either.
    request.cookies.delete([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]);
  }
  return withCookies(NextResponse.next());
}

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  });
}

function loginRedirect(request: NextRequest, locale: Locale): NextResponse {
  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL(localePath(locale, '/login'), request.url);
  loginUrl.searchParams.set(REDIRECT_PARAM, `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except static assets and `/api/*`. Api calls never need the proxy: in production
    // nginx sends them straight to the api, which reads the access token from its cookie; the
    // rest are our own Route Handlers (e.g. `/api/auth/refresh`), which rotate on their own.
    '/((?!api/|_next/static|_next/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
