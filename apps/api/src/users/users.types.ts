import type { User } from '@/generated/prisma/client';

/** A user as it may leave the users module by default: never with the password hash. */
export type PublicUser = Omit<User, 'passwordHash'>;

/** Only for verifying a password; never send this to a client. */
export interface UserCredentials {
  user: PublicUser;
  passwordHash: string;
}
