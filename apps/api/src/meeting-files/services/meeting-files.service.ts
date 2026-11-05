import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { type MeetingFile, MeetingFileStatus } from '@/generated/prisma/client';
import { GetMeetingByIdQuery } from '@/meetings/queries/get-meeting-by-id/get-meeting-by-id.query';
import type { MeetingDetails } from '@/meetings/meetings.types';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { GetUsersByIdsQuery } from '@/users/queries/get-users-by-ids/get-users-by-ids.query';
import { toMeetingFileDetails } from '../meeting-files.mapper';
import type { MeetingFileDetails } from '../meeting-files.types';

/** Helpers shared by the meeting files handlers. */
@Injectable()
export class MeetingFilesService {
  /** Uploads a request is working on right now, each with a promise that settles when it's done. */
  private readonly busy = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Runs `fn` while holding the upload's lock, so chunks and completion of one upload never overlap
   * and two writes can't interleave in its temporary file. The lock is per process, which is
   * enough because files live on the local disk of a single api instance.
   *
   * @throws ConflictException if another request for the upload is still running.
   */
  async exclusive<T>(id: string, fn: () => Promise<T>): Promise<T> {
    if (this.busy.has(id)) {
      throw new ConflictException('Another request for this upload is in progress');
    }
    const running = fn();
    this.busy.set(id, running);
    try {
      return await running;
    } finally {
      this.busy.delete(id);
    }
  }

  /**
   * Like `exclusive`, but waits for the request holding the lock to finish instead of failing.
   * For cancelling: a chunk still being received when the client gave up ends as soon as its
   * connection closes.
   */
  async afterCurrent<T>(id: string, fn: () => Promise<T>): Promise<T> {
    for (let current = this.busy.get(id); current; current = this.busy.get(id)) {
      // Only waiting for it to end; its own request reports how it failed.
      await current.catch(() => undefined);
    }
    return this.exclusive(id, fn);
  }

  /**
   * Deletes a pending upload's record and then its temporary file, once no request is working on
   * it. Only uploads still pending (and, with `updatedBefore`, not touched since) are deleted, so
   * one that was completed or received a chunk in the meantime stays.
   *
   * @returns whether the upload was deleted.
   */
  discardUpload(id: string, { updatedBefore }: { updatedBefore?: Date } = {}): Promise<boolean> {
    return this.afterCurrent(id, async () => {
      const { count } = await this.prisma.meetingFile.deleteMany({
        where: {
          id,
          status: MeetingFileStatus.PENDING,
          ...(updatedBefore && { updatedAt: { lt: updatedBefore } }),
        },
      });
      if (count > 0) {
        await this.storage.removeTemp(id);
      }
      return count > 0;
    });
  }

  /**
   * An upload started by the user, while they're still a member of its meeting.
   *
   * @throws NotFoundException if there's no such upload, it belongs to someone else or the user
   *   can't see its meeting (the same error, so upload ids can't be probed).
   */
  async findOwnUpload(id: string, userId: string): Promise<MeetingFile> {
    const file = await this.prisma.meetingFile.findFirst({ where: { id, uploaderId: userId } });
    if (!file) {
      throw new NotFoundException('Upload not found');
    }
    await this.queryBus.execute(new GetMeetingByIdQuery(file.meetingId, userId));
    return file;
  }

  /**
   * A completed file of a meeting the user can see (as its owner or a participant, whoever
   * uploaded it), with that meeting.
   *
   * @throws NotFoundException if there's no such completed file or the user can't see its meeting
   *   (the same error, so file ids can't be probed).
   */
  async findVisibleFile(
    id: string,
    userId: string,
  ): Promise<{ file: MeetingFile & { storageKey: string }; meeting: MeetingDetails }> {
    const file = await this.prisma.meetingFile.findFirst({
      where: { id, status: MeetingFileStatus.COMPLETED },
    });
    if (!file?.storageKey) {
      throw new NotFoundException('File not found');
    }
    try {
      const meeting = await this.queryBus.execute(new GetMeetingByIdQuery(file.meetingId, userId));
      return { file: { ...file, storageKey: file.storageKey }, meeting };
    } catch (error) {
      throw error instanceof NotFoundException ? new NotFoundException('File not found') : error;
    }
  }

  /** Completed files with their uploaders' emails, in the given order. */
  async withUploaders(files: MeetingFile[]): Promise<MeetingFileDetails[]> {
    const users = await this.queryBus.execute(
      new GetUsersByIdsQuery(files.map(({ uploaderId }) => uploaderId)),
    );
    const usersById = new Map(users.map((user) => [user.id, user]));
    return files.map((file) => {
      // Deleting a user who uploaded files is restricted by the foreign key, so this can't miss.
      const uploader = usersById.get(file.uploaderId);
      if (!uploader) {
        throw new Error(`Uploader ${file.uploaderId} of meeting file ${file.id} not found`);
      }
      return toMeetingFileDetails(file, uploader);
    });
  }
}
