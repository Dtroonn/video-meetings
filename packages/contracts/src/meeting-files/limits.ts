/** Largest file a meeting accepts, in bytes (100 MB). */
export const MEETING_FILE_MAX_SIZE = 100 * 1024 * 1024;

/**
 * Largest chunk the api accepts in one upload request. Clients send chunks of exactly this size
 * (the last one may be smaller), so a 100 MB file takes 20 requests.
 */
export const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024;
export const FILE_NAME_MAX_LENGTH = 255;
/** Upper bound for the MIME type a client reports. */
export const FILE_TYPE_MAX_LENGTH = 255;

/**
 * File types a meeting accepts, by lowercase extension (without the dot), with the MIME type the
 * api stores for them. Types are decided by extension, not by the MIME type the browser reports,
 * which is unreliable for `.md`, `.mkv` or `.m4a`.
 */
export const MEETING_FILE_TYPES = {
  // Recordings
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  // Documents
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
} as const;

export type MeetingFileExtension = keyof typeof MEETING_FILE_TYPES;
