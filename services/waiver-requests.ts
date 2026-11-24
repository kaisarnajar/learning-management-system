import type { WaiverFeeType } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { isCourseEnrollmentOpen } from "@/services/course-status";
import type { WaiverRequestInput } from "@/utils/validations";

/**
 * Fee-waiver requests. The fee type used to live only as a
 * "[Fee Type: Enrollment Fee]" / "[Fee Type: Course Fee]" prefix inside the
 * free-text reason; it is now a real column (CouponRequest.feeType). Rows
 * created before the column existed are read through parseLegacyFeeType until
 * scripts/backfill-waiver-fee-type.ts has filled the column.
 */

const LEGACY_ENROLLMENT_MARKER = "[Fee Type: Enrollment Fee]";
const LEGACY_COURSE_MARKER = "[Fee Type: Course Fee]";

export function parseLegacyFeeType(reason: string): WaiverFeeType {
  if (reason.includes(LEGACY_ENROLLMENT_MARKER)) return "ENROLLMENT";
  if (reason.includes(LEGACY_COURSE_MARKER)) return "COURSE";
  return "BOTH";
}

export function resolveWaiverFeeType(row: { feeType: WaiverFeeType | null; reason: string }): WaiverFeeType {
  return row.feeType ?? parseLegacyFeeType(row.reason);
}

export function waiverFeeTypeLabel(feeType: WaiverFeeType): string {
  switch (feeType) {
    case "ENROLLMENT":
      return "Enrollment Fee";
    case "COURSE":
      return "Course Fee";
    default:
      return "Both";
  }
}

/**
 * Code suffix of the course-fee coupon issued with a "both fees" waiver. The
 * request links only the enrollment-fee coupon; its sibling is found by code.
 */
export const BOTH_FEES_COURSE_SUFFIX = "-C";

type RequestWithCoupon = { userId: string; courseId: string; feeType: WaiverFeeType | null; reason: string; coupon: { code: string } | null };

/**
 * Adds `couponCodes`: every code the request issued, the linked coupon first
 * and, for an approved "both fees" waiver, its course-fee coupon. One query
 * for the whole list.
 */
export async function withIssuedCouponCodes<T extends RequestWithCoupon>(requests: T[]): Promise<(T & { couponCodes: string[] })[]> {
  const siblingCodes = requests
    .filter((request) => request.coupon && resolveWaiverFeeType(request) === "BOTH")
    .map((request) => `${request.coupon!.code}${BOTH_FEES_COURSE_SUFFIX}`);
  const siblings = siblingCodes.length
    ? await prisma.coupon.findMany({
        where: { code: { in: siblingCodes }, type: "SPECIAL" },
        select: { code: true, userId: true, courseId: true },
      })
    : [];

  return requests.map((request) => {
    if (!request.coupon) return { ...request, couponCodes: [] };
    const siblingCode = `${request.coupon.code}${BOTH_FEES_COURSE_SUFFIX}`;
    const sibling = resolveWaiverFeeType(request) === "BOTH"
      && siblings.some((c) => c.code === siblingCode && c.userId === request.userId && c.courseId === request.courseId);
    return { ...request, couponCodes: sibling ? [request.coupon.code, siblingCode] : [request.coupon.code] };
  });
}

const FORM_FEE_TYPE_TO_ENUM: Record<WaiverRequestInput["feeType"], WaiverFeeType> = {
  enrollment: "ENROLLMENT",
  course: "COURSE",
  both: "BOTH",
};

export type CreateWaiverRequestResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status: 400 | 404 | 409 };

/** Shared by the web server action and the mobile API route. */
export async function createWaiverRequest(userId: string, input: WaiverRequestInput): Promise<CreateWaiverRequestResult> {
  const course = await withDbErrorHandling(
    () => prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true, status: true } }),
    "Database operation failed",
  );
  if (!course) return { ok: false, error: "The selected course does not exist.", status: 404 };
  if (!isCourseEnrollmentOpen(course.status)) {
    return { ok: false, error: "This course is not open for enrollment, so a fee waiver cannot be requested for it.", status: 400 };
  }

  const existing = await withDbErrorHandling(
    () => prisma.couponRequest.findFirst({
      where: { userId, courseId: input.courseId, status: "PENDING" },
      select: { id: true },
    }),
    "Database operation failed",
  );
  if (existing) return { ok: false, error: "You already have a pending waiver request for this course.", status: 409 };

  const created = await withDbErrorHandling(
    () => prisma.couponRequest.create({
      data: {
        userId,
        courseId: input.courseId,
        feeType: FORM_FEE_TYPE_TO_ENUM[input.feeType],
        reason: input.reason,
        status: "PENDING",
      },
      select: { id: true },
    }),
    "Database operation failed",
  );
  return { ok: true, id: created.id };
}
