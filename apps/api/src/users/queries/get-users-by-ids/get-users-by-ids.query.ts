import { Query } from '@nestjs/cqrs';
import type { PublicUser } from '@/users/users.types';

/** The users with these ids, in no particular order; unknown ids are skipped. */
export class GetUsersByIdsQuery extends Query<PublicUser[]> {
  constructor(public readonly ids: string[]) {
    super();
  }
}
