import {
  MEETING_FILE_MAX_SIZE,
  MEETING_FILE_TYPES,
  type MeetingFileExtension,
} from '@video-meetings/contracts';
import type { Locale } from '@/shared/i18n';

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/**
 * A file size in the largest fitting unit, in the locale's words: `('en', 1572864)` → `1.5 MB`,
 * `('ru', 1572864)` → `1,5 МБ`. Units are steps of 1024, like `UPLOAD_CHUNK_SIZE`.
 */
export function formatFileSize(bytes: number, locale: Locale): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

/**
 * What to show as a file's type: its extension in capitals (`report.PDF` → `PDF`), since browsers
 * report unreliable MIME types for some files; the MIME type when there's no extension.
 */
export function fileTypeLabel(name: string, type: string): string {
  const dot = name.lastIndexOf('.');
  if (dot > 0 && dot < name.length - 1) {
    return name.slice(dot + 1).toUpperCase();
  }
  return type;
}

/** Why a selected file isn't uploaded: its type isn't allowed, or it's over the size limit. */
export type FileRejection = 'type' | 'size';

/** The allowed extensions in capitals, as shown to users: `MP4, WEBM, …`. */
export const ALLOWED_FILE_TYPES_LABEL = Object.keys(MEETING_FILE_TYPES)
  .map((extension) => extension.toUpperCase())
  .join(', ');

/** The file input's `accept`: the allowed extensions, so the picker offers only those by default. */
export const FILE_INPUT_ACCEPT = Object.keys(MEETING_FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(',');

const isAllowedExtension = (extension: string): extension is MeetingFileExtension =>
  Object.hasOwn(MEETING_FILE_TYPES, extension);

/**
 * Checks a selected file against the limits from `@video-meetings/contracts`, the same rules the
 * api enforces when an upload starts: an allowed extension (in any case) and at most
 * `MEETING_FILE_MAX_SIZE` bytes. Returns why it's rejected, or `null` if it may be uploaded.
 */
export function checkMeetingFile({
  name,
  size,
}: Pick<File, 'name' | 'size'>): FileRejection | null {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  if (!name.includes('.') || !isAllowedExtension(extension)) {
    return 'type';
  }
  return size > MEETING_FILE_MAX_SIZE ? 'size' : null;
}
