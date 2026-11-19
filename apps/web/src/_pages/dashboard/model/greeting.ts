import type { UserResponse } from '@video-meetings/contracts';

/** Who the dashboard greets: the user's name, or their email when they haven't set one. */
export const greetingName = (user: UserResponse): string => user.name ?? user.email;
