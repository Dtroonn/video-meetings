import type { Metadata } from 'next';
import '@/_app/styles/globals.css';
import { ErrorTextsProvider } from '@/_pages/error';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { LOCALES } from '@/shared/i18n';

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// Pages override the title with their own metadata.
export const metadata: Metadata = {
  title: 'Video Meetings',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  const locale = await getLocale();
  const { serverError } = await getDictionary();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/* Texts for the error page (`error.tsx`), which renders inside this layout. */}
        <ErrorTextsProvider locale={locale} t={serverError}>
          {children}
        </ErrorTextsProvider>
      </body>
    </html>
  );
}
