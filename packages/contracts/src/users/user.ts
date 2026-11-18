import type { GENDERS } from './limits';

export type Gender = (typeof GENDERS)[number];

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
