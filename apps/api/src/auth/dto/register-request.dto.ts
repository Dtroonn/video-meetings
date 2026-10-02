import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type RegisterRequest,
} from '@video-meetings/contracts';
import { NormalizeEmail } from './validation';

export class RegisterRequestDto implements RegisterRequest {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
