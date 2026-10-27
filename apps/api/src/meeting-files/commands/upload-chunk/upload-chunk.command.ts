import type { Readable } from 'node:stream';
import { Command } from '@nestjs/cqrs';
import type { MeetingFileUpload } from '../../meeting-files.types';

/**
 * Appends a chunk to the user's own pending upload, streaming `body` to disk.
 *
 * @throws NotFoundException if the upload isn't the user's or they can't see its meeting.
 * @throws ConflictException if `offset` isn't the upload's `bytesReceived`, the upload is already
 *   complete, or another request for it is running.
 * @throws BadRequestException if the chunk goes past the file's declared size.
 */
export class UploadChunkCommand extends Command<MeetingFileUpload> {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly offset: number,
    /** The chunk's size in bytes, from `Content-Length`. */
    public readonly length: number,
    public readonly body: Readable,
  ) {
    super();
  }
}
