import { TokensResponseDto } from './tokens-response.dto';

/** The token pair of the caller's new session (all previous sessions were ended). */
export class ChangePasswordResponseDto extends TokensResponseDto {}
