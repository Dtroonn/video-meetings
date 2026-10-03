import { Card } from '@heroui/react';
import { linkVariants } from '@heroui/styles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RetryButton } from './retry-button';

export const metadata: Metadata = {
  title: 'Something went wrong · Video Meetings',
};

/** Shown with status 500 by `proxy.ts` when the session can't be refreshed because the api failed. */
export function ServerErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          {/* A plain h1, not Card.Title (an h3): this is the page's main heading. */}
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <Card.Description>
            We couldn&apos;t reach our servers. Your session is safe — try again in a moment.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <RetryButton />
        </Card.Content>
        <Card.Footer className="justify-center text-sm text-muted">
          <Link
            // Underlined so the link isn't told apart from the muted text by colour alone.
            className={linkVariants().base({ className: 'underline underline-offset-4' })}
            href="/"
          >
            Go to the home page
          </Link>
        </Card.Footer>
      </Card>
    </main>
  );
}
