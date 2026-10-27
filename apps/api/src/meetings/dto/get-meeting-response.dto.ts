import type { GetMeetingResponse, MeetingParticipantResponse } from '@video-meetings/contracts';
import type { PublicUser } from '@/users/users.types';
import type { MeetingDetails } from '../meetings.types';
import { MeetingResponseDto } from './meeting-response.dto';

export class GetMeetingResponseDto extends MeetingResponseDto implements GetMeetingResponse {
  readonly participantUsers: MeetingParticipantResponse[];

  /** `users` must contain every participant; they're listed in the order of `participants`. */
  constructor(meeting: MeetingDetails, users: PublicUser[]) {
    super(meeting);
    const usersById = new Map(users.map((user) => [user.id, user]));
    this.participantUsers = meeting.participants.map((id) => {
      const user = usersById.get(id);
      if (!user) {
        throw new Error(`Participant ${id} of meeting ${meeting.id} not found`);
      }
      return { id: user.id, email: user.email };
    });
  }
}
