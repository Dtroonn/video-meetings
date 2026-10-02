import {
  PARTICIPANTS_MAX_COUNT,
  TITLE_MAX_LENGTH,
  type CreateMeetingRequest,
} from '@video-meetings/contracts';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateMeetingRequestDto implements CreateMeetingRequest {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string;

  /** An ISO 8601 date-time, e.g. `2026-10-01T10:00:00.000Z`. */
  @IsISO8601({ strict: true })
  date: string;

  /** Ids of the invited users; the owner doesn't need to be listed. */
  @IsArray()
  @ArrayMaxSize(PARTICIPANTS_MAX_COUNT)
  @IsUUID('all', { each: true })
  participants: string[];
}
