"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-actions";
import { getCourseById } from "@/lib/courses";
import { rupeesToPaise } from "@/lib/form";
import { PAYMENT_TYPE_MANUAL } from "@/lib/monthly-payment-status";
import { notifyPaymentApproved } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { paymentRecordSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";
import { redirect } from "next/navigation";

export type RecordPaymentState = {
  error?: string;
  success?: string;
};

export async function recordStudentPayment(
  _prev: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  if (!userId) {
    return { error: "Student must be selected." };
  }

  const parsed = paymentRecordSchema.safeParse({
    courseId: formData.get("courseId") || undefined,
    amountInr: formData.get("amountInr"),
    paidAt: formData.get("paidAt"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment data." };
  }

  const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { id: userId } }), "Database operation failed");
  if (!user) {
    return { error: "Student not found." };
  }

  const courseId = parsed.data.courseId?.trim() || null;
  let courseTitle = "your account";
  if (courseId) {
    const course = await getCourseById(courseId);
    if (!course) {
      return { error: "Course not found." };
    }
    courseTitle = course.title;
  }

  const paidAt = new Date(parsed.data.paidAt);
  if (Number.isNaN(paidAt.getTime())) {
    return { error: "Invalid payment date." };
  }

  const record = await withDbErrorHandling(() => prisma.paymentRecord.create({
      data: {
        userId,
        courseId,
        amountInrPaise: rupeesToPaise(parsed.data.amountInr),
        paidAt,
        paymentType: PAYMENT_TYPE_MANUAL,
        description: parsed.data.description?.trim() || null,
      },
    }), "Database operation failed");

  await notifyPaymentApproved({
    userId,
    courseTitle,
    sourceId: record.id,
    sourceType: "PaymentRecord",
  });

  revalidatePath(`/admin/students/${userId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/payments");
  revalidatePath("/profile/payments");
  revalidatePath("/profile/notifications");

  revalidatePath("/admin/transactions");

  redirect(`/admin/transactions?tab=payments&saved=1`);
}
