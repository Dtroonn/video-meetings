import { describe, expect, it } from 'vitest';
import { avatarSrc } from './avatar';

describe('avatarSrc', () => {
  it('loads the avatar through the same-origin /api rewrite', () => {
    expect(avatarSrc('/users/u1/avatar?v=a1')).toBe('/api/users/u1/avatar?v=a1');
  });

  it('has no source when the user has no avatar', () => {
    expect(avatarSrc(null)).toBeUndefined();
  });
});
