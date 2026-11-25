import { NextRequest, NextResponse } from "next/server";
import { GET as exportFinance } from "@/app/api/admin/finance/export/route";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";

/**
 * The finance pages' "Export to Excel": the website's own export, run as the
 * app user. Query as /api/admin/finance/export: `type` (income | expenses |
 * book_sales | book_orders) plus the page's filters. The date range must be
 * bounded and the export at most FINANCE_EXPORT_MAX_ROWS rows (400 otherwise).
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/finance/export", async () => {
    const response = await exportFinance(request);
    return new NextResponse(response.body, { status: response.status, headers: response.headers });
  });
}
