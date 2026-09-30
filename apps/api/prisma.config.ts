import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Not `env('DATABASE_URL')`: that throws when the variable is unset, which would break
    // `prisma generate` (run on install) in environments without a database, e.g. CI.
    url: process.env.DATABASE_URL,
  },
});
