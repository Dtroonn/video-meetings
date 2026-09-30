# video-meetings

Turborepo monorepo (pnpm workspaces) for a video meetings product.

## Layout

- `apps/web` — Next.js 16 frontend (App Router). See `apps/web/CLAUDE.md`.
- `apps/api` — NestJS 12 backend. See `apps/api/CLAUDE.md`.
- `packages/eslint-config` — shared ESLint flat configs: `@video-meetings/eslint-config/{base,next,nest}`.
- `packages/typescript-config` — shared tsconfig presets: `base.json`, `nextjs.json`, `nestjs.json`.
- `compose.yaml` — local dev services (Docker Compose): PostgreSQL 18 (`postgres:18-alpine`).

## Commands (run from the repo root)

- `pnpm install` — install all workspaces. Always use pnpm, never npm/yarn.
- `pnpm dev` — run all apps in watch mode (web on :3000, api on :3001).
- `pnpm build` / `pnpm lint` / `pnpm check-types` / `pnpm test` — run via Turbo across all workspaces.
- `pnpm format` / `pnpm format:check` — Prettier for the whole repo.
- Scope to one app: `pnpm turbo run <task> --filter=@video-meetings/web` (or `pnpm --filter @video-meetings/api <script>`).
- Add a dependency to one app: `pnpm --filter @video-meetings/<app> add [-D] <pkg>`.
- `pnpm db:up` / `pnpm db:down` / `pnpm db:logs` — start (waits until healthy), stop, tail logs of the local Postgres. `docker compose down -v` also wipes the data volume.

## Local database

- Postgres runs in Docker via the root `compose.yaml`; defaults are user `postgres`, password `postgres`, database `video_meetings`, host port **5432**.
- Override them in a root `.env` (template: `.env.example`) — e.g. set `POSTGRES_PORT=5433` if 5432 is already used by another Postgres. Keep `DATABASE_URL` in `apps/api/.env` (template: `apps/api/.env.example`) in sync with those values.
- The data volume is mounted at `/var/lib/postgresql`, not `/var/lib/postgresql/data`: Postgres 18+ images store data in a per-major-version subdirectory, and mounting the old path breaks them.
- `.env*` files are gitignored except `.env.example`; never commit real credentials.

Before finishing a change, run `pnpm lint`, `pnpm check-types` and `pnpm format:check`.

## Keeping docs in sync

The `CLAUDE.md` files are the source of truth for how the project is put together. When a change alters the architecture, update the matching docs in the same change, not in a later one.

- **What counts:** adding, removing or renaming an app/package, a top-level folder or a key entry file (`main.ts`, `app.module.ts`, `src/app/`); changing ports, scripts, build tooling, test runner, module system or import aliases; adding or replacing a major library or framework (ORM, auth, state management, UI kit, realtime/WebRTC layer); changing a shared preset or a convention listed here.
- **Where to write it:**
  - Monorepo-wide (layout, root commands, cross-app conventions) → this file.
  - App-specific (commands, structure, gotchas) → `apps/<app>/CLAUDE.md`.
  - New app or package → give it its own `CLAUDE.md` in the same shape (commands, structure, things to know) and add it to **Layout** above.
- **How to write it:** describe the current state, not the history of the change. Update or delete statements that are no longer true instead of appending to them. Record the _why_ for non-obvious decisions (like the SWC/`paths` note in `apps/api/CLAUDE.md`) so they aren't undone later.
- **Check before finishing:** make sure the commands, paths, ports and versions named in the docs still match `package.json`, config files and the actual folder layout.
- Don't edit `apps/web/AGENTS.md` — it is managed by `next dev`.

## Conventions

- **Dependency versions:** write full caret versions (`"typescript": "^6.0.3"`), never bare majors like `^6`. Internal packages use `"workspace:*"`.
- **TypeScript:** both apps are on TypeScript 6 (`^6.0.3`). Do not move to 6.1+ or 7 until `typescript-eslint` supports it — its peer range is `<6.1.0`, mirrored in `packages/eslint-config`'s peer dependencies.
- **Shared config first:** lint and compiler settings belong in `packages/*` presets. App-level `eslint.config.mjs` / `tsconfig.json` should only extend a preset and add app-specific bits (paths, `tsconfigRootDir`, includes).
- **Strictness:** `strict` and `strictNullChecks` are on for everything via `base.json`. The Nest preset sets `strictPropertyInitialization: false` on purpose (DTOs/entities are populated by decorators). `any` is banned everywhere (`@typescript-eslint/no-explicit-any` is an error in every ESLint preset) — use `unknown` and narrow it; don't turn the rule off in a preset or app config.
- **Formatting:** Prettier is configured only at the root (`.prettierrc`: single quotes, trailing commas, width 100, LF). Don't add per-app Prettier configs; ESLint presets include `eslint-config-prettier` so there are no conflicting style rules. A Claude Code `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/lint-format.mjs`) runs on every file Claude writes or edits: `eslint --fix` with the owning app's config (JS/TS only), then Prettier (respecting `.prettierignore`). ESLint errors it can't auto-fix are fed back to Claude to resolve.
- **New app or package:** put it in `apps/*` or `packages/*`, name it `@video-meetings/<name>`, add `lint` / `check-types` / `build` scripts so Turbo picks it up, and extend the shared presets.
