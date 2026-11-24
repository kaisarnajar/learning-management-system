import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { expenseRow, financeFiltersFromRequest, financeRangeBody, incomeRow } from "@/services/api-admin-money";
import { getExpensesPaginated, getExpenseTotal } from "@/services/finance-expenses";
import { getIncomeRecordsPaginated, getIncomeTotal } from "@/services/finance-income";

/**
 * Courses finance, as on /admin/finance. Query: `tab` (income | expenses),
 * `preset` (this_month | last_month | this_year | all_time | custom with
 * `from`/`to` as YYYY-MM-DD), income filters `courseId`, `studentId`,
 * `paymentType`, expense filters `category`, `teacherId`, and `q`.
 * `summary` uses the date range only; `filtered` also applies the tab's filters.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/finance", async () => {
    const { page, pageSize } = staffListParams(request);
    const filters = financeFiltersFromRequest(request);
    const dateOnly = { preset: filters.preset, from: filters.from, to: filters.to, tab: filters.tab };

    const [incomeTotal, expenseTotal] = await Promise.all([getIncomeTotal(dateOnly), getExpenseTotal(dateOnly)]);
    const summary = { incomeTotalPaise: incomeTotal, expenseTotalPaise: expenseTotal, netBalancePaise: incomeTotal - expenseTotal };

    if (filters.tab === "income") {
      const [{ items, totalCount }, filteredTotal] = await Promise.all([
        getIncomeRecordsPaginated(filters, page, pageSize),
        getIncomeTotal(filters),
      ]);
      return {
        ...pagedBody(items.map(incomeRow), totalCount, page, pageSize),
        tab: filters.tab,
        range: financeRangeBody(filters),
        summary,
        filtered: { recordCount: totalCount, totalPaise: filteredTotal },
      };
    }

    const [{ items, totalCount }, filteredTotal] = await Promise.all([
      getExpensesPaginated(filters, page, pageSize),
      getExpenseTotal(filters),
    ]);
    return {
      ...pagedBody(items.map(expenseRow), totalCount, page, pageSize),
      tab: filters.tab,
      range: financeRangeBody(filters),
      summary,
      filtered: { recordCount: totalCount, totalPaise: filteredTotal },
    };
  });
}
