import { Transform } from 'class-transformer';

/** Trims and lowercases, so `User@Example.com` and `user@example.com` are one account. */
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
