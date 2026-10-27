import { notFound } from 'next/navigation';
import { lang } from 'next/root-params';
import { isLocale, type Locale } from './locale';

/** The locale of the current route, i.e. the `[lang]` segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return locale;
}
