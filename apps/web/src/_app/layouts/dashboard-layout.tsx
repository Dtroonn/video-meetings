import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { UserProvider } from '@/entities/user';
import { LocaleSwitcher, LocaleSwitcherSkeleton, localePath } from '@/shared/i18n';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { UserMenu } from './user-menu';

/**
 * The layout of every page under `/<locale>/dashboard` (private: `proxy.ts` lets only signed-in
 * users in). `UserProvider` loads the signed-in user on the client and shares it with the header
 * and the pages below; everything here is static, so it's part of each page's static shell.
 */
export async function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const { common, dashboard: t } = await getDictionary();

  return (
    <UserProvider>
      <header className="border-separator bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href={localePath(locale, '/dashboard')}
            className="text-foreground text-lg font-semibold"
          >
            Video Meetings
          </Link>
          <div className="flex items-center gap-3">
            {/* The switcher reads the query (useSearchParams); the skeleton keeps its size. */}
            <Suspense fallback={<LocaleSwitcherSkeleton />}>
              <LocaleSwitcher locale={locale} label={common.localeSwitcherLabel} />
            </Suspense>
            <UserMenu locale={locale} t={t.layout} />
          </div>
        </div>
      </header>
      {children}
    </UserProvider>
  );
}
