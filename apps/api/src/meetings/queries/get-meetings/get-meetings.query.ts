import { Query } from '@nestjs/cqrs';
import type { MeetingDetails } from '../../meetings.types';

/** Meetings the user owns or was invited to, earliest first. */
export class GetMeetingsQuery extends Query<MeetingDetails[]> {
  constructor(public readonly userId: string) {
    super();
  }
}
