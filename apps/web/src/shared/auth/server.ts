// Server Components only: these read the request through `next/headers`. Everything that is safe
// to import from anywhere, `proxy.ts` included, lives in `./index.ts`.
export { isSignedIn } from './session';
