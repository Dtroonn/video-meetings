'use client';

import { createContext, use, type ReactNode } from 'react';
import type { Dictionary, Locale } from '@/shared/i18n';

interface ErrorTexts {
  locale: Locale;
  t: Dictionary['serverError'];
}

const ErrorTextsContext = createContext<ErrorTexts | null>(null);

/**
 * Hands the error page its texts. `error.tsx` is a Client Component that gets no props from the
 * server and Client Components don't load dictionaries, so the root layout (which the error
 * boundary renders inside) provides them.
 */
export function ErrorTextsProvider({ children, ...value }: ErrorTexts & { children: ReactNode }) {
  return <ErrorTextsContext value={value}>{children}</ErrorTextsContext>;
}

export function useErrorTexts(): ErrorTexts {
  const value = use(ErrorTextsContext);
  if (!value) {
    throw new Error('useErrorTexts must be used inside <ErrorTextsProvider>');
  }
  return value;
}
