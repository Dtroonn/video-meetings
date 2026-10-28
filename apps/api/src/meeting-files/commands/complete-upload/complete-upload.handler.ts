import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type MeetingFile, MeetingFileStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { allowedExtensionOf, contentMatchesExtension } from '../../meeting-file-types';
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
        await this.rejectUnexpectedContent(file);
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

  /**
   * Checks what was actually stored against what the upload declared: the size on disk, and that
   * the content isn't recognizably another type than the name's extension (e.g. an `.exe` renamed
   * to `.mp4`). A mismatching upload can't be fixed by sending more chunks, so its data and record
   * are removed.
   *
   * @throws BadRequestException if the stored file doesn't match.
   */
  private async rejectUnexpectedContent(file: MeetingFile): Promise<void> {
    const extension = allowedExtensionOf(file.name);
    const { size, detectedType } = await this.storage.inspectTemp(file.id);
    let problem: string | undefined;
    if (size !== Number(file.size)) {
      problem = `The stored file has ${size} bytes instead of ${file.size}`;
    } else if (!extension || !contentMatchesExtension(extension, detectedType)) {
      problem = "The file content doesn't match its extension";
    }
    if (problem) {
      await this.prisma.meetingFile.delete({ where: { id: file.id } });
      await this.storage.removeTemp(file.id);
      throw new BadRequestException(problem);
    }
  }
}
