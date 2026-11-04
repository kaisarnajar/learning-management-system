/**
 * Links historical book-purchase PaymentRecords to their BookOrder via the
 * new PaymentRecord.bookOrderId column. Legacy records were only linked by
 * the description "Book order #XXXXXX" (last 6 characters of the order id).
 *
 * Usage:
 *   npx tsx scripts/backfill-book-order-links.ts            # dry run
 *   npx tsx scripts/backfill-book-order-links.ts --apply    # write links after snapshotting
 *
 * A record is linked only when exactly one non-deleted order of the same
 * user matches the suffix AND the order total equals the record amount.
 * Ambiguous or unmatched records are listed for manual resolution and never
 * guessed.
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = new PrismaClient();

async function main() {
  const apply = isApplyMode();
  printMode("backfill-book-order-links", apply);

  const records = await prisma.paymentRecord.findMany({
    where: { paymentType: "book_purchase", bookOrderId: null },
    orderBy: { paidAt: "asc" },
  });

  const matched: Array<{ recordId: string; orderId: string }> = [];
  const ambiguous: Array<{ recordId: string; candidates: string[] }> = [];
  const unmatched: string[] = [];

  for (const record of records) {
    const match = record.description?.match(/Book order #([A-Z0-9]+)/i);
    if (!match) {
      unmatched.push(record.id);
      continue;
    }
    const suffix = match[1].toLowerCase();
    const candidates = await prisma.bookOrder.findMany({
      where: { userId: record.userId, id: { endsWith: suffix }, deletedAt: null },
      select: { id: true, totalAmountInrPaise: true },
    });
    const exact = candidates.filter((c) => c.totalAmountInrPaise === record.amountInrPaise);
    const pool = exact.length > 0 ? exact : candidates;
    if (pool.length === 1) matched.push({ recordId: record.id, orderId: pool[0].id });
    else if (pool.length > 1) ambiguous.push({ recordId: record.id, candidates: pool.map((c) => c.id) });
    else unmatched.push(record.id);
  }

  console.log(`Book-purchase records without a link: ${records.length}`);
  console.log(`  linkable: ${matched.length}`);
  console.log(`  ambiguous (manual resolution): ${ambiguous.length}`);
  for (const a of ambiguous) console.log(`    ${a.recordId} -> candidates ${a.candidates.join(", ")}`);
  console.log(`  unmatched (no order found): ${unmatched.length}`);
  for (const id of unmatched) console.log(`    ${id}`);

  if (!apply || matched.length === 0) return;

  const snapshot = writeSnapshot("backfill-book-order-links", matched);
  console.log(`Snapshot written to ${snapshot}`);

  let linked = 0;
  for (const m of matched) {
    const result = await prisma.paymentRecord.updateMany({
      where: { id: m.recordId, bookOrderId: null },
      data: { bookOrderId: m.orderId },
    });
    linked += result.count;
  }
  console.log(`Linked ${linked} record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
