import { Command } from '@nestjs/cqrs';

/**
 * Replaces the user's password hash, but only if it's still `currentHash` — the hash the caller
 * verified the current password against. A concurrent change in between makes this a no-op, so
 * two changes made with the same old password can't both succeed.
 *
 * @returns whether the hash was replaced (false if the user is gone or the hash has changed).
 */
export class UpdatePasswordHashCommand extends Command<boolean> {
  constructor(
    public readonly userId: string,
    public readonly currentHash: string,
    public readonly newHash: string,
  ) {
    super();
  }
}
