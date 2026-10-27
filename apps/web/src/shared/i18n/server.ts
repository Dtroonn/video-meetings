// Server Components only: these read the `[lang]` root param through `next/root-params`, which
// fails to build anywhere outside the App Directory (e.g. in `proxy.ts`). Everything that is safe
// to import from anywhere lives in `./index.ts`.
export { getDictionary } from './dictionary';
export { getLocale } from './get-locale';
