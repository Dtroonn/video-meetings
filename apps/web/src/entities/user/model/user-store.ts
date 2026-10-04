// A client module: `createContext` doesn't exist in the Server Component environment, and Server
// Components reach this file through the slice's index (when they render `UserProvider`).
'use client';

import type { UserResponse } from '@video-meetings/contracts';
import { createContext, use } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { fetchCurrentUser } from '../api/fetch-current-user';

export interface UserState {
  /** The signed-in user; `null` until it's loaded (show a skeleton) or when loading failed. */
  user: UserResponse | null;
  status: 'loading' | 'ready' | 'error';
  /**
   * (Re)loads the user; an aborted load leaves the state alone. Never rejects: a failure ends up
   * in `status`, so callers can fire it without awaiting or catching.
   */
  load: (signal?: AbortSignal) => Promise<void>;
}

/**
 * One store per `UserProvider`, not a module-level `create()`: a module-level store would live in
 * the server process too and be shared by every request rendered there.
 */
export const createUserStore = () =>
  createStore<UserState>()((set) => ({
    user: null,
    status: 'loading',
    load: async (signal) => {
      set({ status: 'loading' });
      try {
        const user = await fetchCurrentUser(signal);
        set({ user, status: 'ready' });
      } catch {
        if (signal?.aborted) return;
        set({ user: null, status: 'error' });
      }
    },
  }));

export const UserStoreContext = createContext<StoreApi<UserState> | null>(null);

/**
 * Reads the signed-in user's state from the nearest `UserProvider`, e.g.
 * `useUserStore((state) => state.user)`. Re-renders only when the selected value changes.
 */
export function useUserStore<T>(selector: (state: UserState) => T): T {
  const store = use(UserStoreContext);
  if (!store) {
    throw new Error('useUserStore must be used inside <UserProvider>');
  }
  return useStore(store, selector);
}
