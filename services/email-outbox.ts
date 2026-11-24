import type { EmailOutbox } from "@prisma/client";
import { deliverMail, type DeliverMailParams, type EmailSendResult } from "@/services/email";
import { prisma } from "@/utils/prisma";

/**
 * A queue for bulk e-mail. Announcements enqueue one rendered message per
 * recipient; `drainOutbox` sends them in batches, from the announcement's
 * after() callback (bounded by a time budget) and from the e-mail-outbox cron,
 * which picks up whatever is left and retries failures.
 *
 * Rows are claimed with FOR UPDATE SKIP LOCKED, so a cron run and an after()
 * drain that overlap never send the same row twice. A claim older than
 * ten minutes (the sender died mid-batch) is picked up again. A failed row
 * keeps its claim, so it is retried after those ten minutes rather than
 * straight away, up to OUTBOX_MAX_ATTEMPTS sends.
 */

export const OUTBOX_BATCH_SIZE = 50;
export const OUTBOX_MAX_ATTEMPTS = 5;
const ENQUEUE_CHUNK = 1_000;

type Deliver = (message: DeliverMailParams) => Promise<EmailSendResult>;

export type DrainResult = { sent: number; failed: number; batches: number };

export async function enqueueEmails(messages: DeliverMailParams[]): Promise<number> {
  for (let i = 0; i < messages.length; i += ENQUEUE_CHUNK) {
    await prisma.emailOutbox.createMany({
      data: messages.slice(i, i + ENQUEUE_CHUNK).map((message) => ({
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        listUnsubscribeUrl: message.listUnsubscribeUrl ?? null,
      })),
    });
  }
  return messages.length;
}

async function claimBatch(batchSize: number): Promise<EmailOutbox[]> {
  return prisma.$queryRaw<EmailOutbox[]>`
    UPDATE "EmailOutbox" SET "claimedAt" = NOW()
    WHERE "id" IN (
      SELECT "id" FROM "EmailOutbox"
      WHERE "sentAt" IS NULL
        AND "attempts" < ${OUTBOX_MAX_ATTEMPTS}
        AND ("claimedAt" IS NULL OR "claimedAt" < NOW() - INTERVAL '10 minutes')
      ORDER BY "createdAt"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
}

/** Sends one claimed batch. Returns how many rows were claimed, sent and failed. */
export async function sendOutboxBatch(
  options: { batchSize?: number; deliver?: Deliver } = {},
): Promise<{ claimed: number; sent: number; failed: number }> {
  const { batchSize = OUTBOX_BATCH_SIZE, deliver = deliverMail } = options;
  const rows = await claimBatch(batchSize);
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    let result: EmailSendResult;
    try {
      result = await deliver({
        to: row.to,
        subject: row.subject,
        html: row.html,
        text: row.text,
        listUnsubscribeUrl: row.listUnsubscribeUrl ?? undefined,
      });
    } catch (error) {
      result = { sent: false, error: error instanceof Error ? error.message : "Send failed" };
    }

    if (result.sent || result.skipped) {
      // A skipped send (SMTP not configured) is logged by deliverMail and
      // would never succeed on retry, so it leaves the queue too.
      sent++;
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          sentAt: new Date(),
          attempts: { increment: 1 },
          claimedAt: null,
          lastError: result.skipped ? "skipped: SMTP not configured" : null,
        },
      });
    } else {
      failed++;
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          attempts: { increment: 1 },
          lastError: (result.error ?? "Send failed").slice(0, 500),
        },
      });
    }
  }

  return { claimed: rows.length, sent, failed };
}

/**
 * Sends batches until the queue is empty, `maxBatches` is reached, or the
 * time budget runs out (checked between batches).
 */
export async function drainOutbox(
  options: { maxBatches?: number; budgetMs?: number; batchSize?: number; deliver?: Deliver } = {},
): Promise<DrainResult> {
  const { maxBatches = Infinity, budgetMs = Infinity, batchSize, deliver } = options;
  const startedAt = Date.now();
  const total: DrainResult = { sent: 0, failed: 0, batches: 0 };

  while (total.batches < maxBatches && Date.now() - startedAt < budgetMs) {
    const batch = await sendOutboxBatch({ batchSize, deliver });
    if (batch.claimed === 0) break;
    total.batches++;
    total.sent += batch.sent;
    total.failed += batch.failed;
  }
  return total;
}
