/**
 * Re-expresses coupon validity bounds written as UTC days (validFrom at
 * 00:00:00.000Z, validUntil at 23:59:59.999Z) as days of the academy's
 * calendar (BUSINESS_TIMEZONE), which is how coupons are written and read
 * from 2026-11-24 (see services/coupon-dates.ts). A coupon entered as
 * Dec 1–31 then runs from 00:00 IST on Dec 1 to 23:59 IST on Dec 31.
 *
 * Usage:
 *   npx tsx scripts/normalise-coupon-dates.ts            # dry run: report only
 *   npx tsx scripts/normalise-coupon-dates.ts --apply    # write after snapshotting
 *
 * Idempotent: only bounds still in the UTC-day form are changed, so a second
 * run finds nothing. A waiver coupon's validFrom (the approval instant) is
 * not a day bound and is left alone.
 */
import { createPrismaClient } from "../utils/prisma-client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";
import { fromLegacyCouponBound } from "../services/coupon-dates";

const prisma = createPrismaClient();

async function main() {
  const apply = isApplyMode();
  printMode("normalise-coupon-dates", apply);

  const coupons = await prisma.coupon.findMany({
    select: { id: true, code: true, type: true, validFrom: true, validUntil: true },
    orderBy: { createdAt: "asc" },
  });

  const changes = coupons
    .map((coupon) => ({
      ...coupon,
      newValidFrom: fromLegacyCouponBound(coupon.validFrom, "start"),
      newValidUntil: fromLegacyCouponBound(coupon.validUntil, "end"),
    }))
    .filter((coupon) => coupon.newValidFrom || coupon.newValidUntil);

  console.log(`Coupons: ${coupons.length}; with UTC-day bounds to convert: ${changes.length}`);
  for (const c of changes) {
    const from = c.newValidFrom ? `${c.validFrom.toISOString()} -> ${c.newValidFrom.toISOString()}` : "unchanged";
    const until = c.newValidUntil ? `${c.validUntil.toISOString()} -> ${c.newValidUntil.toISOString()}` : "unchanged";
    console.log(`  ${c.id}  ${c.type}  ${c.code}  from: ${from}  until: ${until}`);
  }

  if (!apply || changes.length === 0) {
    if (changes.length === 0) console.log("Nothing to write.");
    return;
  }

  const snapshot = writeSnapshot(
    "normalise-coupon-dates",
    changes.map(({ id, code, validFrom, validUntil }) => ({ id, code, validFrom, validUntil })),
  );
  console.log(`Snapshot written to ${snapshot}`);

  let written = 0;
  for (const c of changes) {
    // Guarded on the values read, so a coupon edited meanwhile is not overwritten.
    const result = await prisma.coupon.updateMany({
      where: { id: c.id, validFrom: c.validFrom, validUntil: c.validUntil },
      data: {
        ...(c.newValidFrom ? { validFrom: c.newValidFrom } : {}),
        ...(c.newValidUntil ? { validUntil: c.newValidUntil } : {}),
      },
    });
    written += result.count;
  }
  console.log(`Updated ${written} coupon(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
