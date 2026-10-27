import { Module } from '@nestjs/common';
import { MeetingsModule } from '@/meetings/meetings.module';
import { UsersModule } from '@/users/users.module';
import { CompleteUploadHandler } from './commands/complete-upload/complete-upload.handler';
import { StartUploadHandler } from './commands/start-upload/start-upload.handler';
import { UploadChunkHandler } from './commands/upload-chunk/upload-chunk.handler';
import { MeetingFilesController } from './meeting-files.controller';
import { GetMeetingFilesHandler } from './queries/get-meeting-files/get-meeting-files.handler';
import { MeetingFilesService } from './services/meeting-files.service';

// Membership checks and uploader emails go through the QueryBus; the meetings and users modules
// are imported so their handlers are registered.
@Module({
  imports: [MeetingsModule, UsersModule],
  controllers: [MeetingFilesController],
  providers: [
    MeetingFilesService,
    StartUploadHandler,
    UploadChunkHandler,
    CompleteUploadHandler,
    GetMeetingFilesHandler,
  ],
})
export class MeetingFilesModule {}
