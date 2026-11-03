/**
 * Fills CourseGradeRecord.marksObtainedDecimal (migration 20261103001400)
 * from the legacy Float column marksObtained, rounded to two decimals.
 *
 * Usage:
 *   npx tsx scripts/backfill-grade-marks-decimal.ts            # dry run
 *   npx tsx scripts/backfill-grade-marks-decimal.ts --apply    # write in batches of 1,000
 *
 * Idempotent: only rows whose decimal column is NULL are touched; the float
 * column is never modified. Rows where the float is not a finite number are
 * reported and left NULL.
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = new PrismaClient();
const BATCH = 1000;

async function main() {
  const apply = isApplyMode();
  printMode("backfill-grade-marks-decimal", apply);

  const pending = await prisma.courseGradeRecord.count({ where: { marksObtainedDecimal: null } });
  const odd = await prisma.$queryRaw<Array<{ id: string; marksObtained: number }>>`
    SELECT "id", "marksObtained" FROM "CourseGradeRecord"
    WHERE "marksObtainedDecimal" IS NULL
      AND ("marksObtained" <> "marksObtained" OR "marksObtained" IN ('Infinity'::float8, '-Infinity'::float8) OR "marksObtained" >= 10000 OR "marksObtained" < 0)`;

  console.log(`Rows without marksObtainedDecimal: ${pending}`);
  if (odd.length > 0) {
    console.log(`${odd.length} row(s) hold a value the DECIMAL(6,2) column cannot take and will be left NULL:`);
    for (const row of odd) console.log(`  ${row.id}: ${row.marksObtained}`);
  }

  if (!apply || pending === 0) {
    if (pending === 0) console.log("Nothing to do.");
    return;
  }

  const snapshot = writeSnapshot("backfill-grade-marks-decimal", [{ pending, skipped: odd }]);
  console.log(`Snapshot written to ${snapshot} (reverse by setting marksObtainedDecimal back to NULL).`);

  let written = 0;
  for (;;) {
    const count = await prisma.$executeRaw`
      UPDATE "CourseGradeRecord" SET "marksObtainedDecimal" = ROUND("marksObtained"::numeric, 2)
      WHERE "id" IN (
        SELECT "id" FROM "CourseGradeRecord"
        WHERE "marksObtainedDecimal" IS NULL
          AND "marksObtained" = "marksObtained"
          AND "marksObtained" NOT IN ('Infinity'::float8, '-Infinity'::float8)
          AND "marksObtained" >= 0 AND "marksObtained" < 10000
        LIMIT ${BATCH}
      )`;
    written += count;
    if (count < BATCH) break;
  }
  console.log(`Updated ${written} row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
