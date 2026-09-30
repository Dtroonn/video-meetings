import { Query } from '@nestjs/cqrs';
import type { PublicUser } from '@/users/users.types';

export class GetUserByIdQuery extends Query<PublicUser | null> {
  constructor(public readonly id: string) {
    super();
  }
}
