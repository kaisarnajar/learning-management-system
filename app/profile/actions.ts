"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-actions";
import { buildStoredProfileWhatsApp } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

export type ProfileUpdateState = {
  error?: string;
};

export async function updateProfile(
  _prev: ProfileUpdateState,
  formData: FormData,
): Promise<ProfileUpdateState> {
  const session = await requireUser();

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    fatherName: formData.get("fatherName"),
    dateOfBirth: formData.get("dateOfBirth"),
    occupation: formData.get("occupation"),
    address: formData.get("address"),
    country: formData.get("country"),
    whatsapp: formData.get("whatsapp"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  await withDbErrorHandling(() => prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        fatherName: parsed.data.fatherName,
        dateOfBirth: new Date(parsed.data.dateOfBirth),
        occupation: parsed.data.occupation,
        address: parsed.data.address,
        whatsapp: buildStoredProfileWhatsApp(parsed.data.country, parsed.data.whatsapp),
      },
    }), "Database operation failed");

  revalidatePath("/profile");
  revalidatePath("/profile/courses");
  revalidatePath("/courses");

  redirect("/courses");
}
