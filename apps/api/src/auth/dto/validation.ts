import { Transform } from 'class-transformer';

/** Upper bound so a huge body can't make password hashing expensive. */
export const PASSWORD_MAX_LENGTH = 128;

/** Trims and lowercases, so `User@Example.com` and `user@example.com` are one account. */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
