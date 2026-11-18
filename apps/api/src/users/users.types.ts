import type { Readable } from 'node:stream';
import type { AvatarType, Gender } from '@video-meetings/contracts';
import type { User } from '@/generated/prisma/client';

/** A user as it may leave the users module by default: never with the password hash. */
export type PublicUser = Omit<User, 'passwordHash'>;

/** Only for verifying a password; never send this to a client. */
export interface UserCredentials {
  user: PublicUser;
  passwordHash: string;
}

/**
 * Profile fields to change: `undefined` keeps the current value, `null` clears it. Values are
 * already validated and normalized (trimmed, non-empty name; `YYYY-MM-DD` date).
 */
export interface ProfileChanges {
  name?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
}

/** A stored avatar opened for streaming. */
export interface AvatarContent {
  avatarId: string;
  type: AvatarType;
  size: number;
  stream: Readable;
}
