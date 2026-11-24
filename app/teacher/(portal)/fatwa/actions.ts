"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireTeacher } from "@/services/auth-actions";
import { sendFatwaSubmissionAdminEmail } from "@/services/email";
import { prisma } from "@/utils/prisma";
import { fatwaAnswerSchema } from "@/utils/validations";
import { sanitizeRichText } from "@/services/rich-text";
import { withDbErrorHandling } from "@/utils/db-error";
import { BRAND_CONFIG } from "@/config/brand";
import { revalidatePublicContent } from "@/services/public-cache";
import { FATWA_ANSWER_EDITABLE_WHERE, isFatwaAnswerLocked } from "@/services/fatwa";

export async function submitTeacherFatwaAnswer(id: string, formData: FormData) {
  const { session, teacher } = await requireTeacher();

  const parsed = fatwaAnswerSchema.safeParse({
    answer: sanitizeRichText(String(formData.get("answer") ?? "")),
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

  const lockedMessage = "This answer is awaiting review or already published and can't be changed.";
  if (isFatwaAnswerLocked(existing)) {
    redirect(`/teacher/fatwa/${id}?error=${encodeURIComponent(lockedMessage)}`);
  }

  // Re-checked in the write, so an approval that lands meanwhile is not undone.
  const updated = await withDbErrorHandling(() => prisma.fatwaQuestion.updateMany({
      where: {
        id,
        ...FATWA_ANSWER_EDITABLE_WHERE,
        OR: [{ answer: null }, { answeredById: session.user.id }],
      },
      data: {
        answer: parsed.data.answer,
        answeredById: session.user.id,
        approvalStatus: "PENDING",
      },
    }), "Database operation failed");
  if (updated.count === 0) {
    redirect(`/teacher/fatwa/${id}?error=${encodeURIComponent(lockedMessage)}`);
  }

  revalidatePath("/");


  revalidatePublicContent();
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);
  revalidatePath("/teacher/fatwa");
  revalidatePath(`/teacher/fatwa/${id}`);

  // Only a first answer or a resubmission after rejection gets this far, and
  // either one asks an admin to review it. Notify after the response; the
  // teacher's save must not wait on SMTP.
  const adminReviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || BRAND_CONFIG.websiteUrl}/admin/fatwa/${id}`;
  after(() => sendFatwaSubmissionAdminEmail({
    teacherName: teacher.name,
    questionTitle: existing.title,
    adminReviewUrl,
  }));

  redirect(`/teacher/fatwa/${id}?saved=1`);
}
