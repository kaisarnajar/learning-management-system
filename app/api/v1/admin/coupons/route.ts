import { NextRequest } from "next/server";
import { createDefaultCoupon } from "@/app/admin/coupons/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { getAdminCouponsPaginated, getCouponCourseOptions } from "@/services/coupons-admin";

function applyTo(c: { applyToEnrollment: boolean; applyToCourse: boolean }) {
  if (c.applyToEnrollment && c.applyToCourse) return { value: "BOTH", label: "Both Fees" };
  if (c.applyToEnrollment) return { value: "ENROLLMENT", label: "Enrollment Only" };
  return { value: "COURSE", label: "Course Only" };
}

/** Coupons, as on /admin/coupons. `type`: DEFAULT (default) or SPECIAL. `courses` are the course choices of the coupon forms. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/coupons", async () => {
    const { page, pageSize, params } = staffListParams(request);
    const type = params.get("type")?.toUpperCase() === "SPECIAL" ? "SPECIAL" : "DEFAULT";
    const [result, courses] = await Promise.all([getAdminCouponsPaginated(type, page, pageSize), getCouponCourseOptions()]);
    return {
      ...pagedBody(
        result.items.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          percentage: c.percentage,
          validFrom: c.validFrom,
          validUntil: c.validUntil,
          courseId: c.courseId,
          courseTitle: c.course?.title ?? null,
          gender: c.gender,
          user: c.user,
          isActive: c.isActive,
          applyTo: applyTo(c).value,
          applyToLabel: applyTo(c).label,
          createdAt: c.createdAt,
        })),
        result.totalCount,
        page,
        pageSize,
      ),
      type,
      courses,
    };
  });
}

/**
 * Creates a DEFAULT coupon (CreateCouponDialog). Fields: code, percentage,
 * validFrom, validUntil (YYYY-MM-DD), courseId, gender (MALE | FEMALE | ""),
 * applyTo (BOTH | ENROLLMENT | COURSE), isActive ("true").
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/coupons POST", async () => createDefaultCoupon(await readActionForm(request)));
}
