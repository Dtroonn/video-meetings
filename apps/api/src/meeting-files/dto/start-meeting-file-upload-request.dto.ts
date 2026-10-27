import {
  FILE_NAME_MAX_LENGTH,
  FILE_TYPE_MAX_LENGTH,
  type StartMeetingFileUploadRequest,
} from '@video-meetings/contracts';
import { IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class StartMeetingFileUploadRequestDto implements StartMeetingFileUploadRequest {
  @IsUUID()
  meetingId: string;

  /** The original file name; only stored, never used as a path. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX_LENGTH)
  name: string;

  /** The MIME type the browser reports; may be empty. */
  @IsString()
  @MaxLength(FILE_TYPE_MAX_LENGTH)
  type: string;

  /** Size in bytes. */
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  size: number;
}
