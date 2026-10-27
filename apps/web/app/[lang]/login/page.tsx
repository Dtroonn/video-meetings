export { LoginPage as default, generateMetadata } from '@/_pages/login';

// Route segment config must be written here, as a literal: Next reads it statically from the
// route file's own source, so a value exported from (or re-exported via) the page slice is ignored.
// `false` lets this page block on runtime data (`searchParams`) instead of requiring a static shell.
export const instant = false;
