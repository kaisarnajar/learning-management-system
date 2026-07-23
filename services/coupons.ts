import { prisma } from "@/utils/prisma";

export type ApplicableCoupon = {
  id: string;
  code: string;
  percentage: number;
  type: "DEFAULT" | "SPECIAL";
  validUntil: Date;
  applyToEnrollment: boolean;
  applyToCourse: boolean;
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

  // Find all active coupons matching date and course/feeType
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
      applicableCoupons.push({
        id: coupon.id,
        code: coupon.code,
        percentage: coupon.percentage,
        type: coupon.type as "DEFAULT" | "SPECIAL",
        validUntil: coupon.validUntil,
        applyToEnrollment: coupon.applyToEnrollment,
        applyToCourse: coupon.applyToCourse,
      });
    }
  }

  return applicableCoupons;
}

export async function getSelectedCoupon(
  userId: string,
  courseId: string,
  feeType?: "enrollment" | "course",
  couponId?: string | null
): Promise<ApplicableCoupon | null> {
  const applicableCoupons = await getApplicableCoupons(userId, courseId, feeType);
  if (applicableCoupons.length === 0) return null;

  if (couponId === "none" || couponId === "") {
    return null;
  }

  if (couponId) {
    const found = applicableCoupons.find((c) => c.id === couponId || c.code === couponId);
    if (found) return found;
  }

  // Default to highest discount coupon if not specified
  return applicableCoupons[0];
}

/** Backwards-compatible helper returning the selected or default top coupon. */
export async function getBestApplicableCoupon(
  userId: string,
  courseId: string,
  feeType?: "enrollment" | "course"
) {
  return getSelectedCoupon(userId, courseId, feeType);
}

export function calculateDiscountedAmount(originalPaise: number, percentage: number): number {
  if (percentage >= 100) return 0;
  if (percentage <= 0) return originalPaise;
  const discount = Math.floor((originalPaise * percentage) / 100);
  return originalPaise - discount;
}
