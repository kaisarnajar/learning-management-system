import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { bookOrderRow, courseTitleMap, expenseRow, financeFiltersFromRequest, incomeRow, submissionRow } from "@/services/api-admin-money";
import { getApprovedEnrollmentFeePaymentsPaginated, getApprovedMonthlyPaymentsPaginated } from "@/services/monthly-payments";
import { getIncomeRecordsPaginated } from "@/services/finance-income";
import { getExpensesPaginated } from "@/services/finance-expenses";
import { getApprovedBookPaymentsPaginated, getRefundedBookOrdersPaginated } from "@/services/bookstore";

const TABS = [
  { value: "enrollment_approved", label: "Enrollment Fee Approved" },
  { value: "monthly_approved", label: "Course Fee Approved" },
  { value: "enrollment_waiver", label: "100% Fee Waiver (Enrollment)" },
  { value: "monthly_waiver", label: "100% Fee Waiver (Course)" },
  { value: "book_approved", label: "Book Order Payments" },
  { value: "book_refunded", label: "Book Order Refunds" },
  { value: "manual_transactions", label: "Manually Added Transactions" },
  { value: "manual_expenses", label: "Manually Added Expenses" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/**
 * Completed payments, as on /admin/completed-payments. `type` is one of the
 * page's tabs (listed in `tabs`). Every row has a `kind`: submission,
 * book_order, income or expense.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/completed-payments", async () => {
    const { page, pageSize, q, params } = staffListParams(request);
    const requested = params.get("type");
    const type: Tab = TABS.some((t) => t.value === requested) ? (requested as Tab) : "enrollment_approved";
    const query = q || undefined;

    let rows: unknown[];
    let totalCount: number;
    if (type === "book_approved" || type === "book_refunded") {
      const result = type === "book_approved"
        ? await getApprovedBookPaymentsPaginated(page, pageSize, query)
        : await getRefundedBookOrdersPaginated(page, pageSize, query);
      rows = result.items.map(bookOrderRow);
      totalCount = result.totalCount;
    } else if (type === "manual_transactions" || type === "manual_expenses") {
      // The page lists every manual entry (all time) unless a date range is given.
      const filters = financeFiltersFromRequest(request, { preset: params.get("preset") ?? "all_time" });
      if (type === "manual_transactions") {
        const result = await getIncomeRecordsPaginated({ ...filters, onlyManual: true, q: query }, page, pageSize);
        rows = result.items.map(incomeRow);
        totalCount = result.totalCount;
      } else {
        const result = await getExpensesPaginated({ ...filters, onlyManual: true, q: query }, page, pageSize);
        rows = result.items.map(expenseRow);
        totalCount = result.totalCount;
      }
    } else {
      const filter = type.endsWith("_waiver") ? "waiver" : "paid";
      const [titleById, result] = await Promise.all([
        courseTitleMap(),
        type.startsWith("enrollment")
          ? getApprovedEnrollmentFeePaymentsPaginated(page, pageSize, query, filter)
          : getApprovedMonthlyPaymentsPaginated(page, pageSize, query, filter),
      ]);
      rows = result.items.map((s) => submissionRow(s, titleById));
      totalCount = result.totalCount;
    }

    return { ...pagedBody(rows, totalCount, page, pageSize), type, tabs: TABS };
  });
}
