import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordRequest,
} from '@video-meetings/contracts';
import * as v from 'valibot';
import { formatMessage, type Dictionary } from '@/shared/i18n';

export type PasswordFormMessages = Dictionary['profile']['password'];

/**
 * The password change form's client-side schema, with error messages in the user's locale. The new
 * password follows the registration limits from `@video-meetings/contracts`; the current one only
 * has to be non-empty and within the maximum, like the api checks it (it may predate the rules).
 */
export function createPasswordSchema(messages: PasswordFormMessages['validation']) {
  return v.pipe(
    v.object({
      currentPassword: v.pipe(
        v.string(),
        v.nonEmpty(messages.currentPasswordRequired),
        v.maxLength(
          PASSWORD_MAX_LENGTH,
          formatMessage(messages.currentPasswordTooLong, { max: PASSWORD_MAX_LENGTH }),
        ),
      ),
      newPassword: v.pipe(
        v.string(),
        v.minLength(
          PASSWORD_MIN_LENGTH,
          formatMessage(messages.newPasswordTooShort, { min: PASSWORD_MIN_LENGTH }),
        ),
        v.maxLength(
          PASSWORD_MAX_LENGTH,
          formatMessage(messages.newPasswordTooLong, { max: PASSWORD_MAX_LENGTH }),
        ),
      ),
      confirmNewPassword: v.pipe(v.string(), v.nonEmpty(messages.confirmNewPasswordRequired)),
    }),
    v.forward(
      v.partialCheck(
        [['newPassword'], ['confirmNewPassword']],
        (input) => input.newPassword === input.confirmNewPassword,
        messages.passwordsMismatch,
      ),
      ['confirmNewPassword'],
    ),
  );
}

type PasswordSchema = ReturnType<typeof createPasswordSchema>;
export type PasswordFormInput = v.InferInput<PasswordSchema>;
export type PasswordFormOutput = v.InferOutput<PasswordSchema>;

export const EMPTY_PASSWORD_FORM: PasswordFormInput = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

/** The `POST /auth/change-password` body: the confirmation only matters in the browser. */
export function toChangePasswordRequest({
  currentPassword,
  newPassword,
}: PasswordFormOutput): ChangePasswordRequest {
  return { currentPassword, newPassword };
}

/**
 * Why the password change failed; returned by the `changePassword` Server Function. A code, not
 * text (Server Functions can't read the route's locale): the form looks the message up in
 * `password.errors[code]`.
 */
export interface ChangePasswordError {
  code: keyof PasswordFormMessages['errors'];
}
