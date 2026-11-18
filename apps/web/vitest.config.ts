import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Unit tests for plain modules (schemas, mappers); they run in Node, with no DOM.
export default defineConfig({
  // Resolves the `@/*` alias from tsconfig.json.
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
