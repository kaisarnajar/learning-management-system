import { FILE_CONFIG } from "@/config/constants/file";
import { deleteFromR2, IMAGE_MIMES, uploadToR2, validateUpload, type UploadRules } from "@/services/storage";

const RULES: UploadRules = { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Image" };

export function validateProfileImage(file: File | null): { error?: string } {
  return validateUpload(file, RULES);
}

/** Stores a profile photo (bytes are sniffed); throws UploadError when refused. */
export function saveProfileImage(userId: string, file: File): Promise<string> {
  return uploadToR2("profiles", userId, file, RULES);
}

export function deleteProfileImage(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("profiles", imagePath);
}
