# video-meetings

Turborepo monorepo (pnpm workspaces) for a video meetings product.

## Layout

- `apps/web` — Next.js 16 frontend (App Router). See `apps/web/CLAUDE.md`.
- `apps/api` — NestJS 12 backend. See `apps/api/CLAUDE.md`.
- `packages/eslint-config` — shared ESLint flat configs: `@video-meetings/eslint-config/{base,next,nest}`.
- `packages/typescript-config` — shared tsconfig presets: `base.json`, `nextjs.json`, `nestjs.json`.

## Commands (run from the repo root)

- `pnpm install` — install all workspaces. Always use pnpm, never npm/yarn.
- `pnpm dev` — run all apps in watch mode (web on :3000, api on :3001).
- `pnpm build` / `pnpm lint` / `pnpm check-types` / `pnpm test` — run via Turbo across all workspaces.
- `pnpm format` / `pnpm format:check` — Prettier for the whole repo.
- Scope to one app: `pnpm turbo run <task> --filter=@video-meetings/web` (or `pnpm --filter @video-meetings/api <script>`).
- Add a dependency to one app: `pnpm --filter @video-meetings/<app> add [-D] <pkg>`.

Before finishing a change, run `pnpm lint`, `pnpm check-types` and `pnpm format:check`.

## Conventions

- **Dependency versions:** write full caret versions (`"typescript": "^6.0.3"`), never bare majors like `^6`. Internal packages use `"workspace:*"`.
- **TypeScript:** both apps are on TypeScript 6 (`^6.0.3`). Do not move to 6.1+ or 7 until `typescript-eslint` supports it — its peer range is `<6.1.0`, mirrored in `packages/eslint-config`'s peer dependencies.
- **Shared config first:** lint and compiler settings belong in `packages/*` presets. App-level `eslint.config.mjs` / `tsconfig.json` should only extend a preset and add app-specific bits (paths, `tsconfigRootDir`, includes).
- **Strictness:** `strict` and `strictNullChecks` are on for everything via `base.json`. The Nest preset sets `strictPropertyInitialization: false` on purpose (DTOs/entities are populated by decorators).
- **Formatting:** Prettier is configured only at the root (`.prettierrc`: single quotes, trailing commas, width 100, LF). Don't add per-app Prettier configs; ESLint presets include `eslint-config-prettier` so there are no conflicting style rules.
- **New app or package:** put it in `apps/*` or `packages/*`, name it `@video-meetings/<name>`, add `lint` / `check-types` / `build` scripts so Turbo picks it up, and extend the shared presets.
