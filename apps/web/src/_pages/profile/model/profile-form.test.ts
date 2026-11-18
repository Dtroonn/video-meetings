import type { UserResponse } from '@video-meetings/contracts';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createProfileSchema, toProfileFormValues, todayUtc } from './profile-form';

const messages = {
  nameTooLong: 'At most {max} characters',
  dateOfBirthInvalid: 'Enter a valid date',
  dateOfBirthTooEarly: 'Not earlier than {min}',
  dateOfBirthInFuture: 'Not in the future',
};
const TODAY = '2026-11-19';
const schema = createProfileSchema(messages, TODAY);

const user: UserResponse = {
  id: 'id',
  email: 'ann@example.com',
  name: null,
  dateOfBirth: null,
  gender: null,
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const issuesOf = (input: unknown) => {
  const result = v.safeParse(schema, input);
  return result.success ? [] : result.issues.map((issue) => issue.message);
};

describe('createProfileSchema', () => {
  it('turns the form values into an update request', () => {
    expect(
      v.parse(schema, { name: '  Ann  ', dateOfBirth: '1990-05-17', gender: 'female' }),
    ).toEqual({ name: 'Ann', dateOfBirth: '1990-05-17', gender: 'female' });
  });

  it('clears empty fields with null', () => {
    expect(v.parse(schema, { name: '   ', dateOfBirth: '', gender: 'none' })).toEqual({
      name: null,
      dateOfBirth: null,
      gender: null,
    });
  });

  it('accepts a name of exactly 50 characters after trimming', () => {
    expect(issuesOf({ name: ` ${'a'.repeat(50)} `, dateOfBirth: '', gender: 'none' })).toEqual([]);
  });

  it('rejects a name over 50 characters', () => {
    expect(issuesOf({ name: 'a'.repeat(51), dateOfBirth: '', gender: 'none' })).toEqual([
      'At most 50 characters',
    ]);
  });

  it('accepts the first and the last allowed dates', () => {
    expect(issuesOf({ name: '', dateOfBirth: '1900-01-01', gender: 'none' })).toEqual([]);
    expect(issuesOf({ name: '', dateOfBirth: TODAY, gender: 'none' })).toEqual([]);
  });

  it('rejects a date before 1900-01-01', () => {
    expect(issuesOf({ name: '', dateOfBirth: '1899-12-31', gender: 'none' })).toEqual([
      'Not earlier than 1900-01-01',
    ]);
  });

  it('rejects a date after today', () => {
    expect(issuesOf({ name: '', dateOfBirth: '2026-11-20', gender: 'none' })).toEqual([
      'Not in the future',
    ]);
  });

  it('rejects a date that does not exist or is not YYYY-MM-DD', () => {
    expect(issuesOf({ name: '', dateOfBirth: '1990-02-30', gender: 'none' })).toEqual([
      'Enter a valid date',
    ]);
    expect(issuesOf({ name: '', dateOfBirth: '17.05.1990', gender: 'none' })).toEqual([
      'Enter a valid date',
    ]);
  });

  it('rejects an unknown gender', () => {
    expect(issuesOf({ name: '', dateOfBirth: '', gender: 'other' })).toHaveLength(1);
  });
});

describe('toProfileFormValues', () => {
  it('fills the form with empty values for an empty profile', () => {
    expect(toProfileFormValues(user)).toEqual({ name: '', dateOfBirth: '', gender: 'none' });
  });

  it('fills the form with the current values', () => {
    expect(
      toProfileFormValues({ ...user, name: 'Ann', dateOfBirth: '1990-05-17', gender: 'male' }),
    ).toEqual({ name: 'Ann', dateOfBirth: '1990-05-17', gender: 'male' });
  });
});

describe('todayUtc', () => {
  it('returns the UTC date as YYYY-MM-DD, like the api', () => {
    expect(todayUtc(new Date('2026-11-19T23:30:00.000-05:00'))).toBe('2026-11-20');
  });
});
