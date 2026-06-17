"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { getFatwaPublicUrl, resolveFatwaFeaturedUpdate } from "@/lib/fatwa";
import { sendFatwaAnswerEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { fatwaAnswerSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

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
      featuredOnHomepage: existing.featuredOnHomepage,
      featuredAt: existing.featuredAt,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(featured.error)}`);
  }

  await withDbErrorHandling(() => prisma.fatwaQuestion.update({
      where: { id },
      data: {
        answer: parsed.data.answer,
        answeredAt: existing.answeredAt ?? now,
        answeredById: session.user.id,
        ...featured,
      },
    }), "Database operation failed");

  revalidatePath("/");
  revalidatePath("/fatwa");
  revalidatePath(`/fatwa/${id}`);
  revalidatePath("/admin/fatwa");
  revalidatePath(`/admin/fatwa/${id}`);

  const fatwaUrl = getFatwaPublicUrl(id);
  const emailResult = await sendFatwaAnswerEmail({
    to: existing.askerEmail,
    askerName: existing.askerName,
    questionTitle: existing.title,
    fatwaUrl,
  });

  const savedParams = new URLSearchParams({ saved: "1" });
  if (!emailResult.sent) {
    savedParams.set("email", emailResult.skipped ? "skipped" : "failed");
  }

  redirect(`/admin/fatwa/${id}?${savedParams.toString()}`);
}

export async function deleteFatwaQuestion(id: string): Promise<{ error?: string }> {
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

  return {};
}

export async function deleteFatwaQuestionForm(id: string) {
  const result = await deleteFatwaQuestion(id);
  if (result.error) {
    redirect(`/admin/fatwa/${id}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/admin/fatwa?deleted=1");
}
