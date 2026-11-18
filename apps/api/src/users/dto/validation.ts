import { DATE_OF_BIRTH_MIN } from '@video-meetings/contracts';
import { Transform } from 'class-transformer';
import { ValidateBy, type ValidationOptions } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Today as `YYYY-MM-DD` in UTC. */
const todayUtc = (): string => new Date().toISOString().slice(0, 10);

/** Whether `value` is an existing calendar date written as `YYYY-MM-DD` (rejects `1990-02-30`). */
const isCalendarDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/**
 * A `YYYY-MM-DD` date of birth from `DATE_OF_BIRTH_MIN` to today. "Today" is the UTC date, as the
 * api has no idea of the user's time zone. Same-format dates compare correctly as strings.
 */
export const IsDateOfBirth = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isDateOfBirth',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          isCalendarDate(value) &&
          value >= DATE_OF_BIRTH_MIN &&
          value <= todayUtc(),
        defaultMessage: (args) =>
          `${args?.property ?? 'value'} must be a YYYY-MM-DD date from ${DATE_OF_BIRTH_MIN} to today`,
      },
    },
    options,
  );

/** Trims a name and turns an empty one into `null`, so "only spaces" means "no name". */
export const NormalizeName = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });
