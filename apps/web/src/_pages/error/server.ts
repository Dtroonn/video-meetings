// Server Components only: the `/500` page reads `next/root-params`. Everything that is safe to
// import from anywhere lives in `./index.ts`.
export { ServerErrorPage, generateMetadata } from './ui/server-error-page';
