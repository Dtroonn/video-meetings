import { Card } from '@heroui/react';
import { linkVariants } from '@heroui/styles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { localePath } from '@/shared/i18n';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { RetryButton } from './retry-button';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).serverError.metadata.title };
}

/** Shown with status 500 by `proxy.ts` when the session can't be refreshed because the api failed. */
export async function ServerErrorPage() {
  const locale = await getLocale();
  const { serverError: t } = await getDictionary();

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          {/* A plain h1, not Card.Title (an h3): this is the page's main heading. */}
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <Card.Description>{t.description}</Card.Description>
        </Card.Header>
        <Card.Content>
          <RetryButton label={t.retry} />
        </Card.Content>
        <Card.Footer className="justify-center text-sm text-muted">
          <Link
            // Underlined so the link isn't told apart from the muted text by colour alone.
            className={linkVariants().base({ className: 'underline underline-offset-4' })}
            href={localePath(locale, '/')}
          >
            {t.home}
          </Link>
        </Card.Footer>
      </Card>
    </main>
  );
}
