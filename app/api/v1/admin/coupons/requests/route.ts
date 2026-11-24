import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getWaiverRequestsPaginated } from "@/services/coupons-admin";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

/** Fee-waiver requests, as on /admin/coupons (Waiver Requests), newest first. Optional `status`. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/coupons/requests", async () => {
    const { page, pageSize, params } = staffListParams(request);
    const raw = params.get("status")?.toUpperCase();
    const status = STATUSES.find((s) => s === raw);
    const { items, totalCount } = await getWaiverRequestsPaginated(page, pageSize, status);
    return pagedBody(
      items.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        reason: r.reason,
        feeTypeLabel: r.feeTypeLabel,
        status: r.status,
        couponId: r.couponId,
        user: r.user,
        courseTitle: r.course.title,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}
