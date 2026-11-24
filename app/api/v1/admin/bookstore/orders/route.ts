import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import {
  getApprovedBookOrdersPaginated,
  getCompletedBookOrdersPaginated,
  getPendingBookOrdersPaginated,
} from "@/services/bookstore";
import { APPROVAL_PAGE_SIZE } from "@/utils/pagination";
import { serializeBookOrderRow } from "../serialize";

/**
 * Book orders, as on /admin/bookstore/orders. `status`: pending (default: awaiting payment verification),
 * approved (awaiting shipment) or completed (shipped, refunded or declined). `q` searches the customer's name,
 * e-mail and the UPI transaction id. `counts` holds each tab's total, as the website's tab badges.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/bookstore/orders", async () => {
    const { page, pageSize, q, params } = staffListParams(request, APPROVAL_PAGE_SIZE);
    const raw = params.get("status");
    const status = raw === "approved" || raw === "completed" ? raw : "pending";
    const search = q || undefined;
    // Inactive tabs only need their count: ask for one row, as the page does.
    const [pending, approved, completed] = await Promise.all([
      getPendingBookOrdersPaginated(status === "pending" ? page : 1, status === "pending" ? pageSize : 1, search),
      getApprovedBookOrdersPaginated(status === "approved" ? page : 1, status === "approved" ? pageSize : 1, search),
      getCompletedBookOrdersPaginated(status === "completed" ? page : 1, status === "completed" ? pageSize : 1, search),
    ]);
    const active = status === "pending" ? pending : status === "approved" ? approved : completed;
    return {
      ...pagedBody(active.items.map(serializeBookOrderRow), active.totalCount, page, pageSize),
      status,
      counts: { pending: pending.totalCount, approved: approved.totalCount, completed: completed.totalCount },
    };
  });
}
