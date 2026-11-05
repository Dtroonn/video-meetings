import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { MEETING_FILE_TYPES, PENDING_UPLOAD_TTL } from '@video-meetings/contracts';
import { type MeetingFile, MeetingFileStatus } from '@/generated/prisma/client';
import { GetMeetingByIdQuery } from '@/meetings/queries/get-meeting-by-id/get-meeting-by-id.query';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { ALLOWED_FILE_TYPES_MESSAGE, allowedExtensionOf } from '../../meeting-file-types';
import { toMeetingFileUpload } from '../../meeting-files.mapper';
import type { MeetingFileUpload } from '../../meeting-files.types';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { StartUploadCommand } from './start-upload.command';

@CommandHandler(StartUploadCommand)
export class StartUploadHandler implements ICommandHandler<StartUploadCommand, MeetingFileUpload> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly files: MeetingFilesService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: StartUploadCommand): Promise<MeetingFileUpload> {
    const { userId, meetingId, name, size, lastModified } = command;
    const extension = allowedExtensionOf(name);
    if (!extension) {
      throw new BadRequestException(ALLOWED_FILE_TYPES_MESSAGE);
    }
    // Throws the meetings 404 for anyone but the owner and participants.
    await this.queryBus.execute(new GetMeetingByIdQuery(meetingId, userId));

    const resumed = await this.resume(command);
    if (resumed) {
      return toMeetingFileUpload(resumed);
    }

    const file = await this.prisma.meetingFile.create({
      data: {
        meetingId,
        uploaderId: userId,
        name,
        mimeType: MEETING_FILE_TYPES[extension],
        size,
        lastModified,
      },
    });
    try {
      await this.storage.createTemp(file.id);
    } catch (error) {
      await this.prisma.meetingFile.delete({ where: { id: file.id } });
      throw error;
    }
    return toMeetingFileUpload(file);
  }

  /**
   * The user's latest pending upload of the same file in the meeting, if it can still continue.
   * One past `PENDING_UPLOAD_TTL` is discarded here instead of waiting for the scheduled cleanup,
   * so expiry doesn't depend on when that runs; so is one whose temporary file holds fewer bytes
   * than the record counts (e.g. the uploads folder was cleared), since resuming it would leave a
   * gap. A resumed upload is touched, so it doesn't expire before its next chunk.
   */
  private async resume({
    userId,
    meetingId,
    name,
    size,
    lastModified,
  }: StartUploadCommand): Promise<MeetingFile | undefined> {
    const pending = await this.prisma.meetingFile.findFirst({
      where: {
        meetingId,
        uploaderId: userId,
        status: MeetingFileStatus.PENDING,
        name,
        size,
        lastModified,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!pending) return undefined;

    const expired = pending.updatedAt.getTime() < Date.now() - PENDING_UPLOAD_TTL;
    const stored = await this.storage.tempSize(pending.id);
    if (expired || stored === undefined || stored < Number(pending.bytesReceived)) {
      await this.files.discardUpload(pending.id);
      return undefined;
    }
    return this.prisma.meetingFile.update({
      where: { id: pending.id },
      data: { updatedAt: new Date() },
    });
  }
}
