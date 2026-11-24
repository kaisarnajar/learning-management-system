import { NextRequest } from "next/server";
import { recordExpense } from "@/app/admin/record-expense/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

/**
 * Records an expense (/admin/transactions → Record Expense). Fields: category,
 * note (names an "other" category), teacherId (teacher salary), amountInr,
 * paidAt (YYYY-MM-DD), description (optional).
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/transactions/expenses", async () =>
    recordExpense({}, await readActionForm(request)),
  );
}
