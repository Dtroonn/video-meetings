import { Query } from '@nestjs/cqrs';
import type { MeetingFileDetails } from '../../meeting-files.types';

/**
 * A meeting's completed files, oldest upload first; uploads in progress aren't included.
 *
 * @throws NotFoundException if there's no such meeting or the user can't see it.
 */
export class GetMeetingFilesQuery extends Query<MeetingFileDetails[]> {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
  ) {
    super();
  }
}
