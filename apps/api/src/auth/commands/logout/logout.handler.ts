import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { TokensService } from '../../services/tokens.service';
import { LogoutCommand } from './logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand, void> {
  constructor(private readonly tokens: TokensService) {}

  execute({ refreshToken }: LogoutCommand): Promise<void> {
    return this.tokens.revokeRefreshToken(refreshToken);
  }
}
