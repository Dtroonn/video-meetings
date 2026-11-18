import { Command } from '@nestjs/cqrs';
import type { ProfileChanges, PublicUser } from '@/users/users.types';

/** Changes the user's profile fields; resolves to `null` if the user doesn't exist. */
export class UpdateProfileCommand extends Command<PublicUser | null> {
  constructor(
    public readonly userId: string,
    public readonly changes: ProfileChanges,
  ) {
    super();
  }
}
