import { FILE_CONFIG } from "@/config/constants/file";
import { deleteFromR2, IMAGE_MIMES, uploadPrivateToR2, validateUpload, type UploadRules } from "@/services/storage";

const RULES: UploadRules = { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Screenshot" };

export function validatePaymentScreenshot(file: File | null): { error?: string } {
  return validateUpload(file, RULES);
}

/**
 * Stores a payment screenshot privately (bytes are sniffed); the returned
 * path is served through /api/files to the owner and admins only.
 * Throws UploadError when refused.
 */
export function savePaymentScreenshot(referenceId: string, file: File): Promise<string> {
  return uploadPrivateToR2("payments", referenceId, file, RULES);
}

/** Removes a previously uploaded payment screenshot (best effort, never throws). */
export function deletePaymentScreenshot(pathOrUrl: string | null | undefined): Promise<void> {
  return deleteFromR2("payments", pathOrUrl);
}
