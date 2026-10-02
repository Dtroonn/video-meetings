# @video-meetings/contracts

Request/response shapes and validation limits shared by `apps/api` and `apps/web`. Types and constants only — no runtime logic, no validation library.

## Commands

- `pnpm --filter @video-meetings/contracts build` — bundle `src/index.ts` to `dist/` (ESM + `.d.ts`) with **tsup**.
- `pnpm --filter @video-meetings/contracts dev` — `tsup --watch`; `pnpm dev` at the root starts it with the apps.
- `lint` / `check-types` as in every package.

## Structure

- `src/<area>/` (`auth`, `meetings`, `users`) — interfaces named `<Name>Request` / `<Name>Response`, plus `limits.ts` with constants such as `PASSWORD_MAX_LENGTH`.
- `src/index.ts` — the only entry point; re-export everything new from it.

## Things to know

- **Consumed from `dist/`**, not source: the API runs compiled output under Node and Next has no `transpilePackages`. Turbo's `^build` (also on `dev`, `lint`, `check-types`) builds this package first, so apps always see fresh types.
- **Dates are ISO 8601 strings**, as they arrive over JSON. The API's response DTOs call `toISOString()`.
- **The API's DTO classes `implements` these interfaces** and keep their class-validator decorators; web uses the types and constants directly (valibot form schemas import the limits). When you change a shape or limit, change it here — both apps then fail type-checking until they agree.
- `tsup.config.ts` sets `ignoreDeprecations` for the dts build because tsup injects the deprecated `baseUrl`, which TypeScript 6 rejects.
