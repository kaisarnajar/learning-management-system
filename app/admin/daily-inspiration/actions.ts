"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { dailyInspirationSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function adminListPath(suffix = "") {
  return `/admin/daily-inspiration${suffix}`;
}

function parseDailyInspirationForm(formData: FormData) {
  return dailyInspirationSchema.safeParse({
    kind: formData.get("kind"),
    arabicText: formData.get("arabicText"),
    englishTranslation: formData.get("englishTranslation"),
    reference: formData.get("reference") ?? "",
    published: formData.get("published") === "on",
  });
}

function revalidateDailyInspirationPaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/daily-inspiration");
}

export async function createDailyInspiration(formData: FormData) {
  const session = await requireAdmin();
  const parsed = parseDailyInspirationForm(formData);

  if (!parsed.success) {
    redirect(
      adminListPath(
        `/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
      ),
    );
  }

  await withDbErrorHandling(() => prisma.dailyInspiration.create({
      data: {
        kind: parsed.data.kind,
        arabicText: parsed.data.arabicText,
        englishTranslation: parsed.data.englishTranslation,
        reference: parsed.data.reference || null,
        published: parsed.data.published,
        createdById: session.user.id,
      },
    }), "Database operation failed");

  revalidateDailyInspirationPaths();
  redirect(`${adminListPath()}?posted=1`);
}

export async function updateDailyInspiration(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseDailyInspirationForm(formData);

  if (!parsed.success) {
    redirect(
      adminListPath(
        `/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
      ),
    );
  }

  const existing = await withDbErrorHandling(() => prisma.dailyInspiration.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    redirect(`${adminListPath()}?error=notfound`);
  }

  await withDbErrorHandling(() => prisma.dailyInspiration.update({
      where: { id },
      data: {
        kind: parsed.data.kind,
        arabicText: parsed.data.arabicText,
        englishTranslation: parsed.data.englishTranslation,
        reference: parsed.data.reference || null,
        published: parsed.data.published,
      },
    }), "Database operation failed");

  revalidateDailyInspirationPaths();
  redirect(`${adminListPath()}/${id}/edit?saved=1`);
}

export async function deleteDailyInspiration(id: string) {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.dailyInspiration.findUnique({ where: { id } }), "Database operation failed");
  if (!existing) {
    redirect(`${adminListPath()}?error=notfound`);
  }

  await withDbErrorHandling(() => prisma.dailyInspiration.delete({ where: { id } }), "Database operation failed");

  revalidateDailyInspirationPaths();
  redirect(`${adminListPath()}?deleted=1`);
}
