/** Where the NestJS api listens. The browser reaches it through the `/api` rewrite in `next.config.ts`; server code calls it directly. */
export const API_URL = process.env.API_URL ?? 'http://localhost:3001';
