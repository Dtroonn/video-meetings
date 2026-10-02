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
  - `register/` — sign-up page (email, password, confirm password): `ui/register-page.tsx` (page + `metadata`), `ui/register-form.tsx` (client form), `ui/password-input.tsx` (password input with a show/hide toggle, used by both password fields), `model/register-form.ts` (valibot schema), `api/register.ts` (`registerUser()` → `POST /auth/register`; the form only logs the response for now).
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
- **UI kit is HeroUI v3** (`@heroui/react` + `@heroui/styles`, built on React Aria); icons come from `@gravity-ui/icons`, the set HeroUI's docs use (decorative icons get `aria-hidden`, icon-only buttons an `aria-label`). v3 is not v2: no `HeroUIProvider`, no `framer-motion`, compound components (`<Card><Card.Header>…`), `onPress` instead of `onClick`. Check the v3 docs (or the `heroui-react` skill) before using a component; don't rely on v2 knowledge. Components ship with `'use client'`, so Server Components can render them directly.
- **Styling** is Tailwind CSS 4 (required by HeroUI v3) via `@tailwindcss/postcss`. `src/_app/styles/globals.css` imports `tailwindcss` and then `@heroui/styles` (the order matters), followed by theme variable overrides. There is no `tailwind.config.js`; colours, radii and dark mode come from HeroUI's theme variables. The light theme overrides a few of them for WCAG AA: darker `--accent` and `--danger` (HeroUI's white button text and red error text were ~3.6:1), a visible field border (`--field-border-width`, `--field-border`; HeroUI's fields are borderless and vanish on a white card), an accent border on focus (`--field-border-focus`) so it merges with the focus ring into one edge, a danger border on invalid fields (HeroUI only adds a red outline/ring, which left a grey or blue line inside it), and no divider on `InputGroup` prefix/suffix (it reuses the field border width, so it would otherwise appear). If you change them, keep white-on-accent, white-on-danger and danger-on-white at ≥ 4.5:1 including the hover state, and the field border at ≥ 3:1 against both the card and the page background. Use them via semantic utilities (`bg-background`, `text-foreground`, `accent`, …). Prefer HeroUI components and semantic variants over raw Tailwind colours (`zinc-*`, hex values). To customise the design, override HeroUI's theme variables in `globals.css` after the imports. Dark mode is switched with `class="dark"` / `data-theme="dark"` on `<html>`.
- **Talking to the api:** `next.config.ts` rewrites `/api/:path*` to the api (`API_URL`, default `http://localhost:3001`), so the browser calls same-origin `/api/...` and the api needs no CORS setup. Call it through `@/shared/api`, not with hard-coded `localhost:3001` URLs. Rewrites are read at server start, so restart `next dev` after changing `API_URL`.
- **Forms** use **react-hook-form** with **valibot** schemas (`@hookform/resolvers/valibot`). Wire HeroUI fields through `<Controller>`: `value`/`onChange`/`onBlur` go to `TextField`, `fieldState.invalid` to `isInvalid`, `field.ref` to `Input`, the message to `FieldError`. Set `validationBehavior="aria"` on `Form` so the schema, not native browser validation, decides what's invalid. Import limits (e.g. `PASSWORD_MIN_LENGTH`) and request types from `@video-meetings/contracts` instead of redefining them, so they stay in sync with the api. Cross-field checks (`v.partialCheck` + `v.forward`) only run once the fields they read are valid. For them to run at all while other fields have errors, set `criteriaMode: 'all'` in `useForm`: with the default `'firstError'` the resolver passes valibot `abortPipeEarly`, which skips the object-level check (an empty email hid "Passwords do not match"). Put `rules={{ deps: '<checked field>' }}` on the `Controller` of the other field the check reads (here `password` → `confirmPassword`), so the error appears or clears when either field changes.
- **Linting** comes from `@video-meetings/eslint-config/next`; **TypeScript** extends `@video-meetings/typescript-config/nextjs.json` (strict, bundler resolution).
- `AGENTS.md` and the `@AGENTS.md` import at the top of this file are managed by `next dev` — don't remove them.

## Checking UI changes

A UI change isn't done when lint and types pass; it must also be **checked visually** and **reviewed with the `ui-ux-pro-max` skill**.

- **Look at it in a browser** (the Playwright MCP server from the root `.mcp.json`) on the running dev server: take screenshots and read them, don't rely on the code alone. Cover every state the change touches (default, hover, keyboard focus, invalid, disabled, loading) at desktop (1280px) and mobile (375px) widths.
- **Review it with `ui-ux-pro-max`** against its rules, accessibility first: text contrast ≥ 4.5:1 and field/control boundaries ≥ 3:1 (measure computed colours, don't eyeball them), visible focus, labels and errors linked to their fields, heading order, touch target size, no horizontal scroll.
- Fix what the review finds, or report it if the fix is out of scope (e.g. a theme-wide change), then re-check.
