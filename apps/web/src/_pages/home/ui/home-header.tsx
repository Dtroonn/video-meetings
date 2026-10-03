import { buttonVariants } from '@heroui/styles';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  LocaleSwitcher,
  LocaleSwitcherSkeleton,
  localePath,
  type Dictionary,
  type Locale,
} from '@/shared/i18n';
import { ButtonSkeleton } from '@/shared/ui';
import { GuestOnly } from './guest-only';

interface HomeHeaderProps {
  locale: Locale;
  localeSwitcherLabel: string;
  t: Dictionary['home']['header'];
}

export function HomeHeader({ locale, localeSwitcherLabel, t }: HomeHeaderProps) {
  return (
    <header className="border-separator bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={localePath(locale, '/')} className="text-foreground text-lg font-semibold">
          Video Meetings
        </Link>
        <div className="flex items-center gap-2">
          {/* The switcher reads the query (useSearchParams); the skeleton keeps its size. */}
          <Suspense fallback={<LocaleSwitcherSkeleton />}>
            <LocaleSwitcher locale={locale} label={localeSwitcherLabel} />
          </Suspense>
          {/* Signed-in users have nothing to log into: /login would just send them back here. */}
          <Suspense fallback={<ButtonSkeleton size="sm" label={t.logIn} />}>
            <GuestOnly>
              <Link
                href={localePath(locale, '/login')}
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                {t.logIn}
              </Link>
            </GuestOnly>
          </Suspense>
        </div>
      </div>
    </header>
  );
}
