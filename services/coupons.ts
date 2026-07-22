import { prisma } from "@/utils/prisma";

export async function getBestApplicableCoupon(userId: string, courseId: string, feeType?: "enrollment" | "course") {
  const settings = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
  if (!settings?.feeWaiverEnabled) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true },
  });

  const now = new Date();

  // Find all active coupons
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      OR: [
        { courseId: courseId },
        { courseId: null },
      ],
      ...(feeType === "enrollment" ? { applyToEnrollment: true } : {}),
      ...(feeType === "course" ? { applyToCourse: true } : {}),
    },
  });

  const applicableCoupons = [];
  let totalPercentage = 0;

  for (const coupon of coupons) {
    let applicable = false;

    if (coupon.type === "SPECIAL") {
      // Must match userId
      if (coupon.userId === userId) applicable = true;
    } else {
      // DEFAULT coupon
      if (!coupon.gender || coupon.gender === user?.gender) {
        applicable = true;
      }
    }

    if (applicable) {
      applicableCoupons.push(coupon);
      totalPercentage += coupon.percentage;
    }
  }

  if (applicableCoupons.length === 0) return null;

  const combinedPercentage = Math.min(100, totalPercentage);
  const displayCode =
    applicableCoupons.length === 1
      ? applicableCoupons[0].code
      : applicableCoupons.map((c) => c.code).join(" + ");

  return {
    id: applicableCoupons.map((c) => c.id).join(","),
    code: displayCode,
    percentage: combinedPercentage,
    coupons: applicableCoupons,
  };
}

export function calculateDiscountedAmount(originalPaise: number, percentage: number): number {
  if (percentage >= 100) return 0;
  if (percentage <= 0) return originalPaise;
  const discount = Math.floor((originalPaise * percentage) / 100);
  return originalPaise - discount;
}
