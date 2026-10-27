import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MeetingFileStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { toMeetingFileUpload } from '../../meeting-files.mapper';
import type { MeetingFileUpload } from '../../meeting-files.types';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { UploadChunkCommand } from './upload-chunk.command';

@CommandHandler(UploadChunkCommand)
export class UploadChunkHandler implements ICommandHandler<UploadChunkCommand, MeetingFileUpload> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly files: MeetingFilesService,
  ) {}

  execute({ id, userId, offset, length, body }: UploadChunkCommand): Promise<MeetingFileUpload> {
    return this.files.exclusive(id, async () => {
      const file = await this.files.findOwnUpload(id, userId);
      if (file.status !== MeetingFileStatus.PENDING) {
        throw new ConflictException('The upload is already complete');
      }
      const bytesReceived = Number(file.bytesReceived);
      if (offset !== bytesReceived) {
        throw new ConflictException(`The next chunk must start at byte ${bytesReceived}`);
      }
      if (offset + length > Number(file.size)) {
        throw new BadRequestException('The chunk goes past the end of the file');
      }

      const written = await this.storage.writeTemp(id, offset, body);
      const updated = await this.prisma.meetingFile.update({
        where: { id },
        data: { bytesReceived: offset + written },
      });
      return toMeetingFileUpload(updated);
    });
  }
}
