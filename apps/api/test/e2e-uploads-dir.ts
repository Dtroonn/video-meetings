import { tmpdir } from 'node:os';
import path from 'node:path';

/** Where e2e tests store uploads, so they stay out of the dev uploads folder. */
export const E2E_UPLOADS_DIR = path.join(tmpdir(), 'video-meetings-e2e-uploads');
