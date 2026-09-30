// @ts-check
import { nestConfig } from '@video-meetings/eslint-config/nest';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['eslint.config.mjs', 'src/generated/**']),
  ...nestConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
