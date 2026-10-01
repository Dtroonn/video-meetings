import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Video Meetings',
  description: 'Video meetings',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
