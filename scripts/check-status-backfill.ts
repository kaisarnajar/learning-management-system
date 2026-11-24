/**
 * Read-only check that every text status/type column's typed twin is filled.
 * The app filters on the typed columns (services/status-compat.ts), so any
 * row counted here is missing from those queries: run
 * scripts/backfill-status-enums.ts (dry run, then --apply) and check again.
 * The CHECK constraints that keep the pairs in agreement (plan 7.8) need 0.
 *
 * Usage: npx tsx scripts/check-status-backfill.ts    # exit 1 when any row is missing
 */
import { createPrismaClient } from "../utils/prisma-client";
import { findStatusBackfillGaps } from "./lib/status-backfill";

async function main() {
  const prisma = createPrismaClient();
  try {
    const gaps = await findStatusBackfillGaps(prisma);
    for (const gap of gaps) {
      console.log(`${gap.missing === 0 ? "ok     " : "MISSING"} ${gap.table}.${gap.typed} (from ${gap.text}): ${gap.missing}`);
    }
    const total = gaps.reduce((sum, gap) => sum + gap.missing, 0);
    console.log(total === 0 ? "All typed status columns are filled." : `${total} row(s) need scripts/backfill-status-enums.ts.`);
    process.exitCode = total === 0 ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
