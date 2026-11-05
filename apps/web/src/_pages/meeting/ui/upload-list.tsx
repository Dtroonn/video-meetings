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
    case 'cancelFailed':
      return t.cancelFailed;
    default:
      return t.failed;
  }
}

/**
 * The files being uploaded, each with its own progress bar and a cancel button, and the ones that
 * failed or were rejected before uploading, each with its reason. Nothing when there are none.
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
  const cancel = useMeetingFilesStore((state) => state.cancel);
  const { name, size, loaded, status, resumed, error } = upload;

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

  let valueLabel = `${percent}% · ${sizes}`;
  if (status === 'queued') valueLabel = t.queued;
  else if (status === 'paused') valueLabel = `${t.paused} · ${percent}%`;
  else if (resumed) valueLabel = `${t.resumed} · ${valueLabel}`;
  // A progress bar's value isn't announced when it changes, so pausing and resuming are also
  // told to screen readers here, once each, with the file's name.
  let announcement = '';
  if (status === 'paused') announcement = `${name}: ${t.paused}`;
  else if (resumed) announcement = `${name}: ${t.resumed}`;

  return (
    <div className="flex items-center gap-2">
      <span role="status" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
      <ProgressBar
        value={status === 'queued' ? 0 : percent}
        size="sm"
        // The state, percentage and sizes, read out by screen readers along with the name.
        valueLabel={valueLabel}
        className="flex min-w-0 flex-1 flex-col gap-1.5"
      >
        {/* Wraps when the state doesn't fit next to the name, so the name is never squeezed out. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
          <Label className="max-w-full min-w-0 truncate font-medium" title={name}>
            {name}
          </Label>
          <ProgressBar.Output
            className={`ms-auto tabular-nums ${status === 'paused' ? 'text-foreground' : 'text-muted'}`}
          />
        </div>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={formatMessage(t.cancel, { name })}
        onPress={() => cancel(upload.key)}
      >
        <Xmark aria-hidden className="size-4" />
      </Button>
    </div>
  );
}
