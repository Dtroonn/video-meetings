import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { E2E_UPLOADS_DIR } from './test/e2e-uploads-dir';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      // Process env wins over `.env`, so files uploaded by tests stay out of the dev uploads folder.
      UPLOADS_DIR: E2E_UPLOADS_DIR,
    },
  },
});
