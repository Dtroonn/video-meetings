import { DEFAULT_LOCALE, isLocale, type Locale } from './locale';

/**
 * Picks the locale for a request without one in the URL: the one remembered in the cookie, else
 * the best match of the browser's `Accept-Language`, else the default.
 */
export function negotiateLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return matchAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Picks the supported locale with the highest `q` from a header like `ru-RU,ru;q=0.9,en;q=0.8`. */
function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
      return { language: tag.split('-')[0]?.toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { language } of candidates) {
    if (isLocale(language)) return language;
  }
  return null;
}
