'use client';

import { Button } from '@heroui/react';
import { useUserStore } from '@/entities/user';
import { formatMessage, type Dictionary } from '@/shared/i18n';
import { TextSkeleton } from '@/shared/ui';

type GreetingTexts = Pick<
  Dictionary['dashboard']['page'],
  'greeting' | 'greetingNoUser' | 'loadingUser' | 'userError' | 'retry'
>;

/**
 * The page heading, greeting the user by email. While the user loads, a skeleton one line high
 * stands in for the text; if loading fails, a generic greeting and a retry button.
 */
export function Greeting({ t }: { t: GreetingTexts }) {
  const user = useUserStore((state) => state.user);
  const status = useUserStore((state) => state.status);
  const load = useUserStore((state) => state.load);

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight wrap-break-word sm:text-3xl">
        {user ? (
          formatMessage(t.greeting, { email: user.email })
        ) : status === 'error' ? (
          t.greetingNoUser
        ) : (
          <>
            <span className="sr-only">{t.loadingUser}</span>
            <TextSkeleton className="w-72" />
          </>
        )}
      </h1>
      {status === 'error' && (
        <div role="alert" className="text-danger mt-2 flex flex-wrap items-center gap-2 text-sm">
          {t.userError}
          <Button size="sm" variant="secondary" onPress={() => load()}>
            {t.retry}
          </Button>
        </div>
      )}
    </div>
  );
}
