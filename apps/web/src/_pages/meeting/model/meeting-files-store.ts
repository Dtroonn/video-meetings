// A client module: `createContext` doesn't exist in the Server Component environment.
'use client';

import type { MeetingFileResponse } from '@video-meetings/contracts';
import { AxiosError } from 'axios';
import { createContext, use } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { deleteMeetingFile } from '../api/delete-meeting-file';
import { uploadMeetingFile } from '../api/upload-meeting-file';
import { checkMeetingFile, type FileRejection } from './meeting-file';

/** How many files upload at the same time; the rest wait in the queue. */
export const MAX_PARALLEL_UPLOADS = 3;

/**
 * Why an upload is in the `error` state: the upload failed, or the file was rejected in the
 * browser before uploading (see `checkMeetingFile`).
 */
export type UploadError = 'failed' | FileRejection;

/** A file the user selected that hasn't finished uploading. A finished one moves to `files`. */
export interface Upload {
  /** Local id, for React keys and actions. */
  readonly key: string;
  readonly name: string;
  readonly size: number;
  /** Bytes sent so far. */
  readonly loaded: number;
  readonly status: 'queued' | 'uploading' | 'error';
  /** Set when `status` is `error`. */
  readonly error?: UploadError;
}

export interface MeetingFilesState {
  /** The meeting's completed files, newest first. */
  files: MeetingFileResponse[];
  /** Selected files still uploading, waiting or failed, in the order they were selected. */
  uploads: Upload[];
  /**
   * Queues the files for upload; up to `MAX_PARALLEL_UPLOADS` run at once. Files of a type that
   * isn't allowed or over the size limit are added as errors right away and never uploaded.
   */
  addFiles: (files: Iterable<File>) => void;
  /** Removes a failed or rejected upload from `uploads`. */
  dismiss: (key: string) => void;
  /**
   * Deletes a file for everyone and removes it from `files`; a file that's already gone (404) is
   * removed too. Rejects with the request's `AxiosError` otherwise (e.g. 403).
   */
  deleteFile: (id: string) => Promise<void>;
}

/**
 * One store per `MeetingFilesProvider`, i.e. per meeting page, starting with the files the server
 * read. A module-level store would be shared by every request rendered on the server.
 */
export const createMeetingFilesStore = (meetingId: string, initialFiles: MeetingFileResponse[]) =>
  createStore<MeetingFilesState>()((set, get) => {
    /** The selected `File`s of queued and running uploads, by `Upload.key`. */
    const sources = new Map<string, File>();

    const update = (key: string, patch: Partial<Upload>) =>
      set((state) => ({
        uploads: state.uploads.map((upload) =>
          upload.key === key ? { ...upload, ...patch } : upload,
        ),
      }));

    /** Starts queued uploads until `MAX_PARALLEL_UPLOADS` are running. */
    const startQueued = () => {
      let running = get().uploads.filter(({ status }) => status === 'uploading').length;
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
      update(key, { status: 'uploading' });
      uploadMeetingFile(meetingId, file, (loaded) => update(key, { loaded }))
        .then((uploaded) => {
          set((state) => ({
            // Newest first, like the api's list.
            files: [uploaded, ...state.files],
            uploads: state.uploads.filter((upload) => upload.key !== key),
          }));
        })
        .catch(() => update(key, { status: 'error', error: 'failed' }))
        .finally(() => {
          sources.delete(key);
          startQueued();
        });
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
      dismiss: (key) =>
        set((state) => ({ uploads: state.uploads.filter((upload) => upload.key !== key) })),
      deleteFile: async (id) => {
        try {
          await deleteMeetingFile(id);
        } catch (error) {
          // Someone else already deleted it: the goal is reached all the same.
          if (!(error instanceof AxiosError && error.response?.status === 404)) {
            throw error;
          }
        }
        set((state) => ({ files: state.files.filter((file) => file.id !== id) }));
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
