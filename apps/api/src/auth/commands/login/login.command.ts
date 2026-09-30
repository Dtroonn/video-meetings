import { Command } from '@nestjs/cqrs';
import type { AuthResult } from '../../auth.types';

/**
 * A command, not a query: a successful login starts a session (stores a refresh token).
 *
 * @throws UnauthorizedException for an unknown email or a wrong password (same error for both).
 */
export class LoginCommand extends Command<AuthResult> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}
