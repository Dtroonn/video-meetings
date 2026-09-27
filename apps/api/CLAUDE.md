# @video-meetings/api

NestJS 12 backend. See the root `CLAUDE.md` for monorepo-wide commands and conventions.

## Commands (run in `apps/api`, or use `pnpm --filter @video-meetings/api <script>` from the root)

- `pnpm dev` — `nest start --watch`, listens on `PORT` or **3001** (3000 is the web app).
- `pnpm build` — type-checks, then compiles `src/` to `dist/` with SWC.
- `pnpm lint` — ESLint over `src/` and `test/` (type-aware rules).
- `pnpm check-types` — `tsc --noEmit`.
- `pnpm test` — unit tests (Vitest, `**/*.spec.ts`, config in `vitest.config.ts`).
- `pnpm test:e2e` — e2e tests (Vitest + supertest, `**/*.e2e-spec.ts`, config in `vitest.config.e2e.ts`).
- Generate code with the Nest CLI: `pnpm exec nest g <schematic> <name>` (e.g. `module`, `controller`, `service`, `resource`).

## Structure

- `src/main.ts` — bootstrap (top-level `await`).
- `src/app.module.ts` — root module; register feature modules here.
- `src/**/*.spec.ts` — unit tests next to the code they test.
- `test/*.e2e-spec.ts` — end-to-end tests.

## Things to know

- **Imports are extensionless** (`import { AppService } from './app.service'`). Never add `.js` — ESLint (`no-restricted-imports`) rejects it. The `@/*` alias maps to `src/*`.
- **Why that works:** this is an ESM package (`"type": "module"`, and Nest 12 itself is ESM-only), which at runtime needs full specifiers. TypeScript uses `moduleResolution: bundler` so it accepts extensionless imports, and the build uses the **SWC builder** (`nest-cli.json`: `builder: "swc"`, `typeCheck: true`), which rewrites them to `./app.service.js` in `dist/`. SWC only does this rewriting when `paths` is set in `tsconfig.json` — do not remove the `paths` entry. Always build/run through `nest build` / `nest start`, not plain `tsc`.
- **Tests use Vitest, not Jest.** Globals (`describe`, `it`, `expect`, `vi`) are enabled; use `vi.fn()` / `vi.spyOn()` for mocks.
- **Linting** comes from `@video-meetings/eslint-config/nest` (typescript-eslint `recommendedTypeChecked`). `no-floating-promises` is an error — await or explicitly `void` every promise. `no-explicit-any` is off.
- **TypeScript** config extends `@video-meetings/typescript-config/nestjs.json`: strict mode with `strictPropertyInitialization: false`, decorators and `emitDecoratorMetadata` enabled, `module: esnext` + `moduleResolution: bundler`.
