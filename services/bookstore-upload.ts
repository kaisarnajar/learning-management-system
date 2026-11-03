import { FILE_CONFIG } from "@/config/constants/file";
import { deleteFromR2, IMAGE_MIMES, uploadToR2, validateUpload, type UploadRules } from "@/services/storage";

const RULES: UploadRules = { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Image" };

export function validateBookImage(file: File | null): { error?: string } {
  return validateUpload(file, RULES);
}

/** Stores a book cover (bytes are sniffed); throws UploadError when refused. */
export function saveBookImage(bookId: string, file: File): Promise<string> {
  return uploadToR2("books", bookId, file, RULES);
}

export function deleteBookImage(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("books", imagePath);
}
