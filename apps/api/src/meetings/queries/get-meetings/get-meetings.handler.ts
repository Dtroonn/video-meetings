import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import { meetingDetailsInclude, toMeetingDetails, visibleTo } from '../../meetings.mapper';
import type { MeetingDetails } from '../../meetings.types';
import { GetMeetingsQuery } from './get-meetings.query';

@QueryHandler(GetMeetingsQuery)
export class GetMeetingsHandler implements IQueryHandler<GetMeetingsQuery, MeetingDetails[]> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId }: GetMeetingsQuery): Promise<MeetingDetails[]> {
    const meetings = await this.prisma.meeting.findMany({
      where: visibleTo(userId),
      include: meetingDetailsInclude,
      // `id` breaks ties between meetings at the same time, so the order is stable.
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });
    return meetings.map(toMeetingDetails);
  }
}
