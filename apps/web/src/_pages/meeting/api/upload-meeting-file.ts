import {
  UPLOAD_CHUNK_SIZE,
  type MeetingFileResponse,
  type MeetingFileUploadResponse,
  type StartMeetingFileUploadRequest,
} from '@video-meetings/contracts';
import { AxiosError, isCancel } from 'axios';
import { apiClient } from '@/shared/api';

const UPLOADS_PATH = '/meeting/files/uploads';

/** Longest wait between two attempts to reach the api again while the connection is down. */
const MAX_RETRY_DELAY = 15_000;

/**
 * How many 409s in a row an upload survives. A 409 means the api's state moved on without us
 * (a chunk whose response was lost, or one still being received after its connection dropped),
 * which a fresh start sorts out; one that keeps coming back is a real error.
 */
const MAX_CONFLICTS = 5;

export interface UploadCallbacks {
  /** Aborting it stops the upload; the promise then rejects with axios's `CanceledError`. */
  signal: AbortSignal;
  /**
   * Called on every (re)start with the api's upload: its `id`, and its `bytesReceived`, where
   * sending continues. More than 0 means it resumed bytes stored earlier (e.g. before a reload).
   */
  onStart: (upload: MeetingFileUploadResponse) => void;
  /** The number of bytes stored or in flight so far, updated while a chunk is being sent. */
  onProgress: (loaded: number) => void;
  /** The api can't be reached; the upload waits and continues once it can. */
  onPause: () => void;
}

/**
 * Uploads a file to a meeting from the browser: starts an upload, sends the file in chunks of
 * `UPLOAD_CHUNK_SIZE` one after another (each a raw `application/octet-stream` body, so neither
 * app buffers the whole file), then completes it. Resolves to the completed file.
 *
 * Resumable: starting returns the user's pending upload of the same file (name, size and
 * last-modified time) with the bytes the api already has, so after a reload the upload continues
 * where it stopped. When the connection drops it pauses (`onPause`), waits until the api can be
 * reached and starts again, which tells it where to continue. Rejects with the `AxiosError` of a
 * request that failed otherwise, or with `CanceledError` when `signal` is aborted.
 */
export async function uploadMeetingFile(
  meetingId: string,
  file: File,
  { signal, onStart, onProgress, onPause }: UploadCallbacks,
): Promise<MeetingFileResponse> {
  const request: StartMeetingFileUploadRequest = {
    meetingId,
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
  };
  /** Set once every byte is stored: from then on only the completion is retried. */
  let complete: string | undefined;
  let retries = 0;
  let conflicts = 0;

  for (;;) {
    try {
      if (!complete) {
        const { data: upload } = await apiClient.post<MeetingFileUploadResponse>(
          UPLOADS_PATH,
          request,
          { signal },
        );
        onStart(upload);
        await sendChunks(upload, file, signal, (loaded) => {
          // Progress means the connection is back.
          retries = 0;
          onProgress(loaded);
        });
        // Not before: a completion retried after a lost response returns the same file, while
        // a new start would begin a second upload of it.
        complete = upload.id;
      }
      const { data: completed } = await apiClient.post<MeetingFileResponse>(
        `${UPLOADS_PATH}/${complete}/complete`,
        undefined,
        { signal },
      );
      return completed;
    } catch (error) {
      if (isCancel(error)) throw error;
      if (isConnectionError(error)) {
        onPause();
        await waitForConnection(retries, signal);
        retries += 1;
      } else if (error instanceof AxiosError && error.response?.status === 409) {
        conflicts += 1;
        if (conflicts > MAX_CONFLICTS) throw error;
        await delay(1000, signal);
      } else {
        throw error;
      }
    }
  }
}

async function sendChunks(
  upload: MeetingFileUploadResponse,
  file: File,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<void> {
  let offset = upload.bytesReceived;
  onProgress(offset);
  while (offset < file.size) {
    const start = offset;
    const { data } = await apiClient.post<MeetingFileUploadResponse>(
      `${UPLOADS_PATH}/${upload.id}/chunks`,
      file.slice(start, start + UPLOAD_CHUNK_SIZE),
      {
        params: { offset: start },
        headers: { 'Content-Type': 'application/octet-stream' },
        signal,
        onUploadProgress: ({ loaded }) => onProgress(start + loaded),
      },
    );
    offset = data.bytesReceived;
    onProgress(offset);
  }
}

/**
 * Whether a request failed for lack of a connection rather than because the api refused it: no
 * response at all, or a gateway error from the proxy in front of the api (`next dev`'s rewrite or
 * nginx) while the api is down.
 */
function isConnectionError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) return false;
  const status = error.response?.status;
  return status === undefined || status === 502 || status === 503 || status === 504;
}

/**
 * Waits before trying to reach the api again: while the browser reports being offline until it
 * comes back online, else (or if that event never comes) with a delay doubling from 1 s up to
 * `MAX_RETRY_DELAY`. Rejects with `CanceledError` when `signal` is aborted.
 */
function waitForConnection(attempt: number, signal: AbortSignal): Promise<void> {
  const wait = navigator.onLine ? Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY) : MAX_RETRY_DELAY;
  return delay(wait, signal, 'online');
}

/** Resolves after `ms`, or earlier on `wakeOn` (a window event); rejects when `signal` aborts. */
function delay(ms: number, signal: AbortSignal, wakeOn?: keyof WindowEventMap): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanUp = () => {
      clearTimeout(timer);
      if (wakeOn) window.removeEventListener(wakeOn, done);
      signal.removeEventListener('abort', abort);
    };
    const done = () => {
      cleanUp();
      resolve();
    };
    const abort = () => {
      cleanUp();
      // The same error axios throws for an aborted request, so callers check one thing.
      reject(new AxiosError('canceled', AxiosError.ERR_CANCELED));
    };
    const timer = setTimeout(done, ms);
    if (wakeOn) window.addEventListener(wakeOn, done);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort);
  });
}
