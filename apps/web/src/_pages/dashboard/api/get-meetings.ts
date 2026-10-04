import type { MeetingResponse } from '@video-meetings/contracts';
import { apiGet } from '@/shared/api/server';

/**
 * `GET /meetings` as the signed-in user (Server Components only): the meetings they own or were
 * invited to, earliest first. Reads the session cookie, so render the caller inside `<Suspense>`.
 */
export function getMeetings() {
  return apiGet<MeetingResponse[]>('/meetings');
}
