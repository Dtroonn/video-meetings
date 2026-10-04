'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { UserStoreContext, createUserStore } from '../model/user-store';

/**
 * Loads the signed-in user once mounted and shares it with every Client Component below through
 * `useUserStore`. Until it arrives, `user` is `null`: render a skeleton in its place.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createUserStore);

  useEffect(() => {
    // Aborted on unmount (and on Strict Mode's extra mount in dev), so a stale response can't
    // overwrite a newer one.
    const controller = new AbortController();
    store.getState().load(controller.signal);
    return () => controller.abort();
  }, [store]);

  return <UserStoreContext value={store}>{children}</UserStoreContext>;
}
