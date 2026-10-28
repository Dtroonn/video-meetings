import { Query } from '@nestjs/cqrs';
import type { MeetingFileContent } from '../../meeting-files.types';

/**
 * The content of a completed meeting file, for downloading. Membership is checked on every call,
 * so a file id alone gives no access.
 *
 * @throws NotFoundException if there's no such completed file or the user can't see its meeting.
 */
export class GetMeetingFileContentQuery extends Query<MeetingFileContent> {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {
    super();
  }
}
