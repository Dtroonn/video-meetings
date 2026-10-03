import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@video-meetings/contracts';
import * as v from 'valibot';
import { formatMessage, type Dictionary } from '@/shared/i18n';

export type RegisterFormMessages = Dictionary['register']['form'];

/** The sign-up form's client-side schema, with error messages in the user's locale. */
export function createRegisterSchema(messages: RegisterFormMessages['validation']) {
  return v.pipe(
    v.object({
      email: v.pipe(
        v.string(),
        v.trim(),
        v.nonEmpty(messages.emailRequired),
        v.email(messages.emailInvalid),
      ),
      password: v.pipe(
        v.string(),
        v.minLength(
          PASSWORD_MIN_LENGTH,
          formatMessage(messages.passwordTooShort, { min: PASSWORD_MIN_LENGTH }),
        ),
        v.maxLength(
          PASSWORD_MAX_LENGTH,
          formatMessage(messages.passwordTooLong, { max: PASSWORD_MAX_LENGTH }),
        ),
      ),
      confirmPassword: v.pipe(v.string(), v.nonEmpty(messages.confirmPasswordRequired)),
    }),
    v.forward(
      v.partialCheck(
        [['password'], ['confirmPassword']],
        (input) => input.password === input.confirmPassword,
        messages.passwordsMismatch,
      ),
      ['confirmPassword'],
    ),
  );
}

type RegisterSchema = ReturnType<typeof createRegisterSchema>;
export type RegisterFormInput = v.InferInput<RegisterSchema>;
export type RegisterFormOutput = v.InferOutput<RegisterSchema>;

/**
 * Why sign-up failed; returned by the `register` Server Function instead of a redirect. A code, not
 * text: Server Functions can't read the route's locale, so the form looks the message up in its
 * dictionary (`form.errors[code]`, which must have an entry for every code).
 */
export interface RegisterError {
  code: keyof RegisterFormMessages['errors'];
}
