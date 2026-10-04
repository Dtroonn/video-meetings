import { Command } from '@nestjs/cqrs';

/**
 * Ends the session the refresh token belongs to: the token stops working. Other sessions of the
 * user stay. An already used or expired token is accepted, so logging out twice is harmless.
 *
 * @throws UnauthorizedException if the token isn't a valid refresh token.
 */
export class LogoutCommand extends Command<void> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
