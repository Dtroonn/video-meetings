import type { ReactNode } from 'react';
import { isSignedIn } from '@/shared/auth/server';

/**
 * Renders its children only for signed-out visitors. It reads the session cookie (runtime data),
 * so put it inside `<Suspense>` with a same-size skeleton: everything around it stays in the
 * static shell.
 */
export async function GuestOnly({ children }: { children: ReactNode }) {
  return (await isSignedIn()) ? null : children;
}
