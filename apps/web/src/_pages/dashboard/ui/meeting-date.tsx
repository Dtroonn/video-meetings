'use client';

import { useSyncExternalStore } from 'react';
import type { Locale } from '@/shared/i18n';

interface MeetingDateProps {
  /** An ISO 8601 date-time, as the api sends it. */
  date: string;
  locale: Locale;
}

// Nothing to subscribe to: the value only differs between the server and the browser.
const subscribe = () => () => {};

/**
 * A meeting's date and time in the viewer's own time zone. The server doesn't know that zone, so
 * it renders an invisible placeholder of about the same width and the browser fills in the text
 * right after hydration (`useSyncExternalStore` with a separate server snapshot, so there's no
 * hydration mismatch).
 */
export function MeetingDate({ date, locale }: MeetingDateProps) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatDate(date, locale),
    () => null,
  );

  return (
    <time dateTime={date}>{text ?? <span className="invisible">00.00.0000, 00:00</span>}</time>
  );
}

function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(date),
  );
}
