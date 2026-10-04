import { Card } from '@heroui/react';
import { linkVariants } from '@heroui/styles';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { localePath, type Dictionary, type Locale } from '@/shared/i18n';

interface ErrorCardProps {
  locale: Locale;
  t: Dictionary['serverError'];
  /** The retry control: how to retry differs between the `/500` page and the error boundary. */
  retry: ReactNode;
}

/**
 * "Something went wrong" with a retry and a link home. No server-only code, so both the `/500`
 * page (a Server Component) and the error boundary (a Client Component) render it.
 */
export function ErrorCard({ locale, t, retry }: ErrorCardProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          {/* A plain h1, not Card.Title (an h3): this is the page's main heading. */}
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <Card.Description>{t.description}</Card.Description>
        </Card.Header>
        <Card.Content>{retry}</Card.Content>
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
