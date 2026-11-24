import { pruneRateLimitBuckets } from "@/services/rate-limit";
import { prisma } from "@/utils/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Expired tokens are kept a day, so a late click still gets "link expired" rather than "invalid link". */
const EXPIRED_TOKEN_GRACE_MS = DAY_MS;
/** Sent (or abandoned) bulk e-mail is kept 30 days for troubleshooting. */
const OUTBOX_RETENTION_MS = 30 * DAY_MS;

export type HousekeepingResult = {
  rateLimitBuckets: number;
  verificationTokens: number;
  passwordResetTokens: number;
  emailOutbox: number;
};

/**
 * Deletes rows that only grow: old rate-limit buckets, expired verification
 * and password-reset tokens, and old e-mail outbox rows. Run daily by
 * app/api/cron/housekeeping.
 */
export async function runHousekeeping(now = new Date()): Promise<HousekeepingResult> {
  const tokenCutoff = new Date(now.getTime() - EXPIRED_TOKEN_GRACE_MS);
  const outboxCutoff = new Date(now.getTime() - OUTBOX_RETENTION_MS);

  const rateLimitBuckets = await pruneRateLimitBuckets();
  const verificationTokens = await prisma.verificationToken.deleteMany({ where: { expires: { lt: tokenCutoff } } });
  const passwordResetTokens = await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: tokenCutoff } } });
  const emailOutbox = await prisma.emailOutbox.deleteMany({ where: { createdAt: { lt: outboxCutoff } } });

  return {
    rateLimitBuckets,
    verificationTokens: verificationTokens.count,
    passwordResetTokens: passwordResetTokens.count,
    emailOutbox: emailOutbox.count,
  };
}
