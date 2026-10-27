import { Command } from '@nestjs/cqrs';
import type { MeetingFileDetails } from '../../meeting-files.types';

/**
 * Finishes the user's own upload once all its bytes arrived: moves the file into place and makes
 * it visible in the meeting's file list. Completing a completed upload returns it again.
 *
 * @throws NotFoundException if the upload isn't the user's or they can't see its meeting.
 * @throws ConflictException if bytes are still missing or another request for it is running.
 */
export class CompleteUploadCommand extends Command<MeetingFileDetails> {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {
    super();
  }
}
