import type { AVATAR_TYPES, GENDERS } from './limits';

export type Gender = (typeof GENDERS)[number];
export type AvatarType = (typeof AVATAR_TYPES)[number];

/** A user as sent to clients. Dates are ISO 8601 strings, as they arrive over JSON. */
export interface UserResponse {
  readonly id: string;
  readonly email: string;
  /** `null` when not set. */
  readonly name: string | null;
  /** A calendar date, `YYYY-MM-DD`; `null` when not set. */
  readonly dateOfBirth: string | null;
  /** `null` means "not specified". */
  readonly gender: Gender | null;
  /**
   * Where to load the avatar from: a path on the api (`/users/<id>/avatar?v=<version>`; the browser
   * prefixes it with `/api`), served to signed-in users only. The version changes with every new
   * avatar, so the URL can be cached. `null` when the user has no avatar.
   */
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * `PATCH /users/me`: changes the signed-in user's profile. A missing field stays as is, `null`
 * clears it. The name is trimmed and an empty one is stored as `null`; at most `NAME_MAX_LENGTH`
 * characters after trimming. `dateOfBirth` is `YYYY-MM-DD` between `DATE_OF_BIRTH_MIN` and today.
 * Responds with the updated user (`UserResponse`).
 */
export interface UpdateMeRequest {
  readonly name?: string | null;
  readonly dateOfBirth?: string | null;
  readonly gender?: Gender | null;
}

// `PUT /users/me/avatar` uploads or replaces the signed-in user's avatar. The body is the raw image
// (not multipart), with a `Content-Length` of at most `AVATAR_MAX_SIZE` and a `Content-Type` from
// `AVATAR_TYPES` or `application/octet-stream`. Its content must be a JPEG, PNG or WebP image,
// whatever the `Content-Type` says; otherwise, or when it's too large, the api answers 400 and the
// current avatar stays. Responds with the updated user (`UserResponse`).
// `DELETE /users/me/avatar` removes the avatar (204, also when there was none).
