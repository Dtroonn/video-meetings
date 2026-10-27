import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MeetingFileStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { storageKeyFor } from '../../meeting-files.mapper';
import type { MeetingFileDetails } from '../../meeting-files.types';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { CompleteUploadCommand } from './complete-upload.command';

@CommandHandler(CompleteUploadCommand)
export class CompleteUploadHandler implements ICommandHandler<
  CompleteUploadCommand,
  MeetingFileDetails
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly files: MeetingFilesService,
  ) {}

  execute({ id, userId }: CompleteUploadCommand): Promise<MeetingFileDetails> {
    return this.files.exclusive(id, async () => {
      let file = await this.files.findOwnUpload(id, userId);
      if (file.status === MeetingFileStatus.PENDING) {
        if (file.bytesReceived !== file.size) {
          throw new ConflictException(
            `Only ${file.bytesReceived} of ${file.size} bytes have been received`,
          );
        }
        // Move first, then mark completed: a completed row always has its file in place.
        const storageKey = storageKeyFor(file);
        await this.storage.commitTemp(id, storageKey);
        file = await this.prisma.meetingFile.update({
          where: { id },
          data: { status: MeetingFileStatus.COMPLETED, storageKey, completedAt: new Date() },
        });
      }
      const [details] = await this.files.withUploaders([file]);
      return details;
    });
  }
}
