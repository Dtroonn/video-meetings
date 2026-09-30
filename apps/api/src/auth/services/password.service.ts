import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';

/** Password hashing with argon2 (argon2id). */
@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  /**
   * Checks `password` against `passwordHash`. Without a hash (unknown user) it still verifies
   * against a dummy hash and returns false, so a login takes as long whether or not the user
   * exists and response time doesn't reveal registered emails.
   */
  async verify(passwordHash: string | undefined, password: string): Promise<boolean> {
    this.dummyHash ??= hash(randomUUID());
    const isValid = await verify(passwordHash ?? (await this.dummyHash), password);
    return passwordHash !== undefined && isValid;
  }
}
