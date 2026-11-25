// Prisma never belongs in a browser bundle: a client component that reaches
// this module (directly or through a service) fails the build.
import "server-only";
import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "@/utils/prisma-client";

/**
 * One Prisma client per process. In development the instance is kept on
 * globalThis so hot reloads do not open a new connection pool each time; in
 * production (serverless) each function instance creates its own.
 *
 * Connection settings belong on the DATABASE_URL (the Neon pooler URL with
 * `?connection_limit=1&pool_timeout=10`, see docs/OPERATIONS.md), not here;
 * utils/prisma-client.ts hands them to the pg driver adapter.
 * Query logging: PRISMA_LOG_QUERIES=true (development only).
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createAppPrismaClient(): PrismaClient {
  const logQueries = process.env.PRISMA_LOG_QUERIES === "true" && process.env.NODE_ENV !== "production";
  return createPrismaClient({ log: logQueries ? ["query", "warn", "error"] : ["warn", "error"] });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createAppPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
