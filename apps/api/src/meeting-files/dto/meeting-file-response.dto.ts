import type { MeetingFileResponse, MeetingFileUploaderResponse } from '@video-meetings/contracts';
import type { MeetingFileDetails } from '../meeting-files.types';

/**
 * A completed meeting file as sent to clients; shared by the meeting files endpoints. Fields are
 * copied one by one (not spread), so a new column on `meeting_files` (like the storage key) doesn't
 * reach clients by accident.
 */
export class MeetingFileResponseDto implements MeetingFileResponse {
  readonly id: string;
  readonly meetingId: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly uploader: MeetingFileUploaderResponse;
  readonly uploadedAt: string;

  constructor(file: MeetingFileDetails) {
    this.id = file.id;
    this.meetingId = file.meetingId;
    this.name = file.name;
    this.type = file.mimeType;
    this.size = file.size;
    this.uploader = { id: file.uploader.id, email: file.uploader.email };
    this.uploadedAt = file.uploadedAt.toISOString();
  }
}
