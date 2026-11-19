'use client';

import { CircleCheckFill } from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import type { UserResponse } from '@video-meetings/contracts';
import { AxiosError } from 'axios';
import { useRef, useState } from 'react';
import { UserAvatar, useUserStore } from '@/entities/user';
import { formatMessage, type Dictionary } from '@/shared/i18n';
import { removeAvatar, uploadAvatar } from '../api/avatar';
import {
  ALLOWED_AVATAR_TYPES_LABEL,
  AVATAR_INPUT_ACCEPT,
  AVATAR_MAX_SIZE_MB,
  checkAvatarFile,
} from '../model/avatar-file';

export type AvatarEditorTexts = Dictionary['profile']['avatar'];

/** What the last action led to; drives the message under the buttons. */
type AvatarResult =
  | { kind: 'uploaded' | 'removed' }
  /** Refused before uploading: the browser's checks of type and size. */
  | { kind: 'rejected'; reason: 'type' | 'size' }
  /** The api refused the content (400): not a real JPEG/PNG/WebP image. Retrying won't help. */
  | { kind: 'invalid' }
  /** A network or server failure: the same action can be retried. */
  | { kind: 'uploadFailed'; file: File }
  | { kind: 'removeFailed' };

interface AvatarEditorProps {
  user: UserResponse;
  t: AvatarEditorTexts;
}

/**
 * The user's photo (or the placeholder) with buttons to upload a new one and to remove it. A
 * picked file is checked against the contracts' type and size limits before it's sent. The api's
 * answer goes into the user store, so the header avatar follows without a reload; on a network or
 * server error the current photo stays and an alert offers a retry.
 */
export function AvatarEditor({ user, t }: AvatarEditorProps) {
  const setUser = useUserStore((state) => state.setUser);
  const setAvatarUrl = useUserStore((state) => state.setAvatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<'upload' | 'remove' | null>(null);
  const [result, setResult] = useState<AvatarResult | null>(null);
  const hasAvatar = user.avatarUrl !== null;
  const limits = { types: ALLOWED_AVATAR_TYPES_LABEL, max: AVATAR_MAX_SIZE_MB };

  const upload = async (file: File) => {
    const rejection = checkAvatarFile(file);
    if (rejection) {
      setResult({ kind: 'rejected', reason: rejection });
      return;
    }
    setPending('upload');
    setResult(null);
    try {
      setUser(await uploadAvatar(file));
      setResult({ kind: 'uploaded' });
    } catch (error) {
      // A 401 that couldn't be refreshed already redirected to login.
      setResult(
        error instanceof AxiosError && error.response?.status === 400
          ? { kind: 'invalid' }
          : { kind: 'uploadFailed', file },
      );
    } finally {
      setPending(null);
    }
  };

  const remove = async () => {
    setPending('remove');
    setResult(null);
    try {
      await removeAvatar();
      setAvatarUrl(null);
      setResult({ kind: 'removed' });
    } catch {
      setResult({ kind: 'removeFailed' });
    } finally {
      setPending(null);
    }
  };

  const alert = alertText(result, t, limits);

  return (
    <section
      aria-labelledby="avatar-heading"
      className="flex flex-col gap-4 sm:flex-row sm:items-center"
    >
      <UserAvatar
        avatarUrl={user.avatarUrl}
        alt={t.photoAlt}
        className="size-24 rounded-full"
        iconClassName="size-10"
      />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="avatar-heading" className="text-sm font-medium">
          {t.title}
        </h2>
        <p className="text-muted text-sm">{formatMessage(t.hint, limits)}</p>
        <input
          ref={inputRef}
          type="file"
          // A hint for the picker only: users can still pick any file, `checkAvatarFile` decides.
          accept={AVATAR_INPUT_ACCEPT}
          hidden
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            // Cleared, so picking the same file again fires `change` again.
            input.value = '';
            if (file) {
              // `upload` never rejects: every failure ends up in `result`.
              upload(file).catch(() => {});
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            isPending={pending === 'upload'}
            isDisabled={pending !== null}
            onPress={() => inputRef.current?.click()}
          >
            {hasAvatar ? t.change : t.upload}
          </Button>
          {hasAvatar && (
            <Button
              size="sm"
              variant="danger-soft"
              isPending={pending === 'remove'}
              isDisabled={pending !== null}
              onPress={() => remove()}
            >
              {t.remove}
            </Button>
          )}
        </div>
        {alert && (
          <div role="alert" className="text-danger flex flex-wrap items-center gap-2 text-sm">
            {alert}
            {(result?.kind === 'uploadFailed' || result?.kind === 'removeFailed') && (
              <Button
                size="sm"
                variant="secondary"
                isDisabled={pending !== null}
                onPress={() => (result.kind === 'uploadFailed' ? upload(result.file) : remove())}
              >
                {t.retry}
              </Button>
            )}
          </div>
        )}
        {/* Always rendered, so screen readers announce the text when it appears. */}
        <p role="status" className="flex items-center gap-1.5 text-sm empty:hidden">
          {(result?.kind === 'uploaded' || result?.kind === 'removed') && (
            <>
              {/* HeroUI's green is too light for text (~2.2:1 on white), so only the icon is green. */}
              <CircleCheckFill aria-hidden className="text-success size-4 shrink-0" />
              {result.kind === 'uploaded' ? t.uploaded : t.removed}
            </>
          )}
        </p>
      </div>
    </section>
  );
}

function alertText(
  result: AvatarResult | null,
  t: AvatarEditorTexts,
  limits: { types: string; max: number },
): string | null {
  switch (result?.kind) {
    case 'rejected':
      return formatMessage(result.reason === 'type' ? t.rejectedType : t.rejectedSize, limits);
    case 'invalid':
      return formatMessage(t.invalidImage, limits);
    case 'uploadFailed':
      return t.uploadError;
    case 'removeFailed':
      return t.removeError;
    default:
      return null;
  }
}
