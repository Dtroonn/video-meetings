@AGENTS.md

# @video-meetings/web

Next.js 16 frontend (App Router, React 19, Tailwind CSS 4). See the root `CLAUDE.md` for monorepo-wide commands and conventions.

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
- **Styling** is Tailwind CSS 4, configured via `@import 'tailwindcss'` in `globals.css` and `@tailwindcss/postcss` — there is no `tailwind.config.js`.
- **Linting** comes from `@video-meetings/eslint-config/next`; **TypeScript** extends `@video-meetings/typescript-config/nextjs.json` (strict, bundler resolution).
- `AGENTS.md` and the `@AGENTS.md` import at the top of this file are managed by `next dev` — don't remove them.
