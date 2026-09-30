import { Command } from '@nestjs/cqrs';
import type { AuthTokens } from '../../auth.types';

/**
 * Exchanges a refresh token for a new token pair; the used refresh token stops working.
 *
 * @throws UnauthorizedException if the token is invalid, expired or was already used.
 */
export class RefreshTokensCommand extends Command<AuthTokens> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
