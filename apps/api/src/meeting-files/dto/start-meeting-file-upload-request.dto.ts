import {
  FILE_NAME_MAX_LENGTH,
  FILE_TYPE_MAX_LENGTH,
  MEETING_FILE_MAX_SIZE,
  type StartMeetingFileUploadRequest,
} from '@video-meetings/contracts';
import { IsInt, IsNotEmpty, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { ALLOWED_FILE_NAME, ALLOWED_FILE_TYPES_MESSAGE } from '../meeting-file-types';

export class StartMeetingFileUploadRequestDto implements StartMeetingFileUploadRequest {
  @IsUUID()
  meetingId: string;

  /** The original file name; only stored, never used as a path. Its extension decides the type. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(FILE_NAME_MAX_LENGTH)
  @Matches(ALLOWED_FILE_NAME, { message: ALLOWED_FILE_TYPES_MESSAGE })
  name: string;

  /** The MIME type the browser reports; may be empty. Not stored, the extension decides. */
  @IsString()
  @MaxLength(FILE_TYPE_MAX_LENGTH)
  type: string;

  /** Size in bytes. */
  @IsInt()
  @Min(0)
  @Max(MEETING_FILE_MAX_SIZE, {
    message: `size must not be greater than ${MEETING_FILE_MAX_SIZE} bytes (100 MB)`,
  })
  size: number;
}
