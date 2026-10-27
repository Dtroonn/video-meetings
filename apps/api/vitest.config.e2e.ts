import { tmpdir } from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      // Process env wins over `.env`, so files uploaded by tests stay out of the dev uploads folder.
      UPLOADS_DIR: path.join(tmpdir(), 'video-meetings-e2e-uploads'),
    },
  },
});
