import { Body, Controller, Get, Patch, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { UpdateProfileCommand } from './commands/update-profile/update-profile.command';
import { GetMeResponseDto } from './dto/get-me-response.dto';
import { UpdateMeRequestDto } from './dto/update-me-request.dto';
import { UpdateMeResponseDto } from './dto/update-me-response.dto';
import { GetUserByIdQuery } from './queries/get-user-by-id/get-user-by-id.query';

// Every route requires an access token (global `AccessTokenGuard`).
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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

  /**
   * Changes the profile of the user the access token belongs to; there's no route taking a user
   * id, so nobody can change someone else's profile.
   */
  @Patch('me')
  async updateMe(
    @CurrentUser() { id }: AuthenticatedUser,
    @Body() { name, dateOfBirth, gender }: UpdateMeRequestDto,
  ): Promise<UpdateMeResponseDto> {
    const user = await this.commandBus.execute(
      new UpdateProfileCommand(id, { name, dateOfBirth, gender }),
    );
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return new UpdateMeResponseDto(user);
  }
}
