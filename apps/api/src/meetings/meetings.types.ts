import type { Meeting } from '@/generated/prisma/client';

/** A meeting with the ids of its participants; what the handlers return. */
export interface MeetingDetails extends Meeting {
  participants: string[];
}
