import type { UploadMeetingFileChunkRequest } from '@video-meetings/contracts';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** The query string; the chunk itself is the raw request body. */
export class UploadMeetingFileChunkRequestDto implements UploadMeetingFileChunkRequest {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  offset: number;
}
