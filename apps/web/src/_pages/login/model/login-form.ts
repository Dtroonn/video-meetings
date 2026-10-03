import { PASSWORD_MAX_LENGTH } from '@video-meetings/contracts';
import * as v from 'valibot';

// No minimum length: login only checks the password against the stored hash, and the rules may
// have changed since the account was created.
export const loginSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Enter your email'),
    v.email('Enter a valid email address'),
  ),
  password: v.pipe(
    v.string(),
    v.nonEmpty('Enter your password'),
    v.maxLength(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
  ),
});

export type LoginFormInput = v.InferInput<typeof loginSchema>;
export type LoginFormOutput = v.InferOutput<typeof loginSchema>;

/** Why the login failed; returned by the `login` Server Function instead of a redirect. */
export interface LoginError {
  message: string;
}
