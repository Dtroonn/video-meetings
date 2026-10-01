import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { LoginCommand } from './commands/login/login.command';
import { RefreshTokensCommand } from './commands/refresh-tokens/refresh-tokens.command';
import { RegisterCommand } from './commands/register/register.command';
import { LoginRequestDto } from './dto/login-request.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokensRequestDto } from './dto/refresh-tokens-request.dto';
import { RefreshTokensResponseDto } from './dto/refresh-tokens-response.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { Public } from './decorators/public.decorator';

// These endpoints are how a client gets an access token, so they can't require one.
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  async register(@Body() { email, password }: RegisterRequestDto): Promise<RegisterResponseDto> {
    const result = await this.commandBus.execute(new RegisterCommand(email, password));
    return new RegisterResponseDto(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() { email, password }: LoginRequestDto): Promise<LoginResponseDto> {
    const result = await this.commandBus.execute(new LoginCommand(email, password));
    return new LoginResponseDto(result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() { refreshToken }: RefreshTokensRequestDto,
  ): Promise<RefreshTokensResponseDto> {
    const tokens = await this.commandBus.execute(new RefreshTokensCommand(refreshToken));
    return new RefreshTokensResponseDto(tokens);
  }
}
