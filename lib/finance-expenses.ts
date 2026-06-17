import type { Prisma } from "@prisma/client";
import { isTeacherExpenseFilterRelevant } from "@/lib/expense-categories";
import type { FinanceFilters } from "@/lib/finance-filters";
import { financePaidAtWhere } from "@/lib/finance-filters";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";

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

  const base = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(isTeacherExpenseFilterRelevant(filters.category) && filters.teacherId
      ? { teacherId: filters.teacherId }
      : {}),
    ...(paidAt ? { paidAt } : {}),
  };

  return andWhere(Object.keys(base).length > 0 ? base : undefined, expenseSearchWhere(filters.q));
}


export async function getExpensesPaginated(
  filters: FinanceFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>>> {
  const where = buildExpenseWhere(filters);
  const totalCount = await prisma.expense.count({ where });
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await prisma.expense.findMany({
    where,
    include: expenseInclude,
    orderBy: { paidAt: "desc" },
    ...paginationArgs(safePage, pageSize),
  });
  return { items, totalCount };
}

export async function getExpenseTotal(filters: FinanceFilters): Promise<number> {
  const result = await prisma.expense.aggregate({
    where: buildExpenseWhere(filters),
    _sum: { amountInrPaise: true },
  });

  return result._sum.amountInrPaise ?? 0;
}
