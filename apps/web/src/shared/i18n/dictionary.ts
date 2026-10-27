import type en from './dictionaries/en.json';
import { getLocale } from './get-locale';
import type { Locale } from './locale';

/** All UI texts of one locale, namespaced by page (`home`, …) plus `common` for shared bits. */
export type Dictionary = typeof en;

// Loaded lazily, so a request only pulls in its own locale. The `Dictionary` return type makes
// every locale's file match the English one: a missing or renamed key fails type checking.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  ru: () => import('./dictionaries/ru.json').then((module) => module.default),
};

/**
 * The dictionary of the current route's locale (Server Components only). Client Components don't
 * call it: their Server Component parent passes them just the strings they need as props.
 */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
