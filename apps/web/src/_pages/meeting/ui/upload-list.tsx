'use client';

import { Xmark } from '@gravity-ui/icons';
import { Button, Label, ProgressBar } from '@heroui/react';
import { MEETING_FILE_MAX_SIZE } from '@video-meetings/contracts';
import { formatMessage, type Dictionary, type Locale } from '@/shared/i18n';
import { ALLOWED_FILE_TYPES_LABEL, formatFileSize } from '../model/meeting-file';
import { useMeetingFilesStore, type Upload, type UploadError } from '../model/meeting-files-store';

type UploadsTexts = Dictionary['meeting']['page']['uploads'];

function errorMessage(error: UploadError | undefined, locale: Locale, t: UploadsTexts): string {
  switch (error) {
    case 'type':
      return formatMessage(t.rejectedType, { types: ALLOWED_FILE_TYPES_LABEL });
    case 'size':
      return formatMessage(t.rejectedSize, { max: formatFileSize(MEETING_FILE_MAX_SIZE, locale) });
    default:
      return t.failed;
  }
}

/**
 * The files being uploaded, each with its own progress bar, and the ones that failed or were
 * rejected before uploading, each with its reason. Nothing when there are none.
 */
export function UploadList({ locale, t }: { locale: Locale; t: UploadsTexts }) {
  const uploads = useMeetingFilesStore((state) => state.uploads);

  if (uploads.length === 0) return null;
  return (
    <section aria-label={t.title}>
      <ul className="flex flex-col gap-4">
        {uploads.map((upload) => (
          <li key={upload.key}>
            <UploadItem upload={upload} locale={locale} t={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function UploadItem({ upload, locale, t }: { upload: Upload; locale: Locale; t: UploadsTexts }) {
  const dismiss = useMeetingFilesStore((state) => state.dismiss);
  const { name, size, loaded, status, error } = upload;

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={name}>
            {name}
          </p>
          <p role="alert" className="text-danger text-sm">
            {errorMessage(error, locale, t)}
          </p>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={formatMessage(t.dismiss, { name })}
          onPress={() => dismiss(upload.key)}
        >
          <Xmark aria-hidden className="size-4" />
        </Button>
      </div>
    );
  }

  // An empty file is "done" as soon as it starts; avoid dividing by zero.
  const percent = size === 0 ? 0 : Math.floor((loaded / size) * 100);
  const sizes = formatMessage(t.progress, {
    loaded: formatFileSize(loaded, locale),
    total: formatFileSize(size, locale),
  });

  return (
    <ProgressBar
      value={status === 'queued' ? 0 : percent}
      size="sm"
      // The percentage and sizes, read out by screen readers along with the name.
      valueLabel={status === 'queued' ? t.queued : `${percent}% · ${sizes}`}
      className="flex w-full flex-col gap-1.5"
    >
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <Label className="min-w-0 truncate font-medium" title={name}>
          {name}
        </Label>
        <ProgressBar.Output className="text-muted shrink-0 tabular-nums" />
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}
