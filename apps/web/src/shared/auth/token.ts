import { decodeJwt } from 'jose';

/**
 * Reads the `exp` claim (seconds since the epoch) of a JWT without verifying its signature: the
 * api verifies tokens, the web app only needs to know when to refresh them.
 *
 * @returns `null` if the token isn't a JWT or has no numeric `exp`.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const { exp } = decodeJwt(token);
    return typeof exp === 'number' ? exp : null;
  } catch {
    // decodeJwt throws on anything that isn't a well-formed JWT.
    return null;
  }
}

/** Whether the token expires within `seconds` from now (an unreadable token counts as expired). */
export function expiresWithin(token: string, seconds: number): boolean {
  const expiry = getTokenExpiry(token);
  return expiry === null || expiry * 1000 - Date.now() <= seconds * 1000;
}
