/** The search param holding the path to return to after login or registration. */
export const REDIRECT_PARAM = 'from';

/**
 * Returns `from` if it is a path on this site, otherwise `fallback` (also when `from` is missing).
 * Guards against open redirects: `//evil.com` and `/\evil.com` are protocol-relative URLs to
 * another host.
 */
export function safeRedirectPath(from: unknown, fallback = '/'): string {
  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.startsWith('/\\') ||
    /[\u0000-\u001f\u007f]/.test(from)
  ) {
    return fallback;
  }
  return from;
}

/**
 * Clears the session cookies and redirects to the login page (a Route Handler, locale prefix
 * added by the caller). Where Server Components send the user when the api answers 401.
 */
export const SESSION_EXPIRED_PATH = '/session-expired';
