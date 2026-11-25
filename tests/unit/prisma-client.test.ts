import { describe, expect, it } from "vitest";
import { pgAdapterFor } from "@/utils/prisma-client";

/** The pg pool settings and adapter options PrismaPg was given (private fields, read for the test). */
function settingsOf(url: string) {
  const adapter = pgAdapterFor(url) as unknown as { config: Record<string, unknown>; options?: { schema?: string } };
  return { config: adapter.config, schema: adapter.options?.schema };
}

describe("pgAdapterFor (Prisma 7 driver adapter)", () => {
  it("turns Prisma 6's pool parameters on the URL into pg pool settings", () => {
    const { config, schema } = settingsOf(
      "postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require&connection_limit=1&pool_timeout=10&pgbouncer=true",
    );
    expect(config).toMatchObject({ max: 1, connectionTimeoutMillis: 10_000 });
    expect(config.connectionString).toBe("postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require");
    expect(schema).toBeUndefined();
  });

  it("keeps a non-default schema and needs no parameters at all", () => {
    expect(settingsOf("postgresql://u:p@localhost:5432/db?schema=tenant").schema).toBe("tenant");
    const plain = settingsOf("postgresql://u:p@localhost:5432/db?schema=public");
    expect(plain.schema).toBeUndefined();
    expect(plain.config).toEqual({ connectionString: "postgresql://u:p@localhost:5432/db" });
  });
});
