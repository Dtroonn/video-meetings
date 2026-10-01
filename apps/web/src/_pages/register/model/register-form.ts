import * as v from 'valibot';

/** Mirrors the api's `RegisterRequestDto` limits. */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const registerSchema = v.pipe(
  v.object({
    email: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty('Enter your email'),
      v.email('Enter a valid email address'),
    ),
    password: v.pipe(
      v.string(),
      v.minLength(
        PASSWORD_MIN_LENGTH,
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      ),
      v.maxLength(
        PASSWORD_MAX_LENGTH,
        `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
      ),
    ),
    confirmPassword: v.pipe(v.string(), v.nonEmpty('Confirm your password')),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'Passwords do not match',
    ),
    ['confirmPassword'],
  ),
);

export type RegisterFormInput = v.InferInput<typeof registerSchema>;
export type RegisterFormOutput = v.InferOutput<typeof registerSchema>;
