import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { UpdatePasswordHashCommand } from '@/users/commands/update-password-hash/update-password-hash.command';
import { GetUserCredentialsByIdQuery } from '@/users/queries/get-user-credentials-by-id/get-user-credentials-by-id.query';
import type { AuthTokens } from '../../auth.types';
import { PasswordService } from '../../services/password.service';
import { TokensService } from '../../services/tokens.service';
import { ChangePasswordCommand } from './change-password.command';

/** Not 401: clients treat a 401 as an expired session and refresh or sign out. */
export const WRONG_CURRENT_PASSWORD_MESSAGE = 'Current password is wrong';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, AuthTokens> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async execute({
    userId,
    currentPassword,
    newPassword,
  }: ChangePasswordCommand): Promise<AuthTokens> {
    const credentials = await this.queryBus.execute(new GetUserCredentialsByIdQuery(userId));
    if (!credentials) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!(await this.passwords.verify(credentials.passwordHash, currentPassword))) {
      throw new ForbiddenException(WRONG_CURRENT_PASSWORD_MESSAGE);
    }

    const newHash = await this.passwords.hash(newPassword);
    // Conditional on the hash just verified: if another change got in first, the password this
    // request proved is no longer the current one.
    const isChanged = await this.commandBus.execute(
      new UpdatePasswordHashCommand(userId, credentials.passwordHash, newHash),
    );
    if (!isChanged) {
      throw new ForbiddenException(WRONG_CURRENT_PASSWORD_MESSAGE);
    }

    // Everyone signed in elsewhere (possibly with the old password) loses their refresh token;
    // the caller gets a fresh session instead.
    return this.tokens.replaceSessions(credentials.user);
  }
}
