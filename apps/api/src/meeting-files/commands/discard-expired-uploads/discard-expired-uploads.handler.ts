import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PENDING_UPLOAD_TTL } from '@video-meetings/contracts';
import { MeetingFileStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { DiscardExpiredUploadsCommand } from './discard-expired-uploads.command';

@CommandHandler(DiscardExpiredUploadsCommand)
export class DiscardExpiredUploadsHandler implements ICommandHandler<
  DiscardExpiredUploadsCommand,
  number
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: MeetingFilesService,
  ) {}

  async execute({ now }: DiscardExpiredUploadsCommand): Promise<number> {
    const updatedBefore = new Date(now.getTime() - PENDING_UPLOAD_TTL);
    const expired = await this.prisma.meetingFile.findMany({
      where: { status: MeetingFileStatus.PENDING, updatedAt: { lt: updatedBefore } },
      select: { id: true },
    });
    let discarded = 0;
    // One at a time, each under its upload's lock; one that received a chunk meanwhile is kept.
    for (const { id } of expired) {
      if (await this.files.discardUpload(id, { updatedBefore })) {
        discarded += 1;
      }
    }
    return discarded;
  }
}
