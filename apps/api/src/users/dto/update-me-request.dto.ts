import {
  GENDERS,
  NAME_MAX_LENGTH,
  type Gender,
  type UpdateMeRequest,
} from '@video-meetings/contracts';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOfBirth, NormalizeName } from './validation';

/** A missing field stays as is; `null` clears it (`@IsOptional` lets both through). */
export class UpdateMeRequestDto implements UpdateMeRequest {
  @IsOptional()
  @NormalizeName()
  @IsString()
  @MaxLength(NAME_MAX_LENGTH)
  name?: string | null;

  @IsOptional()
  @IsDateOfBirth()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: Gender | null;
}
