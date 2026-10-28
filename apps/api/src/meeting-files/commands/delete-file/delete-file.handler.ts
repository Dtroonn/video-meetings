import { ForbiddenException, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { DeleteFileCommand } from './delete-file.command';

@CommandHandler(DeleteFileCommand)
export class DeleteFileHandler implements ICommandHandler<DeleteFileCommand, void> {
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly files: MeetingFilesService,
  ) {}

  async execute({ id, userId }: DeleteFileCommand): Promise<void> {
    const { file, meeting } = await this.files.findVisibleFile(id, userId);
    if (meeting.ownerId !== userId && file.uploaderId !== userId) {
      throw new ForbiddenException('Only the meeting owner or the uploader can delete this file');
    }

    // Record first, then data: a listed file always has its data. `deleteMany` makes a concurrent
    // delete of the same file a no-op instead of an error.
    await this.prisma.meetingFile.deleteMany({ where: { id } });
    try {
      await this.storage.remove(file.storageKey);
    } catch (error) {
      // The file is already gone for users; a leftover on disk (e.g. still open on Windows by a
      // running download) only wastes space, so don't fail the request over it.
      this.logger.warn(`Could not remove the data of deleted file ${id}: ${String(error)}`);
    }
  }
}
