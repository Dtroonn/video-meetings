import type { UserResponse } from '@video-meetings/contracts';
import { describe, expect, it } from 'vitest';
import { createUserStore } from './user-store';

const user: UserResponse = {
  id: 'u1',
  email: 'ann@example.com',
  name: 'Ann',
  dateOfBirth: null,
  gender: null,
  avatarUrl: '/users/u1/avatar?v=a1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('setAvatarUrl', () => {
  it('changes only the avatar of the loaded user', () => {
    const store = createUserStore();
    store.getState().setUser(user);
    store.getState().setAvatarUrl(null);
    expect(store.getState().user).toEqual({ ...user, avatarUrl: null });
    expect(store.getState().status).toBe('ready');
  });

  it('does nothing before the user has loaded', () => {
    const store = createUserStore();
    store.getState().setAvatarUrl('/users/u1/avatar?v=a2');
    expect(store.getState().user).toBeNull();
  });
});
