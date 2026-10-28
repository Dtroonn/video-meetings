'use client';

import { Button, Card, Skeleton } from '@heroui/react';
import type { MeetingFileResponse } from '@video-meetings/contracts';
import { useState, type ReactNode } from 'react';
import { useUserStore } from '@/entities/user';
import { formatMessage, type Dictionary, type Locale } from '@/shared/i18n';
import { DateTime } from '@/shared/ui';
import { fileTypeLabel, formatFileSize } from '../model/meeting-file';
import {
  MeetingFilesStoreContext,
  createMeetingFilesStore,
  useMeetingFilesStore,
} from '../model/meeting-files-store';
import { DeleteFileButton, FileDownloadButton, FileDownloadLink } from './file-actions';
import { DropZonePanel, FileDropTarget, UploadButton } from './file-drop-zone';
import { UploadList } from './upload-list';

type FilesTexts = Pick<Dictionary['meeting']['page'], 'files' | 'uploads'>;

interface MeetingFilesProps {
  meetingId: string;
  /** The meeting's owner, who may delete every file; participants only their own. */
  ownerId: string;
  /** The completed files as the server read them; uploads add to them. */
  files: MeetingFileResponse[];
  locale: Locale;
  t: FilesTexts;
}

/**
 * The meeting's files card: the list of completed files and a drop zone. Files are added by
 * dropping them anywhere on the card or with the zone's "Upload files" button, several at once.
 * Each one uploads with its own progress and joins the list when
 * it's done; a file of a type that isn't allowed or over the size limit is rejected right away.
 * A file's name downloads it; a delete button shows on the files the user may delete.
 */
export function MeetingFiles({ meetingId, ownerId, files, locale, t }: MeetingFilesProps) {
  const [store] = useState(() => createMeetingFilesStore(meetingId, files));

  return (
    <MeetingFilesStoreContext value={store}>
      <FileDropTarget>
        <FilesCard t={t}>
          <DropZonePanel
            locale={locale}
            t={t.files}
            button={<UploadButton label={t.files.upload} />}
          />
          <UploadList locale={locale} t={t.uploads} />
          <FileList ownerId={ownerId} locale={locale} t={t.files} />
        </FilesCard>
      </FileDropTarget>
    </MeetingFilesStoreContext>
  );
}

/** Placeholder of the same layout as `MeetingFiles` with a few files. */
export function MeetingFilesSkeleton({ locale, t }: { locale: Locale; t: FilesTexts }) {
  return (
    <FilesCard t={t}>
      <DropZonePanel
        locale={locale}
        t={t.files}
        button={
          <Button isDisabled variant="primary">
            {t.files.upload}
          </Button>
        }
      />
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

function FilesCard({ t, children }: { t: FilesTexts; children: ReactNode }) {
  return (
    <Card>
      <Card.Header>
        <h2 className="text-lg font-semibold">{t.files.title}</h2>
      </Card.Header>
      <Card.Content className="flex flex-col gap-6">{children}</Card.Content>
    </Card>
  );
}

function FileList({
  ownerId,
  locale,
  t,
}: {
  ownerId: string;
  locale: Locale;
  t: FilesTexts['files'];
}) {
  const files = useMeetingFilesStore((state) => state.files);
  // Delete buttons appear once the user is known; the api checks the same rule on every delete.
  const userId = useUserStore((state) => state.user?.id);
  const canDelete = (file: MeetingFileResponse) =>
    userId !== undefined && (userId === ownerId || userId === file.uploader.id);

  if (files.length === 0) {
    return <p className="text-muted text-sm">{t.empty}</p>;
  }
  return (
    <ul className="divide-separator divide-y">
      {files.map((file) => (
        <li key={file.id} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <FileDownloadLink file={file} />
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
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <FileDownloadButton file={file} t={t} />
            {canDelete(file) && <DeleteFileButton file={file} t={t} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
