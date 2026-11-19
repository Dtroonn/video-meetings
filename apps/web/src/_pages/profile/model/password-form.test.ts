import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@video-meetings/contracts';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { createPasswordSchema, toChangePasswordRequest } from './password-form';

const messages = {
  currentPasswordRequired: 'Enter current',
  currentPasswordTooLong: 'Current at most {max}',
  newPasswordTooShort: 'At least {min}',
  newPasswordTooLong: 'At most {max}',
  confirmNewPasswordRequired: 'Confirm',
  passwordsMismatch: 'Mismatch',
};
const schema = createPasswordSchema(messages);

const NEW = 'n'.repeat(PASSWORD_MIN_LENGTH);

/** Each invalid field with its first message: the one the form shows. */
const issuesOf = (input: unknown) => {
  const result = v.safeParse(schema, input);
  if (result.success) return [];
  const first = new Map<string, string>();
  for (const issue of result.issues) {
    const path = v.getDotPath(issue) ?? '';
    if (!first.has(path)) first.set(path, issue.message);
  }
  return [...first];
};

describe('createPasswordSchema', () => {
  it('accepts a matching new password within the limits', () => {
    expect(
      v.parse(schema, { currentPassword: 'old', newPassword: NEW, confirmNewPassword: NEW }),
    ).toEqual({ currentPassword: 'old', newPassword: NEW, confirmNewPassword: NEW });
  });

  it('rejects a confirmation that differs from the new password', () => {
    expect(
      issuesOf({ currentPassword: 'old', newPassword: NEW, confirmNewPassword: `${NEW}x` }),
    ).toEqual([['confirmNewPassword', 'Mismatch']]);
  });

  it('rejects a new password shorter than the minimum', () => {
    const short = 'n'.repeat(PASSWORD_MIN_LENGTH - 1);
    expect(
      issuesOf({ currentPassword: 'old', newPassword: short, confirmNewPassword: short }),
    ).toEqual([['newPassword', `At least ${PASSWORD_MIN_LENGTH}`]]);
  });

  it('rejects a new password longer than the maximum', () => {
    const long = 'n'.repeat(PASSWORD_MAX_LENGTH + 1);
    expect(
      issuesOf({ currentPassword: 'old', newPassword: long, confirmNewPassword: long }),
    ).toEqual([['newPassword', `At most ${PASSWORD_MAX_LENGTH}`]]);
  });

  it('requires the current password and the confirmation', () => {
    expect(issuesOf({ currentPassword: '', newPassword: NEW, confirmNewPassword: '' })).toEqual([
      ['currentPassword', 'Enter current'],
      ['confirmNewPassword', 'Confirm'],
    ]);
  });

  it('accepts a short current password (it may predate the rules) but not an overlong one', () => {
    expect(issuesOf({ currentPassword: 'a', newPassword: NEW, confirmNewPassword: NEW })).toEqual(
      [],
    );
    expect(
      issuesOf({
        currentPassword: 'a'.repeat(PASSWORD_MAX_LENGTH + 1),
        newPassword: NEW,
        confirmNewPassword: NEW,
      }),
    ).toEqual([['currentPassword', `Current at most ${PASSWORD_MAX_LENGTH}`]]);
  });

  it('checks the confirmation even while the current password is missing', () => {
    expect(
      issuesOf({ currentPassword: '', newPassword: NEW, confirmNewPassword: `${NEW}x` }),
    ).toEqual([
      ['currentPassword', 'Enter current'],
      ['confirmNewPassword', 'Mismatch'],
    ]);
  });
});

describe('toChangePasswordRequest', () => {
  it('drops the confirmation', () => {
    expect(
      toChangePasswordRequest({
        currentPassword: 'old',
        newPassword: NEW,
        confirmNewPassword: NEW,
      }),
    ).toEqual({ currentPassword: 'old', newPassword: NEW });
  });
});
