import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetUserByIdQuery } from '@/users/queries/get-user-by-id/get-user-by-id.query';
import type { AuthTokens } from '../../auth.types';
import { TokensService } from '../../services/tokens.service';
import { RefreshTokensCommand } from './refresh-tokens.command';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand, AuthTokens> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokens: TokensService,
  ) {}

  async execute({ refreshToken }: RefreshTokensCommand): Promise<AuthTokens> {
    const userId = await this.tokens.consumeRefreshToken(refreshToken);

    const user = await this.queryBus.execute(new GetUserByIdQuery(userId));
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.tokens.issue(user);
  }
}
