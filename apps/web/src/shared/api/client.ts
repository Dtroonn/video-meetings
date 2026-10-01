/** A response from the api: its HTTP status and parsed JSON body (`null` if it had none). */
export interface ApiResponse {
  ok: boolean;
  status: number;
  body: unknown;
}

/** Sends a JSON request to the api through the `/api` proxy (see `next.config.ts`). */
export async function apiPost(path: string, data: unknown): Promise<ApiResponse> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: text ? (JSON.parse(text) as unknown) : null,
  };
}
