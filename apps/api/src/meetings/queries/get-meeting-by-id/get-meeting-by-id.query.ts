import { Query } from '@nestjs/cqrs';
import type { MeetingDetails } from '../../meetings.types';

/**
 * A meeting the user owns or was invited to.
 *
 * @throws NotFoundException if there's no such meeting or the user can't see it (the same error,
 *   so other users' meeting ids can't be probed).
 */
export class GetMeetingByIdQuery extends Query<MeetingDetails> {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {
    super();
  }
}
