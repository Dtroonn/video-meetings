import { Card } from '@heroui/react';
import type { Metadata } from 'next';
import { getDictionary } from '@/shared/i18n/server';
import { PasswordForm } from './password-form';
import { ProfileDetails } from './profile-details';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).profile.metadata.title };
}

/**
 * The signed-in user's profile (`/<locale>/dashboard/profile`, private). Static: the details come
 * from the user store of the dashboard layout's `UserProvider`, on the client.
 */
export async function ProfilePage() {
  const { profile: t, common } = await getDictionary();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h1>
      <p className="text-muted mt-2">{t.description}</p>
      <Card className="mt-6">
        <Card.Content>
          {/* The client tree gets only its own texts, not the whole dictionary. */}
          <ProfileDetails
            t={{ loading: t.loading, loadError: t.loadError, retry: t.retry }}
            messages={t.form}
            avatarTexts={t.avatar}
          />
        </Card.Content>
      </Card>
      <section aria-labelledby="password-title" className="mt-10">
        <h2 id="password-title" className="text-xl font-semibold tracking-tight">
          {t.password.title}
        </h2>
        <p className="text-muted mt-2">{t.password.description}</p>
        <Card className="mt-4">
          <Card.Content>
            {/* Doesn't need the user store: the api changes the password of the session's user. */}
            <PasswordForm messages={t.password} passwordInputLabels={common.passwordInput} />
          </Card.Content>
        </Card>
      </section>
    </main>
  );
}
