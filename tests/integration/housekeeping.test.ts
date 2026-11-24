import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as housekeeping } from "@/app/api/cron/housekeeping/route";
import { apiRequest } from "../helpers/api";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const SECRET = "cron-secret-for-tests-0123456789";
const ago = (ms: number) => new Date(Date.now() - ms);

describe.skipIf(SKIP_WITHOUT_DB)("housekeeping cron", () => {
  beforeEach(resetDb);
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("refuses requests without the right secret", async () => {
    expect((await housekeeping(apiRequest("/api/cron/housekeeping"))).status).toBe(401);
    process.env.CRON_SECRET = SECRET;
    const wrong = apiRequest("/api/cron/housekeeping", { headers: { authorization: `Bearer ${SECRET}x` } });
    expect((await housekeeping(wrong)).status).toBe(401);
  });

  it("deletes old rate-limit buckets, expired tokens and old outbox rows, and keeps the rest", async () => {
    await prisma.rateLimitBucket.createMany({
      data: [
        { key: "rl:old", count: 3, windowStart: ago(2 * DAY) },
        { key: "rl:live", count: 1, windowStart: ago(HOUR) },
      ],
    });
    await prisma.verificationToken.createMany({
      data: [
        { identifier: "a@example.test", token: "expired", expires: ago(2 * DAY) },
        { identifier: "b@example.test", token: "just-expired", expires: ago(HOUR) },
        { identifier: "c@example.test", token: "valid", expires: new Date(Date.now() + DAY) },
      ],
    });
    await prisma.passwordResetToken.createMany({
      data: [
        { email: "a@example.test", tokenHash: "expired", expiresAt: ago(2 * DAY) },
        { email: "c@example.test", tokenHash: "valid", expiresAt: new Date(Date.now() + HOUR) },
      ],
    });
    const message = { to: "a@example.test", subject: "s", html: "<p>x</p>", text: "x" };
    await prisma.emailOutbox.createMany({
      data: [
        { ...message, sentAt: ago(31 * DAY), createdAt: ago(31 * DAY) },
        { ...message, createdAt: ago(HOUR) },
      ],
    });

    process.env.CRON_SECRET = SECRET;
    const response = await housekeeping(apiRequest("/api/cron/housekeeping", { headers: { authorization: `Bearer ${SECRET}` } }));
    expect(response.status).toBe(200);
    expect((await response.json()).deleted).toEqual({ rateLimitBuckets: 1, verificationTokens: 1, passwordResetTokens: 1, emailOutbox: 1 });

    expect((await prisma.rateLimitBucket.findMany()).map((b) => b.key)).toEqual(["rl:live"]);
    expect((await prisma.verificationToken.findMany()).map((t) => t.token).sort()).toEqual(["just-expired", "valid"]);
    expect((await prisma.passwordResetToken.findMany()).map((t) => t.tokenHash)).toEqual(["valid"]);
    expect(await prisma.emailOutbox.count()).toBe(1);
  });
});
