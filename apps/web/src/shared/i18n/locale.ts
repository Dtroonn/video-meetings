export const LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie remembering the last locale the user opened the site in (set by `proxy.ts`). */
export const LOCALE_COOKIE = 'locale';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

/** Splits `/ru/login` into `{ locale: 'ru', path: '/login' }`; `locale` is `null` without a prefix. */
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const [, first = '', ...rest] = pathname.split('/');
  if (!isLocale(first)) return { locale: null, path: pathname };
  return { locale: first, path: `/${rest.join('/')}` };
}

/** Prefixes a site path with the locale: `('ru', '/login')` → `/ru/login`, `('ru', '/')` → `/ru`. */
export function localePath(locale: Locale, path: string): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
