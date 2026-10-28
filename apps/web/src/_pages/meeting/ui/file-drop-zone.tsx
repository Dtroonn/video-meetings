'use client';

import { ArrowUpFromLine } from '@gravity-ui/icons';
import { Button } from '@heroui/react';
import { MEETING_FILE_MAX_SIZE } from '@video-meetings/contracts';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { formatMessage, type Dictionary, type Locale } from '@/shared/i18n';
import { ALLOWED_FILE_TYPES_LABEL, FILE_INPUT_ACCEPT, formatFileSize } from '../model/meeting-file';
import { useMeetingFilesStore } from '../model/meeting-files-store';

type FilesTexts = Dictionary['meeting']['page']['files'];

/** Whether a drag carries files (not text or a link dragged from the page). */
const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

/**
 * Makes everything inside it a drop target for files: dropped files are queued for upload like
 * picked ones (`addFiles` checks each). While files are dragged over it, it sets
 * `data-dragging="true"`, which `DropZonePanel` reads through the `group/drop` class to highlight.
 */
export function FileDropTarget({ children }: { children: ReactNode }) {
  const addFiles = useMeetingFilesStore((state) => state.addFiles);
  const [isDragging, setIsDragging] = useState(false);
  // `dragenter`/`dragleave` also fire when moving between children, so count the nesting.
  const depth = useRef(0);

  return (
    <div
      className="group/drop"
      data-dragging={isDragging}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        depth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        // Without this the browser opens the dropped file instead of dropping it here.
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setIsDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setIsDragging(false);
        if (event.dataTransfer.files.length > 0) {
          addFiles(event.dataTransfer.files);
        }
      }}
    >
      {children}
    </div>
  );
}

/**
 * The visible drop zone: a dashed panel with what can be uploaded and the "Upload files" button,
 * the keyboard and touch way to pick files. Highlighted while files are dragged over the
 * surrounding `FileDropTarget`; the "drag and drop" line is hidden on touch screens.
 */
export function DropZonePanel({
  locale,
  t,
  button,
}: {
  locale: Locale;
  t: FilesTexts;
  button: ReactNode;
}) {
  return (
    // `--field-border` is the theme's field border, tuned to ≥ 3:1 against the card.
    <div className="group-data-[dragging=true]/drop:border-accent border-(--field-border) group-data-[dragging=true]/drop:bg-accent-soft flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors">
      <ArrowUpFromLine
        aria-hidden
        className="text-muted group-data-[dragging=true]/drop:text-accent size-6"
      />
      <div className="flex flex-col gap-1">
        <p className="font-medium pointer-coarse:hidden">{t.dropzone.title}</p>
        <p className="text-muted text-sm">
          {formatMessage(t.dropzone.hint, {
            types: ALLOWED_FILE_TYPES_LABEL,
            max: formatFileSize(MEETING_FILE_MAX_SIZE, locale),
          })}
        </p>
      </div>
      {button}
    </div>
  );
}

/** Opens the browser's file picker; the picked files are queued for upload. */
export function UploadButton({ label }: { label: string }) {
  const addFiles = useMeetingFilesStore((state) => state.addFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        // A hint for the picker only: users can still pick any file, `addFiles` checks each.
        accept={FILE_INPUT_ACCEPT}
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
      <Button variant="primary" onPress={() => inputRef.current?.click()}>
        {label}
      </Button>
    </>
  );
}
