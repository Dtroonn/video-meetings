import { Command } from '@nestjs/cqrs';
import type { MeetingFileUpload } from '../../meeting-files.types';

/**
 * Starts uploading a file to a meeting: creates a pending record and an empty temporary file. The
 * stored type is the one of the name's extension, which must be allowed (the DTO checks it).
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
  ) {
    super();
  }
}
