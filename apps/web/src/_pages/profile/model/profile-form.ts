import {
  DATE_OF_BIRTH_MIN,
  GENDERS,
  NAME_MAX_LENGTH,
  type UpdateMeRequest,
  type UserResponse,
} from '@video-meetings/contracts';
import * as v from 'valibot';
import { formatMessage, type Dictionary } from '@/shared/i18n';

export type ProfileFormMessages = Dictionary['profile']['form'];

/** The radio value for "Not specified"; the api's `null`. */
export const GENDER_NOT_SPECIFIED = 'none';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whether `value` is an existing calendar date written as `YYYY-MM-DD` (rejects `1990-02-30`). */
const isCalendarDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/**
 * Today as `YYYY-MM-DD` in UTC: the latest date of birth the api accepts. It checks against the UTC
 * date, so the form does too, rather than the user's local date.
 */
export const todayUtc = (now = new Date()): string => now.toISOString().slice(0, 10);

/**
 * The profile form's client-side schema, with error messages in the user's locale. It checks the
 * limits the api enforces (`@video-meetings/contracts`) and outputs the `PATCH /users/me` body:
 * empty fields become `null`, which clears them. `today` (`YYYY-MM-DD`) is the latest allowed date
 * of birth.
 */
export function createProfileSchema(messages: ProfileFormMessages['validation'], today: string) {
  return v.object({
    name: v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(NAME_MAX_LENGTH, formatMessage(messages.nameTooLong, { max: NAME_MAX_LENGTH })),
      v.transform((name) => (name === '' ? null : name)),
    ),
    dateOfBirth: v.pipe(
      v.string(),
      // One check reporting the first problem only: a malformed date isn't "before 1900" too.
      v.rawCheck(({ dataset, addIssue }) => {
        if (!dataset.typed || dataset.value === '') return;
        const date = dataset.value;
        if (!isCalendarDate(date)) {
          addIssue({ message: messages.dateOfBirthInvalid });
        } else if (date < DATE_OF_BIRTH_MIN) {
          addIssue({
            message: formatMessage(messages.dateOfBirthTooEarly, { min: DATE_OF_BIRTH_MIN }),
          });
        } else if (date > today) {
          addIssue({ message: messages.dateOfBirthInFuture });
        }
      }),
      v.transform((date) => (date === '' ? null : date)),
    ),
    gender: v.pipe(
      v.picklist([...GENDERS, GENDER_NOT_SPECIFIED]),
      v.transform((gender) => (gender === GENDER_NOT_SPECIFIED ? null : gender)),
    ),
  });
}

type ProfileSchema = ReturnType<typeof createProfileSchema>;
export type ProfileFormInput = v.InferInput<ProfileSchema>;
export type ProfileFormOutput = v.InferOutput<ProfileSchema> & UpdateMeRequest;

/** The form's values for a user's current profile: empty fields for what isn't set. */
export function toProfileFormValues(user: UserResponse): ProfileFormInput {
  return {
    name: user.name ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
    gender: user.gender ?? GENDER_NOT_SPECIFIED,
  };
}
