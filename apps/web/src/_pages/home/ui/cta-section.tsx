import { Skeleton } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import Link from 'next/link';
import { Suspense } from 'react';
import { localePath, type Dictionary, type Locale } from '@/shared/i18n';
import { GuestOnly } from './guest-only';

interface CtaSectionProps {
  locale: Locale;
  t: Dictionary['home']['cta'];
}

/** The closing call to sign up; signed-in users don't see it. */
export function CtaSection({ locale, t }: CtaSectionProps) {
  return (
    <Suspense fallback={<CtaCard locale={locale} t={t} isPlaceholder />}>
      <GuestOnly>
        <CtaCard locale={locale} t={t} />
      </GuestOnly>
    </Suspense>
  );
}

interface CtaCardProps extends CtaSectionProps {
  /**
   * Render as the `<Suspense>` skeleton: the same markup with its content invisible over a
   * skeleton, so the placeholder has exactly the card's size at every width and text length.
   */
  isPlaceholder?: boolean;
}

function CtaCard({ locale, t, isPlaceholder = false }: CtaCardProps) {
  return (
    <section
      aria-hidden={isPlaceholder || undefined}
      className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
    >
      <div
        className={
          isPlaceholder
            ? 'relative rounded-3xl px-6 py-12 text-center'
            : 'bg-accent text-accent-foreground rounded-3xl px-6 py-12 text-center'
        }
      >
        {isPlaceholder && <Skeleton className="absolute inset-0 rounded-[inherit]" />}
        <div className={isPlaceholder ? 'invisible' : undefined}>
          <h2 className="text-3xl font-semibold tracking-tight">{t.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty">{t.text}</p>
          {isPlaceholder ? (
            <span className={buttonVariants({ size: 'lg', className: 'mt-6' })}>{t.button}</span>
          ) : (
            <Link
              href={localePath(locale, '/register')}
              className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'mt-6' })}
            >
              {t.button}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
