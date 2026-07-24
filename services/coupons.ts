import { prisma } from "@/utils/prisma";

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

  const [user, enrollment] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    }),
    prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { createdAt: true },
    }),
  ]);

  const now = new Date();
  const db = prisma as any;

  // Find all coupons already used by this student
  const [usedUsages, usedSubmissions] = await Promise.all([
    db.couponUsage.findMany({
      where: { userId },
      select: { couponId: true },
    }),
    db.coursePaymentSubmission.findMany({
      where: {
        userId,
        couponId: { not: null },
        status: { in: ["pending_verification", "approved"] },
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
      const enrolledBeforeCoupon = enrollment && enrollment.createdAt < (coupon.validFrom || coupon.createdAt);
      if (!enrolledBeforeCoupon && (!coupon.gender || coupon.gender === user?.gender)) {
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
  const applicableCoupons = await getApplicableCoupons(userId, courseId, feeType);
  const selectableCoupons = applicableCoupons.filter((c) => !c.isUsed);
  if (selectableCoupons.length === 0) return null;

  if (couponId === "none" || couponId === "") {
    return null;
  }

  if (couponId) {
    const found = selectableCoupons.find((c) => c.id === couponId || c.code === couponId);
    if (found) return found;
  }

  // Default to highest discount usable coupon if not specified
  return selectableCoupons[0];
}

/** Backwards-compatible helper returning the selected or default top coupon. */
export async function getBestApplicableCoupon(
  userId: string,
  courseId: string,
  feeType?: "enrollment" | "course"
) {
  return getSelectedCoupon(userId, courseId, feeType);
}

export async function recordCouponUsage(userId: string, couponId: string) {
  try {
    await (prisma as any).couponUsage.upsert({
      where: { couponId_userId: { couponId, userId } },
      create: { couponId, userId },
      update: {},
    });
    // For SPECIAL coupons, mark as inactive once used
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      select: { type: true },
    });
    if (coupon?.type === "SPECIAL") {
      await prisma.coupon.update({
        where: { id: couponId },
        data: { isActive: false },
      });
    }
  } catch (e) {
    console.error("Error recording coupon usage:", e);
  }
}

export function calculateDiscountedAmount(originalPaise: number, percentage: number): number {
  if (percentage >= 100) return 0;
  if (percentage <= 0) return originalPaise;
  const discount = Math.floor((originalPaise * percentage) / 100);
  return originalPaise - discount;
}
