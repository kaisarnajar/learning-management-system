import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { applyStudentProfileChanges } from "@/services/profile-update";
import { deleteProfileImage, saveProfileImage, validateProfileImage } from "@/services/profile-upload";
import { isUploadError } from "@/services/storage";
import { prisma } from "@/utils/prisma";
import { apiError, apiServerError } from "@/utils/api-response";

const MALE_AVATAR = "/assets/male_icon.png";

async function currentImage(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { image: true, gender: true } });
}

function isUploaded(image: string | null | undefined): image is string {
  return Boolean(image && !image.startsWith("/assets/"));
}

/**
 * Uploads a profile photo: multipart/form-data with an `image` file (JPEG,
 * PNG or WebP, checked by content). As on the website, female profiles use
 * the default avatar and cannot upload a photo. The previous upload is
 * removed only after the profile points at the new one.
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const profile = await currentImage(user.id);
    if (profile?.gender === "FEMALE") {
      return apiError("Female profiles use the default avatar; a photo cannot be uploaded.", 400);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    if (!(file instanceof File) || file.size === 0) return apiError("Attach the photo as the \"image\" field.", 400);
    const validation = validateProfileImage(file);
    if (validation.error) return apiError(validation.error, 400);

    let stored: string;
    try {
      stored = await saveProfileImage(user.id, file);
    } catch (error) {
      if (isUploadError(error)) return apiError(error.message, 400);
      throw error;
    }

    try {
      await applyStudentProfileChanges(user.id, { image: stored });
    } catch (error) {
      await deleteProfileImage(stored);
      throw error;
    }
    if (isUploaded(profile?.image) && profile.image !== stored) await deleteProfileImage(profile.image);

    return NextResponse.json({ success: true, image: stored });
  } catch (error) {
    return apiServerError("api/v1/auth/me/photo POST", error, "Failed to upload the photo.");
  }
}

/** Removes the uploaded photo and goes back to the default avatar. */
export async function DELETE(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const profile = await currentImage(user.id);
    const avatar = profile?.gender === "FEMALE" ? "/assets/female_icon.png" : MALE_AVATAR;
    await applyStudentProfileChanges(user.id, { image: avatar });
    if (isUploaded(profile?.image)) await deleteProfileImage(profile.image);
    return NextResponse.json({ success: true, image: avatar });
  } catch (error) {
    return apiServerError("api/v1/auth/me/photo DELETE", error, "Failed to remove the photo.");
  }
}
