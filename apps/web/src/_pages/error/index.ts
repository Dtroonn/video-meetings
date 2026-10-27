// Safe to import from anywhere, Client Components included (`app/[lang]/error.tsx`). The `/500`
// page reads `next/root-params`, so it's in `./server.ts`: exported from here, it would be pulled
// into the client bundle of the error boundary and break the build.
export { ErrorPage } from './ui/error-page';
export { ErrorTextsProvider } from './ui/error-texts';
