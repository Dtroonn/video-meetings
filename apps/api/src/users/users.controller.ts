import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AVATAR_MAX_SIZE, AVATAR_TYPES } from '@video-meetings/contracts';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ALLOWED_AVATAR_TYPES_MESSAGE, AVATAR_TOO_LARGE_MESSAGE } from './avatars';
import { RemoveAvatarCommand } from './commands/remove-avatar/remove-avatar.command';
import { SetAvatarCommand } from './commands/set-avatar/set-avatar.command';
import { UpdateProfileCommand } from './commands/update-profile/update-profile.command';
import { GetMeResponseDto } from './dto/get-me-response.dto';
import { UpdateMeRequestDto } from './dto/update-me-request.dto';
import { UpdateMeResponseDto } from './dto/update-me-response.dto';
import { SetAvatarResponseDto } from './dto/set-avatar-response.dto';
import { GetAvatarQuery } from './queries/get-avatar/get-avatar.query';
import { GetUserByIdQuery } from './queries/get-user-by-id/get-user-by-id.query';

/**
 * Checks the framing of an avatar upload before its body is read: a raw image body (Nest's
 * JSON/urlencoded parsers leave it unread, so it reaches the handler as a stream) with a known,
 * non-zero length of at most `AVATAR_MAX_SIZE`. The `Content-Type` only has to look like an
 * allowed image; the handler decides the type from the content.
 */
const avatarLength = (req: Request): number => {
  if (!req.is([...AVATAR_TYPES, 'application/octet-stream'])) {
    throw new BadRequestException(ALLOWED_AVATAR_TYPES_MESSAGE);
  }
  const header = req.headers['content-length'];
  if (header === undefined) {
    throw new HttpException('Content-Length is required', HttpStatus.LENGTH_REQUIRED);
  }
  const length = Number(header);
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new BadRequestException('The avatar is empty');
  }
  if (length > AVATAR_MAX_SIZE) {
    throw new BadRequestException(AVATAR_TOO_LARGE_MESSAGE);
  }
  return length;
};

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

  /**
   * Uploads or replaces the avatar of the user the access token belongs to; the body is the raw
   * image. Like the profile, only the token's own user can be changed.
   */
  @Put('me/avatar')
  async setAvatar(
    @CurrentUser() { id }: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<SetAvatarResponseDto> {
    const user = await this.commandBus.execute(new SetAvatarCommand(id, avatarLength(req), req));
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return new SetAvatarResponseDto(user);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAvatar(@CurrentUser() { id }: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute(new RemoveAvatarCommand(id));
  }

  /**
   * Serves a user's avatar to any signed-in user. Unlike meeting files, it goes out with its own
   * image type: it was checked by content to be a JPEG, PNG or WebP (no SVG or HTML that could
   * run scripts), and `nosniff` plus a sandbox CSP keep the browser from treating it as anything
   * else.
   */
  @Get(':id/avatar')
  async avatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('v') version: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { avatarId, type, size, stream } = await this.queryBus.execute(new GetAvatarQuery(id));
    res.set({
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      // A URL with the current avatar's version always shows this image, so the browser may keep
      // it; any other URL must be checked again, since the avatar behind it can change.
      'Cache-Control':
        version === avatarId ? 'private, max-age=31536000, immutable' : 'private, no-cache',
    });
    return new StreamableFile(stream, { length: size });
  }
}
