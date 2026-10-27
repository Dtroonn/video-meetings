import { cookies } from 'next/headers';
import { cache } from 'react';
import { ACCESS_TOKEN_COOKIE } from './session-cookies';
import { isAccessTokenActive } from './token';

/**
 * Whether the current request has a valid session (Server Components only). Wrapped in
 * `React.cache`, so every component of one render shares a single cookie read and token decode;
 * each request still gets its own answer. `proxy.ts` has already rotated the tokens by now, so
 * the cookie is up to date.
 *
 * Reads cookies, i.e. runtime data: with Cache Components, render whatever awaits it inside
 * `<Suspense>`, so the rest of the page stays in the static shell.
 */
export const isSignedIn = cache(async (): Promise<boolean> => {
  return isAccessTokenActive((await cookies()).get(ACCESS_TOKEN_COOKIE)?.value);
});
