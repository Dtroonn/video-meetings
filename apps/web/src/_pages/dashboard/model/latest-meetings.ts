import type { MeetingResponse } from '@video-meetings/contracts';

/** How many meetings the dashboard lists. */
export const LATEST_MEETINGS_COUNT = 3;

/** The `count` meetings with the latest dates, latest first. */
export function latestMeetings(
  meetings: readonly MeetingResponse[],
  count = LATEST_MEETINGS_COUNT,
): MeetingResponse[] {
  // ISO 8601 strings in UTC (`toISOString()`) sort chronologically as plain strings.
  return meetings.toSorted((a, b) => b.date.localeCompare(a.date)).slice(0, count);
}
