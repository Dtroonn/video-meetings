import { NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AvatarType } from '@video-meetings/contracts';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { avatarStorageKey } from '@/users/avatars';
import type { AvatarContent } from '@/users/users.types';
import { GetAvatarQuery } from './get-avatar.query';

@QueryHandler(GetAvatarQuery)
export class GetAvatarHandler implements IQueryHandler<GetAvatarQuery, AvatarContent> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async execute({ userId }: GetAvatarQuery): Promise<AvatarContent> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarId: true, avatarType: true },
    });
    if (!user?.avatarId || !user.avatarType) {
      throw new NotFoundException('Avatar not found');
    }
    try {
      const { size, stream } = await this.storage.openRead(avatarStorageKey(userId, user.avatarId));
      // Only types detected by `avatarTypeOf` are ever written to the column.
      return { avatarId: user.avatarId, type: user.avatarType as AvatarType, size, stream };
    } catch (error) {
      // Replaced or removed between reading the row and opening the file.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Avatar not found');
      }
      throw error;
    }
  }
}
