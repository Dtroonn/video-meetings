import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, type LoginRequest } from '@video-meetings/contracts';
import { NormalizeEmail } from './validation';

// No password policy on login: a policy change must not lock out existing users.
export class LoginRequestDto implements LoginRequest {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
