import { Module } from '@nestjs/common';
import { CreateMeetingHandler } from './commands/create-meeting/create-meeting.handler';
import { MeetingsController } from './meetings.controller';
import { GetMeetingByIdHandler } from './queries/get-meeting-by-id/get-meeting-by-id.handler';
import { GetMeetingsHandler } from './queries/get-meetings/get-meetings.handler';

@Module({
  controllers: [MeetingsController],
  providers: [CreateMeetingHandler, GetMeetingsHandler, GetMeetingByIdHandler],
})
export class MeetingsModule {}
