import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import type { UserCredentials } from '@/users/users.types';
import { GetUserCredentialsByIdQuery } from './get-user-credentials-by-id.query';

@QueryHandler(GetUserCredentialsByIdQuery)
export class GetUserCredentialsByIdHandler implements IQueryHandler<
  GetUserCredentialsByIdQuery,
  UserCredentials | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetUserCredentialsByIdQuery): Promise<UserCredentials | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) {
      return null;
    }
    // Split the hash off, so the user half can be returned to a client as is.
    const { passwordHash, ...user } = row;
    return { user, passwordHash };
  }
}
