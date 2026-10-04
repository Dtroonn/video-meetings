import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { GetMeResponseDto } from './dto/get-me-response.dto';
import { GetUserByIdQuery } from './queries/get-user-by-id/get-user-by-id.query';

// Every route requires an access token (global `AccessTokenGuard`).
@Controller('users')
export class UsersController {
  constructor(private readonly queryBus: QueryBus) {}

  /** The user the access token belongs to. */
  @Get('me')
  async me(@CurrentUser() { id }: AuthenticatedUser): Promise<GetMeResponseDto> {
    const user = await this.queryBus.execute(new GetUserByIdQuery(id));
    if (!user) {
      // A valid token of a deleted user: the session is meaningless, so treat it as signed out.
      throw new UnauthorizedException('User not found');
    }
    return new GetMeResponseDto(user);
  }
}
