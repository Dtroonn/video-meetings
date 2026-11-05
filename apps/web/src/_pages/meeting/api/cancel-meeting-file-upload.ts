import { apiClient } from '@/shared/api';

/**
 * Cancels the user's own pending upload from the browser (`DELETE /meeting/files/uploads/:id`):
 * the api deletes it with its partial data. An upload that was completed meanwhile gets a 409
 * (delete the file instead). Rejects with the `AxiosError` of the request.
 */
export async function cancelMeetingFileUpload(id: string): Promise<void> {
  await apiClient.delete(`/meeting/files/uploads/${encodeURIComponent(id)}`);
}
