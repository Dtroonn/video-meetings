import { Query } from '@nestjs/cqrs';
import type { UserCredentials } from '@/users/users.types';

/** Returns the password hash too — only for verifying credentials. */
export class GetUserCredentialsByIdQuery extends Query<UserCredentials | null> {
  constructor(public readonly id: string) {
    super();
  }
}
