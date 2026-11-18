import { AVATAR_MAX_SIZE, type AvatarType } from '@video-meetings/contracts';
import type { PrismaService } from '@/prisma/prisma.service';

export const ALLOWED_AVATAR_TYPES_MESSAGE = 'Allowed avatar types: JPEG, PNG, WebP';
export const AVATAR_TOO_LARGE_MESSAGE = `An avatar may be at most ${AVATAR_MAX_SIZE / (1024 * 1024)} MB`;

/**
 * What `file-type` detects in an allowed avatar, mapped to the type it's served with. An APNG is
 * a PNG with extra chunks, which browsers show as `image/png`.
 */
const DETECTED_AVATAR_TYPES: Record<string, AvatarType> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  apng: 'image/png',
  webp: 'image/webp',
};

/**
 * The avatar type of content in which `file-type` detected `detected`, or `undefined` if it isn't
 * an allowed image. Unlike meeting files, content that isn't recognized at all is refused too:
 * every allowed image format has a signature.
 */
export const avatarTypeOf = (detected: string | undefined): AvatarType | undefined =>
  detected !== undefined && Object.hasOwn(DETECTED_AVATAR_TYPES, detected)
    ? DETECTED_AVATAR_TYPES[detected]
    : undefined;

/** Where an avatar is stored, relative to `UPLOADS_DIR`. */
export const avatarStorageKey = (userId: string, avatarId: string) =>
  `avatars/${userId}/${avatarId}`;

/**
 * The api path an avatar is loaded from. It carries the avatar id as a version, so a new avatar
 * gets a new URL and a cached old image is never shown in its place.
 */
export const avatarUrl = (userId: string, avatarId: string) =>
  `/users/${userId}/avatar?v=${avatarId}`;

type Transaction = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

/**
 * Locks the user's row until the end of the transaction and returns their current avatar id
 * (`null` if there's none, `undefined` if the user doesn't exist). Concurrent changes of one
 * user's avatar wait for each other, so each sees the id the previous one left and removes the
 * right file: no avatar file is orphaned, and none is removed while the row still points at it.
 */
export const lockAvatar = async (
  tx: Transaction,
  userId: string,
): Promise<string | null | undefined> => {
  const rows = await tx.$queryRaw<{ avatar_id: string | null }[]>`
    SELECT avatar_id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
  return rows.length === 0 ? undefined : rows[0].avatar_id;
};
