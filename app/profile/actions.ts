"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth-actions";
import { buildStoredProfileWhatsApp } from "@/services/countries";
import { Occupation, Gender } from "@prisma/client";
import { profileUpdateSchema } from "@/utils/validations";
import { saveProfileImage, validateProfileImage, deleteProfileImage } from "@/services/profile-upload";
import { isUploadError } from "@/services/storage";
import { applyStudentProfileChanges } from "@/services/profile-update";
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

  // The previous upload is removed only after the profile row points at the
  // new image (or the avatar); a failed save keeps the old photo intact.
  let previousUpload: string | null = null;

  if (parsed.data.gender === "FEMALE") {
    if (currentProfile?.image && !currentProfile.image.startsWith("/assets/")) {
      previousUpload = currentProfile.image;
    }
    newImageUrl = "/assets/female_icon.png";
  } else {
    // MALE
    if (imageFile && imageFile.size > 0) {
      const validation = validateProfileImage(imageFile);
      if (validation.error) {
        return { error: validation.error };
      }

      if (currentProfile?.image && !currentProfile.image.startsWith("/assets/")) {
        previousUpload = currentProfile.image;
      }

      try {
        newImageUrl = await saveProfileImage(session.user.id, imageFile);
      } catch (error) {
        if (isUploadError(error)) return { error: error.message };
        throw error;
      }
    } else {
      if (currentProfile?.image === "/assets/female_icon.png" || !currentProfile?.image) {
        newImageUrl = "/assets/male_icon.png";
      }
    }
  }

  try {
    // Allocates the registration number in the same transaction when this
    // save completes the profile (services/profile-update.ts).
    await applyStudentProfileChanges(session.user.id, {
      name: parsed.data.name,
      fatherName: parsed.data.fatherName,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      occupation: parsed.data.occupation as Occupation,
      address: parsed.data.address,
      whatsapp: buildStoredProfileWhatsApp(parsed.data.country, parsed.data.whatsapp),
      gender: parsed.data.gender as Gender,
      ...(newImageUrl ? { image: newImageUrl } : {}),
    });
  } catch (error) {
    // The row still points at the old photo; drop the one we just stored.
    if (newImageUrl && !newImageUrl.startsWith("/assets/")) await deleteProfileImage(session.user.id, newImageUrl);
    throw error;
  }

  if (previousUpload && previousUpload !== newImageUrl) {
    await deleteProfileImage(session.user.id, previousUpload);
  }

  revalidatePath("/profile");
  revalidatePath("/profile/courses");
  revalidatePath("/courses");
  revalidatePath("/admin/students", "page");
  revalidatePath(`/admin/students/${session.user.id}`, "page");
  revalidatePath(`/admin/students/${session.user.id}/id-card`, "page");
  revalidatePath("/", "layout");

  redirect("/profile");
}
