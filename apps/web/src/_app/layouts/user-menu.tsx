'use client';

import { ArrowRightFromSquare, Person } from '@gravity-ui/icons';
import { Avatar, Dropdown, Label, Skeleton, Spinner } from '@heroui/react';
import { useTransition, type Key } from 'react';
import { useUserStore } from '@/entities/user';
import type { Dictionary, Locale } from '@/shared/i18n';
import { logout } from './logout';

interface UserMenuProps {
  locale: Locale;
  t: Dictionary['dashboard']['layout'];
}

/**
 * The avatar in the header and the account menu it opens. A skeleton of the same size stands in
 * while the user is loading; if loading fails the menu still opens, so the user can log out.
 */
export function UserMenu({ locale, t }: UserMenuProps) {
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.status === 'loading');
  // The Server Function redirects to the login page; isPending stays true until it renders.
  const [isPending, startTransition] = useTransition();

  if (isLoading) {
    return <Skeleton aria-hidden className="size-10 shrink-0 rounded-full" />;
  }

  const onAction = (key: Key) => {
    if (key === 'logout') {
      startTransition(async () => {
        await logout(locale);
      });
    }
    // `profile` has no page yet.
  };

  return (
    <Dropdown>
      <Dropdown.Trigger aria-label={t.userMenu} className="rounded-full">
        <Avatar>
          {/* Users have no photo yet, so the fallback is always shown. */}
          <Avatar.Fallback>
            <Person aria-hidden className="size-5" />
          </Avatar.Fallback>
        </Avatar>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="min-w-56">
        {user && (
          <div className="border-separator border-b px-3 pt-3 pb-2">
            <p className="text-muted text-xs">{t.signedInAs}</p>
            <p className="text-sm font-medium wrap-break-word">{user.email}</p>
          </div>
        )}
        <Dropdown.Menu aria-label={t.userMenu} onAction={onAction}>
          <Dropdown.Item id="profile" textValue={t.profile}>
            <Person aria-hidden className="text-muted size-4" />
            <Label>{t.profile}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="logout" textValue={t.logOut} variant="danger" isDisabled={isPending}>
            {isPending ? (
              <Spinner color="current" size="sm" />
            ) : (
              <ArrowRightFromSquare aria-hidden className="text-danger size-4" />
            )}
            <Label>{t.logOut}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
