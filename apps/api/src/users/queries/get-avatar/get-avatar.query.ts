import { Query } from '@nestjs/cqrs';
import type { AvatarContent } from '@/users/users.types';

/** A user's current avatar, opened for streaming; 404 if the user has none or doesn't exist. */
export class GetAvatarQuery extends Query<AvatarContent> {
  constructor(public readonly userId: string) {
    super();
  }
}
