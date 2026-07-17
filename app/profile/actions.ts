"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth-actions";
import { buildStoredProfileWhatsApp } from "@/services/countries";
import { prisma } from "@/utils/prisma";
import { Occupation, Gender } from "@prisma/client";
import { profileUpdateSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";
import { saveProfileImage, validateProfileImage, deleteProfileImage } from "@/services/profile-upload";
import { getUserProfile } from "@/services/profile";

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
    gender: formData.get("gender"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  const currentProfile = await getUserProfile(session.user.id);

  const imageFile = formData.get("image") as File | null;
  let newImageUrl: string | undefined;

  if (parsed.data.gender === "FEMALE") {
    if (currentProfile?.image && currentProfile.image !== "/assets/female_icon.jpeg") {
      await deleteProfileImage(currentProfile.image);
    }
    newImageUrl = "/assets/female_icon.jpeg";
  } else {
    // MALE
    if (imageFile && imageFile.size > 0) {
      const validation = validateProfileImage(imageFile);
      if (validation.error) {
        return { error: validation.error };
      }

      if (currentProfile?.image && currentProfile.image !== "/assets/female_icon.jpeg" && currentProfile.image !== "/assets/male_icon.png") {
        await deleteProfileImage(currentProfile.image);
      }

      newImageUrl = await saveProfileImage(session.user.id, imageFile);
    } else {
      if (currentProfile?.image === "/assets/female_icon.jpeg" || !currentProfile?.image) {
        newImageUrl = "/assets/male_icon.png";
      }
    }
  }

  const updateData: {
    name: string;
    fatherName: string;
    dateOfBirth: Date;
    occupation: Occupation;
    address: string;
    whatsapp: string;
    gender: Gender;
    image?: string;
    registrationNumber?: string;
  } = {
    name: parsed.data.name,
    fatherName: parsed.data.fatherName,
    dateOfBirth: new Date(parsed.data.dateOfBirth),
    occupation: parsed.data.occupation as Occupation,
    address: parsed.data.address,
    whatsapp: buildStoredProfileWhatsApp(parsed.data.country, parsed.data.whatsapp),
    gender: parsed.data.gender as Gender,
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
      updateData.gender &&
      currentProfile?.email?.trim()
  );

  if (isNowComplete && !currentProfile?.registrationNumber) {
    const { generateNextRegistrationNumber } = await import("@/services/registration");
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
  revalidatePath("/admin/students", "page");
  revalidatePath(`/admin/students/${session.user.id}`, "page");
  revalidatePath(`/admin/students/${session.user.id}/id-card`, "page");
  revalidatePath("/", "layout");

  redirect("/profile");
}
