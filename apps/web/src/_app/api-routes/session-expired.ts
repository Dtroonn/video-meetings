import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies } from '@/shared/auth';
import { DEFAULT_LOCALE, isLocale, localePath } from '@/shared/i18n';

/**
 * `GET /<locale>/session-expired`: clears the session cookies and redirects to the login page.
 * `resolveApiResponse` sends Server Components here when the api answers 401. Redirecting straight
 * to the login page wouldn't work: Server Components can't change cookies, and `proxy.ts` only
 * checks the access token's `exp` (not its signature), so it would still count the rejected token
 * as a session and send the user from the login page back home.
 *
 * Public in `proxy.ts`, or a signed-out visit would itself be redirected to login and come back
 * here afterwards. A cross-site link here can only sign the user out (it never signs anyone in).
 */
export async function sessionExpired(
  request: NextRequest,
  { params }: RouteContext<'/[lang]/session-expired'>,
) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const response = NextResponse.redirect(new URL(localePath(locale, '/login'), request.url));
  clearSessionCookies(response.cookies);
  return response;
}
