import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from '@/users/commands/create-user/create-user.command';
import type { AuthResult } from '../../auth.types';
import { PasswordService } from '../../services/password.service';
import { TokensService } from '../../services/tokens.service';
import { RegisterCommand } from './register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, AuthResult> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async execute({ email, password }: RegisterCommand): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(password);
    const user = await this.commandBus.execute(new CreateUserCommand(email, passwordHash));

    return { user, ...(await this.tokens.issue(user)) };
  }
}
