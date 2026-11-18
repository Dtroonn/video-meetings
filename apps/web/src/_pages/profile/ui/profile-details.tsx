'use client';

import { Button, Skeleton } from '@heroui/react';
import { useUserStore } from '@/entities/user';
import type { Dictionary } from '@/shared/i18n';
import type { ProfileFormMessages } from '../model/profile-form';
import { AvatarEditor, type AvatarEditorTexts } from './avatar-editor';
import { ProfileForm } from './profile-form';

type ProfileDetailsTexts = Pick<Dictionary['profile'], 'loading' | 'loadError' | 'retry'>;

interface ProfileDetailsProps {
  t: ProfileDetailsTexts;
  messages: ProfileFormMessages;
  avatarTexts: AvatarEditorTexts;
}

/**
 * The photo and the profile form once the user has loaded; a skeleton of both before that, and an
 * error with a retry if loading failed.
 */
export function ProfileDetails({ t, messages, avatarTexts }: ProfileDetailsProps) {
  const user = useUserStore((state) => state.user);
  const status = useUserStore((state) => state.status);
  const load = useUserStore((state) => state.load);

  if (user) {
    // Keyed by user, so a different user (never expected, but cheap) gets a fresh form.
    return (
      <div key={user.id} className="flex flex-col gap-6">
        <AvatarEditor user={user} t={avatarTexts} />
        <hr className="border-separator" />
        <ProfileForm user={user} messages={messages} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className="text-danger flex flex-wrap items-center gap-2 text-sm">
        {t.loadError}
        <Button size="sm" variant="secondary" onPress={() => load()}>
          {t.retry}
        </Button>
      </div>
    );
  }

  return <ProfileFormSkeleton label={t.loading} />;
}

/** Placeholders for the photo and the form's fields while the user loads. */
function ProfileFormSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Skeleton className="size-24 shrink-0 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
      </div>
      <hr aria-hidden className="border-separator" />
      {[0, 1, 2].map((index) => (
        <div key={index} aria-hidden className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <div aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-5 w-72 max-w-full rounded-md" />
      </div>
      <Skeleton aria-hidden className="h-10 w-36 rounded-full" />
    </div>
  );
}
