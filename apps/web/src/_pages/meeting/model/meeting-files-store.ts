// A client module: `createContext` doesn't exist in the Server Component environment.
'use client';

import type { MeetingFileResponse } from '@video-meetings/contracts';
import { AxiosError, isCancel } from 'axios';
import { createContext, use } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { cancelMeetingFileUpload } from '../api/cancel-meeting-file-upload';
import { deleteMeetingFile } from '../api/delete-meeting-file';
import { uploadMeetingFile } from '../api/upload-meeting-file';
import { checkMeetingFile, type FileRejection } from './meeting-file';

/** How many files upload at the same time; the rest wait in the queue. */
export const MAX_PARALLEL_UPLOADS = 3;

/**
 * Why an upload is in the `error` state: the upload failed, the file was rejected in the browser
 * before uploading (see `checkMeetingFile`), or a cancel came too late to stop the file from
 * being added and deleting it failed.
 */
export type UploadError = 'failed' | 'cancelFailed' | FileRejection;

/** A file the user selected that hasn't finished uploading. A finished one moves to `files`. */
export interface Upload {
  /** Local id, for React keys and actions. */
  readonly key: string;
  readonly name: string;
  readonly size: number;
  /** Bytes stored or in flight so far. */
  readonly loaded: number;
  /** `paused`: the connection dropped; it continues from the stored bytes when it's back. */
  readonly status: 'queued' | 'uploading' | 'paused' | 'error';
  /** It continued from bytes stored earlier: after a reload or a dropped connection. */
  readonly resumed?: boolean;
  /** Set when `status` is `error`. */
  readonly error?: UploadError;
}

/** Whether an upload still has work to do, i.e. leaving the page would interrupt it. */
export const isUploadActive = ({ status }: Upload) => status !== 'error';

export interface MeetingFilesState {
  /** The meeting's completed files, newest first. */
  files: MeetingFileResponse[];
  /** Selected files still uploading, waiting or failed, in the order they were selected. */
  uploads: Upload[];
  /**
   * Queues the files for upload; up to `MAX_PARALLEL_UPLOADS` run at once. Files of a type that
   * isn't allowed or over the size limit are added as errors right away and never uploaded.
   * A file with a pending upload on this meeting (e.g. from before a reload) continues from there.
   */
  addFiles: (files: Iterable<File>) => void;
  /**
   * Cancels a queued, running or paused upload: stops it, removes it from `uploads` and has the
   * api delete what it stored, so the file is never listed. Never rejects.
   */
  cancel: (key: string) => void;
  /** Removes a failed or rejected upload from `uploads`. */
  dismiss: (key: string) => void;
  /**
   * Deletes a file for everyone and removes it from `files`; a file that's already gone (404) is
   * removed too. Rejects with the request's `AxiosError` otherwise (e.g. 403).
   */
  deleteFile: (id: string) => Promise<void>;
  /**
   * Stops every running upload without cancelling it on the api, for when the page goes away:
   * selecting the same file again within 24 hours continues it.
   */
  dispose: () => void;
}

const isStatus = (error: unknown, status: number) =>
  error instanceof AxiosError && error.response?.status === status;

/**
 * One store per `MeetingFilesProvider`, i.e. per meeting page, starting with the files the server
 * read. A module-level store would be shared by every request rendered on the server.
 */
export const createMeetingFilesStore = (meetingId: string, initialFiles: MeetingFileResponse[]) =>
  createStore<MeetingFilesState>()((set, get) => {
    /** The selected `File`s of queued and running uploads, by `Upload.key`. */
    const sources = new Map<string, File>();
    /** Aborts the requests of running uploads, by `Upload.key`. */
    const controllers = new Map<string, AbortController>();
    /** The api's upload id of running uploads once started, for cancelling, by `Upload.key`. */
    const uploadIds = new Map<string, string>();

    const update = (key: string, patch: Partial<Upload>) =>
      set((state) => ({
        uploads: state.uploads.map((upload) =>
          upload.key === key ? { ...upload, ...patch } : upload,
        ),
      }));

    const remove = (key: string) =>
      set((state) => ({ uploads: state.uploads.filter((upload) => upload.key !== key) }));

    /** Starts queued uploads until `MAX_PARALLEL_UPLOADS` are running. */
    const startQueued = () => {
      let running = get().uploads.filter(({ key }) => controllers.has(key)).length;
      for (const { key, status } of get().uploads) {
        if (running >= MAX_PARALLEL_UPLOADS) break;
        const file = sources.get(key);
        if (status !== 'queued' || !file) continue;
        running += 1;
        run(key, file);
      }
    };

    /** Uploads one file. Never rejects: a failure ends up in the upload's `status`. */
    const run = (key: string, file: File) => {
      const controller = new AbortController();
      controllers.set(key, controller);
      update(key, { status: 'uploading' });
      uploadMeetingFile(meetingId, file, {
        signal: controller.signal,
        onStart: ({ id, bytesReceived }) => {
          uploadIds.set(key, id);
          update(key, { status: 'uploading', loaded: bytesReceived, resumed: bytesReceived > 0 });
        },
        onProgress: (loaded) => update(key, { loaded }),
        onPause: () => update(key, { status: 'paused' }),
      })
        .then((uploaded) => {
          // Cancelled while the completion was in flight: `cancel` deletes it on the api.
          if (controller.signal.aborted) return;
          set((state) => ({
            // Newest first, like the api's list.
            files: [uploaded, ...state.files],
            uploads: state.uploads.filter((upload) => upload.key !== key),
          }));
        })
        .catch((error: unknown) => {
          // Cancelled or disposed: nothing to show.
          if (isCancel(error)) return;
          update(key, { status: 'error', error: 'failed' });
        })
        .finally(() => {
          sources.delete(key);
          controllers.delete(key);
          uploadIds.delete(key);
          startQueued();
        });
    };

    /**
     * Has the api delete an upload the user cancelled. Never rejects. If it failed for any other
     * reason than the upload being complete, it's still pending, which no one else sees, and the
     * api discards it after 24 hours.
     */
    const discard = async (id: string, name: string, size: number) => {
      try {
        await cancelMeetingFileUpload(id);
      } catch (error) {
        if (!isStatus(error, 409)) return;
        // It was completed before the cancel arrived: delete the file instead.
        try {
          await get().deleteFile(id);
        } catch {
          set((state) => ({
            uploads: [
              ...state.uploads,
              {
                key: crypto.randomUUID(),
                name,
                size,
                loaded: size,
                status: 'error',
                error: 'cancelFailed',
              },
            ],
          }));
        }
      }
    };

    return {
      files: initialFiles,
      uploads: [],
      addFiles: (files) => {
        const added = Array.from(files, (file): Upload => {
          const key = crypto.randomUUID();
          const upload = { key, name: file.name, size: file.size, loaded: 0 };
          const rejection = checkMeetingFile(file);
          if (rejection) {
            return { ...upload, status: 'error', error: rejection };
          }
          sources.set(key, file);
          return { ...upload, status: 'queued' };
        });
        set((state) => ({ uploads: [...state.uploads, ...added] }));
        startQueued();
      },
      cancel: (key) => {
        const upload = get().uploads.find((item) => item.key === key);
        if (!upload) return;
        const id = uploadIds.get(key);
        controllers.get(key)?.abort();
        sources.delete(key);
        remove(key);
        // A start still in flight leaves a pending upload no one sees, discarded after 24 hours.
        if (id) {
          discard(id, upload.name, upload.size).catch(() => undefined);
        }
        startQueued();
      },
      dismiss: remove,
      deleteFile: async (id) => {
        try {
          await deleteMeetingFile(id);
        } catch (error) {
          // Someone else already deleted it: the goal is reached all the same.
          if (!isStatus(error, 404)) {
            throw error;
          }
        }
        set((state) => ({ files: state.files.filter((file) => file.id !== id) }));
      },
      dispose: () => {
        sources.clear();
        for (const controller of controllers.values()) controller.abort();
      },
    };
  });

export const MeetingFilesStoreContext = createContext<StoreApi<MeetingFilesState> | null>(null);

/** Reads the nearest `MeetingFilesProvider`'s state, e.g. `useMeetingFilesStore((s) => s.files)`. */
export function useMeetingFilesStore<T>(selector: (state: MeetingFilesState) => T): T {
  const store = use(MeetingFilesStoreContext);
  if (!store) {
    throw new Error('useMeetingFilesStore must be used inside <MeetingFilesProvider>');
  }
  return useStore(store, selector);
}
