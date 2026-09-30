import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail, PASSWORD_MAX_LENGTH } from './validation';

export class RegisterRequestDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
