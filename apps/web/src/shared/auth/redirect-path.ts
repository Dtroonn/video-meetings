/** The search param holding the path to return to after login or registration. */
export const REDIRECT_PARAM = 'from';

/**
 * Returns `from` if it is a path on this site, otherwise `/`. Guards against open redirects:
 * `//evil.com` and `/\evil.com` are protocol-relative URLs to another host.
 */
export function safeRedirectPath(from: unknown): string {
  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.startsWith('/\\') ||
    /[\u0000-\u001f\u007f]/.test(from)
  ) {
    return '/';
  }
  return from;
}
