import type { Gender, UserResponse } from '@video-meetings/contracts';
import { avatarUrl } from '@/users/avatars';
import type { PublicUser } from '@/users/users.types';

/**
 * A user as sent to clients. Fields are copied one by one (not spread), so a new column on `users`
 * doesn't reach clients until it's added here.
 */
export class UserResponseDto implements UserResponse {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly dateOfBirth: string | null;
  readonly gender: Gender | null;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(user: PublicUser) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    // A `date` column comes back as UTC midnight, so the date part of the ISO string is the date.
    this.dateOfBirth = user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null;
    this.gender = user.gender;
    this.avatarUrl = user.avatarId ? avatarUrl(user.id, user.avatarId) : null;
    this.createdAt = user.createdAt.toISOString();
    this.updatedAt = user.updatedAt.toISOString();
  }
}
