import { MEETING_FILE_TYPES, type MeetingFileExtension } from '@video-meetings/contracts';

const ALLOWED_EXTENSIONS = Object.keys(MEETING_FILE_TYPES);

/** Matches a file name ending in an allowed extension, in any case. */
export const ALLOWED_FILE_NAME = new RegExp(`\\.(${ALLOWED_EXTENSIONS.join('|')})$`, 'i');

export const ALLOWED_FILE_TYPES_MESSAGE = `Allowed file types: ${ALLOWED_EXTENSIONS.join(', ')}`;

const isAllowedExtension = (extension: string): extension is MeetingFileExtension =>
  Object.hasOwn(MEETING_FILE_TYPES, extension);

/** The allowed extension a file name ends in (lowercased), if any. */
export const allowedExtensionOf = (name: string): MeetingFileExtension | undefined => {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return name.includes('.') && isAllowedExtension(extension) ? extension : undefined;
};

// Containers `file-type` reports for ISO media files; which one depends on the brand the
// recording app wrote, so any of them is fine for an mp4, mov or m4a.
const ISO_MEDIA = [
  'mp4',
  'm4v',
  'm4a',
  'm4b',
  'm4p',
  'mov',
  '3gp',
  '3g2',
  'f4v',
  'f4a',
  'f4b',
  'f4p',
];
const MATROSKA = ['mkv', 'webm'];
const OGG = ['ogg', 'oga', 'ogv', 'ogm', 'ogx', 'opus', 'spx'];
// Text formats `file-type` recognizes; any of them may be saved as `.txt` or `.md`.
const TEXT = ['xml', 'vtt', 'ics', 'vcf'];

/**
 * What `file-type` may detect in the content of a file with each extension. Office files are zip
 * archives, and some apps write them in a way that's only recognized as a zip.
 */
const DETECTED_TYPES: Record<MeetingFileExtension, readonly string[]> = {
  mp4: ISO_MEDIA,
  mov: ISO_MEDIA,
  m4a: ISO_MEDIA,
  webm: MATROSKA,
  mkv: MATROSKA,
  mp3: ['mp3', 'mp2', 'mp1'],
  wav: ['wav'],
  ogg: OGG,
  pdf: ['pdf'],
  docx: ['docx', 'zip'],
  xlsx: ['xlsx', 'zip'],
  pptx: ['pptx', 'zip'],
  txt: TEXT,
  md: TEXT,
  png: ['png', 'apng'],
  jpg: ['jpg'],
  jpeg: ['jpg'],
};

/**
 * Whether content in which `file-type` detected `detected` may be stored as `extension`. Content
 * it doesn't recognize passes: plain text has no signature, and some valid recordings aren't
 * detected either, so only content that is recognizably something else is refused.
 */
export const contentMatchesExtension = (
  extension: MeetingFileExtension,
  detected: string | undefined,
): boolean => detected === undefined || DETECTED_TYPES[extension].includes(detected);
