/** Longest name, counted after trimming spaces. */
export const NAME_MAX_LENGTH = 50;
/** Earliest accepted date of birth (`YYYY-MM-DD`); the latest is today (UTC on the api). */
export const DATE_OF_BIRTH_MIN = '1900-01-01';
/** The gender values a user can pick; "not specified" is `null`. */
export const GENDERS = ['male', 'female'] as const;

/** Largest avatar image the api accepts, in bytes (5 MB). */
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
/**
 * Image types accepted as an avatar, by MIME type. The api checks the content, not only the
 * `Content-Type` the client sends, and serves the avatar with the type it detected.
 */
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
