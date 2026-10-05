# video-meetings

Turborepo monorepo (pnpm workspaces) for a video meetings product.

## Layout

- `apps/web` — Next.js 16 frontend (App Router, Feature-Sliced Design). See `apps/web/CLAUDE.md`.
- `apps/api` — NestJS 12 backend. See `apps/api/CLAUDE.md`.
- `packages/contracts` — request/response types and validation limits shared by api and web (`@video-meetings/contracts`, built with tsup). See `packages/contracts/CLAUDE.md`.
- `packages/eslint-config` — shared ESLint flat configs: `@video-meetings/eslint-config/{base,next,nest}`.
- `packages/typescript-config` — shared tsconfig presets: `base.json`, `library.json`, `nextjs.json`, `nestjs.json`.
- `docs/prds/` — product requirements documents, one `<feature-name>.md` per feature, written with the `/prd <feature name>` command (`.claude/skills/prd`; manual only, Claude doesn't invoke it on its own). The folder is created with the first PRD.
- `compose.yaml` — local dev services (Docker Compose): PostgreSQL 18 (`postgres:18-alpine`).

## Commands (run from the repo root)

- `pnpm install` — install all workspaces. Always use pnpm, never npm/yarn.
- `pnpm dev` — run all apps in watch mode (web on :3000, api on :3001).
- `pnpm build` / `pnpm lint` / `pnpm check-types` / `pnpm test` / `pnpm test:e2e` — run via Turbo across all workspaces (`test:e2e` needs the local DB up and migrated, see `apps/api/CLAUDE.md`).
- `pnpm format` / `pnpm format:check` — Prettier for the whole repo.
- Scope to one app: `pnpm turbo run <task> --filter=@video-meetings/web` (or `pnpm --filter @video-meetings/api <script>`).
- Add a dependency to one app: `pnpm --filter @video-meetings/<app> add [-D] <pkg>`.
- `pnpm db:up` / `pnpm db:down` / `pnpm db:logs` — start (waits until healthy), stop, tail logs of the local Postgres. `docker compose down -v` also wipes the data volume.

**The apps are usually already running.** The developer normally keeps `pnpm dev` (web on :3000, api on :3001) and the database going. To check how something works, use those running apps (browser, `curl localhost:3000/...`). Don't start your own `pnpm dev` and don't stop or kill processes on these ports: a second instance fails with `EADDRINUSE`, and killing one stops the developer's session. Both apps reload on file changes. Start a server yourself only if nothing is listening on its port, and ask first if the check needs different settings (e.g. env vars).

**Clean up after yourself.** Anything you started — dev servers, `pnpm dev`, watchers, test browsers (Playwright), containers you brought up — stop it before you finish, and check that its ports are free again. Never stop what you didn't start. On Windows, stopping the background shell isn't enough: the `node` children of `pnpm dev`/turbo keep running and keep the ports busy. Kill the whole tree from its root (`taskkill /PID <root pid> /T /F`) and confirm with `netstat -ano | findstr ":3000 :3001"`.

## Local database

- Postgres runs in Docker via the root `compose.yaml`; defaults are user `postgres`, password `postgres`, database `video_meetings`, host port **5432**.
- Override them in a root `.env` (template: `.env.example`) — e.g. set `POSTGRES_PORT=5433` if 5432 is already used by another Postgres. Keep `DATABASE_URL` in `apps/api/.env` (template: `apps/api/.env.example`) in sync with those values.
- The data volume is mounted at `/var/lib/postgresql`, not `/var/lib/postgresql/data`: Postgres 18+ images store data in a per-major-version subdirectory, and mounting the old path breaks them.
- `.env*` files are gitignored except `.env.example`; never commit real credentials.

Before finishing a change, run `pnpm lint`, `pnpm check-types` and `pnpm format:check`.

## Keeping docs in sync

The `CLAUDE.md` files are the source of truth for how the project is put together. When a change alters the architecture, update the matching docs in the same change, not in a later one.

- **What counts:** adding, removing or renaming an app/package, a top-level folder or a key entry file (`main.ts`, `app.module.ts`, the web `app/` router folder or an FSD layer); changing ports, scripts, build tooling, test runner, module system or import aliases; adding or replacing a major library or framework (ORM, auth, state management, UI kit, realtime/WebRTC layer); changing a shared preset or a convention listed here.
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
- **No `void` operator:** don't write `void somePromise()` to discard a promise. `await` it, or handle the rejection with `.catch(...)`; a fire-and-forget call is fine without `void` when the function never rejects (document that on the function, e.g. `load` in the web's `entities/user` store).
- **Formatting:** Prettier is configured only at the root (`.prettierrc`: single quotes, trailing commas, width 100, LF). Don't add per-app Prettier configs; ESLint presets include `eslint-config-prettier` so there are no conflicting style rules. A Claude Code `PostToolUse` hook (`.claude/settings.json` → `.claude/hooks/lint-format.mjs`) runs on every file Claude writes or edits: `eslint --fix` with the owning app's config (JS/TS only), then Prettier (respecting `.prettierignore`). ESLint errors it can't auto-fix are fed back to Claude to resolve.
- **Git hooks:** Husky (`.husky/`, installed by the root `prepare` script) runs `.husky/pre-commit` on every commit: `lint-staged` (config: `lint-staged.config.mjs`) runs `eslint --fix` on staged JS/TS files from inside the owning app's directory (so the app's flat config is used) and `prettier --write` on all staged files, then `pnpm test` runs the unit tests and `pnpm test:e2e` the API e2e tests (they need `pnpm db:up` and a migrated DB, otherwise the commit fails). Type checking is not in the hook (too slow); run `pnpm check-types` yourself. Don't bypass the hook with `--no-verify`.
- **Install scripts:** pnpm only runs dependency install scripts listed in `onlyBuiltDependencies` in `pnpm-workspace.yaml` (currently Prisma's, which download the migration engine). Packages whose scripts aren't needed (e.g. `argon2`, which ships prebuilt binaries) go in `ignoredBuiltDependencies`. Add every new package with an install script to one of the two lists.
- **New app or package:** put it in `apps/*` or `packages/*`, name it `@video-meetings/<name>`, add `lint` / `check-types` / `build` scripts so Turbo picks it up, and extend the shared presets.
