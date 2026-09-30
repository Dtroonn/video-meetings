import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@/users/users.module';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/login/login.handler';
import { RefreshTokensHandler } from './commands/refresh-tokens/refresh-tokens.handler';
import { RegisterHandler } from './commands/register/register.handler';
import { PasswordService } from './services/password.service';
import { TokensService } from './services/tokens.service';

@Module({
  imports: [
    // No default secret: TokensService passes the access or refresh secret on every sign/verify.
    JwtModule.register({}),
    // Auth dispatches users' commands/queries, so their handlers must be registered.
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [RegisterHandler, LoginHandler, RefreshTokensHandler, PasswordService, TokensService],
})
export class AuthModule {}
