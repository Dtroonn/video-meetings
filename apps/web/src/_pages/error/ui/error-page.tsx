'use client';

import { Button } from '@heroui/react';
import { useEffect } from 'react';
import { useErrorTexts } from './error-texts';
import { ErrorCard } from './error-card';

interface ErrorPageProps {
  /** In production, errors from Server Components arrive without their message, only a `digest`. */
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the failed segment. */
  retry: () => void;
}

/**
 * The error boundary of every page (`app/[lang]/error.tsx`): unexpected render errors and failed
 * api requests (`resolveApiResponse` throws for anything but a 401) end up here.
 */
export function ErrorPage({ error, retry }: ErrorPageProps) {
  const { locale, t } = useErrorTexts();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      {/* Error boundaries can't export metadata. */}
      <title>{t.metadata.title}</title>
      <ErrorCard
        locale={locale}
        t={t}
        retry={
          <Button variant="primary" fullWidth onPress={retry}>
            {t.retry}
          </Button>
        }
      />
    </>
  );
}
