import { Plus } from '@gravity-ui/icons';
import { buttonVariants } from '@heroui/styles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { localePath } from '@/shared/i18n';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { Greeting } from './greeting';
import { MeetingsOverview, MeetingsOverviewSkeleton } from './meetings-overview';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).dashboard.metadata.title };
}

/**
 * The dashboard's main page. The greeting gets the user from `UserProvider` (in the dashboard
 * layout) on the client; the meetings are read on the server, streamed in from `<Suspense>`.
 */
export async function DashboardPage() {
  const locale = await getLocale();
  const { dashboard } = await getDictionary();
  const t = dashboard.page;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Greeting t={t} />
        {/* The page that creates meetings doesn't exist yet. Logging out is in the header's menu. */}
        <Link
          href={localePath(locale, '/dashboard/meetings/new')}
          className={buttonVariants({ variant: 'primary', className: 'w-full shrink-0 sm:w-auto' })}
        >
          <Plus aria-hidden className="size-4" />
          {t.createMeeting}
        </Link>
      </div>
      <Suspense fallback={<MeetingsOverviewSkeleton t={t} />}>
        <MeetingsOverview locale={locale} t={t} />
      </Suspense>
    </main>
  );
}
