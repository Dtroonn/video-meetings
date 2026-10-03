import type { ApiErrorResponse } from '@video-meetings/contracts';
import { API_URL } from '../config';

/** A response from the api: the parsed body on success, the error body otherwise. */
export type ApiResponse<T> =
  { ok: true; status: number; data: T } | { ok: false; status: number; error: ApiErrorResponse };

/**
 * Sends a JSON `POST` straight to the api. Server-side only (Server Functions, Route Handlers,
 * proxy): it uses the absolute `API_URL`, not the browser's `/api` rewrite. A network failure
 * resolves to `{ ok: false, status: 0 }` instead of throwing.
 */
export async function apiPost<T>(path: string, data: unknown): Promise<ApiResponse<T>> {
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    body = await response.json();
  } catch {
    return { ok: false, status: 0, error: { statusCode: 0, message: 'The api is unreachable' } };
  }

  if (response.ok) {
    return { ok: true, status: response.status, data: body as T };
  }
  return {
    ok: false,
    status: response.status,
    error: (body as ApiErrorResponse | null) ?? {
      statusCode: response.status,
      message: response.statusText,
    },
  };
}
