import type { UserResponse } from '@video-meetings/contracts';
import { describe, expect, it } from 'vitest';
import { greetingName } from './greeting';

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

describe('greetingName', () => {
  it('uses the name when it is set', () => {
    expect(greetingName({ ...user, name: 'Ann' })).toBe('Ann');
  });

  it('falls back to the email without a name', () => {
    expect(greetingName(user)).toBe('ann@example.com');
  });
});
