import type { MeetingFile } from '@/generated/prisma/client';
import type { PublicUser } from '@/users/users.types';
import type { MeetingFileDetails, MeetingFileUpload } from './meeting-files.types';

export const toMeetingFileUpload = (file: MeetingFile): MeetingFileUpload => ({
  id: file.id,
  meetingId: file.meetingId,
  name: file.name,
  mimeType: file.mimeType,
  size: Number(file.size),
  bytesReceived: Number(file.bytesReceived),
});

export const toMeetingFileDetails = (
  file: MeetingFile,
  uploader: Pick<PublicUser, 'id' | 'email'>,
): MeetingFileDetails => {
  if (!file.completedAt) {
    throw new Error(`Meeting file ${file.id} is not completed`);
  }
  return {
    id: file.id,
    meetingId: file.meetingId,
    name: file.name,
    mimeType: file.mimeType,
    size: Number(file.size),
    uploader: { id: uploader.id, email: uploader.email },
    uploadedAt: file.completedAt,
  };
};

/**
 * Where a completed file is stored, relative to `UPLOADS_DIR`: grouped by meeting and named by id,
 * never by the client's file name.
 */
export const storageKeyFor = ({ id, meetingId }: Pick<MeetingFile, 'id' | 'meetingId'>) =>
  `meetings/${meetingId}/${id}`;
