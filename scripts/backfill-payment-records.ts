/**
 * Creates the missing PaymentRecord for approved fee submissions that have
 * none (historically this was done lazily while rendering the admin
 * "Completed payments" page, which produced duplicates under concurrency).
 *
 * Usage:
 *   npx tsx scripts/backfill-payment-records.ts            # dry run, prints the rows
 *   npx tsx scripts/backfill-payment-records.ts --apply    # writes, after snapshotting
 *
 * Idempotent: only submissions with status "approved" and paymentRecordId
 * IS NULL are touched; re-running after --apply reports zero rows.
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = new PrismaClient();

async function main() {
  const apply = isApplyMode();
  printMode("backfill-payment-records", apply);

  const missing = await prisma.coursePaymentSubmission.findMany({
    where: { status: "approved", paymentRecordId: null },
    orderBy: { updatedAt: "asc" },
  });

  console.log(`Approved submissions without a PaymentRecord: ${missing.length}`);
  for (const s of missing) {
    console.log(`  ${s.id}  user=${s.userId}  course=${s.courseId}  ${s.paymentType}  ${s.label}  ₹${(s.amountInrPaise / 100).toFixed(2)}  approved=${s.updatedAt.toISOString()}`);
  }

  if (!apply || missing.length === 0) return;

  const snapshot = writeSnapshot("backfill-payment-records", missing);
  console.log(`Snapshot written to ${snapshot}`);

  let created = 0;
  for (const s of missing) {
    await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction so a concurrent approval cannot double-create.
      const fresh = await tx.coursePaymentSubmission.findUnique({ where: { id: s.id }, select: { paymentRecordId: true } });
      if (!fresh || fresh.paymentRecordId) return;
      const record = await tx.paymentRecord.create({
        data: {
          userId: s.userId,
          courseId: s.courseId,
          amountInrPaise: s.amountInrPaise,
          paidAt: s.updatedAt,
          paymentType: s.paymentType,
          description: s.amountInrPaise === 0 ? `${s.label} (100% Fee Waiver)` : s.label,
        },
      });
      await tx.coursePaymentSubmission.update({ where: { id: s.id }, data: { paymentRecordId: record.id } });
      created++;
    });
  }
  console.log(`Created ${created} PaymentRecord row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
