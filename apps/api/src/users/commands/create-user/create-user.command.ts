import { Command } from '@nestjs/cqrs';
import type { PublicUser } from '@/users/users.types';

/** @throws ConflictException if the email is already registered. */
export class CreateUserCommand extends Command<PublicUser> {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string,
  ) {
    super();
  }
}
