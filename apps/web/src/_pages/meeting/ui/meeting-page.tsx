import { ArrowLeft } from '@gravity-ui/icons';
import { Card, Skeleton } from '@heroui/react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { resolveApiResponse } from '@/shared/api/server';
import { localePath, type Dictionary, type Locale } from '@/shared/i18n';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { DateTime, TextSkeleton } from '@/shared/ui';
import { getMeeting } from '../api/get-meeting';
import { getMeetingFiles } from '../api/get-meeting-files';
import { MeetingFiles, MeetingFilesSkeleton } from './meeting-files';

type MeetingTexts = Dictionary['meeting']['page'];

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meeting.metadata.title };
}

/**
 * A meeting's page (`/<locale>/dashboard/meetings/<id>`, private): its title, date, participants
 * and files, where members upload new ones. The meeting is read on the server, streamed in from
 * `<Suspense>`; a meeting that doesn't exist or that the user isn't a member of shows the
 * not-found page (the api answers 404 for both).
 */
export async function MeetingPage({ params }: PageProps<'/[lang]/dashboard/meetings/[id]'>) {
  const locale = await getLocale();
  const t = (await getDictionary()).meeting.page;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href={localePath(locale, '/dashboard')}
        className="text-muted hover:text-foreground focus-visible:status-focused -ms-1 -my-3 inline-flex items-center gap-1.5 rounded-md px-1 py-3 text-sm outline-none"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t.back}
      </Link>
      {/* The id is a dynamic param, i.e. runtime data: it's read inside the boundary. */}
      <Suspense fallback={<MeetingSkeleton t={t} />}>
        {params.then(({ id }) => (
          <Meeting id={id} locale={locale} t={t} />
        ))}
      </Suspense>
    </main>
  );
}

async function Meeting({ id, locale, t }: { id: string; locale: Locale; t: MeetingTexts }) {
  const [meetingResponse, filesResponse] = await Promise.all([getMeeting(id), getMeetingFiles(id)]);
  // 404: missing or not visible to this user; 400: not a meeting id at all.
  if (!meetingResponse.ok && (meetingResponse.status === 404 || meetingResponse.status === 400)) {
    notFound();
  }
  const meeting = await resolveApiResponse(meetingResponse);
  const files = await resolveApiResponse(filesResponse);

  return (
    <MeetingLayout
      title={meeting.title}
      date={<DateTime date={meeting.date} locale={locale} />}
      files={<MeetingFiles meetingId={meeting.id} files={files} locale={locale} t={t} />}
      participants={
        meeting.participantUsers.length === 0 ? (
          <p className="text-muted text-sm">{t.noParticipants}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {meeting.participantUsers.map((user) => (
              <li key={user.id} className="truncate text-sm">
                {user.email}
              </li>
            ))}
          </ul>
        )
      }
      t={t}
    />
  );
}

/** Placeholder of the same layout as the meeting, while it loads. */
function MeetingSkeleton({ t }: { t: MeetingTexts }) {
  return (
    <>
      <span className="sr-only" role="status">
        {t.loading}
      </span>
      <div aria-hidden>
        <MeetingLayout
          title={<TextSkeleton className="w-80" />}
          date={<TextSkeleton className="w-40" />}
          files={<MeetingFilesSkeleton t={t} />}
          participants={
            <div className="flex flex-col gap-2">
              <Skeleton className="h-[1lh] w-48 max-w-full rounded-md text-sm" />
              <Skeleton className="h-[1lh] w-40 max-w-full rounded-md text-sm" />
            </div>
          }
          t={t}
        />
      </div>
    </>
  );
}

interface MeetingLayoutProps {
  title: ReactNode;
  date: ReactNode;
  files: ReactNode;
  participants: ReactNode;
  t: MeetingTexts;
}

function MeetingLayout({ title, date, files, participants, t }: MeetingLayoutProps) {
  return (
    <>
      <div className="mt-4 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight wrap-break-word sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted mt-1">{date}</p>
      </div>
      <div className="mt-8 grid items-start gap-4 md:grid-cols-3">
        <div className="min-w-0 md:col-span-2">{files}</div>
        <Card className="min-w-0">
          <Card.Header>
            <h2 className="text-lg font-semibold">{t.participants}</h2>
          </Card.Header>
          <Card.Content>{participants}</Card.Content>
        </Card>
      </div>
    </>
  );
}
