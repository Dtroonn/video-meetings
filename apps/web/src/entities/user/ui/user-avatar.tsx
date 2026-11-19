'use client';

import { Person } from '@gravity-ui/icons';
import { Avatar } from '@heroui/react';
import { avatarSrc } from '../model/avatar';

interface UserAvatarProps {
  /** `UserResponse.avatarUrl`; `null` shows the placeholder. */
  avatarUrl: string | null;
  /** The image's alt text; empty (decorative) by default, e.g. inside a labelled button. */
  alt?: string;
  /** Size and shape overrides for HeroUI's `Avatar` (`size-10`, round, by default). */
  className?: string;
  /** Classes for the placeholder icon, sized to match the avatar. */
  iconClassName?: string;
}

/**
 * A user's photo, or a person icon when they have none or it fails to load. Keyed by the URL, so
 * a new or removed avatar never shows the previous image while the next one loads.
 */
export function UserAvatar({
  avatarUrl,
  alt = '',
  className = 'rounded-full',
  iconClassName = 'size-5',
}: UserAvatarProps) {
  const src = avatarSrc(avatarUrl);

  return (
    <Avatar key={src ?? 'none'} className={className}>
      {src && <Avatar.Image src={src} alt={alt} className="object-cover" />}
      <Avatar.Fallback>
        <Person aria-hidden className={iconClassName} />
      </Avatar.Fallback>
    </Avatar>
  );
}
