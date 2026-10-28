import { type IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { MeetingFileStatus } from '@/generated/prisma/client';
import { GetMeetingByIdQuery } from '@/meetings/queries/get-meeting-by-id/get-meeting-by-id.query';
import { PrismaService } from '@/prisma/prisma.service';
import type { MeetingFileDetails } from '../../meeting-files.types';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { GetMeetingFilesQuery } from './get-meeting-files.query';

@QueryHandler(GetMeetingFilesQuery)
export class GetMeetingFilesHandler implements IQueryHandler<
  GetMeetingFilesQuery,
  MeetingFileDetails[]
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly files: MeetingFilesService,
  ) {}

  async execute({ meetingId, userId }: GetMeetingFilesQuery): Promise<MeetingFileDetails[]> {
    // Throws the meetings 404 for anyone but the owner and participants.
    await this.queryBus.execute(new GetMeetingByIdQuery(meetingId, userId));

    const files = await this.prisma.meetingFile.findMany({
      where: { meetingId, status: MeetingFileStatus.COMPLETED },
      // `id` breaks ties between files completed at the same time, so the order is stable.
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
    });
    return this.files.withUploaders(files);
  }
}
