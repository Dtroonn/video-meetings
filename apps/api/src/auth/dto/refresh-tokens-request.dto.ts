import type { RefreshTokensRequest } from '@video-meetings/contracts';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokensRequestDto implements RefreshTokensRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
