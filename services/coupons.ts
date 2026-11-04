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

  // Find all coupons already used by this student
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

/**
 * Records that `userId` consumed `couponId` as part of the caller's
 * transaction, so a failed submission never burns the coupon.
 * SPECIAL (single-use, per-student) coupons are deactivated on use.
 */
export async function recordCouponUsageTx(tx: Prisma.TransactionClient, userId: string, couponId: string) {
  await tx.couponUsage.upsert({
    where: { couponId_userId: { couponId, userId } },
    create: { couponId, userId },
    update: {},
  });
  const coupon = await tx.coupon.findUnique({
    where: { id: couponId },
    select: { type: true },
  });
  if (coupon?.type === "SPECIAL") {
    await tx.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
  }
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
