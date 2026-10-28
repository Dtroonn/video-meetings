import { Card, Skeleton } from '@heroui/react';
import type { MeetingResponse } from '@video-meetings/contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { resolveApiResponse } from '@/shared/api/server';
import { localePath, type Dictionary, type Locale } from '@/shared/i18n';
import { DateTime, TextSkeleton } from '@/shared/ui';
import { getMeetings } from '../api/get-meetings';
import { LATEST_MEETINGS_COUNT, latestMeetings } from '../model/latest-meetings';

type OverviewTexts = Pick<
  Dictionary['dashboard']['page'],
  'meetingsCount' | 'meetingsCountHint' | 'recentMeetings' | 'noMeetings'
>;

interface MeetingsOverviewProps {
  locale: Locale;
  t: OverviewTexts;
}

const GRID_CLASS = 'mt-8 grid gap-4 md:grid-cols-3';

/**
 * The number of meetings and the latest few. Reads the session to call the api, so render it
 * inside `<Suspense>` with `<MeetingsOverviewSkeleton />` as the fallback. If the api fails, the
 * session expired → login page, anything else → the error page.
 */
export async function MeetingsOverview({ locale, t }: MeetingsOverviewProps) {
  const meetings = await resolveApiResponse(await getMeetings());
  const latest = latestMeetings(meetings);

  return (
    <div className={GRID_CLASS}>
      <CountCard count={meetings.length} t={t} />
      <LatestCard t={t}>
        {latest.length === 0 ? (
          <p className="text-muted text-sm">{t.noMeetings}</p>
        ) : (
          <ul className="divide-separator divide-y">
            {latest.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} locale={locale} />
            ))}
          </ul>
        )}
      </LatestCard>
    </div>
  );
}

/** Placeholder of the same layout as `MeetingsOverview` with a full list. */
export function MeetingsOverviewSkeleton({ t }: { t: OverviewTexts }) {
  return (
    <div aria-hidden className={GRID_CLASS}>
      <CountCard count={null} t={t} />
      <LatestCard t={t}>
        <ul className="divide-separator divide-y">
          {Array.from({ length: LATEST_MEETINGS_COUNT }, (_, index) => (
            <MeetingRow key={index} meeting={null} />
          ))}
        </ul>
      </LatestCard>
    </div>
  );
}

function CountCard({ count, t }: { count: number | null; t: OverviewTexts }) {
  return (
    <Card>
      <Card.Header>
        <h2 className="text-muted text-sm font-medium">{t.meetingsCount}</h2>
      </Card.Header>
      <Card.Content>
        <p className="text-4xl font-semibold tabular-nums">
          {count ?? <TextSkeleton className="w-16" />}
        </p>
        <p className="text-muted mt-1 text-sm">{t.meetingsCountHint}</p>
      </Card.Content>
    </Card>
  );
}

function LatestCard({ t, children }: { t: OverviewTexts; children: ReactNode }) {
  return (
    <Card className="min-w-0 md:col-span-2">
      <Card.Header>
        <h2 className="text-lg font-semibold">{t.recentMeetings}</h2>
      </Card.Header>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

type MeetingRowProps =
  { meeting: MeetingResponse; locale: Locale } | { meeting: null; locale?: undefined };

/**
 * One meeting: its title and date, linking to the meeting's page. With `meeting: null`, skeleton
 * lines of the same height.
 */
function MeetingRow({ meeting, locale }: MeetingRowProps) {
  return (
    <li className="py-1 first:pt-0 last:pb-0">
      {meeting ? (
        <Link
          href={localePath(locale, `/dashboard/meetings/${meeting.id}`)}
          className="group focus-visible:status-focused -mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-2 outline-none"
        >
          {/* Hover underlines the title instead of tinting the row: muted text on a grey row
              background drops below 4.5:1. */}
          <span className="truncate font-medium underline-offset-2 group-hover:underline">
            {meeting.title}
          </span>
          <span className="text-muted text-sm">
            <DateTime date={meeting.date} locale={locale} />
          </span>
        </Link>
      ) : (
        <div className="flex flex-col gap-0.5 py-2">
          <Skeleton className="h-[1lh] w-48 max-w-full rounded-md" />
          <Skeleton className="h-[1lh] w-32 rounded-md text-sm" />
        </div>
      )}
    </li>
  );
}
