import { ANNOUNCEMENT_MAX_UPLOAD_BYTES } from "@/services/announcements";
import { ATTACHMENT_MIMES, deleteFromR2, uploadToR2, validateUpload, type UploadRules } from "@/services/storage";

const RULES: UploadRules = { allowed: ATTACHMENT_MIMES, maxBytes: ANNOUNCEMENT_MAX_UPLOAD_BYTES, label: "Attachment" };

export function validateAnnouncementAttachment(file: File | null): { error?: string } {
  return validateUpload(file, RULES);
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\?%*:|"<>]/g, "_").trim();
  return base.slice(0, 120) || "attachment";
}

/** Stores a course-announcement attachment (bytes are sniffed); throws UploadError when refused. */
export async function saveAnnouncementAttachment(
  announcementId: string,
  file: File,
): Promise<{ attachmentPath: string; attachmentName: string }> {
  const attachmentPath = await uploadToR2("announcements", announcementId, file, RULES);
  return { attachmentPath, attachmentName: sanitizeFilename(file.name) };
}

export function deleteAnnouncementAttachment(attachmentPath: string | null | undefined): Promise<void> {
  return deleteFromR2("announcements", attachmentPath);
}
