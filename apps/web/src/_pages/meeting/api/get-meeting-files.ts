import type { MeetingFileResponse } from '@video-meetings/contracts';
import { apiGet } from '@/shared/api/server';

/**
 * `GET /meeting/files` as the signed-in user (Server Components only): the meeting's completed
 * files, newest first. Reads the session cookie, so render the caller inside `<Suspense>`.
 */
export function getMeetingFiles(meetingId: string) {
  return apiGet<MeetingFileResponse[]>(
    `/meeting/files?${new URLSearchParams({ meetingId }).toString()}`,
  );
}
