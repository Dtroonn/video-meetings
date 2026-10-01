@AGENTS.md

# @video-meetings/web

Next.js 16 frontend (App Router, React 19, HeroUI v3 on Tailwind CSS 4). See the root `CLAUDE.md` for monorepo-wide commands and conventions.

## Commands (run in `apps/web`, or use `pnpm --filter @video-meetings/web <script>` from the root)

- `pnpm dev` — dev server with Turbopack on **3000** (the api runs on 3001).
- `pnpm build` / `pnpm start` — production build / serve.
- `pnpm lint` — ESLint (`eslint-config-next` core-web-vitals + TypeScript rules).
- `pnpm check-types` — `next typegen && tsc --noEmit` (typegen generates route types first).

## Structure

- `src/app/` — App Router: `layout.tsx`, `page.tsx`, `globals.css`. Add routes as folders with `page.tsx`.
- `public/` — static assets served from `/`.
- Import alias: `@/*` → `src/*`.

## Things to know

- **Next.js 16 differs from older versions.** Before using a Next.js API, check the bundled docs in `node_modules/next/dist/docs/` (see `AGENTS.md` above). Don't rely on memory of Next 13–15 behaviour.
- **Server Components by default.** Add `'use client'` only to components that need state, effects, or browser APIs, and keep them as small leaves.
- **UI kit is HeroUI v3** (`@heroui/react` + `@heroui/styles`, built on React Aria). v3 is not v2: no `HeroUIProvider`, no `framer-motion`, compound components (`<Card><Card.Header>…`), `onPress` instead of `onClick`. Check the v3 docs (or the `heroui-react` skill) before using a component; don't rely on v2 knowledge. Components ship with `'use client'`, so Server Components can render them directly.
- **Styling** is Tailwind CSS 4 (required by HeroUI v3) via `@tailwindcss/postcss`. `globals.css` only imports `tailwindcss` and then `@heroui/styles` — the order matters. There is no `tailwind.config.js` and no custom theme: colours, radii and dark mode come from HeroUI's theme variables (`bg-background`, `text-foreground`, `accent`, …). Prefer HeroUI components and semantic variants over raw Tailwind colours (`zinc-*`, hex values). To customise the design, override HeroUI's theme variables in `globals.css` after the imports. Dark mode is switched with `class="dark"` / `data-theme="dark"` on `<html>`.
- **Linting** comes from `@video-meetings/eslint-config/next`; **TypeScript** extends `@video-meetings/typescript-config/nextjs.json` (strict, bundler resolution).
- `AGENTS.md` and the `@AGENTS.md` import at the top of this file are managed by `next dev` — don't remove them.
