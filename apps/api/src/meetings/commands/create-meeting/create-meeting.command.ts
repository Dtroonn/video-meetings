import { Command } from '@nestjs/cqrs';
import type { MeetingDetails } from '../../meetings.types';

/** @throws BadRequestException if a participant id isn't a registered user. */
export class CreateMeetingCommand extends Command<MeetingDetails> {
  constructor(
    public readonly ownerId: string,
    public readonly title: string,
    public readonly date: Date,
    public readonly participantIds: string[],
  ) {
    super();
  }
}
