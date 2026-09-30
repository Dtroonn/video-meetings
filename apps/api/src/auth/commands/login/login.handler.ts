import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetUserCredentialsByEmailQuery } from '@/users/queries/get-user-credentials-by-email/get-user-credentials-by-email.query';
import type { AuthResult } from '../../auth.types';
import { PasswordService } from '../../services/password.service';
import { TokensService } from '../../services/tokens.service';
import { LoginCommand } from './login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, AuthResult> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async execute({ email, password }: LoginCommand): Promise<AuthResult> {
    const credentials = await this.queryBus.execute(new GetUserCredentialsByEmailQuery(email));

    // Always verify, even for an unknown email — see PasswordService.verify.
    const isPasswordValid = await this.passwords.verify(credentials?.passwordHash, password);
    if (!credentials || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { user } = credentials;
    return { user, ...(await this.tokens.issue(user)) };
  }
}
