/**
 * Names of the httpOnly session cookies. The web app stores the token pair in them; the api reads
 * the access token from its cookie when a request has no `Authorization` header (browser requests
 * to the same-origin `/api/*`, where client-side JS can't read the token).
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
