import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MeetingFileStatus } from '@/generated/prisma/client';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { CancelUploadCommand } from './cancel-upload.command';

const ALREADY_COMPLETE = 'The upload is already complete; delete the file instead';

@CommandHandler(CancelUploadCommand)
export class CancelUploadHandler implements ICommandHandler<CancelUploadCommand, void> {
  constructor(private readonly files: MeetingFilesService) {}

  async execute({ id, userId }: CancelUploadCommand): Promise<void> {
    const file = await this.files.findOwnUpload(id, userId);
    if (file.status !== MeetingFileStatus.PENDING) {
      throw new ConflictException(ALREADY_COMPLETE);
    }
    // Deletes only while still pending: a completion holding the lock may finish first.
    if (!(await this.files.discardUpload(id))) {
      throw new ConflictException(ALREADY_COMPLETE);
    }
  }
}
