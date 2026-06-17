import type { Prisma } from "@prisma/client";
import type { FinanceFilters } from "@/lib/finance-filters";
import { financePaidAtWhere } from "@/lib/finance-filters";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";

function incomeSearchWhere(q?: string) {
  if (!q) return undefined;
  return buildSearchOr(
    ["description"],
    [
      { relation: "user", fields: ["name", "email"] },
      { relation: "course", fields: ["title"] },
    ],
    q,
  );
}

function buildIncomeWhere(filters: FinanceFilters) {
  const paidAt = financePaidAtWhere(filters);

  const base = {
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.studentId ? { userId: filters.studentId } : {}),
    ...(filters.paymentType ? { paymentType: filters.paymentType } : {}),
    ...(paidAt ? { paidAt } : {}),
  };

  return andWhere(Object.keys(base).length > 0 ? base : undefined, incomeSearchWhere(filters.q));
}

const incomeInclude = {
  user: { select: { id: true, name: true, email: true } },
  course: { select: { id: true, title: true } },
} as const;


export async function getIncomeRecordsPaginated(
  filters: FinanceFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<Prisma.PaymentRecordGetPayload<{ include: typeof incomeInclude }>>> {
  const where = buildIncomeWhere(filters);
  const totalCount = await prisma.paymentRecord.count({ where });
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await prisma.paymentRecord.findMany({
    where,
    include: incomeInclude,
    orderBy: { paidAt: "desc" },
    ...paginationArgs(safePage, pageSize),
  });
  return { items, totalCount };
}

export async function getIncomeTotal(filters: FinanceFilters): Promise<number> {
  const result = await prisma.paymentRecord.aggregate({
    where: buildIncomeWhere(filters),
    _sum: { amountInrPaise: true },
  });

  return result._sum.amountInrPaise ?? 0;
}
