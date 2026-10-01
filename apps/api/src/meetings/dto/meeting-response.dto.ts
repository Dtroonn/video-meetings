import type { MeetingDetails } from '../meetings.types';

/**
 * A meeting as sent to clients; shared by the meetings endpoints. Fields are copied one by one (not
 * spread), so a new column on `meetings` doesn't reach clients until it's added here.
 */
export class MeetingResponseDto {
  readonly id: string;
  readonly title: string;
  readonly date: Date;
  readonly ownerId: string;
  /** User ids. */
  readonly participants: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(meeting: MeetingDetails) {
    this.id = meeting.id;
    this.title = meeting.title;
    this.date = meeting.date;
    this.ownerId = meeting.ownerId;
    this.participants = meeting.participants;
    this.createdAt = meeting.createdAt;
    this.updatedAt = meeting.updatedAt;
  }
}
