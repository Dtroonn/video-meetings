import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // tsup's dts build injects the deprecated `baseUrl` and can't use `incremental`.
  dts: { compilerOptions: { incremental: false, ignoreDeprecations: '6.0' } },
  clean: true,
  sourcemap: true,
});
