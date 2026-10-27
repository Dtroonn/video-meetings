import type { MeetingFileUploadResponse } from '@video-meetings/contracts';
import type { MeetingFileUpload } from '../meeting-files.types';

/**
 * An upload in progress as sent to its uploader; shared by the upload endpoints. Fields are copied
 * one by one (not spread), so a new column on `meeting_files` doesn't reach clients by accident.
 */
export class MeetingFileUploadResponseDto implements MeetingFileUploadResponse {
  readonly id: string;
  readonly meetingId: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly bytesReceived: number;

  constructor(upload: MeetingFileUpload) {
    this.id = upload.id;
    this.meetingId = upload.meetingId;
    this.name = upload.name;
    this.type = upload.mimeType;
    this.size = upload.size;
    this.bytesReceived = upload.bytesReceived;
  }
}
