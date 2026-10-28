import {
  UPLOAD_CHUNK_SIZE,
  type MeetingFileResponse,
  type MeetingFileUploadResponse,
  type StartMeetingFileUploadRequest,
} from '@video-meetings/contracts';
import { apiClient } from '@/shared/api';

const UPLOADS_PATH = '/meeting/files/uploads';

/**
 * Uploads a file to a meeting from the browser: starts an upload, sends the file in chunks of
 * `UPLOAD_CHUNK_SIZE` one after another (each a raw `application/octet-stream` body, so neither
 * app buffers the whole file), then completes it. `onProgress` gets the number of bytes sent so
 * far, updated while a chunk is in flight. Resolves to the completed file; rejects with the
 * `AxiosError` of the first failed request.
 */
export async function uploadMeetingFile(
  meetingId: string,
  file: File,
  onProgress: (loaded: number) => void,
): Promise<MeetingFileResponse> {
  const request: StartMeetingFileUploadRequest = {
    meetingId,
    name: file.name,
    type: file.type,
    size: file.size,
  };
  const { data: upload } = await apiClient.post<MeetingFileUploadResponse>(UPLOADS_PATH, request);

  let offset = upload.bytesReceived;
  while (offset < file.size) {
    const start = offset;
    const { data } = await apiClient.post<MeetingFileUploadResponse>(
      `${UPLOADS_PATH}/${upload.id}/chunks`,
      file.slice(start, start + UPLOAD_CHUNK_SIZE),
      {
        params: { offset: start },
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: ({ loaded }) => onProgress(start + loaded),
      },
    );
    offset = data.bytesReceived;
    onProgress(offset);
  }

  const { data: completed } = await apiClient.post<MeetingFileResponse>(
    `${UPLOADS_PATH}/${upload.id}/complete`,
  );
  return completed;
}
