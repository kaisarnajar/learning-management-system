/**
 * Fills the new CouponRequest.feeType column for rows created before it
 * existed, deriving the value from the legacy "[Fee Type: ...]" prefix that
 * the web form used to embed in the free-text reason. The reason text itself
 * is left untouched.
 *
 * Usage:
 *   npx tsx scripts/backfill-waiver-fee-type.ts            # dry run
 *   npx tsx scripts/backfill-waiver-fee-type.ts --apply    # write after snapshotting
 *
 * Idempotent: only rows with feeType IS NULL are touched. Rows without a
 * recognisable marker become BOTH, which is exactly what the readers assumed
 * for them before this column existed.
 */
import { PrismaClient, type WaiverFeeType } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = new PrismaClient();

function parseLegacyFeeType(reason: string): WaiverFeeType {
  if (reason.includes("[Fee Type: Enrollment Fee]")) return "ENROLLMENT";
  if (reason.includes("[Fee Type: Course Fee]")) return "COURSE";
  return "BOTH";
}

async function main() {
  const apply = isApplyMode();
  printMode("backfill-waiver-fee-type", apply);

  const rows = await prisma.couponRequest.findMany({
    where: { feeType: null },
    select: { id: true, reason: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const planned = rows.map((row) => ({ ...row, feeType: parseLegacyFeeType(row.reason) }));
  const counts = planned.reduce<Record<string, number>>((acc, row) => {
    acc[row.feeType] = (acc[row.feeType] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Rows without feeType: ${rows.length}`);
  for (const [feeType, count] of Object.entries(counts)) console.log(`  ${feeType}: ${count}`);
  const unmarked = planned.filter((row) => !row.reason.includes("[Fee Type:"));
  if (unmarked.length > 0) {
    console.log(`\n${unmarked.length} row(s) carry no marker and will be recorded as BOTH:`);
    for (const row of unmarked) console.log(`  ${row.id}  ${row.status}  ${row.createdAt.toISOString()}  ${row.reason.slice(0, 60)}`);
  }

  if (!apply || planned.length === 0) {
    if (planned.length === 0) console.log("Nothing to do.");
    return;
  }

  const snapshot = writeSnapshot("backfill-waiver-fee-type", rows);
  console.log(`Snapshot written to ${snapshot}`);

  let written = 0;
  for (const feeType of ["ENROLLMENT", "COURSE", "BOTH"] as const) {
    const ids = planned.filter((row) => row.feeType === feeType).map((row) => row.id);
    for (let i = 0; i < ids.length; i += 1000) {
      const batch = ids.slice(i, i + 1000);
      const result = await prisma.couponRequest.updateMany({
        where: { id: { in: batch }, feeType: null },
        data: { feeType },
      });
      written += result.count;
    }
  }
  console.log(`Updated ${written} row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
