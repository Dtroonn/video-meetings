/** An upload in progress, as the handlers return it. Sizes are numbers (bigint in the DB). */
export interface MeetingFileUpload {
  id: string;
  meetingId: string;
  name: string;
  mimeType: string;
  size: number;
  bytesReceived: number;
}

/** A completed file with its uploader's email, as the handlers return it. */
export interface MeetingFileDetails {
  id: string;
  meetingId: string;
  name: string;
  mimeType: string;
  size: number;
  uploader: { id: string; email: string };
  uploadedAt: Date;
}
