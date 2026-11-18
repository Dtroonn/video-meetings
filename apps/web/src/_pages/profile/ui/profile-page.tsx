import { Card } from '@heroui/react';
import type { Metadata } from 'next';
import { getDictionary } from '@/shared/i18n/server';
import { ProfileDetails } from './profile-details';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).profile.metadata.title };
}

/**
 * The signed-in user's profile (`/<locale>/dashboard/profile`, private). Static: the details come
 * from the user store of the dashboard layout's `UserProvider`, on the client.
 */
export async function ProfilePage() {
  const { profile: t } = await getDictionary();

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
          />
        </Card.Content>
      </Card>
    </main>
  );
}
