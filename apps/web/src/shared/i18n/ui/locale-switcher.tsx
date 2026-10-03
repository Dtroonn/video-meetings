'use client';

import { buttonVariants } from '@heroui/styles';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ButtonSkeleton } from '@/shared/ui';
import { LOCALES, localePath, splitLocale, type Locale } from '../locale';

// Shared by the switcher and its skeleton so they take exactly the same space (no layout shift):
// HeroUI's `sm` size sets the height (it differs between touch and mouse devices) and the radius,
// and a fixed width replaces the text-dependent one (each code fits in 44px).
const ITEM_CLASS = 'w-11';
const LIST_CLASS = 'flex items-center gap-1';

interface LocaleSwitcherProps {
  locale: Locale;
  /** Accessible name of the group, already translated. */
  label: string;
}

/**
 * Links to the same page in every locale. `proxy.ts` remembers the one the user opens.
 * It reads the query with `useSearchParams`, so render it inside `<Suspense>` with
 * `<LocaleSwitcherSkeleton />` as the fallback.
 */
export function LocaleSwitcher({ locale, label }: LocaleSwitcherProps) {
  const { path } = splitLocale(usePathname());
  const search = useSearchParams().toString();

  return (
    <nav aria-label={label} className={LIST_CLASS}>
      {LOCALES.map((code) => (
        <Link
          key={code}
          href={`${localePath(code, path)}${search ? `?${search}` : ''}`}
          hrefLang={code}
          lang={code}
          aria-current={code === locale ? 'true' : undefined}
          className={buttonVariants({
            size: 'sm',
            variant: code === locale ? 'secondary' : 'ghost',
            className: ITEM_CLASS,
          })}
        >
          {code.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}

/** Placeholder of the same size as `LocaleSwitcher`, for its `<Suspense>` fallback. */
export function LocaleSwitcherSkeleton() {
  return (
    <div aria-hidden className={LIST_CLASS}>
      {LOCALES.map((code) => (
        <ButtonSkeleton key={code} size="sm" label={code.toUpperCase()} className={ITEM_CLASS} />
      ))}
    </div>
  );
}
