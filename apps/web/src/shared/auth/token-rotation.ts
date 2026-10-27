import type { TokensResponse } from '@video-meetings/contracts';
import { apiPost } from '../api';

/** How long the result of a rotation is reused for requests that still carry the old refresh token. */
const GRACE_WINDOW_MS = 30_000;

/** The outcome of a rotation: the new pair, or the api's HTTP status (`0` if it was unreachable). */
export type RotationResult = { ok: true; tokens: TokensResponse } | { ok: false; status: number };

interface Rotation {
  result: Promise<RotationResult>;
}

// Kept on globalThis, not in a module-level variable: proxy.ts and Route Handlers are bundled
// separately, so each would get its own copy of this module, but they run in one Node process.
// A Map in memory is enough because the app runs as a single instance.
const ROTATIONS = Symbol.for('video-meetings.token-rotations');
const store = globalThis as typeof globalThis & { [ROTATIONS]?: Map<string, Rotation> };
const rotations = (store[ROTATIONS] ??= new Map<string, Rotation>());

/**
 * Exchanges a refresh token for a new pair via `POST /auth/refresh`.
 *
 * The api accepts each refresh token once, so concurrent requests (several tabs, parallel
 * prefetches, a request already in flight) carrying the same old token would all but one get a
 * 401. Instead, the first caller starts the rotation and everyone presenting the same token
 * within the grace window gets its result.
 *
 * @returns the new pair, or the api's status code: 401 means the session is gone, `0` (api
 *   unreachable) and 5xx are server failures. A rejected token (4xx) is cached like a success,
 *   since retrying can't help; network and server errors aren't, so the next request retries.
 */
export function rotateTokens(refreshToken: string): Promise<RotationResult> {
  const existing = rotations.get(refreshToken);
  if (existing) {
    return existing.result;
  }

  const result = apiPost<TokensResponse>('/auth/refresh', { refreshToken }).then(
    (response): RotationResult => {
      if (response.ok) {
        return { ok: true, tokens: response.data };
      }
      if (response.status === 0 || response.status >= 500) {
        clearTimeout(timerId);
        rotations.delete(refreshToken);
      }
      return { ok: false, status: response.status };
    },
  );

  rotations.set(refreshToken, { result });
  const timerId = setTimeout(() => {
    rotations.delete(refreshToken);
  }, GRACE_WINDOW_MS);
  return result;
}
