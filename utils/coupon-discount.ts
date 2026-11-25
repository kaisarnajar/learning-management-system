/**
 * Coupon discounts.
 * Pure (no Prisma, no server APIs), so client components import them
 * here; the service module re-exports them for server code.
 */

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

export function calculateDiscountedAmount(originalPaise: number, percentage: number): number {
  if (percentage >= 100) return 0;
  if (percentage <= 0) return originalPaise;
  const discount = Math.floor((originalPaise * percentage) / 100);
  return originalPaise - discount;
}
