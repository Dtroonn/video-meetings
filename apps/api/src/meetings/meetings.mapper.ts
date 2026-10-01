import type { Meeting, Prisma } from '@/generated/prisma/client';
import type { MeetingDetails } from './meetings.types';

/** Pass as `include` to load a meeting's participant ids in the same query. */
export const meetingDetailsInclude = {
  participants: { select: { userId: true }, orderBy: { userId: 'asc' } },
} satisfies Prisma.MeetingInclude;

export const toMeetingDetails = ({
  participants,
  ...meeting
}: Meeting & { participants: { userId: string }[] }): MeetingDetails => ({
  ...meeting,
  participants: participants.map(({ userId }) => userId),
});

/** Meetings a user can see: the ones they own or were invited to. */
export const visibleTo = (userId: string): Prisma.MeetingWhereInput => ({
  OR: [{ ownerId: userId }, { participants: { some: { userId } } }],
});
