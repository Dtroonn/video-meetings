export interface CreateMeetingRequest {
  title: string;
  /** An ISO 8601 date-time, e.g. `2026-10-01T10:00:00.000Z`. */
  date: string;
  /** Ids of the invited users; the owner doesn't need to be listed. */
  participants: string[];
}

/** A meeting as sent to clients. Dates are ISO 8601 strings, as they arrive over JSON. */
export interface MeetingResponse {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly ownerId: string;
  /** User ids. */
  readonly participants: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
