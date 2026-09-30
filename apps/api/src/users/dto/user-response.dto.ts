import type { PublicUser } from '@/users/users.types';

/**
 * A user as sent to clients. Fields are copied one by one (not spread), so a new column on `users`
 * doesn't reach clients until it's added here.
 */
export class UserResponseDto {
  readonly id: string;
  readonly email: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(user: PublicUser) {
    this.id = user.id;
    this.email = user.email;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
