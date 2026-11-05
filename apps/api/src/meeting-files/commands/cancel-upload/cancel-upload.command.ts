import { Command } from '@nestjs/cqrs';

/**
 * Cancels the user's own pending upload: deletes its record and temporary file, so it never
 * appears in the meeting's file list. A chunk still being received is waited for first.
 *
 * @throws NotFoundException if the upload isn't the user's or they can't see its meeting.
 * @throws ConflictException if the upload is already complete (delete the file instead).
 */
export class CancelUploadCommand extends Command<void> {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {
    super();
  }
}
