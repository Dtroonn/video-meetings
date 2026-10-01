@AGENTS.md

# @video-meetings/web

Next.js 16 frontend (App Router, React 19, HeroUI v3 on Tailwind CSS 4). See the root `CLAUDE.md` for monorepo-wide commands and conventions.

## Commands (run in `apps/web`, or use `pnpm --filter @video-meetings/web <script>` from the root)

- `pnpm dev` — dev server with Turbopack on **3000** (the api runs on 3001).
- `pnpm build` / `pnpm start` — production build / serve.
- `pnpm lint` — ESLint (`eslint-config-next` core-web-vitals + TypeScript rules).
- `pnpm check-types` — `next typegen && tsc --noEmit` (typegen generates route types first).

## Structure

The code follows **Feature-Sliced Design** (FSD v2.1, see the `feature-sliced-design` skill). Next.js routing lives in `app/` at the app root; `src/` holds only FSD layers.

- `app/` — Next.js App Router, **routing only**: `layout.tsx` (root layout, imports the global CSS), `favicon.ico`, and one `page.tsx` per route that just re-exports a page slice, e.g. `export { RegisterPage as default, metadata } from '@/_pages/register'`. No logic or UI here.
- `src/_app/` — FSD **app** layer: `styles/globals.css`. Global providers go here when needed.
- `src/_pages/` — FSD **pages** layer, one slice per route: `home/`, `register/`. A slice has segments `ui/` (components), `model/` (schemas, state), `api/` (requests only it makes) and an `index.ts` public API.
  - `register/` — sign-up page (email, password, confirm password): `ui/register-page.tsx` (page + `metadata`), `ui/register-form.tsx` (client form), `model/register-form.ts` (valibot schema), `api/register.ts` (`registerUser()` → `POST /auth/register`; the form only logs the response for now).
- `src/shared/` — FSD **shared** layer, segments only, each with its own `index.ts`: `api/` (`apiPost()`: JSON `fetch` through the `/api` proxy, returning `{ ok, status, body }`).
- `public/` — static assets served from `/`.
- Import alias: `@/*` → `src/*` (`@/_pages/register`, `@/shared/api`).

## Things to know

- **FSD rules:**
  - Layers import only from layers below: `_app` → `_pages` → (`features` → `entities` →) `shared`. Slices on the same layer never import each other.
  - Import a slice only through its `index.ts` (`@/_pages/register`, not `@/_pages/register/ui/...`). Inside a slice, use relative imports.
  - **Pages first:** put new code in the page slice that uses it. Move it down to `features/` / `entities/` only when several pages use it right now; generic, business-free code (UI helpers, api client) goes to `shared/`. Those layers don't exist yet; create them when the first such case appears, not ahead of time.
  - The `_app` / `_pages` underscores avoid a clash with Next's own `app/` / `pages/` folders. Don't recreate `src/app` or `src/pages`: Next would treat them as router folders.
  - Name files after their domain (`register-form.ts`), not their role (`types.ts`, `utils.ts`).
- **Moving the router folder** (e.g. `src/app` ↔ `app`) needs a `next dev` restart; Next picks the folder at startup.
- **Next.js 16 differs from older versions.** Before using a Next.js API, check the bundled docs in `node_modules/next/dist/docs/` (see `AGENTS.md` above). Don't rely on memory of Next 13–15 behaviour.
- **Server Components by default.** Add `'use client'` only to components that need state, effects, or browser APIs, and keep them as small leaves.
- **UI kit is HeroUI v3** (`@heroui/react` + `@heroui/styles`, built on React Aria). v3 is not v2: no `HeroUIProvider`, no `framer-motion`, compound components (`<Card><Card.Header>…`), `onPress` instead of `onClick`. Check the v3 docs (or the `heroui-react` skill) before using a component; don't rely on v2 knowledge. Components ship with `'use client'`, so Server Components can render them directly.
- **Styling** is Tailwind CSS 4 (required by HeroUI v3) via `@tailwindcss/postcss`. `src/_app/styles/globals.css` only imports `tailwindcss` and then `@heroui/styles` — the order matters. There is no `tailwind.config.js` and no custom theme: colours, radii and dark mode come from HeroUI's theme variables (`bg-background`, `text-foreground`, `accent`, …). Prefer HeroUI components and semantic variants over raw Tailwind colours (`zinc-*`, hex values). To customise the design, override HeroUI's theme variables in `globals.css` after the imports. Dark mode is switched with `class="dark"` / `data-theme="dark"` on `<html>`.
- **Talking to the api:** `next.config.ts` rewrites `/api/:path*` to the api (`API_URL`, default `http://localhost:3001`), so the browser calls same-origin `/api/...` and the api needs no CORS setup. Call it through `@/shared/api`, not with hard-coded `localhost:3001` URLs. Rewrites are read at server start, so restart `next dev` after changing `API_URL`.
- **Forms** use **react-hook-form** with **valibot** schemas (`@hookform/resolvers/valibot`). Wire HeroUI fields through `<Controller>`: `value`/`onChange`/`onBlur` go to `TextField`, `fieldState.invalid` to `isInvalid`, `field.ref` to `Input`, the message to `FieldError`. Set `validationBehavior="aria"` on `Form` so the schema, not native browser validation, decides what's invalid. Keep client limits in sync with the api's DTOs (e.g. password 8–128 chars). Cross-field checks (`v.partialCheck` + `v.forward`) only run once the fields they read are valid.
- **Linting** comes from `@video-meetings/eslint-config/next`; **TypeScript** extends `@video-meetings/typescript-config/nextjs.json` (strict, bundler resolution).
- `AGENTS.md` and the `@AGENTS.md` import at the top of this file are managed by `next dev` — don't remove them.
