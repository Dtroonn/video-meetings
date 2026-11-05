import { Command } from '@nestjs/cqrs';
import type { MeetingFileUpload } from '../../meeting-files.types';

/**
 * Starts uploading a file to a meeting, or resumes it: if the user has a pending upload of the
 * same file (name, size and last-modified time) in the meeting, touched within
 * `PENDING_UPLOAD_TTL`, returns that one with the bytes already received. Otherwise creates a
 * pending record and an empty temporary file. The stored type is the one of the name's extension,
 * which must be allowed (the DTO checks it).
 *
 * @throws NotFoundException if there's no such meeting or the user can't see it.
 * @throws BadRequestException if the name doesn't end in an allowed extension.
 */
export class StartUploadCommand extends Command<MeetingFileUpload> {
  constructor(
    public readonly userId: string,
    public readonly meetingId: string,
    public readonly name: string,
    public readonly size: number,
    public readonly lastModified: Date,
  ) {
    super();
  }
}
