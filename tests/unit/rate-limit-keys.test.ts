import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import { bucketKey, PRUNE_PROBABILITY, rateLimit } from "@/services/rate-limit";

const RULE = { name: "test:rule", limit: 3, windowSeconds: 60 };
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("rate-limit bucket keys", () => {
  const db = prisma as unknown as { $queryRaw: ReturnType<typeof vi.fn>; $executeRaw: ReturnType<typeof vi.fn> };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores a SHA-256 of the normalised identifier, never the identifier", () => {
    const key = bucketKey(RULE, "  Someone@Example.com ");
    expect(key).toBe(`rl:test:rule:${sha256("someone@example.com")}`);
    expect(key).not.toContain("someone");
    expect(bucketKey(RULE, "someone@example.com")).toBe(key);
  });

  it("sends only the hashed key to Postgres and prunes old buckets on about 1% of hits", async () => {
    db.$queryRaw = vi.fn(async () => [{ count: 1 }]);
    db.$executeRaw = vi.fn(async () => 0);

    vi.spyOn(Math, "random").mockReturnValue(PRUNE_PROBABILITY + 0.001);
    await rateLimit(RULE, "someone@example.com");
    const sql = db.$queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.values).toContain(bucketKey(RULE, "someone@example.com"));
    expect(sql.values.join(" ")).not.toContain("someone@example.com");
    expect(db.$executeRaw).not.toHaveBeenCalled();

    vi.spyOn(Math, "random").mockReturnValue(PRUNE_PROBABILITY / 2);
    await rateLimit(RULE, "someone@example.com");
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect((db.$executeRaw.mock.calls[0][0] as Prisma.Sql).sql).toMatch(/DELETE FROM "RateLimitBucket" WHERE "windowStart" </);
  });
});
