import { AVATAR_MAX_SIZE, AVATAR_TYPES, type AvatarType } from '@video-meetings/contracts';

/** Why a picked file isn't uploaded: its type isn't allowed, or it's over the size limit. */
export type AvatarRejection = 'type' | 'size';

const TYPE_LABELS: Record<AvatarType, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

/** The allowed types as shown to users: `JPEG, PNG, WebP`. */
export const ALLOWED_AVATAR_TYPES_LABEL = AVATAR_TYPES.map((type) => TYPE_LABELS[type]).join(', ');

/** The file input's `accept`: the allowed MIME types, so the picker offers only images of those. */
export const AVATAR_INPUT_ACCEPT = AVATAR_TYPES.join(',');

/** The size limit in whole megabytes, for the texts (`AVATAR_MAX_SIZE` is 5 MiB). */
export const AVATAR_MAX_SIZE_MB = AVATAR_MAX_SIZE / (1024 * 1024);

const isAvatarType = (type: string): type is AvatarType =>
  (AVATAR_TYPES as readonly string[]).includes(type);

/**
 * Checks a picked file against the limits from `@video-meetings/contracts` before it's uploaded:
 * a type from `AVATAR_TYPES` (the browser's MIME type; the api checks the content too) and at most
 * `AVATAR_MAX_SIZE` bytes. An empty file holds no image, so it counts as the wrong type. Returns
 * why it's rejected, or `null` if it may be uploaded.
 */
export function checkAvatarFile({
  type,
  size,
}: Pick<File, 'type' | 'size'>): AvatarRejection | null {
  if (!isAvatarType(type) || size === 0) {
    return 'type';
  }
  return size > AVATAR_MAX_SIZE ? 'size' : null;
}
