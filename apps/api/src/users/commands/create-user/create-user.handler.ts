import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { PublicUser } from '@/users/users.types';
import { CreateUserCommand } from './create-user.command';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, PublicUser> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ email, passwordHash }: CreateUserCommand): Promise<PublicUser> {
    try {
      return await this.prisma.user.create({
        data: { email, passwordHash },
        omit: { passwordHash: true },
      });
    } catch (error) {
      // Relies on the unique index rather than a lookup first, so concurrent sign-ups can't race.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
