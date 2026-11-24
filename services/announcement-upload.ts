import { uploadRulesFor } from "@/services/direct-upload";
import { finalizeStagedUpload, isStagedUpload, type PendingUpload } from "@/services/staged-upload";
import { deleteFromR2, uploadPrivateToR2, validateUpload } from "@/services/storage";

const RULES = uploadRulesFor("course-announcement-attachment");

/** Declared type and size of a form file; staged uploads are checked when they are finalised. */
export function validateAnnouncementAttachment(upload: PendingUpload | null): { error?: string } {
  if (isStagedUpload(upload)) return {};
  return validateUpload(upload, RULES);
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\?%*:|"<>]/g, "_").trim();
  return base.slice(0, 120) || "attachment";
}

/**
 * Stores a course-announcement attachment privately (bytes are sniffed; a
 * staged upload is verified and moved); the returned path is served through
 * /api/files after an ownership check. Throws UploadError when refused.
 */
export async function saveAnnouncementAttachment(
  announcementId: string,
  upload: PendingUpload,
): Promise<{ attachmentPath: string; attachmentName: string }> {
  if (isStagedUpload(upload)) {
    const { location } = await finalizeStagedUpload(upload, announcementId);
    return { attachmentPath: location, attachmentName: sanitizeFilename(upload.name ?? "") };
  }
  const attachmentPath = await uploadPrivateToR2("announcements", announcementId, upload, RULES);
  return { attachmentPath, attachmentName: sanitizeFilename(upload.name) };
}

export function deleteAnnouncementAttachment(attachmentPath: string | null | undefined): Promise<void> {
  return deleteFromR2("announcements", attachmentPath);
}
