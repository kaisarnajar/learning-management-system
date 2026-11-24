/**
 * Fills CoursePaymentSubmission.periodKey for rows written before the column
 * existed, deriving it from the row's payment type and its label (see
 * services/payment-period.ts), and reports fee periods that were paid more
 * than once.
 *
 * Usage:
 *   npx tsx scripts/backfill-period-key.ts            # dry run: report only
 *   npx tsx scripts/backfill-period-key.ts --apply    # write after snapshotting
 *
 * Idempotent: only rows with periodKey IS NULL are touched. Rows whose label
 * cannot be parsed are listed and left NULL. Rows in a live duplicate group
 * (same student, course and period; not soft-deleted, not declined) are
 * listed and left NULL too, so the unique index on the key can be created
 * (or, once it exists, is not violated); resolve them (decline or void the
 * extra payment) and run the script again.
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";
import { periodKeyFromLabel } from "../services/payment-period";
import { paymentTypeOf, submissionStatusOf } from "../services/status-compat";

const prisma = new PrismaClient();

/** The partial unique index (and the application) ignore these. */
const isLive = (row: { status: string; statusEnum: Parameters<typeof submissionStatusOf>[0]["statusEnum"]; deletedAt: Date | null }) =>
  row.deletedAt === null && submissionStatusOf(row) !== "DECLINED" && !["declined", "rejected"].includes(row.status);

async function main() {
  const apply = isApplyMode();
  printMode("backfill-period-key", apply);

  const rows = await prisma.coursePaymentSubmission.findMany({
    select: {
      id: true,
      userId: true,
      courseId: true,
      paymentType: true,
      paymentTypeEnum: true,
      label: true,
      status: true,
      statusEnum: true,
      deletedAt: true,
      periodKey: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const planned = rows.map((row) => ({
    ...row,
    key: row.periodKey ?? periodKeyFromLabel(paymentTypeOf(row), row.label),
  }));
  const missing = planned.filter((row) => row.periodKey === null);
  const unparsed = missing.filter((row) => row.key === null);

  // Live rows per (student, course, period), counting keys already stored.
  const groups = new Map<string, typeof planned>();
  for (const row of planned) {
    if (!row.key || !isLive(row)) continue;
    const id = `${row.userId}|${row.courseId}|${row.key}`;
    groups.set(id, [...(groups.get(id) ?? []), row]);
  }
  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  const inDuplicate = new Set(duplicates.flat().map((row) => row.id));

  const toWrite = missing.filter((row) => row.key !== null && !inDuplicate.has(row.id));

  console.log(`Submissions: ${rows.length}; without periodKey: ${missing.length}; to fill: ${toWrite.length}`);

  if (unparsed.length > 0) {
    console.log(`\n${unparsed.length} row(s) have a label that names no period; left NULL:`);
    for (const row of unparsed) console.log(`  ${row.id}  ${row.paymentTypeEnum ?? row.paymentType}  ${row.status}  "${row.label}"`);
  }

  if (duplicates.length > 0) {
    console.log(`\n${duplicates.length} period(s) have more than one live submission; their rows are left NULL until resolved:`);
    for (const group of duplicates) {
      const [first] = group;
      console.log(`  student ${first!.userId} / course ${first!.courseId} / ${first!.key}`);
      for (const row of group) console.log(`    ${row.id}  ${row.status}  ${row.createdAt.toISOString()}  "${row.label}"`);
    }
  } else {
    console.log("\nNo period is paid twice.");
  }

  if (!apply || toWrite.length === 0) {
    if (toWrite.length === 0) console.log("Nothing to write.");
    return;
  }

  const snapshot = writeSnapshot(
    "backfill-period-key",
    toWrite.map(({ id, label, paymentType, status, periodKey }) => ({ id, label, paymentType, status, periodKey })),
  );
  console.log(`Snapshot written to ${snapshot}`);

  const byKey = new Map<string, string[]>();
  for (const row of toWrite) byKey.set(row.key!, [...(byKey.get(row.key!) ?? []), row.id]);

  let written = 0;
  for (const [periodKey, ids] of byKey) {
    for (let i = 0; i < ids.length; i += 1000) {
      const result = await prisma.coursePaymentSubmission.updateMany({
        where: { id: { in: ids.slice(i, i + 1000) }, periodKey: null },
        data: { periodKey },
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
