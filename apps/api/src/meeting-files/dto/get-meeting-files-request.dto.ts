import type { GetMeetingFilesRequest } from '@video-meetings/contracts';
import { IsUUID } from 'class-validator';

/** The query string of `GET /meeting/files`. */
export class GetMeetingFilesRequestDto implements GetMeetingFilesRequest {
  @IsUUID()
  meetingId: string;
}
