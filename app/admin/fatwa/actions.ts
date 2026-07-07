"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { getFatwaPublicUrl, resolveFatwaFeaturedUpdate } from "@/services/fatwa";
import { sendFatwaAnswerEmail, sendFatwaStatusTeacherEmail, type EmailSendResult } from "@/services/email";
import { prisma } from "@/utils/prisma";
import { fatwaAnswerSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

export async function answerFatwaQuestion(id: string, formData: FormData) {
  const session = await requireAdmin();

  const parsed = fatwaAnswerSchema.safeParse({
    answer: formData.get("answer"),
  });

  if (!parsed.success) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid answer")}`);
  }

  const existing = await withDbErrorHandling(() => prisma.fatwaQuestion.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    redirect("/admin/fatwa?error=notfound");
  }

  const now = new Date();
  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const featured = await resolveFatwaFeaturedUpdate({
    fatwa: {
      answer: parsed.data.answer,
      approvalStatus: "APPROVED",
      featuredOnHomepage: existing.featuredOnHomepage,
      featuredAt: existing.featuredAt,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(featured.error)}`);
  }

  const wasPending = existing.approvalStatus === "PENDING";

  await withDbErrorHandling(() => prisma.fatwaQuestion.update({
      where: { id },
      data: {
        answer: parsed.data.answer,
        answeredAt: existing.answeredAt ?? now,
        // Keep the original teacher as answeredById if they wrote it, 
        // otherwise if it was unanswered, the admin is the answerer.
        answeredById: existing.answeredById ?? session.user.id,
        approvalStatus: "APPROVED",
        ...featured,
      },
    }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);

  const fatwaUrl = getFatwaPublicUrl(id);
  const isAnonymous = existing.askerEmail === "anonymous@darsequranacademy.org" || existing.askerName === "Anonymous";

  let emailResult: EmailSendResult = { sent: false, skipped: true };
  if (!isAnonymous) {
    emailResult = await sendFatwaAnswerEmail({
      to: existing.askerEmail,
      askerName: existing.askerName,
      questionTitle: existing.title,
      fatwaUrl,
    });
  }

  if (wasPending && existing.answeredById) {
    const teacherUser = await withDbErrorHandling(() => prisma.user.findUnique({ where: { id: existing.answeredById! } }), "Database operation failed");
    if (teacherUser && teacherUser.email) {
      await sendFatwaStatusTeacherEmail({
        to: teacherUser.email,
        teacherName: teacherUser.name || "Teacher",
        questionTitle: existing.title,
        status: "approved",
        fatwaUrl,
      });
    }
  }

  const savedParams = new URLSearchParams({ saved: "1" });
  if (isAnonymous) {
    savedParams.set("email", "anonymous");
  } else if (!emailResult.sent) {
    savedParams.set("email", emailResult.skipped ? "skipped" : "failed");
  }

  redirect(`/admin/fatwa/${id}?${savedParams.toString()}`);
}

export async function deleteFatwaQuestion(id: string): Promise<{ error?: string; success?: string }> {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.fatwaQuestion.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    return { error: "Question not found." };
  }

  await withDbErrorHandling(() => prisma.fatwaQuestion.delete({ where: { id } }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);

  return { success: "Fatwa successfully deleted." };
}

export async function deleteFatwaQuestionForm(id: string) {
  const result = await deleteFatwaQuestion(id);
  if (result.error) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/fatwa?deleted=1");
}

export async function rejectFatwaQuestion(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = fatwaAnswerSchema.safeParse({
    answer: formData.get("answer"),
  });

  if (!parsed.success) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid answer")}`);
  }

  const existing = await withDbErrorHandling(() => prisma.fatwaQuestion.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    redirect("/admin/fatwa?error=notfound");
  }

  await withDbErrorHandling(() => prisma.fatwaQuestion.update({
      where: { id },
      data: {
        answer: parsed.data.answer,
        approvalStatus: "REJECTED",
        featuredOnHomepage: false,
        featuredAt: null,
      },
    }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);

  if (existing.answeredById) {
    const teacherUser = await withDbErrorHandling(() => prisma.user.findUnique({ where: { id: existing.answeredById! } }), "Database operation failed");
    if (teacherUser && teacherUser.email) {
      const fatwaUrl = getFatwaPublicUrl(id);
      await sendFatwaStatusTeacherEmail({
        to: teacherUser.email,
        teacherName: teacherUser.name || "Teacher",
        questionTitle: existing.title,
        status: "rejected",
        fatwaUrl,
      });
    }
  }

  redirect(`/admin/fatwa/${id}?rejected=1`);
}
