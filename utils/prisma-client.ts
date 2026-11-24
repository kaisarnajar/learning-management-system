import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

/**
 * Builds a PrismaClient on the `pg` driver adapter (Prisma 7 connects through
 * a driver adapter; the URL is no longer read from schema.prisma). Used by
 * the app's singleton (utils/prisma.ts), the seeds, the data scripts and the
 * end-to-end helpers. Free of `server-only` so scripts can import it.
 *
 * Prisma 6 read pool settings from the URL; they keep working: the
 * Prisma-only parameters are taken off the URL and given to the pg pool:
 *  - connection_limit → pool size (`max`);
 *  - pool_timeout (seconds) → how long to wait for a connection;
 *  - connect_timeout (seconds) → how long to wait for the server;
 *  - schema → the Postgres schema queries use.
 * Other parameters (sslmode, …) are left for pg.
 */
export function pgAdapterFor(url: string): PrismaPg {
  const parsed = new URL(url);
  const take = (name: string) => {
    const value = parsed.searchParams.get(name);
    parsed.searchParams.delete(name);
    return value;
  };
  const seconds = (value: string | null) => (value && Number.isFinite(Number(value)) ? Number(value) * 1000 : undefined);

  const connectionLimit = take("connection_limit");
  const poolTimeout = seconds(take("pool_timeout"));
  const connectTimeout = seconds(take("connect_timeout"));
  const schema = take("schema") ?? undefined;
  take("pgbouncer"); // Prisma's own flag; the adapter does not use named prepared statements by default.

  return new PrismaPg(
    {
      connectionString: parsed.toString(),
      ...(connectionLimit && Number(connectionLimit) > 0 ? { max: Number(connectionLimit) } : {}),
      // pg has one timeout for "get a connection" (from the pool or a new one).
      ...(poolTimeout ?? connectTimeout ? { connectionTimeoutMillis: poolTimeout ?? connectTimeout } : {}),
    },
    schema && schema !== "public" ? { schema } : undefined,
  );
}

/**
 * A client for [url] (default DATABASE_URL). Nothing connects until the first
 * query, so importing this without a URL (a build step, a unit test) is fine;
 * the query then fails as it did under Prisma 6.
 */
export function createPrismaClient(
  options: { url?: string; log?: Prisma.PrismaClientOptions["log"] } = {},
): PrismaClient {
  const url = options.url ?? process.env.DATABASE_URL;
  const adapter = url ? pgAdapterFor(url) : new PrismaPg({});
  return new PrismaClient({ adapter, ...(options.log ? { log: options.log } : {}) });
}
