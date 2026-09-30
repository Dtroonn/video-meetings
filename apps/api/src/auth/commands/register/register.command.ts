import { Command } from '@nestjs/cqrs';
import type { AuthResult } from '../../auth.types';

/** @throws ConflictException if the email is already registered. */
export class RegisterCommand extends Command<AuthResult> {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {
    super();
  }
}
