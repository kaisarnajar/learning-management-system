import type { Prisma } from "@prisma/client";

/**
 * Transaction references (UPI UTR / bank reference). One reference backs one
 * payment, whether that is a fee submission or a book order, and banks print
 * them in either case, so they are stored trimmed and upper-cased and
 * compared without regard to case (rows written before this may be mixed).
 */

/** Written for 100 % fee waivers; many submissions share it, so it is never "reused". */
export const WAIVER_TRANSACTION_REF = "FEE-WAIVER";

export function normalizeUtr(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

/**
 * Whether a fee submission or a book order already carries this reference.
 * Call it inside the transaction that writes the new row; the partial unique
 * index on each table stays the guard against a race within that table.
 */
export async function isUtrUsed(tx: Prisma.TransactionClient, utr: string | null): Promise<boolean> {
  if (!utr || utr === WAIVER_TRANSACTION_REF) return false;
  const match = { equals: utr, mode: "insensitive" as const };
  const [submission, order] = await Promise.all([
    tx.coursePaymentSubmission.findFirst({ where: { upiTransactionId: match }, select: { id: true } }),
    tx.bookOrder.findFirst({ where: { upiTransactionId: match }, select: { id: true } }),
  ]);
  return Boolean(submission || order);
}
