import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokensRequestDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
