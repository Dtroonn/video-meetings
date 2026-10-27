import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/users.module';
import { CreateMeetingHandler } from './commands/create-meeting/create-meeting.handler';
import { MeetingsController } from './meetings.controller';
import { GetMeetingByIdHandler } from './queries/get-meeting-by-id/get-meeting-by-id.handler';
import { GetMeetingsHandler } from './queries/get-meetings/get-meetings.handler';

// Participants' emails come from the users module through the QueryBus; it's imported so its
// handlers are registered.
@Module({
  imports: [UsersModule],
  controllers: [MeetingsController],
  providers: [CreateMeetingHandler, GetMeetingsHandler, GetMeetingByIdHandler],
})
export class MeetingsModule {}
