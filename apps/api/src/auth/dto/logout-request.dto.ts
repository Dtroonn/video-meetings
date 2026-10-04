import type { LogoutRequest } from '@video-meetings/contracts';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutRequestDto implements LogoutRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
