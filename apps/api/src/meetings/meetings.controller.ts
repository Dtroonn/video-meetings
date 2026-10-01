import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateMeetingCommand } from './commands/create-meeting/create-meeting.command';
import { CreateMeetingRequestDto } from './dto/create-meeting-request.dto';
import { CreateMeetingResponseDto } from './dto/create-meeting-response.dto';
import { GetMeetingResponseDto } from './dto/get-meeting-response.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { GetMeetingByIdQuery } from './queries/get-meeting-by-id/get-meeting-by-id.query';
import { GetMeetingsQuery } from './queries/get-meetings/get-meetings.query';

// Every route requires an access token (global `AccessTokenGuard`).
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() { title, date, participants }: CreateMeetingRequestDto,
  ): Promise<CreateMeetingResponseDto> {
    const meeting = await this.commandBus.execute(
      new CreateMeetingCommand(user.id, title, new Date(date), participants),
    );
    return new CreateMeetingResponseDto(meeting);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<MeetingResponseDto[]> {
    const meetings = await this.queryBus.execute(new GetMeetingsQuery(user.id));
    return meetings.map((meeting) => new MeetingResponseDto(meeting));
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GetMeetingResponseDto> {
    const meeting = await this.queryBus.execute(new GetMeetingByIdQuery(id, user.id));
    return new GetMeetingResponseDto(meeting);
  }
}
