import { UserResponseDto } from '@/users/dto/user-response.dto';
import type { AuthResult } from '../auth.types';
import { TokensResponseDto } from './tokens-response.dto';

/** The user plus a token pair; shared by the register and login response DTOs. */
export class AuthResponseDto extends TokensResponseDto {
  readonly user: UserResponseDto;

  constructor(result: AuthResult) {
    super(result);
    this.user = new UserResponseDto(result.user);
  }
}
