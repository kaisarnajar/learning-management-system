import { FILE_CONFIG } from "@/config/constants/file";
import { deleteFromR2, IMAGE_MIMES, uploadToR2, validateUpload, type UploadRules } from "@/services/storage";

export const MAX_ANNOUNCEMENT_IMAGES = 5;
export const MAX_ANNOUNCEMENT_IMAGE_BYTES = FILE_CONFIG.MAX_IMAGE_SIZE_BYTES;

const RULES: UploadRules = { allowed: IMAGE_MIMES, maxBytes: MAX_ANNOUNCEMENT_IMAGE_BYTES, label: "Each image" };

export function validateAnnouncementImage(file: File): { error?: string } {
  if (!file || file.size === 0) return { error: "Empty file." };
  return validateUpload(file, RULES);
}

export function getAnnouncementImageFiles(formData: FormData): File[] {
  const files = formData.getAll("images");
  return files.filter((f): f is File => f instanceof File && f.size > 0);
}

/** Stores a site-announcement image (bytes are sniffed); throws UploadError when refused. */
export function saveAnnouncementImage(announcementId: string, file: File): Promise<string> {
  return uploadToR2("announcements", announcementId, file, RULES);
}

export function deleteAnnouncementImageFile(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("announcements", imagePath);
}
