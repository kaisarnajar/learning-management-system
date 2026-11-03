/**
 * READ-ONLY report of rows that would violate the partial unique indexes
 * introduced by migration 20261103000300_payment_unique_indexes:
 *
 *   - CoursePaymentSubmission.upiTransactionId reused across submissions
 *   - CoursePaymentSubmission (userId, courseId, label) with more than one
 *     non-declined row
 *   - BookOrder.upiTransactionId reused across orders
 *
 * Usage: npx tsx scripts/report-duplicate-payment-keys.ts
 *
 * The migration skips an index (with a WARNING) when duplicates exist; the
 * academy resolves them (decline/void the duplicate) and re-creates the index
 * with the statement printed at the end of this report.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const utrDupes = await prisma.$queryRaw<Array<{ upiTransactionId: string; count: number; ids: string[] }>>`
    SELECT "upiTransactionId", COUNT(*)::int AS count, array_agg("id") AS ids
    FROM "CoursePaymentSubmission"
    WHERE "upiTransactionId" IS NOT NULL AND "upiTransactionId" <> '' AND "upiTransactionId" <> 'FEE-WAIVER'
    GROUP BY "upiTransactionId" HAVING COUNT(*) > 1`;

  const labelDupes = await prisma.$queryRaw<Array<{ userId: string; courseId: string; label: string; count: number; ids: string[] }>>`
    SELECT "userId", "courseId", "label", COUNT(*)::int AS count, array_agg("id") AS ids
    FROM "CoursePaymentSubmission"
    WHERE "status" <> 'declined'
    GROUP BY "userId", "courseId", "label" HAVING COUNT(*) > 1`;

  const orderDupes = await prisma.$queryRaw<Array<{ upiTransactionId: string; count: number; ids: string[] }>>`
    SELECT "upiTransactionId", COUNT(*)::int AS count, array_agg("id") AS ids
    FROM "BookOrder"
    WHERE "upiTransactionId" IS NOT NULL AND "upiTransactionId" <> ''
    GROUP BY "upiTransactionId" HAVING COUNT(*) > 1`;

  console.log(`Duplicate fee-submission transaction references: ${utrDupes.length}`);
  for (const row of utrDupes) console.log(`  ${row.upiTransactionId}: ${row.count} rows -> ${row.ids.join(", ")}`);

  console.log(`Duplicate (student, course, label) fee submissions: ${labelDupes.length}`);
  for (const row of labelDupes) console.log(`  ${row.userId} / ${row.courseId} / ${row.label}: ${row.count} rows -> ${row.ids.join(", ")}`);

  console.log(`Duplicate book-order transaction references: ${orderDupes.length}`);
  for (const row of orderDupes) console.log(`  ${row.upiTransactionId}: ${row.count} rows -> ${row.ids.join(", ")}`);

  const existing = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes WHERE indexname LIKE '%_partial_key'`;
  console.log(`Partial unique indexes present: ${existing.map((r) => r.indexname).join(", ") || "none"}`);

  if (utrDupes.length + labelDupes.length + orderDupes.length === 0) {
    console.log("No duplicates. All three partial unique indexes can exist.");
  } else {
    console.log("Resolve the duplicates above (decline or void the extra rows), then re-run the");
    console.log("CREATE UNIQUE INDEX statements from prisma/migrations/20261103000300_payment_unique_indexes/migration.sql.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
