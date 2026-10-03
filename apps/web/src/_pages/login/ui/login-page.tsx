import { Card } from '@heroui/react';
import { linkVariants } from '@heroui/styles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { REDIRECT_PARAM, safeRedirectPath } from '@/shared/auth';
import { localePath } from '@/shared/i18n';
import { getDictionary, getLocale } from '@/shared/i18n/server';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.metadata.title };
}

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function LoginPage({ searchParams }: LoginPageProps) {
  const from = safeRedirectPath((await searchParams)[REDIRECT_PARAM]);
  const locale = await getLocale();
  const { common, login: t } = await getDictionary();

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <Card.Header>
          {/* A plain h1, not Card.Title (an h3): this is the page's main heading. */}
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <Card.Description>{t.description}</Card.Description>
        </Card.Header>
        <Card.Content>
          {/* The client form gets only its own texts, not the whole dictionary. */}
          <LoginForm from={from} messages={t.form} passwordInputLabels={common.passwordInput} />
        </Card.Content>
        <Card.Footer className="justify-center text-sm text-muted">
          <p>
            {t.newHere}{' '}
            <Link
              // Underlined so the link isn't told apart from the muted text by colour alone.
              className={linkVariants().base({ className: 'underline underline-offset-4' })}
              href={{
                pathname: localePath(locale, '/register'),
                query: from === '/' ? undefined : { [REDIRECT_PARAM]: from },
              }}
            >
              {t.createAccount}
            </Link>
          </p>
        </Card.Footer>
      </Card>
    </main>
  );
}
