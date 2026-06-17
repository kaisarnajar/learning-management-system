"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { normalizeWhatsAppNumber, SOCIAL_LINKS_SETTINGS_ID } from "@/lib/social-links";
import { prisma } from "@/lib/prisma";
import { socialLinksSettingsSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

function revalidateSocialLinksPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/about", "page");
  revalidatePath("/admin/social-links", "page");
}

export async function updateSocialLinksSettings(formData: FormData) {
  await requireAdmin();

  const parsed = socialLinksSettingsSchema.safeParse({
    contactEmail: formData.get("contactEmail"),
    whatsappNumber: formData.get("whatsappNumber"),
    whatsappDefaultMessage: formData.get("whatsappDefaultMessage") ?? "",
    facebookUrl: formData.get("facebookUrl") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
    youtubeUrl: formData.get("youtubeUrl") ?? "",
  });

  if (!parsed.success) {
    redirect(
      `/admin/social-links?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`,
    );
  }

  const data = {
    contactEmail: parsed.data.contactEmail,
    whatsappNumber: normalizeWhatsAppNumber(parsed.data.whatsappNumber),
    whatsappDefaultMessage: parsed.data.whatsappDefaultMessage,
    facebookUrl: parsed.data.facebookUrl,
    instagramUrl: parsed.data.instagramUrl,
    youtubeUrl: parsed.data.youtubeUrl,
  };

  await withDbErrorHandling(() => prisma.socialLinksSettings.upsert({
      where: { id: SOCIAL_LINKS_SETTINGS_ID },
      create: { id: SOCIAL_LINKS_SETTINGS_ID, ...data },
      update: data,
    }), "Database operation failed");

  revalidateSocialLinksPaths();
  redirect("/admin/social-links?saved=1");
}
