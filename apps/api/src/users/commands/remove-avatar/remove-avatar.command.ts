import { Command } from '@nestjs/cqrs';

/** Removes the user's avatar and its file; does nothing if there's none. */
export class RemoveAvatarCommand extends Command<void> {
  constructor(public readonly userId: string) {
    super();
  }
}
