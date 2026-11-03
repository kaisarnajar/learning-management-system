import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { recordAudit } from "@/services/audit";

/**
 * Voiding keeps a financial record in the database (for audit and invoice
 * continuity) while excluding it from finance totals, receipts and the
 * student's payment history. Nothing here deletes rows.
 */
type Tx = Prisma.TransactionClient;

export class VoidError extends Error {}

export async function voidPaymentRecordTx(
  tx: Tx,
  session: Session,
  recordId: string,
  reason: string,
): Promise<void> {
  const record = await tx.paymentRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new VoidError("Payment record not found.");
  if (record.voidedAt) throw new VoidError("This payment record is already voided.");

  await tx.paymentRecord.update({
    where: { id: recordId },
    data: { voidedAt: new Date(), voidReason: reason, voidedById: session.user.id },
  });
  await recordAudit(tx, session, {
    action: "void",
    entity: "PaymentRecord",
    entityId: recordId,
    reason,
    before: {
      amountInrPaise: record.amountInrPaise,
      paymentType: record.paymentType,
      paidAt: record.paidAt,
      invoiceNumber: record.invoiceNumber,
      description: record.description,
    },
    after: { voidedAt: new Date().toISOString() },
  });
}

export async function softDeleteSubmissionTx(
  tx: Tx,
  session: Session,
  submissionId: string,
  reason: string,
): Promise<void> {
  const submission = await tx.coursePaymentSubmission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new VoidError("Payment submission not found.");
  if (submission.deletedAt) throw new VoidError("This submission is already removed.");

  await tx.coursePaymentSubmission.update({
    where: { id: submissionId },
    data: { deletedAt: new Date() },
  });
  await recordAudit(tx, session, {
    action: "soft_delete",
    entity: "CoursePaymentSubmission",
    entityId: submissionId,
    reason,
    before: {
      status: submission.status,
      amountInrPaise: submission.amountInrPaise,
      label: submission.label,
      paymentRecordId: submission.paymentRecordId,
    },
  });
}

export function normalizeReason(reason: string | undefined | null): string | null {
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < 3) return null;
  return trimmed.slice(0, 500);
}
