import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { meetingDetailsInclude, toMeetingDetails } from '../../meetings.mapper';
import type { MeetingDetails } from '../../meetings.types';
import { CreateMeetingCommand } from './create-meeting.command';

const FOREIGN_KEY_VIOLATION = 'P2003';

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<CreateMeetingCommand, MeetingDetails> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    ownerId,
    title,
    date,
    participantIds,
  }: CreateMeetingCommand): Promise<MeetingDetails> {
    try {
      // A nested create runs in one transaction, so the meeting isn't saved if a participant fails.
      const meeting = await this.prisma.meeting.create({
        data: {
          ownerId,
          title,
          date,
          participants: {
            create: [...new Set(participantIds)].map((userId) => ({ userId })),
          },
        },
        include: meetingDetailsInclude,
      });
      return toMeetingDetails(meeting);
    } catch (error) {
      // Unknown participants are caught by the foreign key on `meeting_participants.user_id`
      // rather than a lookup first, so a user deleted in between can't slip through.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_VIOLATION
      ) {
        throw new BadRequestException('Some participants are not registered users');
      }
      throw error;
    }
  }
}
