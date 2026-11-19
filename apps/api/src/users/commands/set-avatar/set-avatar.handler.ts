import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AvatarType } from '@video-meetings/contracts';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import {
  ALLOWED_AVATAR_TYPES_MESSAGE,
  avatarStorageKey,
  avatarTypeOf,
  lockAvatar,
} from '@/users/avatars';
import type { PublicUser } from '@/users/users.types';
import { SetAvatarCommand } from './set-avatar.command';

@CommandHandler(SetAvatarCommand)
export class SetAvatarHandler implements ICommandHandler<SetAvatarCommand, PublicUser | null> {
  private readonly logger = new Logger(SetAvatarHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async execute({ userId, length, body }: SetAvatarCommand): Promise<PublicUser | null> {
    // Every upload gets a new id, so a new file and URL; the current avatar stays untouched until
    // the new one is fully stored and checked.
    const avatarId = randomUUID();
    const key = avatarStorageKey(userId, avatarId);
    const type = await this.store(avatarId, key, length, body);

    let result: { user: PublicUser; previousAvatarId: string | null } | null;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const previousAvatarId = await lockAvatar(tx, userId);
        if (previousAvatarId === undefined) return null;
        const user = await tx.user.update({
          where: { id: userId },
          data: { avatarId, avatarType: type },
          omit: { passwordHash: true },
        });
        return { user, previousAvatarId };
      });
    } catch (error) {
      await this.removeQuietly(key);
      throw error;
    }

    if (!result) {
      await this.removeQuietly(key);
      return null;
    }
    // The record points at the new file first, so a URL a client got always has its file.
    if (result.previousAvatarId) {
      await this.removeQuietly(avatarStorageKey(userId, result.previousAvatarId));
    }
    return result.user;
  }

  /**
   * Cleanup that must not fail the request: the new avatar is already saved (or the original
   * error is the one to report), so a leftover file is only logged.
   */
  private async removeQuietly(key: string): Promise<void> {
    try {
      await this.storage.remove(key);
    } catch (error) {
      this.logger.warn(`Could not remove ${key}: ${String(error)}`);
    }
  }

  /**
   * Streams the upload to a temporary file, checks it's a complete, allowed image and moves it to
   * `key`. Returns the type detected from its content; leaves nothing on disk if it fails.
   */
  private async store(
    avatarId: string,
    key: string,
    length: number,
    body: Readable,
  ): Promise<AvatarType> {
    await this.storage.createTemp(avatarId);
    try {
      const written = await this.storage.writeTemp(avatarId, 0, body);
      if (written !== length) {
        throw new BadRequestException('The avatar was not received completely');
      }
      const { detectedType } = await this.storage.inspectTemp(avatarId);
      const type = avatarTypeOf(detectedType);
      if (!type) {
        throw new BadRequestException(ALLOWED_AVATAR_TYPES_MESSAGE);
      }
      await this.storage.commitTemp(avatarId, key);
      return type;
    } finally {
      // Already moved away after a successful commit; a missing file is fine.
      await this.storage.removeTemp(avatarId);
    }
  }
}
