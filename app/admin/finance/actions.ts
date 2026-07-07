"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import {
  buildFinanceQueryString,
  parseFinanceFilters,
  type FinanceSearchParams,
} from "@/services/finance-filters";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

function revalidateFinancePaths() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}

export async function deleteExpenseById(
  id: string,
  returnQuery: FinanceSearchParams = {},
  basePath: string = "/admin/finance"
): Promise<{ error?: string; redirectTo?: string }> {
  await requireAdmin();

  const expense = await withDbErrorHandling(() => prisma.expense.findUnique({ where: { id } }), "Database operation failed");
  if (!expense) {
    return { error: "Expense not found." };
  }

  await withDbErrorHandling(() => prisma.expense.delete({ where: { id } }), "Database operation failed");

  revalidateFinancePaths();
  revalidatePath("/admin/transactions");

  const filters = parseFinanceFilters(returnQuery);
  const query = buildFinanceQueryString(filters, { tab: "expenses", deleted: "1" });
  return { redirectTo: `${basePath}${query}` };
}
