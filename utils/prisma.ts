import { Prisma, PrismaClient } from "@prisma/client";

/** Bump when the Prisma schema changes so dev HMR does not keep an outdated client. */
const PRISMA_CLIENT_CACHE_KEY = "20260720_gst_settings";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaCacheKey?: string;
};

function prismaSchemaIsCurrent(): boolean {
  const passwordResetToken = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === "PasswordResetToken",
  );
  return passwordResetToken !== undefined;
}

function createPrismaClient() {
  const logQueries = process.env.PRISMA_LOG_QUERIES === "true";

  if (logQueries) {
    const client = new PrismaClient({
      log: [
        { level: "query", emit: "event" },
        { level: "info", emit: "stdout" },
        { level: "warn", emit: "stdout" },
        { level: "error", emit: "stdout" },
      ],
    });

    type QueryClient = typeof client & {
      $on(event: "query", callback: (event: Prisma.QueryEvent) => void): void;
    };

    (client as unknown as QueryClient).$on("query", (e) => {
      console.log(`[Prisma Query] [${e.duration}ms] ${e.query}`);
      if (e.params && e.params !== "[]") {
        console.log(`  Params: ${e.params}`);
      }
    });

    return client;
  }

  return new PrismaClient();
}

/** Avoid reusing a stale Prisma client cached before schema changes. */
function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  const cacheKeyMatches = globalForPrisma.prismaCacheKey === PRISMA_CLIENT_CACHE_KEY;

  if (
    cached &&
    cacheKeyMatches &&
    typeof cached.course?.findMany === "function" &&
    prismaSchemaIsCurrent()
  ) {
    return cached;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaCacheKey = PRISMA_CLIENT_CACHE_KEY;
  }

  return client;
}

export const prisma = getPrismaClient();
