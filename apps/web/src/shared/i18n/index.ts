// Safe to import from anywhere, `proxy.ts` included. Server-only helpers (`getLocale`,
// `getDictionary`) are in `@/shared/i18n/server`.
export type { Dictionary } from './dictionary';
export { formatMessage } from './format-message';
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  isLocale,
  localePath,
  splitLocale,
  type Locale,
} from './locale';
export { negotiateLocale } from './negotiate-locale';
export { LocaleSwitcher, LocaleSwitcherSkeleton } from './ui/locale-switcher';
