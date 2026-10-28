/**
 * Starts a chunked upload: `POST /meeting/files/uploads`. Then send the bytes with
 * `POST /meeting/files/uploads/:id/chunks?offset=<bytesReceived>` (raw `application/octet-stream`
 * body of at most `UPLOAD_CHUNK_SIZE` bytes) and finish with
 * `POST /meeting/files/uploads/:id/complete`.
 */
export interface StartMeetingFileUploadRequest {
  meetingId: string;
  /** The original file name; must end in one of the `MEETING_FILE_TYPES` extensions. */
  name: string;
  /**
   * The MIME type the browser reports (`File.type`); may be empty. The api ignores it and stores
   * the type of the name's extension from `MEETING_FILE_TYPES`.
   */
  type: string;
  /** Size in bytes, at most `MEETING_FILE_MAX_SIZE`. */
  size: number;
}

/** Query of `POST /meeting/files/uploads/:id/chunks`. */
export interface UploadMeetingFileChunkRequest {
  /** Where the chunk starts; must equal the upload's `bytesReceived`. */
  offset: number;
}

/** Query of `GET /meeting/files`. */
export interface GetMeetingFilesRequest {
  meetingId: string;
}

/** An upload in progress; only its uploader sees it. */
export interface MeetingFileUploadResponse {
  readonly id: string;
  readonly meetingId: string;
  readonly name: string;
  /** The MIME type of the name's extension, from `MEETING_FILE_TYPES`. */
  readonly type: string;
  readonly size: number;
  /** How many bytes the api has stored; the next chunk starts here. */
  readonly bytesReceived: number;
}

export interface MeetingFileUploaderResponse {
  readonly id: string;
  readonly email: string;
}

/** A completed meeting file. Dates are ISO 8601 strings, as they arrive over JSON. */
export interface MeetingFileResponse {
  readonly id: string;
  readonly meetingId: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly uploader: MeetingFileUploaderResponse;
  readonly uploadedAt: string;
}
