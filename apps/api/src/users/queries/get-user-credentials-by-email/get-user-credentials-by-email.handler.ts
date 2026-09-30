import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import type { UserCredentials } from '@/users/users.types';
import { GetUserCredentialsByEmailQuery } from './get-user-credentials-by-email.query';

@QueryHandler(GetUserCredentialsByEmailQuery)
export class GetUserCredentialsByEmailHandler implements IQueryHandler<
  GetUserCredentialsByEmailQuery,
  UserCredentials | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ email }: GetUserCredentialsByEmailQuery): Promise<UserCredentials | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    if (!row) {
      return null;
    }
    // Split the hash off, so the user half can be returned to a client as is.
    const { passwordHash, ...user } = row;
    return { user, passwordHash };
  }
}
