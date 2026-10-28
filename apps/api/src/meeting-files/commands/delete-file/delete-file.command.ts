import { Command } from '@nestjs/cqrs';

/**
 * Deletes a completed meeting file and its stored data. The meeting's owner may delete any file,
 * a participant only the files they uploaded.
 *
 * @throws NotFoundException if there's no such completed file or the user can't see its meeting.
 * @throws ForbiddenException if the user is a participant and someone else uploaded the file.
 */
export class DeleteFileCommand extends Command<void> {
  constructor(
    public readonly id: string,
    public readonly userId: string,
  ) {
    super();
  }
}
