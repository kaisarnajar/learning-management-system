import type { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import { PAYMENTS } from "@/config/constants/payments";

export type ApplicableCoupon = {
  id: string;
  code: string;
  percentage: number;
  type: "DEFAULT" | "SPECIAL";
  validUntil: Date;
  applyToEnrollment: boolean;
  applyToCourse: boolean;
  isUsed: boolean;
};

export async function getApplicableCoupons(
  userId: string,
  courseId: string,
  feeType?: "enrollment" | "course"
): Promise<ApplicableCoupon[]> {
  const settings = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
  if (!settings?.feeWaiverEnabled) return [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true },
  });

  const now = new Date();
  // Account for timezones ahead of UTC (e.g. IST +5:30) where local date is today but UTC is previous day
  const timezoneBuffer = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // A coupon is used once a usage row exists (written when its payment is
  // approved) or while a live submission holds it (pending verification, or
  // approved before usage was recorded at approval).
  const [usedUsages, usedSubmissions] = await Promise.all([
    prisma.couponUsage.findMany({
      where: { userId },
      select: { couponId: true },
    }),
    prisma.coursePaymentSubmission.findMany({
      where: {
        userId,
        couponId: { not: null },
        deletedAt: null,
        status: { in: [PAYMENTS.SUBMISSION_STATUS.PENDING, PAYMENTS.SUBMISSION_STATUS.APPROVED] },
      },
      select: { couponId: true },
    }),
  ]);

  const usedCouponIds = new Set<string>([
    ...usedUsages.map((u: { couponId: string }) => u.couponId),
    ...usedSubmissions.map((s: { couponId: string | null }) => s.couponId!).filter(Boolean),
  ]);

  // Find all active coupons matching date and course/feeType
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: timezoneBuffer },
      validUntil: { gte: now },
      OR: [
        { courseId: courseId },
        { courseId: null },
      ],
      ...(feeType === "enrollment" ? { applyToEnrollment: true } : {}),
      ...(feeType === "course" ? { applyToCourse: true } : {}),
    },
    orderBy: [
      { percentage: "desc" },
      { createdAt: "desc" },
    ],
  });

  const applicableCoupons: ApplicableCoupon[] = [];

  for (const coupon of coupons) {
    let applicable = false;

    if (coupon.type === "SPECIAL") {
      if (coupon.userId === userId) applicable = true;
    } else {
      if (!coupon.gender || coupon.gender === user?.gender) {
        applicable = true;
      }
    }

    if (applicable) {
      const isUsed = usedCouponIds.has(coupon.id);
      applicableCoupons.push({
        id: coupon.id,
        code: coupon.code,
        percentage: coupon.percentage,
        type: coupon.type as "DEFAULT" | "SPECIAL",
        validUntil: coupon.validUntil,
        applyToEnrollment: coupon.applyToEnrollment,
        applyToCourse: coupon.applyToCourse,
        isUsed,
      });
    }
  }

  // Sort usable (unused) coupons first, then by percentage descending
  return applicableCoupons.sort((a, b) => {
    if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
    return b.percentage - a.percentage;
  });
}

export async function getSelectedCoupon(
  userId: string,
  courseId: string,
  feeType?: "enrollment" | "course",
  couponId?: string | null
): Promise<ApplicableCoupon | null> {
  // A coupon is applied only when the client explicitly selected it. Never
  // fall back to "the best available coupon": the student may have paid the
  // full fee shown on screen, and a silently applied coupon would record a
  // lower amount and burn the coupon.
  if (!couponId || couponId === "none") return null;

  const applicableCoupons = await getApplicableCoupons(userId, courseId, feeType);
  const selectableCoupons = applicableCoupons.filter((c) => !c.isUsed);
  return selectableCoupons.find((c) => c.id === couponId || c.code === couponId) ?? null;
}

/** The coupon was redeemed by a concurrent submission after it was offered; the submit paths answer 409. */
export class CouponAlreadyUsedError extends Error {
  constructor() {
    super("This coupon has already been used. Please refresh and choose another option.");
    this.name = "CouponAlreadyUsedError";
  }
}

const LIVE_SUBMISSION_STATUSES = [PAYMENTS.SUBMISSION_STATUS.PENDING, PAYMENTS.SUBMISSION_STATUS.APPROVED];

/**
 * Reserves `couponId` for a submission `userId` is about to create in the
 * caller's transaction. Call it before creating the submission.
 *
 * A coupon is spent when its payment is approved, not when it is submitted,
 * so a declined submission gives the coupon back. Until then the pending
 * submission's couponId holds it. Availability is checked before the
 * transaction (getSelectedCoupon), so two submissions at once can both get
 * here: the coupon row is locked first, which serialises them, and the
 * second one then sees the first one's submission and is refused.
 */
export async function reserveCouponTx(tx: Prisma.TransactionClient, userId: string, couponId: string) {
  const locked = await tx.$queryRaw<{ isActive: boolean }[]>`
    SELECT "isActive" FROM "Coupon" WHERE "id" = ${couponId} FOR UPDATE`;
  if (!locked[0]?.isActive) throw new CouponAlreadyUsedError();

  const [usage, holder] = await Promise.all([
    tx.couponUsage.findUnique({ where: { couponId_userId: { couponId, userId } }, select: { id: true } }),
    tx.coursePaymentSubmission.findFirst({
      where: { userId, couponId, deletedAt: null, status: { in: LIVE_SUBMISSION_STATUSES } },
      select: { id: true },
    }),
  ]);
  if (usage || holder) throw new CouponAlreadyUsedError();
}

/**
 * Records that `userId` consumed `couponId` as part of the caller's
 * transaction, so a failed submission never burns the coupon.
 * SPECIAL (single-use, per-student) coupons are deactivated on use.
 *
 * Used where a payment is approved at submission (auto-approved waivers),
 * after reserveCouponTx. The usage row is created, never upserted, so a
 * second redemption hits the (couponId, userId) unique key, and a SPECIAL
 * coupon is deactivated only if it is still active. Either loss throws
 * CouponAlreadyUsedError and rolls the caller's transaction back.
 */
export async function recordCouponUsageTx(tx: Prisma.TransactionClient, userId: string, couponId: string) {
  try {
    await tx.couponUsage.create({ data: { couponId, userId } });
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") throw new CouponAlreadyUsedError();
    throw error;
  }
  const coupon = await tx.coupon.findUnique({
    where: { id: couponId },
    select: { type: true },
  });
  if (coupon?.type === "SPECIAL") {
    const deactivated = await tx.coupon.updateMany({
      where: { id: couponId, isActive: true },
      data: { isActive: false },
    });
    if (deactivated.count === 0) throw new CouponAlreadyUsedError();
  }
}

/**
 * Spends the coupon a pending submission reserved, as part of the approval
 * transaction: writes the usage row and deactivates a SPECIAL coupon.
 *
 * Submissions made before usage moved to approval already wrote their usage
 * row (and deactivated their SPECIAL coupon) at submission, so an existing
 * row is accepted, unless another approved submission of the student's holds
 * the same coupon; then the coupon really was spent twice and the approval
 * is refused with CouponAlreadyUsedError. The insert skips a conflict instead
 * of raising it, because a failed statement would abort the transaction.
 */
export async function spendReservedCouponTx(
  tx: Prisma.TransactionClient,
  userId: string,
  couponId: string,
  submissionId: string,
) {
  const created = await tx.couponUsage.createMany({ data: [{ couponId, userId }], skipDuplicates: true });
  if (created.count === 0) {
    const otherHolder = await tx.coursePaymentSubmission.findFirst({
      where: {
        userId,
        couponId,
        id: { not: submissionId },
        deletedAt: null,
        status: PAYMENTS.SUBMISSION_STATUS.APPROVED,
      },
      select: { id: true },
    });
    if (otherHolder) throw new CouponAlreadyUsedError();
  }
  // The reservation held the coupon: an admin deactivating it since does not
  // take back the price the student was quoted, so no count check here.
  await tx.coupon.updateMany({
    where: { id: couponId, type: "SPECIAL", isActive: true },
    data: { isActive: false },
  });
}

/**
 * Gives a spent coupon back when the payment it paid for is voided: the
 * usage row is deleted and a SPECIAL coupon reactivated. Call it after the
 * submission was soft-deleted, in the same transaction. Nothing is released
 * while another live submission of the student's still holds the coupon.
 * Returns whether the coupon was given back.
 */
export async function releaseCouponTx(tx: Prisma.TransactionClient, userId: string, couponId: string): Promise<boolean> {
  const holder = await tx.coursePaymentSubmission.findFirst({
    where: { userId, couponId, deletedAt: null, status: { in: LIVE_SUBMISSION_STATUSES } },
    select: { id: true },
  });
  if (holder) return false;
  const released = await tx.couponUsage.deleteMany({ where: { couponId, userId } });
  await tx.coupon.updateMany({
    where: { id: couponId, type: "SPECIAL", isActive: false },
    data: { isActive: true },
  });
  return released.count > 0;
}

export async function recordCouponUsage(userId: string, couponId: string) {
  await prisma.$transaction((tx) => recordCouponUsageTx(tx, userId, couponId));
}

export function calculateDiscountedAmount(originalPaise: number, percentage: number): number {
  if (percentage >= 100) return 0;
  if (percentage <= 0) return originalPaise;
  const discount = Math.floor((originalPaise * percentage) / 100);
  return originalPaise - discount;
}
