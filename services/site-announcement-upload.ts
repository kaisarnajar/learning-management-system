import { uploadRulesFor } from "@/services/direct-upload";
import { finalizeStagedUpload, isStagedUpload, pendingUploadsFrom, type PendingUpload } from "@/services/staged-upload";
import { deleteFromR2, uploadToR2, validateUpload } from "@/services/storage";

export { MAX_ANNOUNCEMENT_IMAGES } from "@/services/site-announcement-limits";

const RULES = uploadRulesFor("site-announcement-image");
export const MAX_ANNOUNCEMENT_IMAGE_BYTES = RULES.maxBytes;

/** Declared type and size of a form file; staged uploads are checked when they are finalised. */
export function validateAnnouncementImage(upload: PendingUpload): { error?: string } {
  if (isStagedUpload(upload)) return {};
  if (!upload || upload.size === 0) return { error: "Empty file." };
  return validateUpload(upload, RULES);
}

/** The images an announcement form submits: files (form upload) and staged keys (direct upload). */
export function getAnnouncementImageUploads(formData: FormData): PendingUpload[] {
  return pendingUploadsFrom(formData, "images", "site-announcement-image");
}

/** Stores a site-announcement image (bytes are sniffed; a staged upload is verified and moved); throws UploadError when refused. */
export async function saveAnnouncementImage(announcementId: string, upload: PendingUpload): Promise<string> {
  if (isStagedUpload(upload)) return (await finalizeStagedUpload(upload, announcementId)).location;
  return uploadToR2("announcements", announcementId, upload, RULES);
}

export function deleteAnnouncementImageFile(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("announcements", imagePath);
}
