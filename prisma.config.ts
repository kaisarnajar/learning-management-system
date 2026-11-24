import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7 no longer reads connection URLs from
 * schema.prisma or settings from package.json#prisma).
 *
 * - `datasource.url` is what `prisma migrate` and `prisma migrate diff`
 *   connect to: the direct (non-pooled) DIRECT_URL, falling back to
 *   DATABASE_URL (local and CI use one URL for both). The app itself connects
 *   through the driver adapter in utils/prisma.ts.
 * - `prisma generate` needs no database, so the URLs are read with
 *   process.env rather than `env()`, which would throw when they are unset.
 * - Prisma 7 no longer loads `.env` on its own; it is loaded here when present
 *   (variables already set in the environment win), as Prisma 6 did.
 */
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
  },
});
