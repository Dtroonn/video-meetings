import { PASSWORD_MAX_LENGTH } from '@video-meetings/contracts';
import * as v from 'valibot';
import { formatMessage, type Dictionary } from '@/shared/i18n';

export type LoginFormMessages = Dictionary['login']['form'];

/** The login form's client-side schema, with error messages in the user's locale. */
// No minimum length: login only checks the password against the stored hash, and the rules may
// have changed since the account was created.
export function createLoginSchema(messages: LoginFormMessages['validation']) {
  return v.object({
    email: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty(messages.emailRequired),
      v.email(messages.emailInvalid),
    ),
    password: v.pipe(
      v.string(),
      v.nonEmpty(messages.passwordRequired),
      v.maxLength(
        PASSWORD_MAX_LENGTH,
        formatMessage(messages.passwordTooLong, { max: PASSWORD_MAX_LENGTH }),
      ),
    ),
  });
}

type LoginSchema = ReturnType<typeof createLoginSchema>;
export type LoginFormInput = v.InferInput<LoginSchema>;
export type LoginFormOutput = v.InferOutput<LoginSchema>;

/**
 * Why the login failed; returned by the `login` Server Function instead of a redirect. A code, not
 * text: Server Functions can't read the route's locale, so the form looks the message up in its
 * dictionary (`form.errors[code]`, which must have an entry for every code).
 */
export interface LoginError {
  code: keyof LoginFormMessages['errors'];
}
