import { CommandHandler, type ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { GetMeetingByIdQuery } from '@/meetings/queries/get-meeting-by-id/get-meeting-by-id.query';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { toMeetingFileUpload } from '../../meeting-files.mapper';
import type { MeetingFileUpload } from '../../meeting-files.types';
import { StartUploadCommand } from './start-upload.command';

@CommandHandler(StartUploadCommand)
export class StartUploadHandler implements ICommandHandler<StartUploadCommand, MeetingFileUpload> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute({
    userId,
    meetingId,
    name,
    mimeType,
    size,
  }: StartUploadCommand): Promise<MeetingFileUpload> {
    // Throws the meetings 404 for anyone but the owner and participants.
    await this.queryBus.execute(new GetMeetingByIdQuery(meetingId, userId));

    const file = await this.prisma.meetingFile.create({
      data: { meetingId, uploaderId: userId, name, mimeType, size },
    });
    try {
      await this.storage.createTemp(file.id);
    } catch (error) {
      await this.prisma.meetingFile.delete({ where: { id: file.id } });
      throw error;
    }
    return toMeetingFileUpload(file);
  }
}
