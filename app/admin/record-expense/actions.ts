"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { EXPENSE_CATEGORY_TEACHER_SALARY } from "@/lib/expense-categories";
import { rupeesToPaise } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

export type RecordExpenseState = {
  error?: string;
};

function revalidateExpensePaths() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/record-expense");
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
    teacherId: formData.get("teacherId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid expense data." };
  }

  const paidAt = new Date(parsed.data.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
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
        teacherId,
      },
    }), "Database operation failed");

  revalidateExpensePaths();
  revalidatePath("/admin/transactions");
  redirect("/admin/transactions?tab=expenses&saved=1");
}
