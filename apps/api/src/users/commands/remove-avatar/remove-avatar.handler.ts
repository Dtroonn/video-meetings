import { Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { avatarStorageKey, lockAvatar } from '@/users/avatars';
import { RemoveAvatarCommand } from './remove-avatar.command';

@CommandHandler(RemoveAvatarCommand)
export class RemoveAvatarHandler implements ICommandHandler<RemoveAvatarCommand, void> {
  private readonly logger = new Logger(RemoveAvatarHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async execute({ userId }: RemoveAvatarCommand): Promise<void> {
    const previousAvatarId = await this.prisma.$transaction(async (tx) => {
      const current = await lockAvatar(tx, userId);
      if (current) {
        await tx.user.update({ where: { id: userId }, data: { avatarId: null, avatarType: null } });
      }
      return current;
    });
    // The record goes first, so an avatar URL a client gets always has its file.
    if (previousAvatarId) {
      // Already gone from the record, so a leftover file is only logged, not reported as a failure.
      await this.storage
        .remove(avatarStorageKey(userId, previousAvatarId))
        .catch((error: unknown) =>
          this.logger.warn(`Could not remove avatar file: ${String(error)}`),
        );
    }
  }
}
