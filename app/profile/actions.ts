"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-actions";
import { buildStoredProfileWhatsApp } from "@/lib/countries";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";
import { saveProfileImage, validateProfileImage, deleteProfileImage } from "@/lib/profile-upload";
import { getUserProfile } from "@/lib/profile";

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

  const currentProfile = await getUserProfile(session.user.id);

  const imageFile = formData.get("image") as File | null;
  let newImageUrl: string | undefined;

  if (imageFile && imageFile.size > 0) {
    const validation = validateProfileImage(imageFile);
    if (validation.error) {
      return { error: validation.error };
    }

    if (currentProfile?.image) {
      await deleteProfileImage(currentProfile.image);
    }

    newImageUrl = await saveProfileImage(session.user.id, imageFile);
  }

  const updateData: {
    name: string;
    fatherName: string;
    dateOfBirth: Date;
    occupation: any;
    address: string;
    whatsapp: string;
    image?: string;
    registrationNumber?: string;
  } = {
    name: parsed.data.name,
    fatherName: parsed.data.fatherName,
    dateOfBirth: new Date(parsed.data.dateOfBirth),
    occupation: parsed.data.occupation as any,
    address: parsed.data.address,
    whatsapp: buildStoredProfileWhatsApp(parsed.data.country, parsed.data.whatsapp),
  };

  if (newImageUrl) {
    updateData.image = newImageUrl;
  }

  // Assign registration number if the profile is newly completed or already complete but missing the number
  const isNowComplete = Boolean(
    updateData.name?.trim() &&
      updateData.fatherName?.trim() &&
      updateData.dateOfBirth &&
      updateData.occupation &&
      updateData.address?.trim() &&
      updateData.whatsapp?.trim() &&
      currentProfile?.email?.trim()
  );

  if (isNowComplete && !currentProfile?.registrationNumber) {
    const { generateNextRegistrationNumber } = await import("@/lib/registration");
    // Registration year is when the user account was created
    const registrationYear = currentProfile?.createdAt?.getFullYear() ?? new Date().getFullYear();
    updateData.registrationNumber = await generateNextRegistrationNumber(registrationYear);
  }

  await withDbErrorHandling(() => prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    }), "Database operation failed");

  revalidatePath("/profile");
  revalidatePath("/profile/courses");
  revalidatePath("/courses");

  redirect("/profile");
}
