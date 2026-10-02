import type { MeetingResponse } from '@video-meetings/contracts';
import type { MeetingDetails } from '../meetings.types';

/**
 * A meeting as sent to clients; shared by the meetings endpoints. Fields are copied one by one (not
 * spread), so a new column on `meetings` doesn't reach clients until it's added here.
 */
export class MeetingResponseDto implements MeetingResponse {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly ownerId: string;
  /** User ids. */
  readonly participants: string[];
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(meeting: MeetingDetails) {
    this.id = meeting.id;
    this.title = meeting.title;
    this.date = meeting.date.toISOString();
    this.ownerId = meeting.ownerId;
    this.participants = meeting.participants;
    this.createdAt = meeting.createdAt.toISOString();
    this.updatedAt = meeting.updatedAt.toISOString();
  }
}
