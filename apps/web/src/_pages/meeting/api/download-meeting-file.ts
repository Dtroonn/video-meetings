import { apiClient } from '@/shared/api';

/**
 * Where the browser downloads a meeting file: the api's download endpoint through the same-origin
 * `/api` rewrite. The api checks membership on every request and answers with an attachment, so
 * a plain link (with the `download` attribute) saves the file without loading it into memory.
 */
export const meetingFileDownloadUrl = (id: string) =>
  `/api/meeting/files/${encodeURIComponent(id)}/download`;

/**
 * Makes sure the session cookie is fresh before the browser follows a download link: a plain
 * link skips `apiClient`, so an expired access token would download a 401 instead of the file.
 * One cheap authenticated request goes through `apiClient`, which refreshes the session on a 401
 * (or redirects to login when it's over). Never rejects: if it fails for another reason, the
 * download is still tried.
 */
export async function refreshSessionForDownload(): Promise<void> {
  try {
    await apiClient.get('/users/me');
  } catch {
    // The download itself reports what's wrong.
  }
}
