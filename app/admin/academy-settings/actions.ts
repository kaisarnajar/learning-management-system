"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { academySettingsSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function revalidateAcademySettingsPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/academy-settings", "page");
}

export async function updateAcademySettings(formData: FormData) {
  await requireAdmin();

  const parsed = academySettingsSchema.safeParse({
    academyName: formData.get("academyName"),
    academyAddress: formData.get("academyAddress"),
    academyWebsite: formData.get("academyWebsite"),
  });

  if (!parsed.success) {
    redirect(
      `/admin/academy-settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
    );
  }

  const data = {
    academyName: parsed.data.academyName,
    academyAddress: parsed.data.academyAddress,
    academyWebsite: parsed.data.academyWebsite,
  };

  await withDbErrorHandling(() => prisma.academySettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    }), "Database operation failed");

  revalidateAcademySettingsPaths();
  redirect("/admin/academy-settings?saved=1");
}
