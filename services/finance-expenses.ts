import type { Prisma } from "@prisma/client";
import { isTeacherExpenseFilterRelevant } from "@/services/expense-categories";
import type { FinanceFilters } from "@/services/finance-filters";
import { financePaidAtWhere } from "@/services/finance-filters";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

const expenseInclude = {
  teacher: { select: { id: true, name: true } },
} as const;

function expenseSearchWhere(q?: string) {
  if (!q) return undefined;
  return buildSearchOr(
    ["description", "category"],
    [{ relation: "teacher", fields: ["name"] }],
    q,
  );
}

function buildExpenseWhere(filters: FinanceFilters) {
  const paidAt = financePaidAtWhere(filters);

  const base: Prisma.ExpenseWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(isTeacherExpenseFilterRelevant(filters.category) && filters.teacherId
      ? { teacherId: filters.teacherId }
      : {}),
    ...(paidAt ? { paidAt } : {}),
  };

  if (filters.onlyManual) {
    // Currently, all Expense records in the system are manually entered by the admin.
    // This block is defined for consistency and future-proofing.
  }

  return andWhere(Object.keys(base).length > 0 ? base : undefined, expenseSearchWhere(filters.q));
}


export async function getExpensesPaginated(
  filters: FinanceFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>>> {
  const where = buildExpenseWhere(filters);
  const totalCount = await withDbErrorHandling(() => prisma.expense.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { paidAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getExpenseTotal(filters: FinanceFilters): Promise<number> {
  const result = await withDbErrorHandling(() => prisma.expense.aggregate({
      where: buildExpenseWhere(filters),
      _sum: { amountInrPaise: true },
    }), "Database operation failed");

  return result._sum.amountInrPaise ?? 0;
}

export async function getExpensesAll(
  filters: FinanceFilters,
): Promise<Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>[]> {
  const where = buildExpenseWhere(filters);
  return withDbErrorHandling(() => prisma.expense.findMany({
      where,
      include: expenseInclude,
      orderBy: { paidAt: "desc" },
    }), "Database operation failed");
}
