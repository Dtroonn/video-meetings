import { Command } from '@nestjs/cqrs';
import type { AuthTokens } from '../../auth.types';

/**
 * Changes the user's password after checking the current one, then ends all of the user's
 * sessions and starts a new one for the caller.
 *
 * @returns the new session's token pair; the caller's access token also stays valid until it
 *   expires, but its old refresh token no longer works.
 * @throws ForbiddenException if `currentPassword` is wrong (the password stays unchanged).
 * @throws UnauthorizedException if the user no longer exists.
 */
export class ChangePasswordCommand extends Command<AuthTokens> {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {
    super();
  }
}
