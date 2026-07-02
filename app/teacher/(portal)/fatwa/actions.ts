"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth-actions";
import { sendFatwaSubmissionAdminEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { fatwaAnswerSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

export async function submitTeacherFatwaAnswer(id: string, formData: FormData) {
  const { session, teacher } = await requireTeacher();

  const parsed = fatwaAnswerSchema.safeParse({
    answer: formData.get("answer"),
  });

  if (!parsed.success) {
    redirect(`/teacher/fatwa/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid answer")}`);
  }

  const existing = await withDbErrorHandling(() => prisma.fatwaQuestion.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    redirect("/teacher/fatwa?error=notfound");
  }

  // Ensure teacher only answers unanswered or their own pending/rejected answers
  if (existing.answer && existing.answeredById !== session.user.id) {
    redirect(`/teacher/fatwa/${id}?error=${encodeURIComponent("This question is already being answered by someone else.")}`);
  }

  // Determine if we need to email admin (only on first submit or if it was rejected and now resubmitted)
  const isNewSubmission = existing.approvalStatus !== "PENDING";

  await withDbErrorHandling(() => prisma.fatwaQuestion.update({
      where: { id },
      data: {
        answer: parsed.data.answer,
        answeredById: session.user.id,
        approvalStatus: "PENDING",
      },
    }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);
  revalidatePath("/teacher/fatwa");
  revalidatePath(`/teacher/fatwa/${id}`);

  if (isNewSubmission) {
    const adminReviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://darsequranacademy.com"}/admin/fatwa/${id}`;
    await sendFatwaSubmissionAdminEmail({
      teacherName: teacher.name,
      questionTitle: existing.title,
      adminReviewUrl,
    });
  }

  redirect(`/teacher/fatwa/${id}?saved=1`);
}
