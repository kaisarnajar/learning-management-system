import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { financeFiltersFromRequest, financeRangeBody } from "@/services/api-admin-money";
import { bookOrderStatusLabel } from "@/services/bookstore";
import { getBookOrderFinancePaginated, getBookSalesPaginated, getBookstoreFinanceSummary } from "@/services/finance-bookstore";

/**
 * Book Store finance, as on /admin/finance/bookstore. `view`: sales (default,
 * the book sales report) or orders (the order finance report); date range as
 * /api/v1/admin/finance; `q` searches. `summary` uses the date range only.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/finance/bookstore", async () => {
    const { page, pageSize, params } = staffListParams(request);
    const filters = financeFiltersFromRequest(request);
    const view = params.get("view") === "orders" ? "orders" : "sales";
    const summary = await getBookstoreFinanceSummary({ from: filters.from, to: filters.to });

    if (view === "sales") {
      const { items, totalCount } = await getBookSalesPaginated(filters, page, pageSize);
      return { ...pagedBody(items.map((r) => ({ kind: "sale", ...r })), totalCount, page, pageSize), view, range: financeRangeBody(filters), summary };
    }

    const { items, totalCount } = await getBookOrderFinancePaginated(filters, page, pageSize);
    return {
      ...pagedBody(
        items.map((r) => ({ kind: "order", ...r, statusLabel: bookOrderStatusLabel(r.status), orderNumber: r.id.slice(-8).toUpperCase() })),
        totalCount,
        page,
        pageSize,
      ),
      view,
      range: financeRangeBody(filters),
      summary,
    };
  });
}
