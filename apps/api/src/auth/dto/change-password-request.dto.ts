import {
  type ChangePasswordRequest,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@video-meetings/contracts';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordRequestDto implements ChangePasswordRequest {
  // Only non-empty and bounded (hashing cost): the current password may predate today's rules.
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword: string;
}
