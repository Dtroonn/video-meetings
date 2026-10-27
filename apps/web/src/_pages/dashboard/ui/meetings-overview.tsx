import { Card, Skeleton } from '@heroui/react';
import type { MeetingResponse } from '@video-meetings/contracts';
import type { ReactNode } from 'react';
import { resolveApiResponse } from '@/shared/api/server';
import type { Dictionary, Locale } from '@/shared/i18n';
import { TextSkeleton } from '@/shared/ui';
import { getMeetings } from '../api/get-meetings';
import { LATEST_MEETINGS_COUNT, latestMeetings } from '../model/latest-meetings';
import { MeetingDate } from './meeting-date';

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

/** One meeting: its title and date. With `meeting: null`, skeleton lines of the same height. */
function MeetingRow({ meeting, locale }: MeetingRowProps) {
  return (
    <li className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
      {meeting ? (
        <>
          <span className="truncate font-medium">{meeting.title}</span>
          <span className="text-muted text-sm">
            <MeetingDate date={meeting.date} locale={locale} />
          </span>
        </>
      ) : (
        <>
          <Skeleton className="h-[1lh] w-48 max-w-full rounded-md" />
          <Skeleton className="h-[1lh] w-32 rounded-md text-sm" />
        </>
      )}
    </li>
  );
}
