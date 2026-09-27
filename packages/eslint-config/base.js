import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Shared base config for every TypeScript package in the monorepo.
 * Prettier handles formatting, so conflicting stylistic rules are disabled.
 */
export const baseConfig = defineConfig([
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.turbo/**']),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
]);

export default baseConfig;
