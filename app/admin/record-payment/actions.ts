"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/services/auth-actions";
import { getCourseById } from "@/services/courses";
import { rupeesToPaise } from "@/utils/form";
import { notifyPaymentApproved } from "@/services/notifications";
import { prisma } from "@/utils/prisma";
import { paymentRecordSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";
import { redirect } from "next/navigation";
import { previewStudentAccountForEnrollment } from "@/app/admin/enrollments/actions";

export type RecordPaymentState = {
  error?: string;
  success?: string;
};

export async function recordStudentPayment(
  _prev: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  await requireAdmin();

  const email = formData.get("email") as string;
  if (!email || !email.trim()) {
    return { error: "Student email must be provided." };
  }

  const parsed = paymentRecordSchema.safeParse({
    courseId: formData.get("courseId") || undefined,
    amountInr: formData.get("amountInr"),
    paidAt: formData.get("paidAt"),
    paymentType: formData.get("paymentType") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payment data." };
  }

  // Use the same lookup logic used for manual enrollment to ensure exact match
  const lookup = await previewStudentAccountForEnrollment(email.trim());
  if (!lookup.ok) {
    return { error: lookup.error ?? "Student not found." };
  }

  // Get the actual user ID from DB now that we verified the email
  const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { email: email.trim() } }), "Database operation failed");
  if (!user) {
    return { error: "Student not found in database." };
  }

  const userId = user.id;
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
        paymentType: parsed.data.paymentType,
        description: null, // Description field was removed
      },
    }), "Database operation failed");

  await notifyPaymentApproved({
    userId,
    courseTitle,
    sourceId: record.id,
    sourceType: "PaymentRecord",
  });

  revalidatePaymentPaths(userId);

  redirect(`/admin/transactions?tab=payments&saved=1`);
}

function revalidatePaymentPaths(userId: string) {
  revalidatePath(`/admin/students/${userId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/payments");
  revalidatePath("/profile/payments");
  revalidatePath("/profile/notifications");
  revalidatePath("/admin/transactions");
}
