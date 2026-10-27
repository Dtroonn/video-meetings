import type { Metadata } from 'next';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { RetryButton } from './retry-button';
import { ErrorCard } from './error-card';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).serverError.metadata.title };
}

/** Shown with status 500 by `proxy.ts` when the session can't be refreshed because the api failed. */
export async function ServerErrorPage() {
  const locale = await getLocale();
  const { serverError: t } = await getDictionary();

  return <ErrorCard locale={locale} t={t} retry={<RetryButton label={t.retry} />} />;
}
