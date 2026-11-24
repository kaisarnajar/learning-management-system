import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { financeFiltersFromRequest, financeRangeBody } from "@/services/api-admin-money";
import { getFeeWaiverFinanceData } from "@/services/waiver-finance";

/**
 * Claimed fee waivers, as on /admin/coupons/finance: `stats` for the filters
 * and the page of waivers. Filters as /api/v1/admin/finance (date range,
 * courseId, studentId, paymentType, q).
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/coupons/finance", async () => {
    const { page, pageSize } = staffListParams(request);
    const filters = financeFiltersFromRequest(request);
    const { stats, paginatedResult } = await getFeeWaiverFinanceData(filters, page, pageSize);
    return {
      ...pagedBody(paginatedResult.items, paginatedResult.totalCount, page, pageSize),
      range: financeRangeBody(filters),
      stats,
    };
  });
}
