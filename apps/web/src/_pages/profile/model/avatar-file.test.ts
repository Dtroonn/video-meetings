import { AVATAR_MAX_SIZE } from '@video-meetings/contracts';
import { describe, expect, it } from 'vitest';
import { ALLOWED_AVATAR_TYPES_LABEL, AVATAR_INPUT_ACCEPT, checkAvatarFile } from './avatar-file';

describe('checkAvatarFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(checkAvatarFile({ type, size: 1024 })).toBeNull();
  });

  it('accepts a file of exactly the size limit', () => {
    expect(checkAvatarFile({ type: 'image/png', size: AVATAR_MAX_SIZE })).toBeNull();
  });

  it('rejects a file one byte over the size limit', () => {
    expect(checkAvatarFile({ type: 'image/png', size: AVATAR_MAX_SIZE + 1 })).toBe('size');
  });

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('rejects the type %j', (type) => {
    expect(checkAvatarFile({ type, size: 1024 })).toBe('type');
  });

  it('reports the type first when both the type and the size are wrong', () => {
    expect(checkAvatarFile({ type: 'image/gif', size: AVATAR_MAX_SIZE + 1 })).toBe('type');
  });

  it('rejects an empty file as the wrong type, since it has no image content', () => {
    expect(checkAvatarFile({ type: 'image/png', size: 0 })).toBe('type');
  });
});

describe('avatar type labels', () => {
  it('lists the allowed types for users', () => {
    expect(ALLOWED_AVATAR_TYPES_LABEL).toBe('JPEG, PNG, WebP');
  });

  it('offers only the allowed types in the picker', () => {
    expect(AVATAR_INPUT_ACCEPT).toBe('image/jpeg,image/png,image/webp');
  });
});
