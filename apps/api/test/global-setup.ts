import { rm } from 'node:fs/promises';
import { E2E_UPLOADS_DIR } from './e2e-uploads-dir';

/**
 * Deletes the e2e uploads folder once every test file has finished. Test files run in parallel
 * and share the folder, so none of them may delete it itself.
 */
export default function setup() {
  return async () => {
    await rm(E2E_UPLOADS_DIR, { recursive: true, force: true });
  };
}
