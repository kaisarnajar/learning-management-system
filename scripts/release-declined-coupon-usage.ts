/**
 * Gives back coupons that declined submissions burned. Until coupons were
 * spent on approval, a submission wrote its CouponUsage row (and deactivated
 * a SPECIAL coupon) when it was made, so a declined payment kept the coupon.
 *
 * A usage row is released when the student has a declined submission with
 * that coupon and no live one (pending or approved, not soft-deleted): the
 * coupon was spent on nothing. Releasing deletes the usage row and
 * reactivates a SPECIAL coupon that has not expired.
 *
 * Usage:
 *   npx tsx scripts/release-declined-coupon-usage.ts            # dry run: report only
 *   npx tsx scripts/release-declined-coupon-usage.ts --apply    # write after snapshotting
 *
 * Idempotent: a released row no longer exists, so a second run finds nothing.
 */
import { PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";
import { submissionStatusOf } from "../services/status-compat";
import { PAYMENTS } from "../config/constants/payments";

const prisma = new PrismaClient();

async function main() {
  const apply = isApplyMode();
  printMode("release-declined-coupon-usage", apply);

  const usages = await prisma.couponUsage.findMany({
    select: {
      id: true,
      couponId: true,
      userId: true,
      usedAt: true,
      coupon: { select: { code: true, type: true, isActive: true, validUntil: true } },
    },
  });
  const submissions = await prisma.coursePaymentSubmission.findMany({
    where: { couponId: { not: null } },
    select: { id: true, userId: true, couponId: true, status: true, statusEnum: true, deletedAt: true },
  });

  const byHolder = new Map<string, typeof submissions>();
  for (const row of submissions) {
    const key = `${row.couponId}|${row.userId}`;
    byHolder.set(key, [...(byHolder.get(key) ?? []), row]);
  }

  const toRelease = usages.filter((usage) => {
    const held = byHolder.get(`${usage.couponId}|${usage.userId}`) ?? [];
    const declined = held.some((row) => submissionStatusOf(row) === "DECLINED");
    const live = held.some((row) => row.deletedAt === null && submissionStatusOf(row) !== "DECLINED");
    return declined && !live;
  });
  const now = new Date();
  const toReactivate = toRelease.filter(
    (usage) => usage.coupon.type === "SPECIAL" && !usage.coupon.isActive && usage.coupon.validUntil >= now,
  );

  console.log(`Coupon usages: ${usages.length}; burned by a declined submission: ${toRelease.length}; SPECIAL coupons to reactivate: ${toReactivate.length}`);
  for (const usage of toRelease) {
    console.log(`  ${usage.id}  ${usage.coupon.code} (${usage.coupon.type})  student ${usage.userId}  used ${usage.usedAt.toISOString()}`);
  }

  if (!apply || toRelease.length === 0) {
    if (toRelease.length === 0) console.log("Nothing to write.");
    return;
  }

  const snapshot = writeSnapshot(
    "release-declined-coupon-usage",
    toRelease.map((usage) => ({ ...usage, reactivate: toReactivate.includes(usage) })),
  );
  console.log(`Snapshot written to ${snapshot}`);

  let released = 0;
  let reactivated = 0;
  for (const usage of toRelease) {
    await prisma.$transaction(async (tx) => {
      // Re-checked inside the write: a submission made since the scan holds the coupon again.
      const live = await tx.coursePaymentSubmission.findFirst({
        where: { userId: usage.userId, couponId: usage.couponId, deletedAt: null, status: { in: [PAYMENTS.SUBMISSION_STATUS.PENDING, PAYMENTS.SUBMISSION_STATUS.APPROVED] } },
        select: { id: true },
      });
      if (live) return;
      released += (await tx.couponUsage.deleteMany({ where: { id: usage.id } })).count;
      if (toReactivate.includes(usage)) {
        reactivated += (await tx.coupon.updateMany({ where: { id: usage.couponId, isActive: false }, data: { isActive: true } })).count;
      }
    });
  }
  console.log(`Released ${released} usage row(s); reactivated ${reactivated} coupon(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
