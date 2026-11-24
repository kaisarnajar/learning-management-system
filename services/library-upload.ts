import { uploadRulesFor } from "@/services/direct-upload";
import { finalizeStagedUpload, isStagedUpload, pendingUploadFrom, type PendingUpload } from "@/services/staged-upload";
import { deleteFromR2, uploadToR2, validateUpload } from "@/services/storage";

const RULES = uploadRulesFor("library-cover");

/** Declared type and size of a form file; staged uploads are checked when they are finalised. */
export function validateLibraryImage(upload: PendingUpload | null): { error?: string } {
  if (isStagedUpload(upload)) return {};
  return validateUpload(upload, RULES);
}

/** The cover the form submits: the file (form upload) or a staged key (direct upload). */
export function getLibraryImageUpload(formData: FormData): PendingUpload | null {
  return pendingUploadFrom(formData, "image", "library-cover");
}

/** Stores a library cover (bytes are sniffed; a staged upload is verified and moved); throws UploadError when refused. */
export async function saveLibraryImage(libraryItemId: string, upload: PendingUpload): Promise<string> {
  if (isStagedUpload(upload)) return (await finalizeStagedUpload(upload, libraryItemId)).location;
  return uploadToR2("library", libraryItemId, upload, RULES);
}

export function deleteLibraryImage(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("library", imagePath);
}
