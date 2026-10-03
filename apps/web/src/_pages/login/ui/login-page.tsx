import { Card } from '@heroui/react';
import { linkVariants } from '@heroui/styles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { REDIRECT_PARAM, safeRedirectPath } from '@/shared/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Log in · Video Meetings',
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function LoginPage({ searchParams }: LoginPageProps) {
  const from = safeRedirectPath((await searchParams)[REDIRECT_PARAM]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          {/* A plain h1, not Card.Title (an h3): this is the page's main heading. */}
          <h1 className="text-xl font-semibold text-foreground">Log in</h1>
          <Card.Description>Welcome back to Video Meetings.</Card.Description>
        </Card.Header>
        <Card.Content>
          <LoginForm from={from} />
        </Card.Content>
        <Card.Footer className="justify-center text-sm text-muted">
          <p>
            New here?{' '}
            <Link
              // Underlined so the link isn't told apart from the muted text by colour alone.
              className={linkVariants().base({ className: 'underline underline-offset-4' })}
              href={{
                pathname: '/register',
                query: from === '/' ? undefined : { [REDIRECT_PARAM]: from },
              }}
            >
              Create an account
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </main>
  );
}
