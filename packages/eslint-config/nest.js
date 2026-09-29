import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { baseConfig } from './base.js';

/**
 * Shared config for NestJS backends. Uses type-aware linting, so the consuming
 * app must set `languageOptions.parserOptions.tsconfigRootDir`.
 */
export const nestConfig = defineConfig([
  ...baseConfig,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Relative imports are extensionless; the SWC build adds `.js` for Node ESM.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.{1,2}/.*\\.js$',
              message: "Omit the file extension, e.g. './app.service'.",
            },
          ],
        },
      ],
    },
  },
  prettier,
]);

export default nestConfig;
