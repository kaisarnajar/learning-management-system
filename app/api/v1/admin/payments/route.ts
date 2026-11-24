import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { courseTitleMap, submissionRow } from "@/services/api-admin-money";
import { getPendingEnrollmentFeePaymentsPaginated, getPendingMonthlyPaymentsPaginated } from "@/services/monthly-payments";

/**
 * Pending fee submissions, as on /admin/payments. `type`: enrollment_pending
 * (default) or monthly_pending; `counts` has both tabs' badge numbers.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/payments", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const type = params.get("type") === "monthly_pending" ? "monthly_pending" : "enrollment_pending";
    const query = q || undefined;
    const [titleById, enrollment, monthly] = await Promise.all([
      courseTitleMap(),
      getPendingEnrollmentFeePaymentsPaginated(type === "enrollment_pending" ? page : 1, type === "enrollment_pending" ? pageSize : 1, query),
      getPendingMonthlyPaymentsPaginated(type === "monthly_pending" ? page : 1, type === "monthly_pending" ? pageSize : 1, query),
    ]);
    const active = type === "enrollment_pending" ? enrollment : monthly;
    return {
      ...pagedBody(active.items.map((s) => submissionRow(s, titleById)), active.totalCount, page, pageSize),
      type,
      counts: { enrollment_pending: enrollment.totalCount, monthly_pending: monthly.totalCount },
    };
  });
}
