import { FILE_CONFIG } from "@/config/constants/file";
import { deleteFromR2, IMAGE_MIMES, ownedProfileImageKey, uploadToR2, validateUpload, type UploadRules } from "@/services/storage";

const RULES: UploadRules = { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Image" };

export function validateProfileImage(file: File | null): { error?: string } {
  return validateUpload(file, RULES);
}

/** Stores a profile photo (bytes are sniffed); throws UploadError when refused. */
export function saveProfileImage(userId: string, file: File): Promise<string> {
  return uploadToR2("profiles", userId, file, RULES);
}

/**
 * Deletes `userId`'s own uploaded photo. Anything else (a default avatar, a
 * Google photo, another user's upload stored on this profile) is left alone.
 */
export async function deleteProfileImage(userId: string, imagePath: string | null | undefined): Promise<void> {
  const key = ownedProfileImageKey(userId, imagePath);
  if (!key) return;
  await deleteFromR2("profiles", key);
}
