import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail, PASSWORD_MAX_LENGTH } from './validation';

// No password policy on login: a policy change must not lock out existing users.
export class LoginRequestDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
