import { Command } from '@nestjs/cqrs';

/**
 * Deletes pending uploads that haven't received anything for `PENDING_UPLOAD_TTL` (24 hours):
 * their records and temporary files. Runs on a schedule; starting the same file again afterwards
 * starts a new upload.
 *
 * @returns how many uploads were discarded.
 */
export class DiscardExpiredUploadsCommand extends Command<number> {
  constructor(
    /** The time to count the 24 hours back from. */
    public readonly now: Date = new Date(),
  ) {
    super();
  }
}
