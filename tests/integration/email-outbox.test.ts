import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/utils/prisma";
import { drainOutbox, enqueueEmails, OUTBOX_MAX_ATTEMPTS, sendOutboxBatch } from "@/services/email-outbox";
import { GET as cronEmailOutbox } from "@/app/api/cron/email-outbox/route";
import { apiRequest } from "../helpers/api";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

const message = (n: number) => ({
  to: `reader${n}@example.test`,
  subject: `Announcement ${n}`,
  text: "Class at 6pm",
  html: "<p>Class at 6pm</p>",
  listUnsubscribeUrl: `http://localhost:3000/unsubscribe?u=${n}`,
});

describe.skipIf(SKIP_WITHOUT_DB)("bulk e-mail outbox", () => {
  beforeEach(resetDb);
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sends batches of 50: two runs over 120 queued leave 20", async () => {
    await enqueueEmails(Array.from({ length: 120 }, (_, i) => message(i)));
    const deliver = vi.fn(async () => ({ sent: true }));

    await drainOutbox({ maxBatches: 1, deliver });
    await drainOutbox({ maxBatches: 1, deliver });

    expect(deliver).toHaveBeenCalledTimes(100);
    expect(await prisma.emailOutbox.count({ where: { sentAt: { not: null } } })).toBe(100);
    expect(await prisma.emailOutbox.count({ where: { sentAt: null } })).toBe(20);
  });

  it("sends each message with its unsubscribe header, oldest first", async () => {
    await enqueueEmails([message(1)]);
    const deliver = vi.fn(async () => ({ sent: true }));

    await sendOutboxBatch({ deliver });

    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      to: "reader1@example.test",
      subject: "Announcement 1",
      listUnsubscribeUrl: "http://localhost:3000/unsubscribe?u=1",
    }));
  });

  it("records a failed send and retries it only after the claim expires, up to the attempt limit", async () => {
    await enqueueEmails([message(1)]);
    const failing = vi.fn(async () => ({ sent: false, error: "550 mailbox unavailable" }));

    await drainOutbox({ deliver: failing });
    let row = await prisma.emailOutbox.findFirstOrThrow();
    expect(row).toMatchObject({ attempts: 1, sentAt: null, lastError: "550 mailbox unavailable" });
    // Still claimed: an immediate second run does not retry it.
    expect(failing).toHaveBeenCalledTimes(1);

    await prisma.emailOutbox.update({ where: { id: row.id }, data: { claimedAt: new Date(Date.now() - 11 * 60_000) } });
    await drainOutbox({ deliver: failing });
    row = await prisma.emailOutbox.findFirstOrThrow();
    expect(row.attempts).toBe(2);

    await prisma.emailOutbox.update({ where: { id: row.id }, data: { attempts: OUTBOX_MAX_ATTEMPTS, claimedAt: null } });
    await drainOutbox({ deliver: failing });
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("never hands the same row to two overlapping senders", async () => {
    await enqueueEmails(Array.from({ length: 30 }, (_, i) => message(i)));
    const deliver = vi.fn(async () => ({ sent: true }));

    await Promise.all([sendOutboxBatch({ batchSize: 20, deliver }), sendOutboxBatch({ batchSize: 20, deliver })]);

    const recipients = deliver.mock.calls.map((call) => (call as unknown as [{ to: string }])[0].to);
    expect(recipients).toHaveLength(30);
    expect(new Set(recipients).size).toBe(30);
  });

  it("the cron route refuses requests without the right secret", async () => {
    await enqueueEmails([message(1)]);

    expect((await cronEmailOutbox(apiRequest("/api/cron/email-outbox"))).status).toBe(401);

    process.env.CRON_SECRET = "cron-secret-for-tests-0123456789";
    const wrong = apiRequest("/api/cron/email-outbox", { headers: { authorization: "Bearer nope" } });
    expect((await cronEmailOutbox(wrong)).status).toBe(401);
    expect(await prisma.emailOutbox.count({ where: { sentAt: null } })).toBe(1);

    const right = apiRequest("/api/cron/email-outbox", { headers: { authorization: "Bearer cron-secret-for-tests-0123456789" } });
    const response = await cronEmailOutbox(right);
    expect(response.status).toBe(200);
    // SMTP is not configured under the tests, so the row leaves the queue as skipped.
    expect(await prisma.emailOutbox.findFirstOrThrow()).toMatchObject({ lastError: "skipped: SMTP not configured" });
    expect(await prisma.emailOutbox.count({ where: { sentAt: null } })).toBe(0);
  });
});
