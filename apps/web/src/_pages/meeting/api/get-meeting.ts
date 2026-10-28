import type { GetMeetingResponse } from '@video-meetings/contracts';
import { apiGet } from '@/shared/api/server';

/**
 * `GET /meetings/:id` as the signed-in user (Server Components only): the meeting with its
 * participants' emails. A missing meeting, one the user isn't a member of and a malformed id all
 * come back as errors (404 / 400). Reads the session cookie, so render the caller inside
 * `<Suspense>`.
 */
export function getMeeting(id: string) {
  return apiGet<GetMeetingResponse>(`/meetings/${encodeURIComponent(id)}`);
}
