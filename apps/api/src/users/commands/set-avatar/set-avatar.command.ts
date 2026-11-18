import type { Readable } from 'node:stream';
import { Command } from '@nestjs/cqrs';
import type { PublicUser } from '@/users/users.types';

/**
 * Stores `body` (`length` bytes, already checked against `AVATAR_MAX_SIZE`) as the user's avatar,
 * replacing the current one. Resolves to the updated user, or `null` if the user doesn't exist.
 */
export class SetAvatarCommand extends Command<PublicUser | null> {
  constructor(
    public readonly userId: string,
    public readonly length: number,
    public readonly body: Readable,
  ) {
    super();
  }
}
