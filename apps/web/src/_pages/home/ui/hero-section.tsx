import { buttonVariants } from '@heroui/styles';
import Link from 'next/link';
import { Suspense } from 'react';
import { localePath, type Dictionary, type Locale } from '@/shared/i18n';
import { ButtonSkeleton } from '@/shared/ui';
import { GuestOnly } from './guest-only';

// Shared by the buttons and their skeletons, so both take the same space.
const ACTIONS_CLASS = 'mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row';
const ACTION_CLASS = 'w-full sm:w-auto';

interface HeroSectionProps {
  locale: Locale;
  t: Dictionary['home']['hero'];
}

export function HeroSection({ locale, t }: HeroSectionProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        {t.title}
      </h1>
      <p className="text-muted mx-auto mt-6 max-w-2xl text-lg text-pretty">{t.subtitle}</p>
      <Suspense
        fallback={
          <div aria-hidden className={ACTIONS_CLASS}>
            <ButtonSkeleton size="lg" label={t.primaryCta} className={ACTION_CLASS} />
            <ButtonSkeleton size="lg" label={t.secondaryCta} className={ACTION_CLASS} />
          </div>
        }
      >
        <GuestOnly>
          <div className={ACTIONS_CLASS}>
            <Link
              href={localePath(locale, '/register')}
              className={buttonVariants({
                variant: 'primary',
                size: 'lg',
                className: ACTION_CLASS,
              })}
            >
              {t.primaryCta}
            </Link>
            <Link
              href={localePath(locale, '/login')}
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: ACTION_CLASS,
              })}
            >
              {t.secondaryCta}
            </Link>
          </div>
        </GuestOnly>
      </Suspense>
    </section>
  );
}
