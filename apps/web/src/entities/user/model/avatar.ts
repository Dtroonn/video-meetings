/**
 * The `src` of a user's avatar image: `UserResponse.avatarUrl` is a path on the api, which the
 * browser reaches through the same-origin `/api` rewrite (the httpOnly session cookie goes along,
 * so the signed-in-only avatar loads). `undefined` when the user has no avatar.
 */
export function avatarSrc(avatarUrl: string | null): string | undefined {
  return avatarUrl === null ? undefined : `/api${avatarUrl}`;
}
