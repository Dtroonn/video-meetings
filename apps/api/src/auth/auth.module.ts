import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@/users/users.module';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/login/login.handler';
import { RefreshTokensHandler } from './commands/refresh-tokens/refresh-tokens.handler';
import { RegisterHandler } from './commands/register/register.handler';
import { AccessTokenGuard } from './guards/access-token.guard';
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
  providers: [
    RegisterHandler,
    LoginHandler,
    RefreshTokensHandler,
    PasswordService,
    TokensService,
    // Global: every route of every module needs an access token unless it's marked @Public().
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AuthModule {}
