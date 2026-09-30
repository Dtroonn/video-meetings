import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import type { PublicUser } from '@/users/users.types';
import { GetUserByIdQuery } from './get-user-by-id.query';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, PublicUser | null> {
  constructor(private readonly prisma: PrismaService) {}

  execute({ id }: GetUserByIdQuery): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({ where: { id }, omit: { passwordHash: true } });
  }
}
