'use client';

import { ArrowUpFromLine } from '@gravity-ui/icons';
import { Button, Card, Skeleton } from '@heroui/react';
import type { MeetingFileResponse } from '@video-meetings/contracts';
import { useRef, useState, type ReactNode } from 'react';
import { formatMessage, type Dictionary, type Locale } from '@/shared/i18n';
import { DateTime } from '@/shared/ui';
import { fileTypeLabel, formatFileSize } from '../model/meeting-file';
import {
  MeetingFilesStoreContext,
  createMeetingFilesStore,
  useMeetingFilesStore,
} from '../model/meeting-files-store';
import { UploadList } from './upload-list';

type FilesTexts = Pick<Dictionary['meeting']['page'], 'files' | 'uploads'>;

interface MeetingFilesProps {
  meetingId: string;
  /** The completed files as the server read them; uploads add to them. */
  files: MeetingFileResponse[];
  locale: Locale;
  t: FilesTexts;
}

/**
 * The meeting's files card: the list of completed files and an "Upload files" button that picks
 * several files at once. Each picked file uploads with its own progress and joins the list when
 * it's done.
 */
export function MeetingFiles({ meetingId, files, locale, t }: MeetingFilesProps) {
  const [store] = useState(() => createMeetingFilesStore(meetingId, files));

  return (
    <MeetingFilesStoreContext value={store}>
      <FilesCard action={<UploadButton label={t.files.upload} />} t={t}>
        <UploadList locale={locale} t={t.uploads} />
        <FileList locale={locale} t={t.files} />
      </FilesCard>
    </MeetingFilesStoreContext>
  );
}

/** Placeholder of the same layout as `MeetingFiles` with a few files. */
export function MeetingFilesSkeleton({ t }: { t: FilesTexts }) {
  return (
    <FilesCard
      action={
        <Button isDisabled variant="primary" className="w-full sm:w-auto">
          <ArrowUpFromLine aria-hidden className="size-4" />
          {t.files.upload}
        </Button>
      }
      t={t}
    >
      <ul className="divide-separator divide-y">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
            <Skeleton className="h-[1lh] w-56 max-w-full rounded-md" />
            <Skeleton className="h-[1lh] w-72 max-w-full rounded-md text-sm" />
          </li>
        ))}
      </ul>
    </FilesCard>
  );
}

function FilesCard({
  action,
  t,
  children,
}: {
  action: ReactNode;
  t: FilesTexts;
  children: ReactNode;
}) {
  return (
    <Card>
      <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{t.files.title}</h2>
        {action}
      </Card.Header>
      <Card.Content className="flex flex-col gap-6">{children}</Card.Content>
    </Card>
  );
}

/** Opens the browser's file picker; the picked files are queued for upload. */
function UploadButton({ label }: { label: string }) {
  const addFiles = useMeetingFilesStore((state) => state.addFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const input = event.currentTarget;
          if (input.files && input.files.length > 0) {
            addFiles(input.files);
          }
          // Cleared, so picking the same file again fires `change` again.
          input.value = '';
        }}
      />
      <Button
        variant="primary"
        className="w-full sm:w-auto"
        onPress={() => inputRef.current?.click()}
      >
        <ArrowUpFromLine aria-hidden className="size-4" />
        {label}
      </Button>
    </>
  );
}

function FileList({ locale, t }: { locale: Locale; t: FilesTexts['files'] }) {
  const files = useMeetingFilesStore((state) => state.files);

  if (files.length === 0) {
    return <p className="text-muted text-sm">{t.empty}</p>;
  }
  return (
    <ul className="divide-separator divide-y">
      {files.map((file) => (
        <li key={file.id} className="flex min-w-0 flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
          <span className="truncate font-medium" title={file.name}>
            {file.name}
          </span>
          <span className="text-muted flex flex-wrap gap-x-2 text-sm">
            <span>{fileTypeLabel(file.name, file.type)}</span>
            <span aria-hidden>·</span>
            <span>{formatFileSize(file.size, locale)}</span>
            <span aria-hidden>·</span>
            <span className="min-w-0 truncate">
              {formatMessage(t.uploadedBy, { email: file.uploader.email })}
            </span>
            <span aria-hidden>·</span>
            <DateTime date={file.uploadedAt} locale={locale} />
          </span>
        </li>
      ))}
    </ul>
  );
}
