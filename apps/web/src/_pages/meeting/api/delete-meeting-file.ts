import { apiClient } from '@/shared/api';

/**
 * Deletes a completed meeting file from the browser (`DELETE /meeting/files/:id`). The api allows
 * the meeting's owner to delete any file and a participant only their own (403 otherwise).
 * Rejects with the `AxiosError` of the request.
 */
export async function deleteMeetingFile(id: string): Promise<void> {
  await apiClient.delete(`/meeting/files/${encodeURIComponent(id)}`);
}
