"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { createAdminCrudActions, parseFormWith } from "@/services/admin-crud";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/services/auth-actions";
import { getFatwaPublicUrl, resolveFatwaFeaturedUpdate } from "@/services/fatwa";
import { sendFatwaAnswerEmail, sendFatwaStatusTeacherEmail, type EmailSendResult } from "@/services/email";
import { prisma } from "@/utils/prisma";
import { fatwaAnswerSchema } from "@/utils/validations";
import { sanitizeRichText } from "@/services/rich-text";
import { withDbErrorHandling } from "@/utils/db-error";
import { BRAND_CONFIG } from "@/config/brand";
import { revalidatePublicContent } from "@/services/public-cache";

const parseFatwaAnswerForm = parseFormWith(
  fatwaAnswerSchema,
  (formData: FormData) => ({ answer: sanitizeRichText(String(formData.get("answer") ?? "")) }),
  "Invalid answer",
);

function revalidateFatwaPaths(id: string) {
  revalidatePath("/");

  revalidatePublicContent();
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);
}

// Rejecting a question is the module's "update"; deleting it is its "remove".
const crud = createAdminCrudActions({
  label: "fatwa question",
  notFoundMessage: "Question not found.",
  model: {
    find: (id) => prisma.fatwaQuestion.findUnique({ where: { id } }),
    update: (id, data) => prisma.fatwaQuestion.update({ where: { id }, data: data as Prisma.FatwaQuestionUncheckedUpdateInput }),
    remove: (id) => prisma.fatwaQuestion.delete({ where: { id } }),
  },
  parse: parseFatwaAnswerForm,
  paths: {
    list: "/admin/fatwa",
    editForm: (id) => `/admin/fatwa/${id}`,
    afterUpdate: (id) => `/admin/fatwa/${id}?rejected=1`,
    revalidate: (id) => revalidateFatwaPaths(id as string),
  },
  hooks: {
    toColumns: (data) => ({
      answer: data.answer,
      approvalStatus: "REJECTED",
      featuredOnHomepage: false,
      featuredAt: null,
    }),

    afterUpdate: async ({ id, existing }) => {
      if (existing.answeredById) {
        const teacherId = existing.answeredById;
        after(async () => {
          const teacherUser = await prisma.user.findUnique({ where: { id: teacherId } }).catch(() => null);
          if (teacherUser?.email) {
            await sendFatwaStatusTeacherEmail({
              to: teacherUser.email,
              teacherName: teacherUser.name || "Teacher",
              questionTitle: existing.title,
              status: "rejected",
              fatwaUrl: getFatwaPublicUrl(id),
            });
          }
        });
      }
    },
  },
});

export async function answerFatwaQuestion(id: string, formData: FormData) {
  const session = await requireAdmin();

  const parsed = fatwaAnswerSchema.safeParse({
    answer: sanitizeRichText(String(formData.get("answer") ?? "")),
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
  // The asker is told once, when the answer first goes live; later edits of
  // an approved answer must not send the same "your question was answered" mail again.
  const firstApproval = existing.approvalStatus !== "APPROVED";

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

  revalidateFatwaPaths(id);

  const fatwaUrl = getFatwaPublicUrl(id);
  const isAnonymous = existing.askerEmail === `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}` || existing.askerName === "Anonymous";

  let emailResult: EmailSendResult = { sent: false, skipped: true };
  if (!isAnonymous && firstApproval) {
    emailResult = await sendFatwaAnswerEmail({
      to: existing.askerEmail,
      askerName: existing.askerName,
      questionTitle: existing.title,
      fatwaUrl,
    });
  }

  if (wasPending && existing.answeredById) {
    // Courtesy mail to the teacher: sent after the response, never on its critical path.
    const teacherId = existing.answeredById;
    after(async () => {
      const teacherUser = await prisma.user.findUnique({ where: { id: teacherId } }).catch(() => null);
      if (teacherUser?.email) {
        await sendFatwaStatusTeacherEmail({
          to: teacherUser.email,
          teacherName: teacherUser.name || "Teacher",
          questionTitle: existing.title,
          status: "approved",
          fatwaUrl,
        });
      }
    });
  }

  const savedParams = new URLSearchParams({ saved: "1" });
  if (isAnonymous) {
    savedParams.set("email", "anonymous");
  } else if (firstApproval && !emailResult.sent) {
    savedParams.set("email", emailResult.skipped ? "skipped" : "failed");
  }

  redirect(`/admin/fatwa/${id}?${savedParams.toString()}`);
}

export async function deleteFatwaQuestion(id: string): Promise<{ error?: string; success?: string }> {
  const result = await crud.removeById(id);
  return result.error ? result : { success: "Fatwa successfully deleted." };
}

export async function deleteFatwaQuestionForm(id: string) {
  const result = await deleteFatwaQuestion(id);
  if (result.error) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/fatwa?deleted=1");
}

export async function rejectFatwaQuestion(id: string, formData: FormData) {
  return crud.update(id, formData);
}
