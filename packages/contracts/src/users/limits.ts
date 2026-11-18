/** Longest name, counted after trimming spaces. */
export const NAME_MAX_LENGTH = 50;
/** Earliest accepted date of birth (`YYYY-MM-DD`); the latest is today (UTC on the api). */
export const DATE_OF_BIRTH_MIN = '1900-01-01';
/** The gender values a user can pick; "not specified" is `null`. */
export const GENDERS = ['male', 'female'] as const;
