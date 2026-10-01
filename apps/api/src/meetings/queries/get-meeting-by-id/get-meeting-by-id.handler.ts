import { NotFoundException } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import { meetingDetailsInclude, toMeetingDetails, visibleTo } from '../../meetings.mapper';
import type { MeetingDetails } from '../../meetings.types';
import { GetMeetingByIdQuery } from './get-meeting-by-id.query';

@QueryHandler(GetMeetingByIdQuery)
export class GetMeetingByIdHandler implements IQueryHandler<GetMeetingByIdQuery, MeetingDetails> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id, userId }: GetMeetingByIdQuery): Promise<MeetingDetails> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, ...visibleTo(userId) },
      include: meetingDetailsInclude,
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    return toMeetingDetails(meeting);
  }
}
