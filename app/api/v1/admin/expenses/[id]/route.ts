import { NextRequest } from "next/server";
import { deleteExpenseById } from "@/app/admin/finance/actions";
import { ADMIN_ROLES, staffAction } from "@/services/api-staff";

type Params = { params: Promise<{ id: string }> };

/** Deletes a recorded expense (Finance → Expense, Completed payments → manual expenses). */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/expenses/[id] DELETE", () => deleteExpenseById(id));
}
