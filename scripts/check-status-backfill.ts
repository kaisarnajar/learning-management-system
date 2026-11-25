/**
 * Read-only check that every text status/type column's typed twin is filled.
 * The app filters on the typed columns (services/status-compat.ts), so any
 * row counted here is missing from those queries: run
 * scripts/backfill-status-enums.ts (dry run, then --apply) and check again.
 * It also counts rows whose twin disagrees with its text: the CHECK
 * constraints of migration 20261124000800_status_twin_agreement refuse any
 * later write to such a row, so resolve them by hand before deploying it.
 *
 * Usage: npx tsx scripts/check-status-backfill.ts    # exit 1 when any row is missing or mismatched
 */
import { createPrismaClient } from "../utils/prisma-client";
import { findStatusBackfillGaps } from "./lib/status-backfill";

async function main() {
  const prisma = createPrismaClient();
  try {
    const gaps = await findStatusBackfillGaps(prisma);
    for (const gap of gaps) {
      const flag = gap.mismatched > 0 ? "MISMATCH" : gap.missing > 0 ? "MISSING " : "ok      ";
      console.log(`${flag} ${gap.table}.${gap.typed} (from ${gap.text}): ${gap.missing} missing, ${gap.mismatched} mismatched`);
    }
    const missing = gaps.reduce((sum, gap) => sum + gap.missing, 0);
    const mismatched = gaps.reduce((sum, gap) => sum + gap.mismatched, 0);
    if (missing > 0) console.log(`${missing} row(s) need scripts/backfill-status-enums.ts (or migration 20261124000800).`);
    if (mismatched > 0) console.log(`${mismatched} row(s) have a typed twin that disagrees with the text: resolve by hand.`);
    if (missing === 0 && mismatched === 0) console.log("All typed status columns are filled and agree with their text.");
    process.exitCode = missing === 0 && mismatched === 0 ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
