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
