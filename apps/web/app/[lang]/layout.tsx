import type { Metadata } from 'next';
import '@/_app/styles/globals.css';
import { getLocale } from '@/shared/i18n/server';
import { LOCALES } from '@/shared/i18n';

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// Pages override the title with their own metadata.
export const metadata: Metadata = {
  title: 'Video Meetings',
};

export default async function RootLayout({ children }: LayoutProps<'/[lang]'>) {
  return (
    <html lang={await getLocale()} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
