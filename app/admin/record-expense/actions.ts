"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { EXPENSE_CATEGORY_OTHER, EXPENSE_CATEGORY_TEACHER_SALARY } from "@/services/expense-categories";
import { businessDayStart } from "@/services/business-time";
import { rupeesToPaise } from "@/utils/form";
import { prisma } from "@/utils/prisma";
import { expenseSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

export type RecordExpenseState = {
  error?: string;
};

function revalidateExpensePaths() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
}

export async function recordExpense(
  _prev: RecordExpenseState,
  formData: FormData,
): Promise<RecordExpenseState> {
  await requireAdmin();

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    amountInr: formData.get("amountInr"),
    paidAt: formData.get("paidAt"),
    description: formData.get("description") || undefined,
    note: formData.get("note") || undefined,
    teacherId: formData.get("teacherId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid expense data." };
  }

  // Stored as midnight of that day in the business timezone, so the row
  // lands in the calendar month the admin picked.
  const paidAt = businessDayStart(parsed.data.paidAt);
  if (!paidAt) {
    return { error: "Invalid payment date." };
  }

  const teacherId =
    parsed.data.category === EXPENSE_CATEGORY_TEACHER_SALARY
      ? parsed.data.teacherId?.trim() || null
      : null;

  if (teacherId) {
    const teacher = await withDbErrorHandling(() => prisma.teacher.findUnique({ where: { id: teacherId } }), "Database operation failed");
    if (!teacher) {
      return { error: "Teacher not found." };
    }
  }

  await withDbErrorHandling(() => prisma.expense.create({
      data: {
        category: parsed.data.category,
        amountInrPaise: rupeesToPaise(parsed.data.amountInr),
        paidAt,
        description: parsed.data.description?.trim() || null,
        note: parsed.data.category === EXPENSE_CATEGORY_OTHER ? parsed.data.note?.trim() || null : null,
        teacherId,
      },
    }), "Database operation failed");

  revalidateExpensePaths();
  revalidatePath("/admin/transactions");
  redirect("/admin/transactions?tab=expenses&saved=1");
}
