import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import type { PublicUser } from '@/users/users.types';
import { GetUsersByIdsQuery } from './get-users-by-ids.query';

@QueryHandler(GetUsersByIdsQuery)
export class GetUsersByIdsHandler implements IQueryHandler<GetUsersByIdsQuery, PublicUser[]> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ ids }: GetUsersByIdsQuery): Promise<PublicUser[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      omit: { passwordHash: true },
    });
  }
}
